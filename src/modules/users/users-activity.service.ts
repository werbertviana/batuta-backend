import { AppError, NotFoundError } from "../../shared/errors";
import { UsersRepository } from "./users.repository";

import {
  ELO_ORDER,
  ELO_REQUIREMENTS,
  LESSON_ACTIVITY_MAP,
  MAX_SKIPS_PER_ACTIVITY,
} from "./users.constants";

import { toEloInput, toUserResponse } from "./users.mapper";

import type {
  ActivityReward,
  CompleteActivityInput,
  CompleteActivityResponse,
  EloInput,
  PreviewActivityResponse,
} from "./users.types";

function normalizeActivityName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveLessonKeyByActivity(atividade: string): string | null {
  const normalized = normalizeActivityName(atividade);

  for (const [lessonKey, atividades] of Object.entries(LESSON_ACTIVITY_MAP)) {
    const found = atividades.some(
      (item) => normalizeActivityName(item) === normalized,
    );

    if (found) return lessonKey;
  }

  return null;
}

function getLessonActivities(lessonKey: string): string[] {
  return LESSON_ACTIVITY_MAP[lessonKey] ?? [];
}

function normalizeActivityInput(
  input: CompleteActivityInput,
): Required<CompleteActivityInput> {
  const puladas =
    input.puladas === undefined
      ? input.totalQuestoes - input.acertos - input.erros
      : input.puladas;

  if (puladas < 0) {
    throw new AppError(
      "Quantidade de acertos e erros maior que o total de questões",
      400,
      "INVALID_ACTIVITY_TOTAL",
    );
  }

  if (puladas > MAX_SKIPS_PER_ACTIVITY) {
    throw new AppError(
      `Limite de ${MAX_SKIPS_PER_ACTIVITY} pulos por atividade excedido`,
      400,
      "MAX_SKIPS_EXCEEDED",
    );
  }

  const soma = input.acertos + input.erros + puladas;

  if (soma !== input.totalQuestoes) {
    throw new AppError(
      "A soma de acertos, erros e puladas deve ser igual ao total de questões",
      400,
      "ACTIVITY_TOTAL_MISMATCH",
    );
  }

  return { ...input, puladas };
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

function getNextElo(currentElo: EloInput): EloInput | null {
  const currentIndex = ELO_ORDER.indexOf(currentElo);
  const nextIndex = currentIndex + 1;

  if (currentIndex < 0 || nextIndex >= ELO_ORDER.length) return null;

  return ELO_ORDER[nextIndex];
}

function promoteEloWithConsumption(args: {
  eloAtual: EloInput;
  batutaPoints: number;
  xpPoints: number;
}) {
  const { eloAtual, batutaPoints, xpPoints } = args;
  const nextElo = getNextElo(eloAtual);

  if (!nextElo) {
    return {
      eloNovo: eloAtual,
      batutasRestantes: batutaPoints,
      subiuElo: false,
      batutasConsumidas: 0,
      xpNecessario: 0,
      batutasNecessarias: 0,
    };
  }

  const requirement = ELO_REQUIREMENTS[nextElo];

  const hasRequiredBatutas = batutaPoints >= requirement.requiredBatutas;
  const hasRequiredXp = xpPoints >= requirement.requiredXp;

  if (!hasRequiredBatutas || !hasRequiredXp) {
    return {
      eloNovo: eloAtual,
      batutasRestantes: batutaPoints,
      subiuElo: false,
      batutasConsumidas: 0,
      xpNecessario: requirement.requiredXp,
      batutasNecessarias: requirement.requiredBatutas,
    };
  }

  return {
    eloNovo: nextElo,
    batutasRestantes: batutaPoints - requirement.requiredBatutas,
    subiuElo: true,
    batutasConsumidas: requirement.requiredBatutas,
    xpNecessario: requirement.requiredXp,
    batutasNecessarias: requirement.requiredBatutas,
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

export class UsersActivityService {
  constructor(private repo = new UsersRepository()) {}

  private async resolveActivityOutcome(
    id: number,
    input: CompleteActivityInput,
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
      normalizedInput.atividade,
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

    if (primeiraConclusao && lessonKey) {
      const lessonActivities = getLessonActivities(lessonKey);

      const completedCountBefore =
        await this.repo.countCompletedActivitiesForLesson(id, lessonActivities);

      const completedCountAfter = completedCountBefore + 1;
      lessonCompleted = completedCountAfter >= lessonActivities.length;

      if (lessonCompleted) {
        const existingLessonReward = await this.repo.findLessonReward(
          id,
          lessonKey,
        );

        if (!existingLessonReward) {
          lessonRewardGranted = true;
          batutasGanhas = 1;
        }
      }
    }

    const batutasAntesDaPromocao = batutasAnteriores + batutasGanhas;

    const promotionResult = promoteEloWithConsumption({
      eloAtual: eloAnterior,
      batutaPoints: batutasAntesDaPromocao,
      xpPoints: xpTotal,
    });

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
      subiuElo: promotionResult.subiuElo,
      eloAnterior,
      eloAtual: promotionResult.eloNovo,
      batutasAntesDaPromocao,
      batutasDepoisDaPromocao: promotionResult.batutasRestantes,
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
      subiuProgressLevel: progressLevelAtual !== progressLevelAnterior,
    };

    return {
      reward,
      persistence: {
        xpPoints: xpTotal,
        batutaPoints: promotionResult.batutasRestantes,
        lifePoints: lifePointsDepois,
        elo: promotionResult.eloNovo,
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
    input: CompleteActivityInput,
  ): Promise<PreviewActivityResponse> {
    const { reward } = await this.resolveActivityOutcome(id, input);

    return { reward };
  }

  async completeActivity(
    id: number,
    input: CompleteActivityInput,
  ): Promise<CompleteActivityResponse> {
    const { reward, persistence } =
      await this.resolveActivityOutcome(id, input);

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
      user: toUserResponse(updatedUser),
      reward,
    };
  }
}