export type EloInput =
  | "ferro"
  | "bronze"
  | "prata"
  | "ouro"
  | "platina"
  | "diamante"
  | "maestro";

export type GameStatsInput = {
  lifePoints: number;
  batutaPoints: number;
  xpPoints: number;
  elo: EloInput;
  progressLevel: number;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  gameStats?: Partial<GameStatsInput>;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  gameStats?: Partial<GameStatsInput>;
};

export type UserResponse = {
  id: number;
  name: string;
  email: string;
  gameStats: GameStatsInput;
};

export type CompleteActivityInput = {
  atividade: string;
  acertos: number;
  erros: number;
  totalQuestoes: number;
  puladas?: number;
};

export type ActivityReward = {
  atividade: string;
  aprovado: boolean;
  perfect: boolean;
  xpBaseGanho: number;
  xpBonusGanho: number;
  xpGanho: number;
  puladas: number;
  maxPuladas: number;
  batutasGanhas: number;
  subiuElo: boolean;
  eloAnterior: EloInput;
  eloAtual: EloInput;
  batutasAntesDaPromocao: number;
  batutasDepoisDaPromocao: number;
  primeiraConclusao: boolean;
  bonusVidaGanha: boolean;
  bonusXpGanho: boolean;
  lifePointsAntes: number;
  lifePointsDepois: number;
  lessonCompleted: boolean;
  lessonRewardGranted: boolean;
  lessonKey: string | null;
  progressLevelAnterior: number;
  progressLevelAtual: number;
  subiuProgressLevel: boolean;
};

export type PreviewActivityResponse = {
  reward: ActivityReward;
};

export type CompleteActivityResponse = {
  user: UserResponse;
  reward: ActivityReward;
};