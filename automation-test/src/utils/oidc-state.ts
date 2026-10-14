import { expect } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { createApiClient, type ApiClient } from "@/api";
import type { AdminAppCreated } from "@/api/admin-apps.client";
import { newContext } from "@/api/base.client";
import type { CatalogCategory } from "@/api/category.client";
import { dataOf, sessionOf } from "@/api/response";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import {
  OIDC_CLIENT_PREFIX,
  OIDC_OTHER_REDIRECT_URI,
  OIDC_POST_LOGOUT_URI,
  OIDC_REDIRECT_URI
} from "@/data/test-data";
import { createAccount, findUserByEmail, type Account } from "./accounts";
import {
  authRequest,
  locationOf,
  type AuthorizeOverrides,
  type AuthorizeParams,
  type AuthRequest,
  type ClientKind,
  type OidcClient
} from "./oidc";
import { findKeys, getValue } from "./redis";

// Backend state of the OIDC module, shared with the modules that need a real
// satellite sign-in (LOGINHISTORY, RECENTLYUSED, FAVORITES, APPS via
// utils/catalog.ts): throwaway OAuth clients registered over the admin API
// and removed from MongoDB, IdP sessions (`sid` cookie) on API contexts, and
// the Redis keys the provider writes. Server facts (server/src/modules/oauth,
// modules/session): code `oauth-code:<code>` TTL 60 s read with GETDEL;
// pending request `oauth-req:<id>` TTL 600 s; session `idp-session:<sid>`.

// ── Client registration ───────────────────────────────────────────────────

let seq = 0;

/**
 * Registers an OAuth client as admin (`adminApi` carries an admin Bearer).
 * Confidential = `client_secret_basic` (the server's default, a secret is
 * returned once); public = `none`. Named `e2e-oidc-*` so deleteOidcClients
 * can remove it.
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
  const name = `${OIDC_CLIENT_PREFIX}${opts.label}-${stamp}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 64);
  const displayName = `E2E OIDC ${opts.label} ${stamp}`.slice(0, 80);
  const api = createApiClient(adminApi);

  const cats = await api.categories.listPublic();
  expect(cats.ok(), `categories → ${cats.status()}`).toBeTruthy();
  const categoryId = (await dataOf<CatalogCategory[]>(cats))[0]._id;

  const res = await api.adminApps.create({
    name,
    displayName,
    description:
      "Throwaway OAuth client registered by the OIDC regression suite",
    homeUrl: "https://rp.e2e.example.com/",
    categoryIds: [categoryId],
    status: "active",
    requiredRoles: opts.requiredRoles ?? ["user", "admin"],
    redirectUris: opts.redirectUris ?? [
      OIDC_REDIRECT_URI,
      OIDC_OTHER_REDIRECT_URI
    ],
    postLogoutRedirectUris: opts.postLogoutRedirectUris ?? [
      OIDC_POST_LOGOUT_URI
    ],
    tokenEndpointAuthMethod:
      opts.kind === "public" ? "none" : "client_secret_basic"
  });
  expect(res.status(), `create app → ${await res.text()}`).toBe(201);
  const app = await dataOf<AdminAppCreated>(res);
  return {
    id: app._id,
    name,
    displayName,
    clientId: app.clientId,
    clientSecret: app.clientSecret ?? null,
    kind: opts.kind
  };
}

export async function setClientStatus(
  adminApi: APIRequestContext,
  client: Pick<OidcClient, "id">,
  status: "active" | "inactive"
): Promise<void> {
  const res = await createApiClient(adminApi).adminApps.update(client.id, {
    status
  });
  expect(res.ok(), `patch app → ${res.status()}`).toBeTruthy();
}

/**
 * There is no DELETE for apps. Leaving them behind — even inactive — would
 * shift the category app counts and the admin app list other specs assert
 * on, so the suite removes its own `e2e-oidc-*` documents and the rows that
 * point at them straight from MongoDB.
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
        name: { $regex: `^${OIDC_CLIENT_PREFIX}` }
      })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    const ids = apps.map((a) => a._id);
    if (ids.length === 0) return;
    await Promise.all(
      [
        "login_histories",
        "user_app_usages",
        "user_favorites",
        "entitlements"
      ].map((c) => d.collection(c).deleteMany({ webAppId: { $in: ids } }))
    );
    await d.collection("web_apps").deleteMany({ _id: { $in: ids } });
  } finally {
    await mongo.close().catch(() => undefined);
  }
}

/** Deactivates (over the API) then deletes the given clients; disposes `admin`. */
export async function retireClients(
  admin: APIRequestContext | undefined,
  clients: (OidcClient | undefined)[]
): Promise<void> {
  const live = clients.filter((c): c is OidcClient => Boolean(c));
  if (admin) {
    const apps = createApiClient(admin).adminApps;
    for (const c of live) {
      await apps.update(c.id, { status: "inactive" }).catch(() => undefined);
    }
  }
  await deleteOidcClients(live);
  await admin?.dispose();
}

// ── IdP session ───────────────────────────────────────────────────────────

/**
 * An API context (own cookie jar) that signed in with a password and
 * therefore carries the `sid` IdP-session cookie (plus refreshToken) — what a
 * browser has after logging in to Ducker ID. Also returns the first-party
 * access token. The caller disposes `ctx`.
 */
export async function idpSession(
  email: string,
  password: string
): Promise<{ ctx: APIRequestContext; accessToken: string }> {
  const ctx = await newContext();
  const { accessToken } = await sessionOf(
    await createApiClient(ctx).auth.login(email, password)
  );
  const state = await ctx.storageState();
  expect(
    state.cookies.some((c) => c.name === "sid" && c.value),
    "login set no sid cookie"
  ).toBeTruthy();
  return { ctx, accessToken };
}

export interface SignedIn {
  account: Account;
  /** users._id — what the server puts in `sub`. */
  userId: string;
  ctx: APIRequestContext;
  /** REST client on `ctx` (its cookie jar carries the session). */
  api: ApiClient;
  /** First-party access token from the password login. */
  accessToken: string;
  /** The `sid` cookie value (Redis key `idp-session:<sid>`). */
  sid: string;
}

/**
 * A throwaway account with a live IdP session. OAuth sign-ins write login
 * history and recent apps for the user, so the seeded accounts are never
 * used for an authorize flow. The caller disposes `ctx`.
 */
export async function signedInUser(tag = "oidc"): Promise<SignedIn> {
  const account = await createAccount({ tag });
  const { ctx, accessToken } = await idpSession(
    account.email,
    account.password
  );
  const user = await findUserByEmail(account.email);
  expect(user, "throwaway user row").toBeTruthy();
  const sid = (await ctx.storageState()).cookies.find(
    (c) => c.name === "sid"
  )!.value;
  return {
    account,
    userId: user!._id.toString(),
    ctx,
    api: createApiClient(ctx),
    accessToken,
    sid
  };
}

/** The `sid` cookie a context holds, if any. */
export async function sidCookieOf(
  ctx: APIRequestContext
): Promise<string | undefined> {
  return (await ctx.storageState()).cookies.find((c) => c.name === "sid")
    ?.value;
}

// ── Redis keys the provider writes ────────────────────────────────────────

export const codeKey = (code: string) => `oauth-code:${code}`;
export const pendingKey = (id: string) => `oauth-req:${id}`;
export const sessionKey = (sid: string) => `idp-session:${sid}`;

/** Ids of the pending authorize requests (`oauth-req:*`) stored for a client. */
export async function findPendingKeysFor(clientId: string): Promise<string[]> {
  const out: string[] = [];
  for (const key of await findKeys("oauth-req:*")) {
    const raw = await getValue(key);
    if (
      raw &&
      (JSON.parse(raw) as { clientId?: string }).clientId === clientId
    ) {
      out.push(key);
    }
  }
  return out.sort();
}

// ── Authorize round-trips ─────────────────────────────────────────────────

export interface AuthorizeResult {
  res: APIResponse;
  status: number;
  /** Parsed `Location` for a 3xx, else null. */
  location: URL | null;
}

/** GET /oauth/authorize on `ctx` (its cookies decide the session), redirect not followed. */
export async function authorize(
  ctx: APIRequestContext,
  params: AuthorizeParams
): Promise<AuthorizeResult> {
  const res = await createApiClient(ctx).oauth.authorize(params);
  return { res, status: res.status(), location: locationOf(res) };
}

/** Runs authorize on a context that holds a session and returns the code. */
export async function obtainCode(
  ctx: APIRequestContext,
  client: OidcClient,
  overrides: AuthorizeOverrides = {},
  verifier?: string
): Promise<AuthRequest & { code: string }> {
  const req = authRequest(client, overrides, verifier);
  const { status, location } = await authorize(ctx, req.params);
  expect(status, "authorize should redirect").toBe(302);
  const code = location?.searchParams.get("code");
  expect(code, `no code in ${location?.toString()}`).toBeTruthy();
  return { ...req, code: code as string };
}
