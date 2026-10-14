import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /users/me/favorites/* — server/src/modules/favorite. Every endpoint is
// behind authGuard: use the client on a context that carries a Bearer
// (`createApiClient(userApi).favorites`, or api.as(session)); bare, the same
// calls prove the guard.

export function createFavoriteClient(base: BaseClient) {
  return {
    /** GET /users/me/favorites — the caller's starred apps still visible to them. */
    list(params: Record<string, string | number> = {}): Promise<APIResponse> {
      return base.call("get", "/users/me/favorites", { params });
    },
    /** POST /users/me/favorites/:appId — star an app. */
    add(appId: string): Promise<APIResponse> {
      return base.call("post", `/users/me/favorites/${appId}`);
    },
    /** DELETE /users/me/favorites/:appId — unstar an app. */
    remove(appId: string): Promise<APIResponse> {
      return base.call("delete", `/users/me/favorites/${appId}`);
    }
  };
}

export type FavoriteClient = ReturnType<typeof createFavoriteClient>;
