// types
import type {
  AdminUserAggregateRow,
  AdminUserRole
} from "@/modules/user/types";

export interface AdminUserDto {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: AdminUserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const toAdminUserDto = (row: AdminUserAggregateRow): AdminUserDto => ({
  _id: row._id.toString(),
  fullName: row.fullName,
  email: row.email,
  avatar: row.avatar ?? null,
  role: row.role,
  isActive: row.isActive,
  lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  createdAt: row.createdAt.toISOString()
});
