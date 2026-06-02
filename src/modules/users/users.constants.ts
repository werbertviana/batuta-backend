import type { EloInput } from "./users.types";

export const VALID_TUTORIAL_KEYS = [
  "intro",
  "content",
  "activity",
  "rewards",
  "profile",
  "elos",
] as const;

export type TutorialKey = (typeof VALID_TUTORIAL_KEYS)[number];

export const ELO_ORDER: EloInput[] = [
  "ferro",
  "bronze",
  "prata",
  "ouro",
  "platina",
  "diamante",
  "maestro",
];

export const MAX_SKIPS_PER_ACTIVITY = 2;

export const ELO_REQUIREMENTS: Record<
  EloInput,
  { requiredXp: number; requiredBatutas: number }
> = {
  ferro: { requiredXp: 0, requiredBatutas: 0 },
  bronze: { requiredXp: 16, requiredBatutas: 2 },
  prata: { requiredXp: 32, requiredBatutas: 2 },
  ouro: { requiredXp: 54, requiredBatutas: 2 },
  platina: { requiredXp: 78, requiredBatutas: 2 },
  diamante: { requiredXp: 108, requiredBatutas: 2 },
  maestro: { requiredXp: 144, requiredBatutas: 2 },
};

export const LESSON_ACTIVITY_MAP: Record<string, string[]> = {
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