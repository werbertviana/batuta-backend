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
}