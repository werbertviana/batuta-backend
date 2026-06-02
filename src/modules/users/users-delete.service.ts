import { AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { AppError, NotFoundError } from "../../shared/errors";
import { UsersRepository } from "./users.repository";
import { normalizeEmail } from "./users.mapper";
import { UsersPasswordService } from "./users-password.service";
import { safelyDeleteAvatarFile } from "./users-avatar.service";
import type { DeleteUserInput } from "./users.types";

function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

export class UsersDeleteService {
  constructor(
    private repo = new UsersRepository(),
    private passwordService = new UsersPasswordService(repo),
  ) {}

  private async verifyGoogleDeleteToken(args: {
    userEmail: string;
    userGoogleId?: string | null;
    googleIdToken: string;
  }) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new AppError(
        "GOOGLE_CLIENT_ID não configurado",
        500,
        "GOOGLE_CLIENT_ID_NOT_CONFIGURED",
      );
    }

    try {
      const googleClient = getGoogleClient();

      const ticket = await googleClient.verifyIdToken({
        idToken: args.googleIdToken,
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

      const tokenEmail = normalizeEmail(payload.email);
      const userEmail = normalizeEmail(args.userEmail);

      if (tokenEmail !== userEmail) {
        throw new AppError(
          "A conta Google selecionada não corresponde ao usuário logado",
          401,
          "GOOGLE_ACCOUNT_MISMATCH",
        );
      }

      if (args.userGoogleId && payload.sub !== args.userGoogleId) {
        throw new AppError(
          "A conta Google selecionada não corresponde ao usuário logado",
          401,
          "GOOGLE_ACCOUNT_MISMATCH",
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;

      throw new AppError("Token Google inválido", 401, "INVALID_GOOGLE_TOKEN");
    }
  }

  async deleteUser(id: number, input: DeleteUserInput): Promise<void> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    const currentPassword = input.currentPassword || input.password || "";
    const googleIdToken = input.googleIdToken || "";

    if (googleIdToken.trim()) {
      if (exists.authProvider !== AuthProvider.GOOGLE && !exists.googleId) {
        throw new AppError(
          "Essa conta não está vinculada ao Google",
          400,
          "GOOGLE_DELETE_NOT_ALLOWED",
        );
      }

      await this.verifyGoogleDeleteToken({
        userEmail: exists.email,
        userGoogleId: exists.googleId,
        googleIdToken,
      });

      await safelyDeleteAvatarFile(exists.avatarUrl);
      await this.repo.delete(id);
      return;
    }

    if (!currentPassword.trim()) {
      throw new AppError(
        "Senha atual ou confirmação com Google é obrigatória",
        400,
        "PASSWORD_OR_GOOGLE_REQUIRED",
      );
    }

    if (!exists.passwordHash) {
      throw new AppError(
        "Essa conta foi criada com Google. Confirme a exclusão usando Google.",
        400,
        "GOOGLE_ACCOUNT_USE_GOOGLE_DELETE",
      );
    }

    const passwordMatches = await this.passwordService.checkPassword(
      currentPassword,
      exists.passwordHash,
    );

    if (!passwordMatches) {
      throw new AppError(
        "Senha atual incorreta",
        401,
        "CURRENT_PASSWORD_INVALID",
      );
    }

    await safelyDeleteAvatarFile(exists.avatarUrl);
    await this.repo.delete(id);
  }
}