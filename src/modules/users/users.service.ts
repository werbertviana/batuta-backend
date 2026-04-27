import { Prisma } from "@prisma/client";
import { AppError, NotFoundError } from "../../shared/errors";
import { UsersRepository } from "./users.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserResponse,
  EloInput,
  CompleteActivityInput,
  CompleteActivityResponse,
  PreviewActivityResponse,
  ActivityReward,
} from "./users.types";

function toEloInput(value: unknown): EloInput {
  const v = String(value).toLowerCase();

  if (v === "ferro") return "ferro";
  if (v === "bronze") return "bronze";
  if (v === "prata") return "prata";
  if (v === "ouro") return "ouro";
  if (v === "platina") return "platina";
  if (v === "diamante") return "diamante";
  if (v === "maestro") return "maestro";

  return "ferro";
}

function toResponse(u: any): UserResponse {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    gameStats: {
      lifePoints: u.lifePoints,
      batutaPoints: u.batutaPoints,
      xpPoints: u.xpPoints,
      elo: toEloInput(u.elo),
      progressLevel: u.progressLevel,
    },
  };
}

function isPrismaKnownError(
  err: unknown
): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}

const ELO_ORDER: EloInput[] = [
  "ferro",
  "bronze",
  "prata",
  "ouro",
  "platina",
  "diamante",
  "maestro",
];

const DEFAULT_BATUTA_COST = 2;
const MAX_SKIPS_PER_ACTIVITY = 2;

const LESSON_ACTIVITY_MAP: Record<string, string[]> = {
  "lesson-1": [
    "Introducao",
    "Pauta Musical",
    "Clave Musical",
    "Notas Musicais",
  ],
  "lesson-2": [
    "Figuras de Notas",
    "Figuras de Pausas",
    "Duração dos Valores",
    "Compasso Musical",
  ],
};

function normalizeActivityName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveLessonKeyByActivity(atividade: string): string | null {
  const normalized = normalizeActivityName(atividade);

  for (const [lessonKey, atividades] of Object.entries(LESSON_ACTIVITY_MAP)) {
    const found = atividades.some(
      (item) => normalizeActivityName(item) === normalized
    );

    if (found) {
      return lessonKey;
    }
  }

  return null;
}

function getLessonActivities(lessonKey: string): string[] {
  return LESSON_ACTIVITY_MAP[lessonKey] ?? [];
}

function normalizeActivityInput(
  input: CompleteActivityInput
): Required<CompleteActivityInput> {
  const puladas =
    input.puladas === undefined
      ? input.totalQuestoes - input.acertos - input.erros
      : input.puladas;

  if (puladas < 0) {
    throw new AppError(
      "Quantidade de acertos e erros maior que o total de questões",
      400,
      "INVALID_ACTIVITY_TOTAL"
    );
  }

  if (puladas > MAX_SKIPS_PER_ACTIVITY) {
    throw new AppError(
      `Limite de ${MAX_SKIPS_PER_ACTIVITY} pulos por atividade excedido`,
      400,
      "MAX_SKIPS_EXCEEDED"
    );
  }

  const soma = input.acertos + input.erros + puladas;

  if (soma !== input.totalQuestoes) {
    throw new AppError(
      "A soma de acertos, erros e puladas deve ser igual ao total de questões",
      400,
      "ACTIVITY_TOTAL_MISMATCH"
    );
  }

  return {
    ...input,
    puladas,
  };
}

function calculateSimpleActivityReward(args: {
  input: Required<CompleteActivityInput>;
  bonusXpAvailable: boolean;
}) {
  const { input, bonusXpAvailable } = args;

  const percentualAcerto = (input.acertos / input.totalQuestoes) * 100;
  const aprovado = percentualAcerto >= 50;
  const perfect = input.acertos === input.totalQuestoes && input.puladas === 0;

  const xpBaseGanho = aprovado ? 2 : 0;
  const xpBonusGanho = aprovado && perfect && bonusXpAvailable ? 1 : 0;
  const xpGanho = xpBaseGanho + xpBonusGanho;

  return {
    aprovado,
    perfect,
    xpBaseGanho,
    xpBonusGanho,
    xpGanho,
  };
}

function getBatutasRequiredForNextElo(currentElo: EloInput): number {
  if (currentElo === "maestro") {
    return Number.POSITIVE_INFINITY;
  }

  return DEFAULT_BATUTA_COST;
}

function promoteEloWithConsumption(
  eloAtual: EloInput,
  batutaPoints: number
): {
  eloNovo: EloInput;
  batutasRestantes: number;
  subiuElo: boolean;
  batutasConsumidas: number;
} {
  if (eloAtual === "maestro") {
    return {
      eloNovo: eloAtual,
      batutasRestantes: batutaPoints,
      subiuElo: false,
      batutasConsumidas: 0,
    };
  }

  const required = getBatutasRequiredForNextElo(eloAtual);

  if (batutaPoints < required) {
    return {
      eloNovo: eloAtual,
      batutasRestantes: batutaPoints,
      subiuElo: false,
      batutasConsumidas: 0,
    };
  }

  const currentIndex = ELO_ORDER.indexOf(eloAtual);
  const nextIndex = Math.min(currentIndex + 1, ELO_ORDER.length - 1);

  return {
    eloNovo: ELO_ORDER[nextIndex],
    batutasRestantes: batutaPoints - required,
    subiuElo: true,
    batutasConsumidas: required,
  };
}

type ActivityResolution = {
  reward: ActivityReward;
  persistence: {
    xpPoints: number;
    batutaPoints: number;
    lifePoints: number;
    elo: EloInput;
    progressLevel: number;
    shouldCreateProgress: boolean;
    shouldCreateLessonReward: boolean;
    lessonKey: string | null;
    shouldGrantBonusLife: boolean;
    shouldGrantBonusXp: boolean;
    shouldUpdateBonusLifeFlag: boolean;
    shouldUpdateBonusXpFlag: boolean;
  };
};

export class UsersService {
  constructor(private repo = new UsersRepository()) {}

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
    }

    try {
      const user = await this.repo.create(input);
      return toResponse(user);
    } catch (err) {
      if (isPrismaKnownError(err) && err.code === "P2002") {
        throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
      }
      throw err;
    }
  }

  async listUsers(): Promise<UserResponse[]> {
    const users = await this.repo.list();
    return users.map(toResponse);
  }

  async getUser(id: number): Promise<UserResponse> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    return toResponse(user);
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<UserResponse> {
    const exists = await this.repo.findById(id);
    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (input.email) {
      const sameEmail = await this.repo.findByEmail(input.email);
      if (sameEmail && sameEmail.id !== id) {
        throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
      }
    }

    try {
      const user = await this.repo.update(id, input);
      return toResponse(user);
    } catch (err) {
      if (isPrismaKnownError(err) && err.code === "P2002") {
        throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
      }
      throw err;
    }
  }

  private async resolveActivityOutcome(
    id: number,
    input: CompleteActivityInput
  ): Promise<ActivityResolution> {
    const normalizedInput = normalizeActivityInput(input);

    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    const eloAnterior = toEloInput(exists.elo);
    const xpAnterior = exists.xpPoints;
    const batutasAnteriores = exists.batutaPoints;
    const lifePointsAntes = exists.lifePoints;
    const progressLevelAnterior = exists.progressLevel ?? 1;

    const activityProgress = await this.repo.findActivityProgress(
      id,
      normalizedInput.atividade
    );

    const bonusXpAvailable =
      !activityProgress || activityProgress.bonusXpGranted === false;

    const { aprovado, perfect, xpBaseGanho, xpBonusGanho, xpGanho } =
      calculateSimpleActivityReward({
        input: normalizedInput,
        bonusXpAvailable,
      });

    const primeiraConclusao = aprovado && !activityProgress;

    const bonusVidaGanha =
      aprovado &&
      perfect &&
      (!activityProgress || !activityProgress.bonusLifeGranted);

    const bonusXpGanho = xpBonusGanho > 0;

    const shouldUpdateBonusLifeFlag =
      aprovado &&
      perfect &&
      !!activityProgress &&
      !activityProgress.bonusLifeGranted;

    const shouldUpdateBonusXpFlag =
      aprovado &&
      perfect &&
      !!activityProgress &&
      !activityProgress.bonusXpGranted;

    const xpTotal = xpAnterior + xpGanho;
    const lifePointsDepois = bonusVidaGanha
      ? lifePointsAntes + 1
      : lifePointsAntes;

    const lessonKey = resolveLessonKeyByActivity(normalizedInput.atividade);

    let lessonCompleted = false;
    let lessonRewardGranted = false;
    let batutasGanhas = 0;

    const progressLevelAtual = primeiraConclusao
      ? progressLevelAnterior + 1
      : progressLevelAnterior;

    const subiuProgressLevel = progressLevelAtual !== progressLevelAnterior;

    if (primeiraConclusao && lessonKey) {
      const lessonActivities = getLessonActivities(lessonKey);

      const completedCountBefore =
        await this.repo.countCompletedActivitiesForLesson(id, lessonActivities);

      const completedCountAfter = completedCountBefore + 1;
      lessonCompleted = completedCountAfter >= lessonActivities.length;

      if (lessonCompleted) {
        const existingLessonReward = await this.repo.findLessonReward(
          id,
          lessonKey
        );

        if (!existingLessonReward) {
          lessonRewardGranted = true;
          batutasGanhas = 1;
        }
      }
    }

    const batutasAntesDaPromocao = batutasAnteriores + batutasGanhas;

    const promotionResult = promoteEloWithConsumption(
      eloAnterior,
      batutasAntesDaPromocao
    );

    const eloAtual = promotionResult.eloNovo;
    const batutasDepoisDaPromocao = promotionResult.batutasRestantes;
    const subiuElo = promotionResult.subiuElo;

    const reward: ActivityReward = {
      atividade: normalizedInput.atividade,
      aprovado,
      perfect,
      xpBaseGanho,
      xpBonusGanho,
      xpGanho,
      puladas: normalizedInput.puladas,
      maxPuladas: MAX_SKIPS_PER_ACTIVITY,
      batutasGanhas,
      subiuElo,
      eloAnterior,
      eloAtual,
      batutasAntesDaPromocao,
      batutasDepoisDaPromocao,
      primeiraConclusao,
      bonusVidaGanha,
      bonusXpGanho,
      lifePointsAntes,
      lifePointsDepois,
      lessonCompleted,
      lessonRewardGranted,
      lessonKey,
      progressLevelAnterior,
      progressLevelAtual,
      subiuProgressLevel,
    };

    return {
      reward,
      persistence: {
        xpPoints: xpTotal,
        batutaPoints: batutasDepoisDaPromocao,
        lifePoints: lifePointsDepois,
        elo: eloAtual,
        progressLevel: progressLevelAtual,
        shouldCreateProgress: primeiraConclusao,
        shouldCreateLessonReward: lessonRewardGranted,
        lessonKey,
        shouldGrantBonusLife: bonusVidaGanha,
        shouldGrantBonusXp: bonusXpGanho,
        shouldUpdateBonusLifeFlag,
        shouldUpdateBonusXpFlag,
      },
    };
  }

  async previewActivity(
    id: number,
    input: CompleteActivityInput
  ): Promise<PreviewActivityResponse> {
    const { reward } = await this.resolveActivityOutcome(id, input);
    return { reward };
  }

  async completeActivity(
    id: number,
    input: CompleteActivityInput
  ): Promise<CompleteActivityResponse> {
    const { reward, persistence } = await this.resolveActivityOutcome(id, input);

    const updatedUser = await this.repo.completeActivityTransaction({
      userId: id,
      atividade: reward.atividade,
      xpPoints: persistence.xpPoints,
      batutaPoints: persistence.batutaPoints,
      lifePoints: persistence.lifePoints,
      elo: persistence.elo,
      progressLevel: persistence.progressLevel,
      shouldCreateProgress: persistence.shouldCreateProgress,
      shouldCreateLessonReward: persistence.shouldCreateLessonReward,
      lessonKey: persistence.lessonKey,
      shouldGrantBonusLife: persistence.shouldGrantBonusLife,
      shouldGrantBonusXp: persistence.shouldGrantBonusXp,
      shouldUpdateBonusLifeFlag: persistence.shouldUpdateBonusLifeFlag,
      shouldUpdateBonusXpFlag: persistence.shouldUpdateBonusXpFlag,
    });

    return {
      user: toResponse(updatedUser),
      reward,
    };
  }

  async deleteUser(id: number): Promise<void> {
    const exists = await this.repo.findById(id);
    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    await this.repo.delete(id);
  }
}