// types
import type { PageMeta } from "@/common/pagination";
import type {
  AdminResetPasswordResult,
  AdminUsersQuery,
  CreateUserData,
  SetUserActiveResult,
  UpdateProfileData,
  UserDocument,
  UserRecord,
  UserWithAuth
} from "@/modules/user/types";
import type { ClientSession } from "mongoose";
import type { AdminUserDto, MyProfileDto, PublicProfileDto } from "../dtos";
import type { UserServiceDeps } from "./deps";
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
  constructor(private readonly deps: UserServiceDeps) {}

  getMyProfile(): Promise<MyProfileDto> {
    return getMyProfile(this.deps);
  }

  updateMyProfile(data: Partial<UpdateProfileData>): Promise<MyProfileDto> {
    return updateMyProfile(this.deps, data);
  }

  getPublicProfile(userId: string): Promise<PublicProfileDto> {
    return getPublicProfile(this.deps, userId);
  }

  createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord> {
    return createProfile(this.deps, data, session);
  }

  emailExists(email: string): Promise<boolean> {
    return emailExists(this.deps, email);
  }

  findByEmailWithAuth(email: string): Promise<UserWithAuth | null> {
    return findByEmailWithAuth(this.deps, email);
  }

  findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null> {
    return findByAuthId(this.deps, authId);
  }

  getAdminUsers(
    query: AdminUsersQuery
  ): Promise<{ items: AdminUserDto[]; meta: PageMeta }> {
    return getAdminUsers(this.deps, query);
  }

  setUserActive(id: string, isActive: boolean): Promise<SetUserActiveResult> {
    return setUserActive(this.deps, id, isActive);
  }

  adminResetPassword(id: string): Promise<AdminResetPasswordResult> {
    return adminResetPassword(this.deps, id);
  }
}
