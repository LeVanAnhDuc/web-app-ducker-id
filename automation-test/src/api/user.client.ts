import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /users/* — server/src/modules/user (user.routes.ts). GET / PATCH /users/me
// sit behind authGuard (PATCH also behind the updateProfileByIp limiter,
// 10 / 15 min, counted before the guard); reach them as api.as(session).users
// or createApiClient(userApi).users — the top-level api.users sends no Bearer,
// for the "not signed in" case. GET /users/:id is public.

/** MyProfileDto (server/src/modules/user/dtos/my-profile.dto.ts). */
export interface MyProfile {
  _id: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  avatar: string | null;
  createdAt: string;
}

/** PublicProfileDto (server/src/modules/user/dtos/public-profile.dto.ts). */
export interface PublicProfile {
  _id: string;
  fullName: string;
  avatar: string | null;
  gender: string | null;
}

export function createUserClient(base: BaseClient) {
  return {
    /** GET /users/me — the caller's own profile. */
    me(headers?: Record<string, string>): Promise<APIResponse> {
      return base.call("get", "/users/me", { headers });
    },
    /** PATCH /users/me — the body as given, to prove the schema with any shape. */
    updateMe(
      body: unknown,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("patch", "/users/me", { data: body, headers });
    },
    /** GET /users/:id — anyone's public profile; `id` is sent as given. */
    publicProfile(
      id: string,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return base.call("get", `/users/${encodeURIComponent(id)}`, { headers });
    }
  };
}

export type UserClient = ReturnType<typeof createUserClient>;
