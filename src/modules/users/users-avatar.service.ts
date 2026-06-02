import fs from "fs/promises";
import path from "path";

import { NotFoundError } from "../../shared/errors";
import { UsersRepository } from "./users.repository";
import { toUserResponse } from "./users.mapper";
import type { UserResponse } from "./users.types";

function avatarUrlToFilePath(avatarUrl: string): string | null {
  if (!avatarUrl.startsWith("/uploads/avatars/")) return null;

  const fileName = path.basename(avatarUrl);
  return path.resolve(process.cwd(), "uploads", "avatars", fileName);
}

export async function safelyDeleteAvatarFile(avatarUrl?: string | null) {
  if (!avatarUrl) return;

  const filePath = avatarUrlToFilePath(avatarUrl);

  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.log("ERRO AO REMOVER ARQUIVO DE AVATAR:", err);
    }
  }
}

export class UsersAvatarService {
  constructor(private repo = new UsersRepository()) {}

  async updateAvatar(id: number, avatarUrl: string): Promise<UserResponse> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      await safelyDeleteAvatarFile(avatarUrl);
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    await safelyDeleteAvatarFile(exists.avatarUrl);

    const user = await this.repo.updateAvatar(id, avatarUrl);

    return toUserResponse(user);
  }

  async removeAvatar(id: number): Promise<UserResponse> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    await safelyDeleteAvatarFile(exists.avatarUrl);

    const user = await this.repo.updateAvatar(id, null);

    return toUserResponse(user);
  }
}