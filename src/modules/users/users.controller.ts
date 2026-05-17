import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UsersService } from "./users.service";
import { AppError } from "../../shared/errors";

const eloSchema = z.enum([
  "ferro",
  "bronze",
  "prata",
  "ouro",
  "platina",
  "diamante",
  "maestro",
]);

const usernameSchema = z
  .string()
  .min(3, "Username deve ter no mínimo 3 caracteres")
  .max(20, "Username deve ter no máximo 20 caracteres")
  .regex(
    /^(?!\.)(?!.*\.$)[a-zA-Z0-9._]+$/,
    "Username deve conter apenas letras, números, ponto ou underline e não pode começar/terminar com ponto"
  );

const gameStatsSchema = z
  .object({
    lifePoints: z.number().int().min(0).default(3),
    batutaPoints: z.number().int().min(0).default(0),
    xpPoints: z.number().int().min(0).default(0),
    elo: eloSchema.default("ferro"),
    progressLevel: z.number().int().min(1).default(1),
  })
  .partial();

const createSchema = z.object({
  name: z.string().min(2),
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(4),
  gameStats: gameStatsSchema.optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  username: usernameSchema.optional(),
  email: z.string().email().optional(),
  password: z.string().min(4).optional(),
  gameStats: gameStatsSchema.optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(4, "Nova senha deve ter no mínimo 4 caracteres"),
});

const deleteAccountSchema = z
  .object({
    password: z.string().optional(),
    currentPassword: z.string().optional(),
  })
  .transform((data) => ({
    currentPassword: data.currentPassword || data.password || "",
  }))
  .refine((data) => data.currentPassword.trim().length > 0, {
    message: "Senha atual é obrigatória",
    path: ["currentPassword"],
  });

const activitySchema = z.object({
  atividade: z.string().min(1),
  acertos: z.number().int().min(0),
  erros: z.number().int().min(0),
  puladas: z.number().int().min(0).optional(),
  totalQuestoes: z.number().int().min(1),
});

export class UsersController {
  constructor(private service = new UsersService()) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.service.listUsers();
      return res.json(users);
    } catch (err) {
      return next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const user = await this.service.getUser(id);
      return res.json(user);
    } catch (err) {
      return next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createSchema.parse(req.body);
      const user = await this.service.createUser(body);
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = updateSchema.parse(req.body);
      const user = await this.service.updateUser(id, body);
      return res.json(user);
    } catch (err) {
      return next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = changePasswordSchema.parse(req.body);

      await this.service.changePassword(id, body);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  };

  updateAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);

      if (!req.file) {
        throw new AppError("Avatar image is required", 400, "AVATAR_REQUIRED");
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await this.service.updateAvatar(id, avatarUrl);

      return res.json(user);
    } catch (err) {
      return next(err);
    }
  };

  removeAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const user = await this.service.removeAvatar(id);

      return res.json(user);
    } catch (err) {
      return next(err);
    }
  };

  previewActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = activitySchema.parse(req.body);
      const result = await this.service.previewActivity(id, body);
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  };

  completeActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = activitySchema.parse(req.body);
      const result = await this.service.completeActivity(id, body);
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const body = deleteAccountSchema.parse(req.body);

      await this.service.deleteUser(id, body);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  };
}