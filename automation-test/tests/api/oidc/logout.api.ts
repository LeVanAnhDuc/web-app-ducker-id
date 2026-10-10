import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  POST_LOGOUT_URI,
  authRequest,
  authorize,
  exchangeCode,
  isAt,
  keyExists,
  obtainCode,
  param,
  registerClient,
  retireClients,
  sessionKey,
  signedInUser
} from "@helpers/oidc";
import type { OidcClient, SignedIn } from "@helpers/oidc";

// GET /oauth/logout (RP-initiated) and the first-party sign-out, both of
// which must end the `sid` IdP session. services/logout.ts, session/services/end.ts.

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

let me: SignedIn;
test.beforeEach(async () => {
  me = await signedInUser("oidc-logout");
});
test.afterEach(async () => {
  await me?.ctx.dispose().catch(() => undefined);
});

function logoutPath(q: Record<string, string>): string {
  const qs = new URLSearchParams(q).toString();
  return `/oauth/logout${qs ? `?${qs}` : ""}`;
}

async function sidCookie(ctx: APIRequestContext): Promise<string | undefined> {
  return (await ctx.storageState()).cookies.find((c) => c.name === "sid")?.value;
}

test(
  "/oauth/logout ends the identity-provider session",
  { tag: "@TC-OIDC-042" },
  async ({ baseURL }) => {
    expect(await keyExists(sessionKey(me.sid))).toBe(true);
    const before = await obtainCode(me.ctx, conf);

    const res = await me.ctx.get(logoutPath({}), { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(new URL(res.headers()["location"]).origin).toBe(new URL(baseURL!).origin);
    expect(res.headers()["set-cookie"]).toMatch(/(^|\n)sid=;/);
    expect(await keyExists(sessionKey(me.sid))).toBe(false);
    expect(await sidCookie(me.ctx)).toBeFalsy();

    const req = authRequest(conf, { prompt: "none" });
    const silent = await authorize(me.ctx, req.params);
    expect(param(silent.location, "error")).toBe("login_required");
    expect(param(silent.location, "code")).toBeNull();

    // No revocation exists (design §8): a code minted before logout still
    // redeems until its own 60 s TTL — the documented blast radius.
    const late = await exchangeCode(me.ctx, {
      client: conf,
      code: before.code,
      verifier: before.verifier
    });
    expect(late.status()).toBe(200);
  }
);

test(
  "logout redirects only to a registered post-logout URI",
  { tag: "@TC-OIDC-043" },
  async ({ baseURL }) => {
    const home = new URL(baseURL!).origin;

    const ok = await me.ctx.get(
      logoutPath({
        client_id: conf.clientId,
        post_logout_redirect_uri: POST_LOGOUT_URI,
        state: "bye-123"
      }),
      { maxRedirects: 0 }
    );
    expect(ok.status()).toBe(302);
    const okAt = new URL(ok.headers()["location"]);
    expect(isAt(okAt, POST_LOGOUT_URI)).toBe(true);
    expect(okAt.searchParams.get("state")).toBe("bye-123");

    for (const [label, q] of [
      [
        "unregistered URI",
        { client_id: conf.clientId, post_logout_redirect_uri: "https://attacker.example.net/" }
      ],
      ["no client_id", { post_logout_redirect_uri: POST_LOGOUT_URI }],
      [
        "unknown client",
        { client_id: "client_unknown000", post_logout_redirect_uri: POST_LOGOUT_URI }
      ]
    ] as const) {
      const res = await me.ctx.get(logoutPath({ ...q }), { maxRedirects: 0 });
      expect(res.status(), label).toBe(302);
      const at = new URL(res.headers()["location"]);
      expect(at.origin, label).toBe(home);
      expect(at.href, label).not.toContain("attacker");
      expect(isAt(at, POST_LOGOUT_URI), label).toBe(false);
    }
  }
);

test(
  "logout expires the sid cookie rather than leaving an empty one alive",
  { tag: "@TC-OIDC-044" },
  async () => {
    // BUG: BUG-023 — clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS) passes maxAge, so Express 4 sends "sid=; Max-Age=604800" — an empty cookie living 7 more days.
    test.fail();
    const res = await me.ctx.get(logoutPath({}), { maxRedirects: 0 });
    const header = res
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie")
      .map((h) => h.value)
      .find((v) => v.startsWith("sid="));
    expect(header, "no Set-Cookie for sid").toBeTruthy();
    const maxAge = /Max-Age=(\d+)/i.exec(header!)?.[1];
    const expires = /Expires=([^;]+)/i.exec(header!)?.[1];
    const expired =
      maxAge === "0" || (expires !== undefined && Date.parse(expires) <= Date.now());
    expect(expired, header).toBe(true);
  }
);

test(
  "signing out of Ducker ID also ends the SSO session",
  { tag: "@TC-OIDC-045" },
  async () => {
    const res = await me.ctx.post("/api/v1/auth/logout", {
      headers: { Authorization: `Bearer ${me.accessToken}` }
    });
    expect(res.status(), await res.text()).toBeLessThan(300);
    expect(await keyExists(sessionKey(me.sid))).toBe(false);

    const silent = await authorize(me.ctx, authRequest(conf, { prompt: "none" }).params);
    expect(param(silent.location, "error")).toBe("login_required");
  }
);
