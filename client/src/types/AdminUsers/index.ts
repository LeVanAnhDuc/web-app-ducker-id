// types
import type { AuthenticationRole } from "@/types/User";
import type { SortOrder } from "@/types/List";
// constants
import type ADMIN_USER_STATUS from "@/constants/adminUserStatus";

export interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: AuthenticationRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export type AdminUserStatusFilter =
  (typeof ADMIN_USER_STATUS)[keyof typeof ADMIN_USER_STATUS];

export interface AdminUsersQueryParams {
  search?: string;
  role?: AuthenticationRole;
  status?: AdminUserStatusFilter;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "fullName" | "lastLoginAt";
  sortOrder?: SortOrder;
}

export type PaginatedAdminUsersResponse = Paginated<AdminUser>;

export interface SetAdminUserActiveResult {
  _id: string;
  isActive: boolean;
}

export interface ResetAdminUserPasswordResult {
  _id: string;
  email: string;
}
