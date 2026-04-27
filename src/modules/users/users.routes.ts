import { Router } from "express";
import { UsersController } from "./users.controller";

export const usersRouter = Router();
const controller = new UsersController();

usersRouter.get("/", controller.list);
usersRouter.get("/:id", controller.getById);
usersRouter.post("/", controller.create);
usersRouter.put("/:id", controller.update);
usersRouter.delete("/:id", controller.delete);

usersRouter.post("/:id/preview-activity", controller.previewActivity);
usersRouter.post("/:id/complete-activity", controller.completeActivity);