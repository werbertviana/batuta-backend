import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
import { AuthProvider, Prisma } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
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
  SetPasswordInput,
  ChangePasswordInput,
  DeleteUserInput,
} from "./users.types";

function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function toResponse(u: any): UserResponse {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
    authProvider: u.authProvider === AuthProvider.GOOGLE ? "google" : "local",
    hasPassword: Boolean(u.passwordHash),
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
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}

function avatarUrlToFilePath(avatarUrl: string): string | null {
  if (!avatarUrl.startsWith("/uploads/avatars/")) return null;

  const fileName = path.basename(avatarUrl);
  return path.resolve(process.cwd(), "uploads", "avatars", fileName);
}

async function safelyDeleteAvatarFile(avatarUrl?: string | null) {
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

const ELO_ORDER: EloInput[] = [
  "ferro",
  "bronze",
  "prata",
  "ouro",
  "platina",
  "diamante",
  "maestro",
];

const MAX_SKIPS_PER_ACTIVITY = 2;

const ELO_REQUIREMENTS: Record<EloInput, { requiredXp: number; requiredBatutas: number }> = {
  ferro: { requiredXp: 0, requiredBatutas: 0 },
  bronze: { requiredXp: 16, requiredBatutas: 2 },
  prata: { requiredXp: 32, requiredBatutas: 2 },
  ouro: { requiredXp: 54, requiredBatutas: 2 },
  platina: { requiredXp: 78, requiredBatutas: 2 },
  diamante: { requiredXp: 108, requiredBatutas: 2 },
  maestro: { requiredXp: 144, requiredBatutas: 2 },
};

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
}): {
  eloNovo: EloInput;
  batutasRestantes: number;
  subiuElo: boolean;
  batutasConsumidas: number;
  xpNecessario: number;
  batutasNecessarias: number;
} {
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

export class UsersService {
  constructor(private repo = new UsersRepository()) {}

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

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const normalizedInput: CreateUserInput = {
      ...input,
      email: normalizeEmail(input.email),
      username: normalizeUsername(input.username),
    };

    const existingEmail = await this.repo.findByEmail(normalizedInput.email);

    if (existingEmail) {
      throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
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

    try {
      const user = await this.repo.create(normalizedInput);
      return toResponse(user);
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
      const sameEmail = await this.repo.findByEmail(normalizedInput.email);

      if (sameEmail && sameEmail.id !== id) {
        throw new AppError("E-mail already in use", 409, "EMAIL_ALREADY_EXISTS");
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
      const user = await this.repo.update(id, normalizedInput);
      return toResponse(user);
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

    await this.repo.updatePassword(id, input.newPassword);
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

    const currentPasswordMatches = await bcrypt.compare(
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

    const newPasswordIsSameAsCurrent = await bcrypt.compare(
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

    await this.repo.updatePassword(id, input.newPassword);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<UserResponse> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      await safelyDeleteAvatarFile(avatarUrl);
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    await safelyDeleteAvatarFile(exists.avatarUrl);

    const user = await this.repo.updateAvatar(id, avatarUrl);

    return toResponse(user);
  }

  async removeAvatar(id: number): Promise<UserResponse> {
    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    await safelyDeleteAvatarFile(exists.avatarUrl);

    const user = await this.repo.updateAvatar(id, null);

    return toResponse(user);
  }

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
      subiuProgressLevel: progressLevelAtual !== progressLevelAnterior,
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
    input: CompleteActivityInput,
  ): Promise<PreviewActivityResponse> {
    const { reward } = await this.resolveActivityOutcome(id, input);

    return { reward };
  }

  async completeActivity(
    id: number,
    input: CompleteActivityInput,
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

    const passwordMatches = await bcrypt.compare(
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