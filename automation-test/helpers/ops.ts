import { request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "./env";

// Operator endpoints the Next client does NOT proxy — `/health/*`,
// `/api-docs*`, `/admin/queues` — are only reachable on the API origin
// itself. `E2E_API_URL` overrides the local default (server/.env PORT).

export const API_ORIGIN: string = API_URL;

/** A cookie-less request context against the API origin. */
export async function apiOriginContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_ORIGIN,
    storageState: { cookies: [], origins: [] }
  });
}

/** The global error body (server/src/middlewares/filters/error.filter.ts). */
export interface ErrorEnvelope {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  errors?: { field: string; reason: string; message: string }[];
}
