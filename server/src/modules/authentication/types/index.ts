// types
import type { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import type { Schema } from "mongoose";

export type AuthenticationRole =
  (typeof AUTHENTICATION_ROLES)[keyof typeof AUTHENTICATION_ROLES];

export interface AuthenticationDocument {
  _id: Schema.Types.ObjectId;
  password: string;
  verifiedEmail: boolean;
  roles: AuthenticationRole;
  isActive: boolean;
  tempPasswordHash: string | null;
  tempPasswordExpAt: Date | null;
  tempPasswordUsed: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAuthenticationData {
  hashedPassword: string;
}

export interface AuthenticationRecord {
  _id: Schema.Types.ObjectId;
  roles: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}
