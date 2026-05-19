export type LoginInput = {
  email: string;
  password: string;
};

export type GoogleLoginInput = {
  idToken: string;
};

export type AuthProviderResponse = "local" | "google";

export type LoginResponse = {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  authProvider: AuthProviderResponse;
  hasPassword: boolean;
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