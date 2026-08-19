// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { UserDocument, UserWithAuth } from "@/modules/user/types";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";

type AuthOverrides = Partial<AuthenticationDocument>;
type UserOverrides = Partial<UserDocument>;

export function buildAuth(
  overrides: AuthOverrides = {}
): AuthenticationDocument {
  return {
    _id: "auth-id-123" as unknown as AuthenticationDocument["_id"],
    password: "hashed-password",
    verifiedEmail: true,
    isActive: true,
    roles: AUTHENTICATION_ROLES.USER,
    tempPasswordHash: null,
    tempPasswordExpAt: null,
    tempPasswordUsed: false,
    mustChangePassword: false,
    passwordChangedAt: null,
    tokenVersion: 0,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides
  };
}

export function buildUser(overrides: UserOverrides = {}): UserDocument {
  return {
    _id: "user-id-456" as unknown as UserDocument["_id"],
    authId: "auth-id-123" as unknown as UserDocument["authId"],
    email: "user@example.com",
    fullName: "Test User",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides
  };
}

export function buildUserWithAuth(
  overrides: { auth?: AuthOverrides; user?: UserOverrides } = {}
): UserWithAuth {
  return {
    user: buildUser(overrides.user),
    auth: buildAuth(overrides.auth)
  };
}
