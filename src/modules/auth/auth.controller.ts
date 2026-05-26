import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Token do Google é obrigatório"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um email válido"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: z.string().min(4, "Nova senha deve ter no mínimo 4 caracteres"),
});

export class AuthController {
  constructor(private service = new AuthService()) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await this.service.login(body.email, body.password);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = googleLoginSchema.parse(req.body);
      const user = await this.service.loginWithGoogle(body.idToken);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const result = await this.service.forgotPassword(body.email);

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = resetPasswordSchema.parse(req.body);

      await this.service.resetPassword({
        token: body.token,
        newPassword: body.newPassword,
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  };
}