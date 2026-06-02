export type LoginInput = {
  email: string;
  password: string;
};

export type GoogleLoginInput = {
  idToken: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

export type AuthProviderResponse = "local" | "google";

export type TutorialKey =
  | "intro"
  | "content"
  | "activity"
  | "rewards"
  | "profile"
  | "elos";

export type TutorialsSeen = Record<TutorialKey, boolean>;

export type LoginResponse = {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  authProvider: AuthProviderResponse;
  hasPassword: boolean;

  tutorialsSeen: TutorialsSeen;

  gameStats: {
    lifePoints: number;
    batutaPoints: number;
    xpPoints: number;
    elo: string;
    progressLevel: number;
  };
};

export type GooglePayload = {
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
};

export type ForgotPasswordResponse = {
  message: string;
  resetToken?: string;
};