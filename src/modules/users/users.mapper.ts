import { AuthProvider } from "@prisma/client";
import type { EloInput, UserResponse } from "./users.types";

export function toEloInput(value: unknown): EloInput {
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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function buildTutorialsSeen(progress: any[] = []) {
  return {
    intro: progress.some((item) => item.tutorialKey === "intro"),
    content: progress.some((item) => item.tutorialKey === "content"),
    activity: progress.some((item) => item.tutorialKey === "activity"),
    rewards: progress.some((item) => item.tutorialKey === "rewards"),
    profile: progress.some((item) => item.tutorialKey === "profile"),
    elos: progress.some((item) => item.tutorialKey === "elos"),
  };
}

export function toUserResponse(u: any): UserResponse {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
    authProvider: u.authProvider === AuthProvider.GOOGLE ? "google" : "local",
    hasPassword: Boolean(u.passwordHash),
    tutorialsSeen: buildTutorialsSeen(u.tutorialProgress),
    gameStats: {
      lifePoints: u.lifePoints,
      batutaPoints: u.batutaPoints,
      xpPoints: u.xpPoints,
      elo: toEloInput(u.elo),
      progressLevel: u.progressLevel,
    },
  };
}