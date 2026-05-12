import bcrypt from "bcrypt";
import { UsersRepository } from "../users/users.repository";
import { AppError } from "../../shared/errors";
import type { LoginResponse } from "./auth.types";

export class AuthService {
  constructor(private usersRepo = new UsersRepository()) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.usersRepo.findByEmailWithPassword(normalizedEmail);

    if (!user) {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
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