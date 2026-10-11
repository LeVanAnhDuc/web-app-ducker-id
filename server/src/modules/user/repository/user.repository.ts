// types
import type {
  UserDocument,
  CreateUserData,
  UserRecord,
  UpdateProfileData,
  PublicUserRecord,
  UserWithAuth,
  AdminUserAggregateRow,
  AdminUsersFilter,
  UserRole
} from "@/modules/user/types";
import type { PaginationOptions } from "@/types/common";
import type { ClientSession } from "mongoose";

export interface UserRepository {
  createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord>;
  findById(userId: string): Promise<UserDocument | null>;
  findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null>;
  updateById(
    userId: string,
    data: Partial<UpdateProfileData>
  ): Promise<UserDocument | null>;
  findPublicById(userId: string): Promise<PublicUserRecord | null>;
  emailExists(email: string): Promise<boolean>;
  findByEmailWithAuth(email: string): Promise<UserWithAuth | null>;
  findAdminUsers(
    filter: AdminUsersFilter,
    options: PaginationOptions
  ): Promise<{ data: AdminUserAggregateRow[]; total: number }>;
  findAuthIdById(
    userId: string
  ): Promise<{ authId: string; email: string } | null>;
  /** The role of each user found; ids with no user are simply absent. */
  findRolesByIds(userIds: string[]): Promise<UserRole[]>;
}
