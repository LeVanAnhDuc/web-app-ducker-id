import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// PATCH /auth/change-password — server/src/modules/change-password, behind
// authGuard and the change-password limiter (5 / 15 min per IP + authId,
// counted before validation). Reached as api.as(session).changePassword; the
// top-level api.changePassword sends no Bearer, for the "not signed in" case.
export function createChangePasswordClient(base: BaseClient) {
  return {
    /** The body as given — leave a field out or send a wrong type to prove the schema. */
    submit(body: Record<string, unknown>): Promise<APIResponse> {
      return base.call("patch", "/auth/change-password", { data: body });
    }
  };
}

export type ChangePasswordClient = ReturnType<
  typeof createChangePasswordClient
>;
