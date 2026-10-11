import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext, Page } from "@fixtures";
import { createAccount } from "@helpers/accounts";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@helpers/env";
import {
  REDIRECT_URI,
  authRequest,
  authorizePath,
  decodeJwt,
  exchangeCode,
  guestContext,
  registerClient,
  retireClients
} from "@helpers/oidc";
import type { OidcClient } from "@helpers/oidc";

// The browser leg of single sign-on: what the user sees between a satellite
// app sending them to /oauth/authorize and arriving back at its redirect URI.
// The redirect URI's host does not resolve: arrival is asserted on the
// browser's request to it, which carries the code / error.

test.use({ role: "guest" });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, { kind: "confidential", label: "browser" });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

/** Records every top-level document request, redirects included. */
function watch(page: Page): string[] {
  const documents: string[] = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) documents.push(r.url());
  });
  return documents;
}

/**
 * Resolves with the URL the browser is sent to at the satellite app. The
 * host does not exist (and `page.route` does not see a navigation's
 * redirect target), so the request itself is the proof of arrival.
 */
function arrival(page: Page): Promise<URL> {
  return page
    .waitForRequest((r) => r.url().startsWith(REDIRECT_URI), { timeout: 20_000 })
    .then((r) => new URL(r.url()));
}

/** Navigates to a URL whose redirect chain ends at the unresolvable RP host. */
async function openExpectingRedirectAway(page: Page, path: string): Promise<URL> {
  const arrived = arrival(page);
  await page.goto(path).catch(() => undefined); // ERR_NAME_NOT_RESOLVED at the RP
  return arrived;
}

test(
  "a guest signs in at Ducker ID and lands back in the app with a code",
  { tag: ["@TC-OIDC-047", "@smoke"] },
  async ({ page }) => {
    const documents = watch(page);
    const req = authRequest(conf);

    await page.goto(authorizePath(req.params));
    await expect(page).toHaveURL(/\/login\?.*auth_req=/);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    // Created only now: the account must exist when the email step looks it up.
    const account = await createAccount({ tag: "oidc-browser" });

    await page.getByLabel("Email").fill(account.email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Enter your password").fill(account.password);
    const arrived = arrival(page);
    await page.getByRole("button", { name: "Sign in" }).click();

    const at = await arrived;
    expect(at.searchParams.get("state")).toBe(req.state);
    const code = at.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(documents.some((u) => new URL(u).pathname === "/login")).toBe(true);

    // The code the browser carried back is a real one.
    const api = await guestContext();
    try {
      const res = await exchangeCode(api, { client: conf, code: code!, verifier: req.verifier });
      expect(res.status(), await res.text()).toBe(200);
      const { id_token } = (await res.json()) as { id_token: string };
      expect(decodeJwt(id_token).payload.email).toBe(account.email);
    } finally {
      await api.dispose();
    }
  }
);

test(
  "an existing Ducker ID session goes straight back to the app",
  { tag: "@TC-OIDC-048" },
  async ({ page }) => {
    const account = await createAccount({ tag: "oidc-sso" });
    // Sign in the way the login page does; page.request shares the browser's cookie jar.
    const login = await page.request.post("/api/v1/auth/login", {
      data: { email: account.email, password: account.password }
    });
    expect(login.ok()).toBeTruthy();

    const documents = watch(page);
    const req = authRequest(conf);
    const at = await openExpectingRedirectAway(page, authorizePath(req.params));

    expect(at.searchParams.get("code")).toBeTruthy();
    expect(at.searchParams.get("state")).toBe(req.state);
    // Only the authorize request and the app itself — no Ducker ID screen in between.
    const paths = documents.map((u) => new URL(u));
    expect(paths.filter((u) => u.origin !== new URL(REDIRECT_URI).origin).map((u) => u.pathname)).toEqual([
      "/oauth/authorize"
    ]);
  }
);

test(
  "prompt=none with no session lands back with login_required, never on a login screen",
  { tag: "@TC-OIDC-049" },
  async ({ page }) => {
    const documents = watch(page);
    const req = authRequest(conf, { prompt: "none" });
    const at = await openExpectingRedirectAway(page, authorizePath(req.params));

    expect(at.searchParams.get("error")).toBe("login_required");
    expect(at.searchParams.get("state")).toBe(req.state);
    expect(at.searchParams.get("code")).toBeNull();
    expect(documents.some((u) => new URL(u).pathname.endsWith("/login"))).toBe(false);
  }
);
