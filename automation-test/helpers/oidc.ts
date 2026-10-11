import crypto from "node:crypto";
import { expect, request } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";
import { createAccount, findUserByEmail } from "./accounts";
import type { Account } from "./accounts";
import { BASE_URL, MONGO_DB_NAME, MONGO_URL, REDIS_URL } from "./env";

// OIDC helpers — registering throwaway OAuth clients, holding an IdP session
// (`sid` cookie) in an API context, PKCE, the token call and RS256 checks
// against the published JWKS with node:crypto only.
//
// Source of truth: server/src/modules/oauth/** — code TTL 60 s (GETDEL,
// single use), PKCE S256 for every client, exact-string redirect_uri match,
// errors before the redirect_uri is trusted come back as JSON, after it as a
// 302 to the client with ?error=….

/** The issuer is the origin the browser sees (server OIDC_ISSUER). */
export const ISSUER: string = BASE_URL.replace(/\/$/, "");

/** Prefix of every app this suite registers — `deleteOidcClients` keys on it. */
export const CLIENT_NAME_PREFIX = "e2e-oidc-";

/** Redirect URIs never reached: API tests read `Location`, e2e routes them. */
export const REDIRECT_URI = "https://rp.e2e.example.com/callback";
export const OTHER_REDIRECT_URI = "https://rp.e2e.example.com/other";
export const POST_LOGOUT_URI = "https://rp.e2e.example.com/signed-out";

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
  return crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function randomToken(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

// ── Client registration ───────────────────────────────────────────────────

export type ClientKind = "confidential" | "public";

export interface OidcClient {
  id: string;
  name: string;
  displayName: string;
  clientId: string;
  clientSecret: string | null;
  kind: ClientKind;
}

let seq = 0;

/**
 * Registers an OAuth client as admin. Confidential = `client_secret_basic`
 * (the server's default, a secret is returned once); public = `none`.
 */
export async function registerClient(
  adminApi: APIRequestContext,
  opts: {
    kind: ClientKind;
    label: string;
    redirectUris?: string[];
    postLogoutRedirectUris?: string[];
    requiredRoles?: string[];
  }
): Promise<OidcClient> {
  seq += 1;
  const stamp = `${Date.now().toString(36)}${seq}`;
  const name = `${CLIENT_NAME_PREFIX}${opts.label}-${stamp}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 64);
  const displayName = `E2E OIDC ${opts.label} ${stamp}`.slice(0, 80);

  const cats = await adminApi.get("/api/v1/apps/categories");
  expect(cats.ok(), `categories → ${cats.status()}`).toBeTruthy();
  const categoryId = ((await cats.json()) as { data: { _id: string }[] })
    .data[0]._id;

  const res = await adminApi.post("/api/v1/admin/apps", {
    data: {
      name,
      displayName,
      description: "Throwaway OAuth client registered by the OIDC regression suite",
      homeUrl: "https://rp.e2e.example.com/",
      categoryIds: [categoryId],
      status: "active",
      requiredRoles: opts.requiredRoles ?? ["user", "admin"],
      redirectUris: opts.redirectUris ?? [REDIRECT_URI, OTHER_REDIRECT_URI],
      postLogoutRedirectUris: opts.postLogoutRedirectUris ?? [POST_LOGOUT_URI],
      tokenEndpointAuthMethod:
        opts.kind === "public" ? "none" : "client_secret_basic"
    }
  });
  expect(res.status(), `create app → ${await res.text()}`).toBe(201);
  const app = ((await res.json()) as { data: Record<string, unknown> }).data;
  return {
    id: app._id as string,
    name,
    displayName,
    clientId: app.clientId as string,
    clientSecret: (app.clientSecret as string | null) ?? null,
    kind: opts.kind
  };
}

export async function setClientStatus(
  adminApi: APIRequestContext,
  client: OidcClient,
  status: "active" | "inactive"
): Promise<void> {
  const res = await adminApi.patch(`/api/v1/admin/apps/${client.id}`, {
    data: { status }
  });
  expect(res.ok(), `patch app → ${res.status()}`).toBeTruthy();
}

/**
 * There is no DELETE for apps. Leaving them behind — even inactive — would
 * shift the category app counts and the admin app list other specs assert
 * on, so after deactivating them over the API the suite removes its own
 * `e2e-oidc-*` documents and the rows that point at them.
 */
export async function deleteOidcClients(clients: OidcClient[]): Promise<void> {
  if (clients.length === 0) return;
  const mongo = new MongoClient(MONGO_URL);
  try {
    await mongo.connect();
    const d = mongo.db(MONGO_DB_NAME);
    const apps = await d
      .collection("web_apps")
      .find({
        _id: { $in: clients.map((c) => new ObjectId(c.id)) },
        name: { $regex: `^${CLIENT_NAME_PREFIX}` }
      })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    const ids = apps.map((a) => a._id);
    if (ids.length === 0) return;
    await Promise.all(
      ["login_histories", "user_app_usages", "user_favorites", "entitlements"].map(
        (c) => d.collection(c).deleteMany({ webAppId: { $in: ids } })
      )
    );
    await d.collection("web_apps").deleteMany({ _id: { $in: ids } });
  } finally {
    await mongo.close().catch(() => undefined);
  }
}

// ── IdP session ───────────────────────────────────────────────────────────

/**
 * An API context that signed in with a password and therefore carries the
 * `sid` IdP-session cookie (plus refreshToken) — what a browser has after
 * logging in to Ducker ID. Also returns the first-party access token.
 */
export async function idpSession(
  email: string,
  password: string
): Promise<{ ctx: APIRequestContext; accessToken: string }> {
  const ctx = await guestContext();
  const res = await ctx.post("/api/v1/auth/login", { data: { email, password } });
  expect(res.ok(), `login ${email} → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { data: { accessToken: string } };
  const state = await ctx.storageState();
  expect(
    state.cookies.some((c) => c.name === "sid" && c.value),
    "login set no sid cookie"
  ).toBeTruthy();
  return { ctx, accessToken: body.data.accessToken };
}

/**
 * A cookie-less context. `storageState` is passed explicitly: inside a test,
 * `request.newContext()` otherwise inherits the test's storage state — i.e.
 * the seeded user's `sid` and refreshToken under the default role.
 */
export async function guestContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] }
  });
}

export interface SignedIn {
  account: Account;
  /** users._id — what the server puts in `sub`. */
  userId: string;
  ctx: APIRequestContext;
  accessToken: string;
  /** The `sid` cookie value (Redis key `idp-session:<sid>`). */
  sid: string;
}

/**
 * A throwaway account with a live IdP session. OAuth sign-ins write login
 * history and recent apps for the user, so the seeded accounts are never
 * used for an authorize flow.
 */
export async function signedInUser(tag = "oidc"): Promise<SignedIn> {
  const account = await createAccount({ tag });
  const { ctx, accessToken } = await idpSession(account.email, account.password);
  const user = await findUserByEmail(account.email);
  expect(user, "throwaway user row").toBeTruthy();
  const sid = (await ctx.storageState()).cookies.find((c) => c.name === "sid")!.value;
  return { account, userId: user!._id.toString(), ctx, accessToken, sid };
}

// ── Redis (code / session keys) ───────────────────────────────────────────

type Redis = ReturnType<typeof createClient>;
let redisClient: Redis | null = null;

async function redis(): Promise<Redis> {
  if (!REDIS_URL) throw new Error("REDIS_URL is not set (automation-test/.env)");
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", () => undefined);
    await redisClient.connect();
  }
  return redisClient;
}

export const codeKey = (code: string) => `oauth-code:${code}`;
export const pendingKey = (id: string) => `oauth-req:${id}`;
export const sessionKey = (sid: string) => `idp-session:${sid}`;

/** Remaining TTL in seconds (-2 = key gone). */
export async function keyTtl(key: string): Promise<number> {
  return (await redis()).ttl(key);
}

export async function keyExists(key: string): Promise<boolean> {
  return (await (await redis()).exists(key)) === 1;
}

/** Shortens a key's life to `ms` milliseconds — expires a code without waiting 60 s. */
export async function expireKeyIn(key: string, ms: number): Promise<void> {
  const ok = await (await redis()).pExpire(key, ms);
  expect(ok, `pexpire ${key}`).toBeTruthy();
}

// ── /oauth/authorize ──────────────────────────────────────────────────────

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

export interface AuthRequest {
  verifier: string;
  state: string;
  nonce: string;
  params: AuthorizeParams;
}

/** A valid request for `client` — override any field, `undefined` drops it. */
export function authRequest(
  client: OidcClient,
  overrides: Partial<Record<keyof AuthorizeParams, string | undefined>> = {},
  verifier = makeVerifier()
): AuthRequest {
  const state = randomToken();
  const nonce = randomToken();
  const params: AuthorizeParams = {
    client_id: client.clientId,
    redirect_uri: REDIRECT_URI,
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

export function authorizePath(params: AuthorizeParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, v);
  return `/oauth/authorize?${q.toString()}`;
}

export interface AuthorizeResult {
  res: APIResponse;
  status: number;
  /** Parsed `Location` for a 3xx, else null. */
  location: URL | null;
}

/** GET /oauth/authorize without following the redirect. */
export async function authorize(
  ctx: APIRequestContext,
  params: AuthorizeParams
): Promise<AuthorizeResult> {
  const res = await ctx.get(authorizePath(params), { maxRedirects: 0 });
  const raw = res.headers()["location"];
  return {
    res,
    status: res.status(),
    location: raw ? new URL(raw, BASE_URL) : null
  };
}

/** Runs authorize on a context that holds a session and returns the code. */
export async function obtainCode(
  ctx: APIRequestContext,
  client: OidcClient,
  overrides: Partial<Record<keyof AuthorizeParams, string | undefined>> = {},
  verifier?: string
): Promise<AuthRequest & { code: string }> {
  const req = authRequest(client, overrides, verifier);
  const { status, location } = await authorize(ctx, req.params);
  expect(status, "authorize should redirect").toBe(302);
  const code = location?.searchParams.get("code");
  expect(code, `no code in ${location?.toString()}`).toBeTruthy();
  return { ...req, code: code as string };
}

// ── /oauth/token ──────────────────────────────────────────────────────────

export type ClientAuth = "basic" | "post" | "none";

export async function exchangeCode(
  ctx: APIRequestContext,
  opts: {
    client: OidcClient;
    code: string;
    verifier: string;
    auth?: ClientAuth;
    secret?: string | null;
    redirectUri?: string;
    extra?: Record<string, string>;
  }
): Promise<APIResponse> {
  const auth = opts.auth ?? (opts.client.kind === "public" ? "none" : "basic");
  const secret = opts.secret === undefined ? opts.client.clientSecret : opts.secret;
  const form: Record<string, string> = {
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirectUri ?? REDIRECT_URI,
    client_id: opts.client.clientId,
    ...opts.extra
  };
  const headers: Record<string, string> = {};
  if (auth === "basic") {
    const pair = `${encodeURIComponent(opts.client.clientId)}:${encodeURIComponent(
      secret ?? ""
    )}`;
    headers.Authorization = `Basic ${Buffer.from(pair).toString("base64")}`;
  } else if (auth === "post" && secret != null) {
    form.client_secret = secret;
  }
  return ctx.post("/oauth/token", { form, headers });
}

export interface TokenSet {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ── JWT / JWKS ────────────────────────────────────────────────────────────

export interface Jwk {
  kty: string;
  n: string;
  e: string;
  kid: string;
  use?: string;
  alg?: string;
}

export function decodeJwt(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
} {
  const [h, p] = token.split(".");
  return {
    header: JSON.parse(Buffer.from(h, "base64url").toString("utf8")),
    payload: JSON.parse(Buffer.from(p, "base64url").toString("utf8"))
  };
}

/** RS256 signature check of a compact JWS against one JWK. */
export function verifyRs256(token: string, jwk: Jwk): boolean {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;
  const key = crypto.createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: "jwk"
  });
  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${h}.${p}`),
    key,
    Buffer.from(s, "base64url")
  );
}

export async function fetchJwks(ctx: APIRequestContext): Promise<Jwk[]> {
  const res = await ctx.get("/.well-known/jwks.json");
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { keys: Jwk[] }).keys;
}

/** Flips one character of the signature so the JWS no longer verifies. */
export function tamperSignature(token: string): string {
  const [h, p, s] = token.split(".");
  const flipped = (s[5] === "A" ? "B" : "A") + "";
  return `${h}.${p}.${s.slice(0, 5)}${flipped}${s.slice(6)}`;
}

// ── Suite lifecycle ───────────────────────────────────────────────────────

/** Deactivates (over the API) then deletes the given clients; disposes `admin`. */
export async function retireClients(
  admin: APIRequestContext | undefined,
  clients: (OidcClient | undefined)[]
): Promise<void> {
  const live = clients.filter((c): c is OidcClient => Boolean(c));
  if (admin) {
    for (const c of live) {
      await admin
        .patch(`/api/v1/admin/apps/${c.id}`, { data: { status: "inactive" } })
        .catch(() => undefined);
    }
  }
  await deleteOidcClients(live);
  await admin?.dispose();
}

/** Reads one query parameter of a redirect, failing clearly when absent. */
export function param(location: URL | null, name: string): string | null {
  return location ? location.searchParams.get(name) : null;
}

/** True when `location` points at `uri` (scheme + host + path, query ignored). */
export function isAt(location: URL | null, uri: string): boolean {
  if (!location) return false;
  const target = new URL(uri);
  return location.origin === target.origin && location.pathname === target.pathname;
}

/** Ids of the pending authorize requests (`oauth-req:*`) stored for a client. */
export async function findPendingKeysFor(clientId: string): Promise<string[]> {
  const r = await redis();
  const out: string[] = [];
  for await (const key of r.scanIterator({ MATCH: "oauth-req:*", COUNT: 500 })) {
    const raw = await r.get(key);
    if (raw && (JSON.parse(raw) as { clientId?: string }).clientId === clientId) {
      out.push(key);
    }
  }
  return out.sort();
}
