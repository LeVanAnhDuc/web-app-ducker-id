// types
import type {
  UpdateProfileRequest,
  GetPublicProfileRequest,
  GetAdminUsersRequest,
  LockUserRequest,
  ResetPasswordRequest
} from "@/modules/user/types";
import type { UserService } from "./services";

export class UserController {
  constructor(private readonly service: UserService) {}

  getMyProfile = async () => this.service.getMyProfile();

  updateMyProfile = async (req: UpdateProfileRequest) =>
    this.service.updateMyProfile(req.body);

  getPublicProfile = async (req: GetPublicProfileRequest) =>
    this.service.getPublicProfile(req.params.id);

  getAdminUsers = async (req: GetAdminUsersRequest) =>
    this.service.getAdminUsers(req.query);

  lockUser = async (req: LockUserRequest) =>
    this.service.setUserActive(req.params.id, false);

  unlockUser = async (req: LockUserRequest) =>
    this.service.setUserActive(req.params.id, true);

  resetUserPassword = async (req: ResetPasswordRequest) =>
    this.service.adminResetPassword(req.params.id);
}
