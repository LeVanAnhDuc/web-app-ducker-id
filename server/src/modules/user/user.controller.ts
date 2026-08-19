// types
import type {
  GetMyProfileRequest,
  UpdateProfileRequest,
  GetPublicProfileRequest,
  GetAdminUsersRequest,
  LockUserRequest,
  ResetPasswordRequest
} from "@/modules/user/types";
import type { Response } from "express";
import type { UserService } from "./user.service";
// common
import { OkSuccess } from "@/common/responses";

export class UserController {
  constructor(private readonly service: UserService) {}

  getMyProfile = async (
    req: GetMyProfileRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getMyProfile();
    new OkSuccess({ data, message: "user:success.getProfile" }).send(req, res);
  };

  updateMyProfile = async (
    req: UpdateProfileRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.updateMyProfile(req.body);
    new OkSuccess({ data, message: "user:success.updateProfile" }).send(
      req,
      res
    );
  };

  getPublicProfile = async (
    req: GetPublicProfileRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getPublicProfile(req.params.id);
    new OkSuccess({ data, message: "user:success.getPublicProfile" }).send(
      req,
      res
    );
  };

  getAdminUsers = async (
    req: GetAdminUsersRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getAdminUsers(req.query);
    new OkSuccess({ data, message: "user:success.getAdminUsers" }).send(
      req,
      res
    );
  };

  lockUser = async (req: LockUserRequest, res: Response): Promise<void> => {
    const data = await this.service.setUserActive(req.params.id, false);
    new OkSuccess({ data, message: "user:success.lockUser" }).send(req, res);
  };

  unlockUser = async (req: LockUserRequest, res: Response): Promise<void> => {
    const data = await this.service.setUserActive(req.params.id, true);
    new OkSuccess({ data, message: "user:success.unlockUser" }).send(req, res);
  };

  resetUserPassword = async (
    req: ResetPasswordRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.adminResetPassword(req.params.id);
    new OkSuccess({ data, message: "user:success.resetPassword" }).send(
      req,
      res
    );
  };
}
