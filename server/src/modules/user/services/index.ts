// types
import type { PageMeta } from "@/common/pagination";
import type {
  CreateUserData,
  UpdateProfileData,
  UserDocument,
  UserRecord,
  UserWithAuth
} from "@/modules/user/types";
import type { ClientSession } from "mongoose";
import type {
  AdminResetPasswordResultDto,
  AdminUserDto,
  MyProfileDto,
  PublicProfileDto,
  SetUserActiveResultDto
} from "../dtos";
import type { AdminUsersQueryDto } from "../dtos/requests";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { UserRepository } from "../repository/user.repository";
// others
import { adminResetPassword } from "./admin-reset-password";
import { createProfile } from "./create-profile";
import { emailExists } from "./email-exists";
import { findByAuthId } from "./find-by-auth-id";
import { findByEmailWithAuth } from "./find-by-email-with-auth";
import { getAdminUsers } from "./get-admin-users";
import { getMyProfile } from "./get-my-profile";
import { getPublicProfile } from "./get-public-profile";
import { setUserActive } from "./set-user-active";
import { updateMyProfile } from "./update-my-profile";

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthenticationService,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  getMyProfile(): Promise<MyProfileDto> {
    return getMyProfile(this.userRepo);
  }

  updateMyProfile(data: Partial<UpdateProfileData>): Promise<MyProfileDto> {
    return updateMyProfile(this.userRepo, data);
  }

  getPublicProfile(userId: string): Promise<PublicProfileDto> {
    return getPublicProfile(this.userRepo, userId);
  }

  createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord> {
    return createProfile(this.userRepo, data, session);
  }

  emailExists(email: string): Promise<boolean> {
    return emailExists(this.userRepo, email);
  }

  findByEmailWithAuth(email: string): Promise<UserWithAuth | null> {
    return findByEmailWithAuth(this.userRepo, email);
  }

  findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null> {
    return findByAuthId(this.userRepo, authId);
  }

  getAdminUsers(
    query: AdminUsersQueryDto
  ): Promise<{ items: AdminUserDto[]; meta: PageMeta }> {
    return getAdminUsers(this.userRepo, query);
  }

  setUserActive(
    id: string,
    isActive: boolean
  ): Promise<SetUserActiveResultDto> {
    return setUserActive(
      { userRepo: this.userRepo, authService: this.authService },
      id,
      isActive
    );
  }

  adminResetPassword(id: string): Promise<AdminResetPasswordResultDto> {
    return adminResetPassword(
      {
        userRepo: this.userRepo,
        authService: this.authService,
        emailDispatcher: this.emailDispatcher,
        notificationDispatcher: this.notificationDispatcher
      },
      id
    );
  }
}
