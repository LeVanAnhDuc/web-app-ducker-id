// types
import type { Request } from "express";

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordRequest = Request<
  Record<string, never>,
  unknown,
  ChangePasswordBody
>;
