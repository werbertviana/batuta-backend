import { AppError, NotFoundError } from "../../shared/errors";
import {
  comparePassword,
  hashPassword,
} from "../../shared/security/password";
import { UsersRepository } from "./users.repository";
import type { ChangePasswordInput, SetPasswordInput } from "./users.types";

export class UsersPasswordService {
  constructor(private repo = new UsersRepository()) {}

  async checkPassword(password: string, passwordHash: string): Promise<boolean> {
    return comparePassword(password, passwordHash);
  }

  async setPassword(id: number, input: SetPasswordInput): Promise<void> {
    const user = await this.repo.findByIdWithPassword(id);

    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (user.passwordHash) {
      throw new AppError(
        "Essa conta já possui senha. Use a opção de alterar senha.",
        400,
        "PASSWORD_ALREADY_SET",
      );
    }

    const passwordHash = await hashPassword(input.newPassword);

    await this.repo.updatePassword(id, passwordHash);
  }

  async changePassword(id: number, input: ChangePasswordInput): Promise<void> {
    const user = await this.repo.findByIdWithPassword(id);

    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (!user.passwordHash) {
      throw new AppError(
        "Essa conta foi criada com Google. Defina uma senha antes de alterar a senha.",
        400,
        "PASSWORD_NOT_SET",
      );
    }

    const currentPasswordMatches = await this.checkPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new AppError(
        "Senha atual incorreta",
        400,
        "CURRENT_PASSWORD_INVALID",
      );
    }

    const newPasswordIsSameAsCurrent = await this.checkPassword(
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

    const passwordHash = await hashPassword(input.newPassword);

    await this.repo.updatePassword(id, passwordHash);
  }
}