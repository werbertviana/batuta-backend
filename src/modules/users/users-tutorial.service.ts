import { AppError, NotFoundError } from "../../shared/errors";
import { UsersRepository } from "./users.repository";
import { VALID_TUTORIAL_KEYS, type TutorialKey } from "./users.constants";
import { toUserResponse } from "./users.mapper";
import type { UserResponse } from "./users.types";

function isValidTutorialKey(value: string): value is TutorialKey {
  return VALID_TUTORIAL_KEYS.includes(value as TutorialKey);
}

export class UsersTutorialService {
  constructor(private repo = new UsersRepository()) {}

  async markTutorialAsSeen(
    id: number,
    tutorialKey: string,
  ): Promise<UserResponse> {
    if (!isValidTutorialKey(tutorialKey)) {
      throw new AppError("Tutorial inválido", 400, "INVALID_TUTORIAL_KEY");
    }

    const exists = await this.repo.findById(id);

    if (!exists) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    const user = await this.repo.markTutorialAsSeen(id, tutorialKey);

    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    return toUserResponse(user);
  }
}