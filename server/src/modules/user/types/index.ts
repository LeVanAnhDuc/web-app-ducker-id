// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type {
  GENDERS,
  ADMIN_USER_STATUS_FILTERS,
  ADMIN_USERS_SORT_BY
} from "@/modules/user/constants";
import type { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// common
import type { SortOrder } from "@/common/sort";

export type Gender = (typeof GENDERS)[keyof typeof GENDERS];

export interface UserDocument {
  _id: Schema.Types.ObjectId;
  authId: Schema.Types.ObjectId;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  address?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  authId: Schema.Types.ObjectId;
  email: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
}

export interface UserRecord {
  _id: Schema.Types.ObjectId;
  email: string;
  fullName: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
}

export interface PublicUserRecord {
  _id: Schema.Types.ObjectId;
  fullName: string;
  avatar?: string;
  gender?: Gender;
}

export interface UserWithAuth {
  user: UserDocument;
  auth: AuthenticationDocument;
}

export interface UserAddressDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  street: string;
  city: string;
  province: string;
  country: string;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GetMyProfileRequest = Request;

export interface UpdateProfileRequest extends Omit<Request, "body"> {
  body: UpdateProfileData;
}

export interface GetPublicProfileRequest extends Omit<Request, "params"> {
  params: { id: string };
}

export type AdminUserRole =
  (typeof AUTHENTICATION_ROLES)[keyof typeof AUTHENTICATION_ROLES];

export type AdminUserStatusFilter =
  (typeof ADMIN_USER_STATUS_FILTERS)[keyof typeof ADMIN_USER_STATUS_FILTERS];

export type AdminUsersSortBy = (typeof ADMIN_USERS_SORT_BY)[number];

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatusFilter;
  sortBy?: AdminUsersSortBy;
  sortOrder?: SortOrder;
}

export interface AdminUsersFilter {
  search?: string;
  role?: AdminUserRole;
  isActive?: boolean;
}

export interface AdminUserListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserAggregateRow {
  _id: Schema.Types.ObjectId;
  fullName: string;
  email: string;
  avatar?: string | null;
  createdAt: Date;
  role: AdminUserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface GetAdminUsersRequest extends Omit<Request, "query"> {
  query: AdminUsersQuery;
}

export interface SetUserActiveResult {
  _id: string;
  isActive: boolean;
}

export interface LockUserRequest extends Omit<Request, "params"> {
  params: { id: string };
}

export interface AdminResetPasswordResult {
  _id: string;
  email: string;
}

export interface ResetPasswordRequest extends Omit<Request, "params"> {
  params: { id: string };
}
