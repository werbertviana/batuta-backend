import bcrypt from "bcrypt";
import { AuthProvider, Elo, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import type { CreateUserInput, UpdateUserInput } from "./users.types";

const USER_SELECT_WITH_AUTH = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarUrl: true,
  passwordHash: true,
  authProvider: true,
  googleId: true,
  lifePoints: true,
  batutaPoints: true,
  xpPoints: true,
  elo: true,
  progressLevel: true,
};

function toPrismaElo(elo?: string): Elo | undefined {
  if (!elo) return undefined;

  const v = elo.toLowerCase();

  if (v === "ferro") return Elo.FERRO;
  if (v === "bronze") return Elo.BRONZE;
  if (v === "prata") return Elo.PRATA;
  if (v === "ouro") return Elo.OURO;
  if (v === "platina") return Elo.PLATINA;
  if (v === "diamante") return Elo.DIAMANTE;
  if (v === "maestro") return Elo.MAESTRO;

  return Elo.FERRO;
}

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeUsername(value: string) {
  return removeAccents(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 32);
}

function buildUsernameBaseFromNameOrEmail(name: string, email: string) {
  const cleanName = removeAccents(name || "")
    .trim()
    .replace(/\s+/g, " ");

  const nameParts = cleanName
    .split(" ")
    .map((part) => normalizeUsername(part))
    .filter(Boolean);

  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    return normalizeUsername(`${firstName}.${lastName}`);
  }

  if (nameParts.length === 1) {
    return normalizeUsername(nameParts[0]);
  }

  const emailPrefix = email.split("@")[0] || "usuario";

  return normalizeUsername(emailPrefix) || "usuario";
}

async function buildUniqueUsername(base: string) {
  const safeBase = normalizeUsername(base) || "usuario";

  const existingBase = await prisma.user.findUnique({
    where: { username: safeBase },
    select: { id: true },
  });

  if (!existingBase) {
    return safeBase;
  }

  for (let index = 1; index <= 100; index += 1) {
    const candidate = `${safeBase}${index}`;

    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${safeBase}.${Date.now()}`;
}

export class UsersRepository {
  async create(data: CreateUserInput) {
    const gs = data.gameStats ?? {};
    const normalizedEmail = data.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        name: data.name.trim(),
        username: normalizeUsername(data.username),
        email: normalizedEmail,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
        lifePoints: gs.lifePoints ?? 3,
        batutaPoints: gs.batutaPoints ?? 0,
        xpPoints: gs.xpPoints ?? 0,
        elo: toPrismaElo(gs.elo) ?? Elo.FERRO,
        progressLevel: gs.progressLevel ?? 1,
      },
    });
  }

  async createGoogleUser(data: {
    name: string;
    email: string;
    googleId?: string | null;
    avatarUrl?: string | null;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const displayName =
      data.name?.trim() || normalizedEmail.split("@")[0] || "Usuário";

    const usernameBase = buildUsernameBaseFromNameOrEmail(
      displayName,
      normalizedEmail
    );

    const username = await buildUniqueUsername(usernameBase);

    return prisma.user.create({
      data: {
        name: displayName,
        username,
        email: normalizedEmail,
        avatarUrl: data.avatarUrl ?? null,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
        googleId: data.googleId ?? null,
        lifePoints: 3,
        batutaPoints: 0,
        xpPoints: 0,
        elo: Elo.FERRO,
        progressLevel: 1,
      },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByIdWithPassword(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
        avatarUrl: true,
        authProvider: true,
        googleId: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
    });
  }

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async list() {
    return prisma.user.findMany({ orderBy: { id: "desc" } });
  }

  async update(id: number, data: UpdateUserInput) {
    const gs = data.gameStats;

    const patch: Record<string, unknown> = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.username !== undefined
        ? { username: normalizeUsername(data.username) }
        : {}),
      ...(data.email !== undefined
        ? { email: data.email.trim().toLowerCase() }
        : {}),
      ...(gs?.lifePoints !== undefined ? { lifePoints: gs.lifePoints } : {}),
      ...(gs?.batutaPoints !== undefined
        ? { batutaPoints: gs.batutaPoints }
        : {}),
      ...(gs?.xpPoints !== undefined ? { xpPoints: gs.xpPoints } : {}),
      ...(gs?.elo !== undefined
        ? { elo: toPrismaElo(gs.elo) ?? Elo.FERRO }
        : {}),
      ...(gs?.progressLevel !== undefined
        ? { progressLevel: gs.progressLevel }
        : {}),
    };

    if (data.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
      patch.authProvider = AuthProvider.LOCAL;
    }

    return prisma.user.update({
      where: { id },
      data: patch,
    });
  }

  async updatePassword(id: number, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
    });
  }

  async updateAvatar(id: number, avatarUrl: string | null) {
    return prisma.user.update({
      where: { id },
      data: { avatarUrl },
    });
  }

  async findActivityProgress(userId: number, atividade: string) {
    return prisma.userActivityProgress.findUnique({
      where: {
        userId_atividade: {
          userId,
          atividade,
        },
      },
    });
  }

  async countCompletedActivitiesForLesson(userId: number, atividades: string[]) {
    return prisma.userActivityProgress.count({
      where: {
        userId,
        atividade: {
          in: atividades,
        },
      },
    });
  }

  async findLessonReward(userId: number, lesson: string) {
    return prisma.userLessonReward.findUnique({
      where: {
        userId_lesson: {
          userId,
          lesson,
        },
      },
    });
  }

  async completeActivityTransaction(args: {
    userId: number;
    atividade: string;
    xpPoints: number;
    batutaPoints: number;
    lifePoints: number;
    elo: string;
    progressLevel: number;
    shouldCreateProgress: boolean;
    shouldCreateLessonReward: boolean;
    lessonKey: string | null;
    shouldGrantBonusLife: boolean;
    shouldGrantBonusXp: boolean;
    shouldUpdateBonusLifeFlag: boolean;
    shouldUpdateBonusXpFlag: boolean;
  }) {
    const {
      userId,
      atividade,
      xpPoints,
      batutaPoints,
      lifePoints,
      elo,
      progressLevel,
      shouldCreateProgress,
      shouldCreateLessonReward,
      lessonKey,
      shouldGrantBonusLife,
      shouldGrantBonusXp,
      shouldUpdateBonusLifeFlag,
      shouldUpdateBonusXpFlag,
    } = args;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (shouldCreateProgress) {
        await tx.userActivityProgress.create({
          data: {
            userId,
            atividade,
            bonusLifeGranted: shouldGrantBonusLife,
            bonusXpGranted: shouldGrantBonusXp,
          },
        });
      } else if (shouldUpdateBonusLifeFlag || shouldUpdateBonusXpFlag) {
        await tx.userActivityProgress.update({
          where: {
            userId_atividade: {
              userId,
              atividade,
            },
          },
          data: {
            ...(shouldUpdateBonusLifeFlag ? { bonusLifeGranted: true } : {}),
            ...(shouldUpdateBonusXpFlag ? { bonusXpGranted: true } : {}),
          },
        });
      }

      if (shouldCreateLessonReward && lessonKey) {
        await tx.userLessonReward.create({
          data: {
            userId,
            lesson: lessonKey,
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xpPoints,
          batutaPoints,
          lifePoints,
          elo: toPrismaElo(elo) ?? Elo.FERRO,
          progressLevel,
        },
      });

      return updatedUser;
    });
  }

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}