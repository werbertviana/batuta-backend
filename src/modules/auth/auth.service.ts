import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { UsersRepository } from "../users/users.repository";
import { AppError } from "../../shared/errors";
import { sendPasswordResetEmail } from "../../shared/mail";

import type {
  LoginResponse,
  GooglePayload,
  ForgotPasswordResponse,
  ResetPasswordInput,
} from "./auth.types";

function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
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

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    const defaultMessage =
      "Se o email estiver cadastrado, enviaremos instruções para redefinir sua senha.";

    const user = await this.usersRepo.findByEmail(normalizedEmail);

    if (!user) {
      return { message: defaultMessage };
    }

    if (user.authProvider === AuthProvider.GOOGLE && !user.passwordHash) {
      throw new AppError(
        "Essa conta foi criada com Google. Entre usando o botão Continuar com Google ou defina uma senha no perfil.",
        400,
        "GOOGLE_ACCOUNT_USE_GOOGLE_LOGIN",
      );
    }

    const rawToken = createResetToken();
    const tokenHash = hashResetToken(rawToken);

    await this.usersRepo.invalidatePasswordResetTokens(user.id);

    await this.usersRepo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: minutesFromNow(15),
    });

    await sendPasswordResetEmail({
      to: normalizedEmail,
      token: rawToken,
    });

    console.log("[PASSWORD_RESET_TOKEN]", {
      email: normalizedEmail,
      token: rawToken,
    });

    return {
      message: defaultMessage,
      ...(process.env.NODE_ENV !== "production" ? { resetToken: rawToken } : {}),
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashResetToken(input.token);

    const resetToken = await this.usersRepo.findValidPasswordResetToken(
      tokenHash,
    );

    if (!resetToken) {
      throw new AppError(
        "Token inválido ou expirado",
        400,
        "INVALID_OR_EXPIRED_RESET_TOKEN",
      );
    }

    const user = await this.usersRepo.findByIdWithPassword(resetToken.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
    }

    if (user.passwordHash) {
      const newPasswordIsSameAsCurrent = await bcrypt.compare(
        input.newPassword,
        user.passwordHash,
      );

      if (newPasswordIsSameAsCurrent) {
        throw new AppError(
          "A nova senha não pode ser igual à senha atual",
          400,
          "SAME_PASSWORD",
        );
      }
    }

    await this.usersRepo.updatePassword(resetToken.userId, input.newPassword);

    await this.usersRepo.markPasswordResetTokenAsUsed(resetToken.id);
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