import { Prisma } from "@prisma/client";

import { AppError, NotFoundError } from "../../shared/errors";
import { hashPassword } from "../../shared/security/password";

import { UsersRepository } from "./users.repository";

import {
  normalizeEmail,
  normalizeUsername,
  toUserResponse,
} from "./users.mapper";

import type {
  CreateUserInput,
  UpdateUserInput,
  UserResponse,
} from "./users.types";

function isPrismaKnownError(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}

export class UsersCrudService {
  constructor(private repo = new UsersRepository()) {}

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const normalizedInput: CreateUserInput = {
      ...input,
      email: normalizeEmail(input.email),
      username: normalizeUsername(input.username),
    };

    const existingEmail = await this.repo.findByEmail(
      normalizedInput.email,
    );

    if (existingEmail) {
      throw new AppError(
        "E-mail already in use",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const existingUsername = await this.repo.findByUsername(
      normalizedInput.username,
    );

    if (existingUsername) {
      throw new AppError(
        "Username already in use",
        409,
        "USERNAME_ALREADY_EXISTS",
      );
    }

    const passwordHash = await hashPassword(
      normalizedInput.password,
    );

    try {
      const user = await this.repo.create({
        ...normalizedInput,
        passwordHash,
      });

      return toUserResponse(user);
    } catch (err) {
      if (isPrismaKnownError(err) && err.code === "P2002") {
        throw new AppError(
          "E-mail or username already in use",
          409,
          "USER_UNIQUE_CONSTRAINT",
        );
      }

      throw err;
    }
  }

  async listUsers(): Promise<UserResponse[]> {
    const users = await this.repo.list();

    return users.map(toUserResponse);
  }

  async getUser(id: number): Promise<UserResponse> {
    const user = await this.repo.findById(id);

    if (!user) {
      throw new NotFoundError(
        "User not found",
        "USER_NOT_FOUND",
      );
    }

    return toUserResponse(user);
  }

  async updateUser(
    id: number,
    input: UpdateUserInput,
  ): Promise<UserResponse> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError(
        "User not found",
        "USER_NOT_FOUND",
      );
    }

    const normalizedInput: UpdateUserInput = {
      ...input,
      ...(input.email !== undefined
        ? { email: normalizeEmail(input.email) }
        : {}),
      ...(input.username !== undefined
        ? { username: normalizeUsername(input.username) }
        : {}),
    };

    if (normalizedInput.email) {
      const sameEmail = await this.repo.findByEmail(
        normalizedInput.email,
      );

      if (sameEmail && sameEmail.id !== id) {
        throw new AppError(
          "E-mail already in use",
          409,
          "EMAIL_ALREADY_EXISTS",
        );
      }
    }

    if (normalizedInput.username) {
      const sameUsername = await this.repo.findByUsername(
        normalizedInput.username,
      );

      if (sameUsername && sameUsername.id !== id) {
        throw new AppError(
          "Username already in use",
          409,
          "USERNAME_ALREADY_EXISTS",
        );
      }
    }

    try {
      const user = await this.repo.update(
        id,
        normalizedInput,
      );

      return toUserResponse(user);
    } catch (err) {
      if (isPrismaKnownError(err) && err.code === "P2002") {
        throw new AppError(
          "E-mail or username already in use",
          409,
          "USER_UNIQUE_CONSTRAINT",
        );
      }

      throw err;
    }
  }
}