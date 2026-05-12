import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UsersController } from "./users.controller";

export const usersRouter = Router();
const controller = new UsersController();

const avatarsDir = path.resolve(process.cwd(), "uploads", "avatars");

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `user-${req.params.id}-${Date.now()}${ext}`;

    cb(null, filename);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("INVALID_AVATAR_TYPE"));
      return;
    }

    cb(null, true);
  },
});

usersRouter.get("/", controller.list);
usersRouter.post("/", controller.create);

usersRouter.post("/:id/preview-activity", controller.previewActivity);
usersRouter.post("/:id/complete-activity", controller.completeActivity);

usersRouter.patch(
  "/:id/avatar",
  avatarUpload.single("avatar"),
  controller.updateAvatar
);

usersRouter.delete("/:id/avatar", controller.removeAvatar);
usersRouter.patch("/:id/password", controller.changePassword);

usersRouter.get("/:id", controller.getById);
usersRouter.put("/:id", controller.update);
usersRouter.delete("/:id", controller.delete);