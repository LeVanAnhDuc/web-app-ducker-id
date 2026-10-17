import type { APIResponse } from "@playwright/test";
import { OIDC_REDIRECT_URI } from "@/data/test-data";
import {
  authorizePath,
  basicAuth,
  type AuthorizeParams,
  type ClientAuth,
  type OidcClient
} from "@/utils/oidc";
import type { BaseClient } from "./base.client";

// The OpenID provider — server/src/modules/oauth (oauth.routes.ts).
//
// NOT under the API prefix: discovery must sit at the origin root, so the
// server mounts the router on `app` and client/next.config.ts rewrites
// `/oauth/*` and `/.well-known/*` to the API. Every method therefore calls
// `base.request` with the root path instead of `base.call` (which prepends
// API_PREFIX). Default headers of `as(session)` do not apply here — the OAuth
// endpoints never read the first-party Bearer; userinfo takes its token as an
// argument.
//
// Bodies are flat OAuth JSON (`{ error, error_description }` / RFC 6749 §5.1),
// never the API envelope. authorize / logout answer with redirects, which are
// never followed: the redirect URIs do not resolve, and the `Location` is
// what a test checks.

export interface ExchangeOptions {
  client: Pick<OidcClient, "clientId" | "clientSecret" | "kind">;
  code: string;
  verifier: string;
  /** Default: `none` for a public client, `basic` for a confidential one. */
  auth?: ClientAuth;
  /** Default: the client's own secret. `null` sends none. */
  secret?: string | null;
  /** Default: OIDC_REDIRECT_URI. */
  redirectUri?: string;
  /** Extra / overriding form fields. */
  extra?: Record<string, string>;
}

export function createOAuthClient(base: BaseClient) {
  const { request } = base;
  return {
    /** GET /.well-known/openid-configuration. */
    discovery(headers?: Record<string, string>): Promise<APIResponse> {
      return request.get("/.well-known/openid-configuration", {
        headers,
        maxRedirects: 0
      });
    },

    /** GET /.well-known/jwks.json (or the path discovery's `jwks_uri` names). */
    jwks(
      path = "/.well-known/jwks.json",
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return request.get(path, { headers, maxRedirects: 0 });
    },

    /** GET /oauth/authorize without following the redirect. */
    authorize(
      params: AuthorizeParams,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return request.get(authorizePath(params), { headers, maxRedirects: 0 });
    },

    /** POST /oauth/token, form-encoded, exactly as given. */
    token(
      form: Record<string, string>,
      headers?: Record<string, string>
    ): Promise<APIResponse> {
      return request.post("/oauth/token", { form, headers });
    },

    /**
     * POST /oauth/token for an authorization code, authenticating the client
     * the way `auth` says: `basic` (Authorization header), `post`
     * (client_secret in the body) or `none` (public client).
     */
    exchangeCode(opts: ExchangeOptions): Promise<APIResponse> {
      const auth =
        opts.auth ?? (opts.client.kind === "public" ? "none" : "basic");
      const secret =
        opts.secret === undefined ? opts.client.clientSecret : opts.secret;
      const form: Record<string, string> = {
        grant_type: "authorization_code",
        code: opts.code,
        code_verifier: opts.verifier,
        redirect_uri: opts.redirectUri ?? OIDC_REDIRECT_URI,
        client_id: opts.client.clientId,
        ...opts.extra
      };
      const headers: Record<string, string> = {};
      if (auth === "basic") {
        headers.Authorization = basicAuth(opts.client.clientId, secret ?? "");
      } else if (auth === "post" && secret != null) {
        form.client_secret = secret;
      }
      return request.post("/oauth/token", { form, headers });
    },

    /** GET /oauth/userinfo with `Authorization: <authorization>` (none when omitted). */
    userinfo(authorization?: string): Promise<APIResponse> {
      return request.get("/oauth/userinfo", {
        headers: authorization ? { Authorization: authorization } : {}
      });
    },

    /** GET /oauth/logout (RP-initiated) without following the redirect. */
    logout(query: Record<string, string> = {}): Promise<APIResponse> {
      const qs = new URLSearchParams(query).toString();
      return request.get(`/oauth/logout${qs ? `?${qs}` : ""}`, {
        maxRedirects: 0
      });
    }
  };
}

export type OAuthClient = ReturnType<typeof createOAuthClient>;
