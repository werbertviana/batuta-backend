import { UsersRepository } from "./users.repository";

import { UsersCrudService } from "./users-crud.service";
import { UsersTutorialService } from "./users-tutorial.service";
import { UsersPasswordService } from "./users-password.service";
import { UsersActivityService } from "./users-activity.service";
import { UsersAvatarService } from "./users-avatar.service";
import { UsersDeleteService } from "./users-delete.service";

import type {
  CreateUserInput,
  UpdateUserInput,
  UserResponse,
  CompleteActivityInput,
  CompleteActivityResponse,
  PreviewActivityResponse,
  SetPasswordInput,
  ChangePasswordInput,
  DeleteUserInput,
} from "./users.types";

export class UsersService {
  constructor(
    private repo = new UsersRepository(),
    private crudService = new UsersCrudService(repo),
    private tutorialService = new UsersTutorialService(repo),
    private passwordService = new UsersPasswordService(repo),
    private activityService = new UsersActivityService(repo),
    private avatarService = new UsersAvatarService(repo),
    private deleteService = new UsersDeleteService(repo, passwordService),
  ) {}

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    return this.crudService.createUser(input);
  }

  async listUsers(): Promise<UserResponse[]> {
    return this.crudService.listUsers();
  }

  async getUser(id: number): Promise<UserResponse> {
    return this.crudService.getUser(id);
  }

  async updateUser(
    id: number,
    input: UpdateUserInput,
  ): Promise<UserResponse> {
    return this.crudService.updateUser(id, input);
  }

  async markTutorialAsSeen(
    id: number,
    tutorialKey: string,
  ): Promise<UserResponse> {
    return this.tutorialService.markTutorialAsSeen(id, tutorialKey);
  }

  async setPassword(id: number, input: SetPasswordInput): Promise<void> {
    return this.passwordService.setPassword(id, input);
  }

  async changePassword(id: number, input: ChangePasswordInput): Promise<void> {
    return this.passwordService.changePassword(id, input);
  }

  async previewActivity(
    id: number,
    input: CompleteActivityInput,
  ): Promise<PreviewActivityResponse> {
    return this.activityService.previewActivity(id, input);
  }

  async completeActivity(
    id: number,
    input: CompleteActivityInput,
  ): Promise<CompleteActivityResponse> {
    return this.activityService.completeActivity(id, input);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<UserResponse> {
    return this.avatarService.updateAvatar(id, avatarUrl);
  }

  async removeAvatar(id: number): Promise<UserResponse> {
    return this.avatarService.removeAvatar(id);
  }

  async deleteUser(id: number, input: DeleteUserInput): Promise<void> {
    return this.deleteService.deleteUser(id, input);
  }
}