import { Router } from "express";
import { AuthController } from "./auth.controller";

export const authRouter = Router();

const controller = new AuthController();

authRouter.post("/login", controller.login);
authRouter.post("/google", controller.googleLogin);
authRouter.post("/forgot-password", controller.forgotPassword);
authRouter.post("/reset-password", controller.resetPassword);