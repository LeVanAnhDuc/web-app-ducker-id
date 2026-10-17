import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { setCookie } from "@/api/response";
import { apiAs } from "@/api/session";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import { OIDC_POST_LOGOUT_URI } from "@/data/test-data";
import {
  authRequest,
  isAt,
  locationOf,
  param,
  type OidcClient
} from "@/utils/oidc";
import {
  authorize,
  obtainCode,
  registerClient,
  retireClients,
  sessionKey,
  sidCookieOf,
  signedInUser,
  type SignedIn
} from "@/utils/oidc-state";
import { keyExists } from "@/utils/redis";

// GET /oauth/logout (RP-initiated) and the first-party sign-out, both of
// which must end the `sid` IdP session. services/logout.ts, session/services/end.ts.
// Test cases: test-cases/oidc.md (TC-OIDC-042 … 045, 056).

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "logout" });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

let me: SignedIn | undefined;
test.beforeEach(async ({}, testInfo) => {
  // The "no session" case starts as a bare guest.
  if (!testInfo.tags.includes("@no-session"))
    me = await signedInUser("oidc-logout");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
  me = undefined;
});

test(
  "/oauth/logout ends the identity-provider session",
  { tag: ["@TC-OIDC-042", "@smoke"] },
  async ({ baseURL }) => {
    expect(await keyExists(sessionKey(me!.sid))).toBe(true);
    const before = await obtainCode(me!.ctx, conf);

    const res = await me!.api.oauth.logout();
    expect(res.status()).toBe(302);
    expect(locationOf(res)!.origin).toBe(new URL(baseURL!).origin);
    expect(res.headers()["set-cookie"]).toMatch(/(^|\n)sid=;/);
    expect(await keyExists(sessionKey(me!.sid))).toBe(false);
    expect(await sidCookieOf(me!.ctx)).toBeFalsy();

    const req = authRequest(conf, { prompt: "none" });
    const silent = await authorize(me!.ctx, req.params);
    expect(param(silent.location, "error")).toBe("login_required");
    expect(param(silent.location, "code")).toBeNull();

    // No revocation exists (design §8): a code minted before logout still
    // redeems until its own 60 s TTL — the documented blast radius.
    const late = await me!.api.oauth.exchangeCode({
      client: conf,
      code: before.code,
      verifier: before.verifier
    });
    expect(late.status()).toBe(200);
  }
);

test(
  "Logout redirects only to a registered post-logout URI",
  { tag: "@TC-OIDC-043" },
  async ({ baseURL }) => {
    const home = new URL(baseURL!).origin;

    const ok = await me!.api.oauth.logout({
      client_id: conf.clientId,
      post_logout_redirect_uri: OIDC_POST_LOGOUT_URI,
      state: "bye-123"
    });
    expect(ok.status()).toBe(302);
    const okAt = locationOf(ok)!;
    expect(isAt(okAt, OIDC_POST_LOGOUT_URI)).toBe(true);
    expect(okAt.searchParams.get("state")).toBe("bye-123");

    for (const [label, q] of [
      [
        "unregistered URI",
        {
          client_id: conf.clientId,
          post_logout_redirect_uri: "https://attacker.example.net/"
        }
      ],
      ["no client_id", { post_logout_redirect_uri: OIDC_POST_LOGOUT_URI }],
      [
        "unknown client",
        {
          client_id: "client_unknown000",
          post_logout_redirect_uri: OIDC_POST_LOGOUT_URI
        }
      ]
    ] as const) {
      const res = await me!.api.oauth.logout({ ...q });
      expect(res.status(), label).toBe(302);
      const at = locationOf(res)!;
      expect(at.origin, label).toBe(home);
      expect(at.href, label).not.toContain("attacker");
      expect(isAt(at, OIDC_POST_LOGOUT_URI), label).toBe(false);
    }
  }
);

test("Logout expires the sid cookie", { tag: "@TC-OIDC-044" }, async () => {
  // The sid cookie is cleared without maxAge, so Express sends an
  // already-expired cookie (fixed BUG-OIDC-05).
  const res = await me!.api.oauth.logout();
  const header = setCookie(res, "sid");
  expect(header, "no Set-Cookie for sid").toBeTruthy();
  const maxAge = /Max-Age=(\d+)/i.exec(header!)?.[1];
  const expires = /Expires=([^;]+)/i.exec(header!)?.[1];
  const expired =
    maxAge === "0" ||
    (expires !== undefined && Date.parse(expires) <= Date.now());
  expect(expired, header).toBe(true);
});

test(
  "Signing out of Ducker ID also ends the SSO session",
  { tag: "@TC-OIDC-045" },
  async () => {
    const res = await me!.api
      .as({ accessToken: me!.accessToken })
      .auth.logout();
    expect(res.status(), await res.text()).toBeLessThan(300);
    expect(await keyExists(sessionKey(me!.sid))).toBe(false);

    const silent = await authorize(
      me!.ctx,
      authRequest(conf, { prompt: "none" }).params
    );
    expect(param(silent.location, "error")).toBe("login_required");
  }
);

test(
  "Logout without a session redirects like a normal logout",
  { tag: ["@TC-OIDC-056", "@no-session"] },
  async ({ api, baseURL }) => {
    const home = new URL(baseURL!).origin;
    for (const [label, q] of [
      ["bare", {}],
      [
        "registered URI",
        {
          client_id: conf.clientId,
          post_logout_redirect_uri: OIDC_POST_LOGOUT_URI,
          state: "bye-guest"
        }
      ]
    ] as const) {
      const res = await api.oauth.logout({ ...q });
      expect(res.status(), label).toBe(302);
      const at = locationOf(res)!;
      if (label === "bare") {
        expect(at.origin, label).toBe(home);
      } else {
        expect(isAt(at, OIDC_POST_LOGOUT_URI), label).toBe(true);
        expect(at.searchParams.get("state"), label).toBe("bye-guest");
      }
    }
  }
);
