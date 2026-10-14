import {
  request as playwrightRequest,
  type APIRequestContext,
  type APIResponse
} from "@playwright/test";
import { API_PREFIX, BASE_URL } from "@/config/urls";

// Every call to the Ducker ID API goes through the client's origin, the way the
// browser's axios instance does: `${BASE_URL}${API_PREFIX}/…`, rewritten by
// next.config.ts to the Express server. Both values come from the client
// (NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_API_PREFIX) — see config/urls.ts.

export const EMPTY_STATE = { cookies: [], origins: [] };

/** Logged-in identity as the API sees it: the Bearer access token. */
export interface Session {
  accessToken: string;
}

export const bearerHeaders = (session: Session) => ({
  Authorization: `Bearer ${session.accessToken}`
});

type Method = "get" | "post" | "patch" | "put" | "delete";

export interface CallOptions {
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export interface BaseClient {
  request: APIRequestContext;
  /** `path` is relative to the API prefix: call("post", "/auth/login", …). */
  call(
    method: Method,
    path: string,
    options?: CallOptions
  ): Promise<APIResponse>;
}

export function createBaseClient(
  request: APIRequestContext,
  defaults: { headers?: Record<string, string> } = {}
): BaseClient {
  return {
    request,
    call(method, path, options = {}) {
      return request[method](`${API_PREFIX}${path}`, {
        data: options.data,
        params: options.params,
        headers: { ...defaults.headers, ...options.headers }
      });
    }
  };
}

/** A request context with no cookies, on the client origin. */
export function newContext(
  extraHTTPHeaders?: Record<string, string>
): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    storageState: EMPTY_STATE,
    extraHTTPHeaders
  });
}
