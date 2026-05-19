import bcrypt from "bcrypt";
import { AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { UsersRepository } from "../users/users.repository";
import { AppError } from "../../shared/errors";
import type { LoginResponse, GooglePayload } from "./auth.types";

function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

export class AuthService {
  constructor(private usersRepo = new UsersRepository()) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.usersRepo.findByEmailWithPassword(normalizedEmail);

    if (!user) {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    if (!user.passwordHash) {
      throw new AppError(
        "Essa conta foi criada com Google. Entre usando o botão Continuar com Google.",
        401,
        "GOOGLE_ACCOUNT_USE_GOOGLE_LOGIN",
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    return this.toLoginResponse(user);
  }

  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new AppError(
        "GOOGLE_CLIENT_ID não configurado",
        500,
        "GOOGLE_CLIENT_ID_NOT_CONFIGURED",
      );
    }

    const payload = await this.verifyGoogleIdToken(idToken);

    let user = payload.googleId
      ? await this.usersRepo.findByGoogleId(payload.googleId)
      : null;

    if (!user) {
      user = await this.usersRepo.findByEmailWithPassword(payload.email);
    }

    if (!user) {
      user = await this.usersRepo.createGoogleUser({
        name: payload.name,
        email: payload.email,
        googleId: payload.googleId,
        avatarUrl: payload.picture ?? null,
      });
    }

    return this.toLoginResponse(user);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GooglePayload> {
    try {
      const googleClient = getGoogleClient();

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.email || !payload?.sub) {
        throw new AppError("Token Google inválido", 401, "INVALID_GOOGLE_TOKEN");
      }

      if (payload.email_verified === false) {
        throw new AppError(
          "E-mail Google não verificado",
          401,
          "GOOGLE_EMAIL_NOT_VERIFIED",
        );
      }

      return {
        googleId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: payload.name || payload.email.split("@")[0],
        picture: payload.picture ?? null,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }

      throw new AppError("Token Google inválido", 401, "INVALID_GOOGLE_TOKEN");
    }
  }

  private toLoginResponse(user: any): LoginResponse {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      authProvider:
        user.authProvider === AuthProvider.GOOGLE ? "google" : "local",
      hasPassword: Boolean(user.passwordHash),
      gameStats: {
        lifePoints: user.lifePoints,
        batutaPoints: user.batutaPoints,
        xpPoints: user.xpPoints,
        elo: String(user.elo).toLowerCase(),
        progressLevel: user.progressLevel,
      },
    };
  }
}