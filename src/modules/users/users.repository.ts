import { AuthProvider, Elo, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import type {
  CreateUserRepositoryInput,
  UpdateUserInput,
} from "./users.types";

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
  currentStreak: true,
  bestStreak: true,
  lastPracticeAt: true,
  tutorialProgress: {
    select: {
      tutorialKey: true,
      seenAt: true,
    },
  },
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
  const cleanName = removeAccents(name || "").trim().replace(/\s+/g, " ");

  const nameParts = cleanName
    .split(" ")
    .map((part) => normalizeUsername(part))
    .filter(Boolean);

  if (nameParts.length >= 2) {
    return normalizeUsername(
      `${nameParts[0]}.${nameParts[nameParts.length - 1]}`,
    );
  }

  if (nameParts.length === 1) {
    return normalizeUsername(nameParts[0]);
  }

  return normalizeUsername(email.split("@")[0] || "usuario") || "usuario";
}

async function buildUniqueUsername(base: string) {
  const safeBase = normalizeUsername(base) || "usuario";

  const existingBase = await prisma.user.findUnique({
    where: { username: safeBase },
    select: { id: true },
  });

  if (!existingBase) return safeBase;

  for (let index = 1; index <= 100; index += 1) {
    const candidate = `${safeBase}${index}`;

    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  return `${safeBase}.${Date.now()}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInCalendarDays(currentDate: Date, previousDate: Date) {
  const current = startOfLocalDay(currentDate).getTime();
  const previous = startOfLocalDay(previousDate).getTime();

  return Math.round((current - previous) / (1000 * 60 * 60 * 24));
}

function calculateStreak(args: {
  currentStreak: number;
  bestStreak: number;
  lastPracticeAt: Date | null;
}) {
  const now = new Date();

  if (!args.lastPracticeAt) {
    return {
      currentStreak: 1,
      bestStreak: Math.max(args.bestStreak, 1),
      lastPracticeAt: now,
    };
  }

  const diffDays = differenceInCalendarDays(now, args.lastPracticeAt);

  if (diffDays === 0) {
    return {
      currentStreak: args.currentStreak,
      bestStreak: args.bestStreak,
      lastPracticeAt: args.lastPracticeAt,
    };
  }

  if (diffDays === 1) {
    const nextCurrentStreak = args.currentStreak + 1;

    return {
      currentStreak: nextCurrentStreak,
      bestStreak: Math.max(args.bestStreak, nextCurrentStreak),
      lastPracticeAt: now,
    };
  }

  return {
    currentStreak: 1,
    bestStreak: args.bestStreak,
    lastPracticeAt: now,
  };
}

export class UsersRepository {
  async create(data: CreateUserRepositoryInput) {
    const gs = data.gameStats ?? {};
    const normalizedEmail = data.email.trim().toLowerCase();

    return prisma.user.create({
      data: {
        name: data.name.trim(),
        username: normalizeUsername(data.username),
        email: normalizedEmail,
        passwordHash: data.passwordHash,
        authProvider: AuthProvider.LOCAL,
        lifePoints: gs.lifePoints ?? 3,
        batutaPoints: gs.batutaPoints ?? 0,
        xpPoints: gs.xpPoints ?? 0,
        elo: toPrismaElo(gs.elo) ?? Elo.FERRO,
        progressLevel: gs.progressLevel ?? 1,
      },
      select: USER_SELECT_WITH_AUTH,
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
      normalizedEmail,
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
    return prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_WITH_AUTH,
    });
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
        email: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: USER_SELECT_WITH_AUTH,
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
    return prisma.user.findMany({
      orderBy: { id: "desc" },
      select: USER_SELECT_WITH_AUTH,
    });
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

    return prisma.user.update({
      where: { id },
      data: patch,
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async markTutorialAsSeen(userId: number, tutorialKey: string) {
    await prisma.userTutorialProgress.upsert({
      where: {
        userId_tutorialKey: {
          userId,
          tutorialKey,
        },
      },
      update: {
        seenAt: new Date(),
      },
      create: {
        userId,
        tutorialKey,
      },
    });

    return prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async updatePassword(id: number, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async updateAvatar(id: number, avatarUrl: string | null) {
    return prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: USER_SELECT_WITH_AUTH,
    });
  }

  async createPasswordResetToken(data: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async invalidatePasswordResetTokens(userId: number) {
    return prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async findValidPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });
  }

  async markPasswordResetTokenAsUsed(id: number) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
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

      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          bestStreak: true,
          lastPracticeAt: true,
        },
      });

      const streak = currentUser
        ? calculateStreak({
            currentStreak: currentUser.currentStreak,
            bestStreak: currentUser.bestStreak,
            lastPracticeAt: currentUser.lastPracticeAt,
          })
        : {
            currentStreak: 1,
            bestStreak: 1,
            lastPracticeAt: new Date(),
          };

      return tx.user.update({
        where: { id: userId },
        data: {
          xpPoints,
          batutaPoints,
          lifePoints,
          elo: toPrismaElo(elo) ?? Elo.FERRO,
          progressLevel,
          currentStreak: streak.currentStreak,
          bestStreak: streak.bestStreak,
          lastPracticeAt: streak.lastPracticeAt,
        },
        select: USER_SELECT_WITH_AUTH,
      });
    });
  }

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}