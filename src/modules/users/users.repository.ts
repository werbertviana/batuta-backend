import bcrypt from "bcrypt";
import { Elo, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import type { CreateUserInput, UpdateUserInput } from "./users.types";

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

export class UsersRepository {
  async create(data: CreateUserInput) {
    const gs = data.gameStats ?? {};
    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        lifePoints: gs.lifePoints ?? 3,
        batutaPoints: gs.batutaPoints ?? 0,
        xpPoints: gs.xpPoints ?? 0,
        elo: toPrismaElo(gs.elo) ?? Elo.FERRO,
        progressLevel: gs.progressLevel ?? 1,
      },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        lifePoints: true,
        batutaPoints: true,
        xpPoints: true,
        elo: true,
        progressLevel: true,
      },
    });
  }

  async list() {
    return prisma.user.findMany({ orderBy: { id: "desc" } });
  }

  async update(id: number, data: UpdateUserInput) {
    const gs = data.gameStats;

    const patch: Record<string, unknown> = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(gs?.lifePoints !== undefined ? { lifePoints: gs.lifePoints } : {}),
      ...(gs?.batutaPoints !== undefined ? { batutaPoints: gs.batutaPoints } : {}),
      ...(gs?.xpPoints !== undefined ? { xpPoints: gs.xpPoints } : {}),
      ...(gs?.elo !== undefined ? { elo: toPrismaElo(gs.elo) ?? Elo.FERRO } : {}),
      ...(gs?.progressLevel !== undefined ? { progressLevel: gs.progressLevel } : {}),
    };

    if (data.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: patch,
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