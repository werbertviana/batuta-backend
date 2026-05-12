export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  gameStats: {
    lifePoints: number;
    batutaPoints: number;
    xpPoints: number;
    elo: string;
    progressLevel: number;
  };
};