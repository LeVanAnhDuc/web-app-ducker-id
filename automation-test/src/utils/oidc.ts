import crypto from "node:crypto";
import type { APIResponse } from "@playwright/test";
import { BASE_URL } from "@/config/urls";
import { OIDC_REDIRECT_URI } from "@/data/test-data";

// The OAuth 2.0 / OIDC protocol as a satellite app speaks it — pure functions
// and types, no I/O: PKCE, an authorize request, reading the redirect the
// server answers with. Backend state (registered clients, IdP sessions, Redis
// keys) lives in ./oidc-state.ts; the HTTP calls in api/oauth.client.ts.
//
// Source of truth: server/src/modules/oauth/** — PKCE S256 for every client,
// exact-string redirect_uri match, errors before the redirect_uri is trusted
// come back as JSON, after it as a 302 to the client with ?error=….

/** The issuer is the origin the browser sees (server OIDC_ISSUER). */
export const ISSUER: string = BASE_URL.replace(/\/$/, "");

// ── Registered client (what the admin API returned) ───────────────────────

export type ClientKind = "confidential" | "public";

export interface OidcClient {
  /** web_apps._id */
  id: string;
  name: string;
  displayName: string;
  clientId: string;
  /** Returned once at registration; null for a public client. */
  clientSecret: string | null;
  kind: ClientKind;
}

// ── PKCE ──────────────────────────────────────────────────────────────────

const UNRESERVED =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/** A code_verifier of exactly `length` unreserved characters (RFC 7636 §4.1). */
export function makeVerifier(length = 64): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => UNRESERVED[b % UNRESERVED.length]).join("");
}

/** BASE64URL(SHA256(verifier)) — the S256 challenge. */
export function challengeFor(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier, "ascii")
    .digest("base64url");
}

export function randomToken(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// ── /oauth/authorize request ──────────────────────────────────────────────

export interface AuthorizeParams {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  prompt?: string;
  auth_req?: string;
}

export type AuthorizeOverrides = Partial<
  Record<keyof AuthorizeParams, string | undefined>
>;

export interface AuthRequest {
  verifier: string;
  state: string;
  nonce: string;
  params: AuthorizeParams;
}

/** A valid request for `client` — override any field, `undefined` drops it. */
export function authRequest(
  client: Pick<OidcClient, "clientId">,
  overrides: AuthorizeOverrides = {},
  verifier = makeVerifier()
): AuthRequest {
  const state = randomToken();
  const nonce = randomToken();
  const params: AuthorizeParams = {
    client_id: client.clientId,
    redirect_uri: OIDC_REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challengeFor(verifier),
    code_challenge_method: "S256",
    ...overrides
  };
  return { verifier, state, nonce, params };
}

/** `/oauth/authorize?…` with every defined parameter (undefined ones left out). */
export function authorizePath(params: AuthorizeParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, v);
  const qs = q.toString();
  return qs ? `/oauth/authorize?${qs}` : "/oauth/authorize";
}

// ── Reading the answer ────────────────────────────────────────────────────

/** Parsed `Location` of a response (relative ones against the client origin), else null. */
export function locationOf(res: APIResponse): URL | null {
  const raw = res.headers()["location"];
  return raw ? new URL(raw, BASE_URL) : null;
}

/** One query parameter of a redirect, or null when there is no redirect / parameter. */
export function param(location: URL | null, name: string): string | null {
  return location ? location.searchParams.get(name) : null;
}

/** True when `location` points at `uri` (scheme + host + path, query ignored). */
export function isAt(location: URL | null, uri: string): boolean {
  if (!location) return false;
  const target = new URL(uri);
  return (
    location.origin === target.origin && location.pathname === target.pathname
  );
}

// ── Token endpoint ────────────────────────────────────────────────────────

/** How the client authenticates at /oauth/token. */
export type ClientAuth = "basic" | "post" | "none";

/** RFC 6749 §5.1 body of a successful /oauth/token. */
export interface TokenSet {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Flat OAuth error body (RFC 6749 §5.2) — not the API's error envelope. */
export interface OAuthErrorBody {
  error: string;
  error_description?: string;
}

/** `Authorization: Basic base64(urlencode(id):urlencode(secret))` (RFC 6749 §2.3.1). */
export function basicAuth(clientId: string, secret: string): string {
  const pair = `${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`;
  return `Basic ${Buffer.from(pair).toString("base64")}`;
}
