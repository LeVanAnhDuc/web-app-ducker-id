import type { Page } from "@playwright/test";

const REFRESH_GLOB = "**/api/v1/auth/token/refresh";

function base64url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds a syntactically-valid but UNSIGNED JWT string carrying the given
 * payload. `jwt-decode` (used client-side by `useUserInfo` — see
 * src/hooks/useUserInfo.ts) never verifies the signature, it only
 * base64url-decodes the payload segment, and the app's own
 * `isTokenExpired`/`getTokenExpSeconds` helpers (src/utils/index.ts) do the
 * same manual decode. That's enough to drive the FE's claim-based UI (e.g.
 * `mustChangePassword`) deterministically in tests without a real backend
 * round-trip. This is an E2E-only technique — the REAL server always verifies
 * signatures; nothing here weakens production auth.
 */
export function fakeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: "none", typ: "JWT" });
  const body = base64url(payload);
  return `${header}.${body}.fake-signature`;
}

export interface FakeSessionClaims {
  /** Value baked into the fabricated idToken's `mustChangePassword` claim. */
  mustChangePassword: boolean;
  email?: string;
  name?: string;
  roles?: "user" | "admin";
}

/**
 * Intercepts the app's session-bootstrap call (`SessionGate` ->
 * `POST /auth/token/refresh`, fired on every fresh full page load since
 * tokens live only in the in-memory Zustand store — see
 * src/layouts/SessionGate/index.tsx) and fulfills it with fabricated tokens
 * carrying the given claims.
 *
 * Why: the force-change-password gate (mustChangePassword redirect) and form
 * only need a session with a specific idToken claim — they don't care how
 * that session was minted. Faking the bootstrap response lets
 * `force-change.e2e.ts` drive the gate + form deterministically for ANY
 * claim combination, without needing a real admin reset (whose generated
 * temp password is never observable over HTTP — see e2e.md "Prerequisites").
 *
 * Must be registered BEFORE `page.goto(...)` (a full navigation) — SPA
 * client-side navigations do not re-trigger the bootstrap query (`enabled:
 * !hasBootstrapped`, and `hasBootstrapped` stays `true` for the lifetime of
 * the in-page JS module, i.e. until the next full navigation).
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
        path: "/api/v1/auth/token/refresh",
        message: "ok",
        data: { accessToken, idToken, expiresIn: 3600 }
      })
    })
  );
}
