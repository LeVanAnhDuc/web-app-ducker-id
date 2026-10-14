import type { Page, Route } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import { fakeJwt } from "@/utils/jwt";

// Network scaffolding the password e2e specs share — mocks and counters on
// `page.route` / `page.on("request")`. Only this module uses them (moved from
// helpers/changePassword.ts, helpers/session.ts, helpers/build.ts).

/** Glob of PATCH /auth/change-password on the client origin. */
export const CHANGE_PASSWORD_GLOB = `**${API_PREFIX}/auth/change-password`;
const REFRESH_GLOB = `**${API_PREFIX}/auth/token/refresh`;
const CHANGE_PASSWORD_PATH = "/auth/change-password";

// ── change-password requests ───────────────────────────────────────────────

/** Counts the PATCH /auth/change-password requests the page fires. */
export function countPatches(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes(CHANGE_PASSWORD_PATH)) {
      counter.count += 1;
    }
  });
  return counter;
}

export interface MockChangePasswordOptions {
  status: number;
  body: Record<string, unknown>;
  /** Delay (ms) before fulfilling — to observe the in-flight UI. */
  delayMs?: number;
}

/**
 * Fulfils PATCH /auth/change-password with a canned answer, so the test sees
 * the client's handling of that answer without a real PATCH (which would
 * spend the 5 / 15 min limiter bucket). Other methods pass through.
 */
export async function mockChangePassword(
  page: Page,
  { status, body, delayMs }: MockChangePasswordOptions
): Promise<void> {
  await page.route(CHANGE_PASSWORD_GLOB, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });
}

/**
 * Holds the PATCH open (never answers it) so the in-flight state can be seen;
 * the returned function aborts it — no success handler runs, so no token pair
 * is ever written into the in-memory session.
 */
export async function holdChangePassword(
  page: Page
): Promise<() => Promise<void>> {
  let pending: Route | null = null;
  await page.route(CHANGE_PASSWORD_GLOB, (route) => {
    if (route.request().method() === "PATCH") {
      pending = route;
      return;
    }
    return route.continue();
  });
  return async () => {
    if (pending) await (pending as Route).abort();
  };
}

/**
 * A real token set for the page's own session, from the refresh endpoint. A
 * mocked 200 must carry tokens the client can decode: the client stores
 * whatever the response returns, and a non-JWT placeholder makes it treat the
 * session as broken and sign the user out.
 */
export async function realTokens(
  page: Page
): Promise<{ accessToken: string; idToken: string; expiresIn: number }> {
  const res = await page.request.post(`${API_PREFIX}/auth/token/refresh`);
  if (!res.ok()) throw new Error(`realTokens: refresh → ${res.status()}`);
  const { data } = (await res.json()) as {
    data: { accessToken: string; idToken: string; expiresIn: number };
  };
  return {
    accessToken: data.accessToken,
    idToken: data.idToken,
    expiresIn: data.expiresIn
  };
}

// ── faked session (force-change gate) ──────────────────────────────────────

export interface FakeSessionClaims {
  /** Value of the fabricated idToken's `mustChangePassword` claim. */
  mustChangePassword: boolean;
  email?: string;
  name?: string;
  roles?: "user" | "admin";
}

/**
 * A decodable but unsigned token pair — the body of a mocked change-password
 * 200, so whatever renders after it has a well-formed session.
 */
export function fakeTokens(mustChangePassword: boolean) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    accessToken: fakeJwt({ sub: "1", authId: "1", roles: "user", exp }),
    idToken: fakeJwt({
      sub: "1",
      name: "Victim User",
      email: "victim@test.com",
      mustChangePassword,
      exp
    }),
    expiresIn: 3600
  };
}

/**
 * Answers the session bootstrap (SessionGate → POST /auth/token/refresh, on
 * every full page load) with unsigned tokens carrying `claims`. The client
 * decodes but never verifies them, so the force-change gate and form can be
 * driven for any claim combination without a real admin reset. Register
 * before `page.goto` — client-side navigations do not bootstrap again.
 */
export async function mockSessionWithClaims(
  page: Page,
  {
    mustChangePassword,
    email = "victim@test.com",
    name = "Victim User",
    roles = "user"
  }: FakeSessionClaims
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + 3600;
  const sub = "000000000000000000000001";
  const accessToken = fakeJwt({
    sub,
    authId: sub,
    roles,
    iat: nowSeconds,
    exp
  });
  const idToken = fakeJwt({
    sub,
    name,
    email,
    mustChangePassword,
    iat: nowSeconds,
    exp
  });
  await page.route(REFRESH_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: `${API_PREFIX}/auth/token/refresh`,
        message: "ok",
        data: { accessToken, idToken, expiresIn: 3600 }
      })
    })
  );
}

/** Resolves after two more frames, so effects queued before it (and their rAF) have run. */
export function afterNextPaint(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

// ── forgot password ────────────────────────────────────────────────────────

/** Lets the first magic-link verify through and replays its answer for repeats. */
export async function answerRepeatVerifyWithFirst(page: Page): Promise<void> {
  let first: Promise<{ status: number; body: string }> | null = null;
  await page.route("**/forgot-password/magic-link/verify", async (route) => {
    if (!first) {
      first = route.fetch().then(async (r) => ({
        status: r.status(),
        body: await r.text()
      }));
    }
    const { status, body } = await first;
    await route.fulfill({ status, contentType: "application/json", body });
  });
}

/** Counts the magic-link verify requests the page fires. */
export function countMagicLinkVerifies(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (r) => {
    if (r.url().includes("/magic-link/verify")) counter.count += 1;
  });
  return counter;
}

/** Counts the POST /forgot-password/reset requests the page fires. */
export function countResets(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (r) => {
    if (r.url().includes("/forgot-password/reset") && r.method() === "POST")
      counter.count += 1;
  });
  return counter;
}

/**
 * True when the page was served by `next dev` rather than a production build
 * (dev serves the unhashed `/_next/static/chunks/webpack.js`). Call after a
 * navigation. For behaviour that exists in one mode only — React StrictMode's
 * double effects run in dev only (BUG-PASSWORD-03).
 */
export async function isDevBuild(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Array.from(document.scripts).some((s) =>
      /\/_next\/static\/chunks\/webpack\.js(\?|$)/.test(s.src)
    )
  );
}
