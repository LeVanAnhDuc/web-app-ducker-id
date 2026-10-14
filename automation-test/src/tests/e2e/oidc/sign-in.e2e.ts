import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { apiAs, loginInBrowser } from "@/api/session";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/accounts";
import { KNOWN_OTP, OIDC_REDIRECT_URI } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { plantWhenIssued } from "@/utils/auth";
import { jwtPayload } from "@/utils/jwt";
import { authRequest, type OidcClient } from "@/utils/oidc";
import { registerClient, retireClients } from "@/utils/oidc-state";

// The browser leg of single sign-on: what the user sees between a satellite
// app sending them to /oauth/authorize and arriving back at its redirect URI
// (pages/oauth/authorize.page.ts reads the arrival off the browser's request
// to the unresolvable app host). Test cases: test-cases/oidc.md
// (TC-OIDC-047 … 049, 058).

test.use({ role: "guest" });

/** Browser waits: routes compile on first hit in the dev server. */
const ready = expect.configure({ timeout: 15_000 });

let admin: APIRequestContext;
let conf: OidcClient;

test.beforeAll(async () => {
  admin = await apiAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  conf = await registerClient(admin, {
    kind: "confidential",
    label: "browser"
  });
});

test.afterAll(async () => {
  await retireClients(admin, [conf]);
});

test(
  "A guest signs in at Ducker ID and lands back in the app with a code",
  { tag: ["@TC-OIDC-047", "@smoke"] },
  async ({ page, api, authorizePage, loginPage, loginPasswordPage }) => {
    const documents = authorizePage.watchNavigations();
    const req = authRequest(conf);

    await authorizePage.goto(req.params);
    await expect(page).toHaveURL(/\/login\?.*auth_req=/);
    await expect(loginPage.heading()).toBeVisible();
    // Created only now: the account must exist when the email step looks it up.
    const account = await createAccount({ tag: "oidc-browser" });

    await loginPage.submitEmail(account.email);
    await loginPasswordPage.fillPassword(account.password);
    const arrived = authorizePage.arrivalAt();
    await loginPasswordPage.signInButton().click();

    const at = await arrived;
    expect(at.searchParams.get("state")).toBe(req.state);
    const code = at.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(documents.some((u) => new URL(u).pathname === "/login")).toBe(true);

    // The code the browser carried back is a real one.
    const res = await api.oauth.exchangeCode({
      client: conf,
      code: code!,
      verifier: req.verifier
    });
    expect(res.status(), await res.text()).toBe(200);
    const { id_token } = (await res.json()) as { id_token: string };
    expect(jwtPayload(id_token).email).toBe(account.email);
  }
);

test(
  "A guest who signs in with a one-time code lands back in the app",
  { tag: "@TC-OIDC-058" },
  async ({
    page,
    api,
    authorizePage,
    loginPage,
    loginPasswordPage,
    loginAlternativePage,
    loginOtpPage
  }) => {
    const req = authRequest(conf);
    await authorizePage.goto(req.params);
    await expect(page).toHaveURL(/\/login\?.*auth_req=/);
    await expect(loginPage.heading()).toBeVisible();
    const account = await createAccount({ tag: "oidc-browser-otp" });

    // Email → password step → "try another way" → one-time code: the
    // pending request must survive every step of the multi-step login.
    await loginPage.submitEmail(account.email);
    await ready(loginPasswordPage.heading()).toBeVisible();
    await loginPasswordPage.tryAnotherWayLink().click();
    await ready(loginAlternativePage.heading()).toBeVisible();
    await loginAlternativePage.otpOption().click();
    await ready(loginOtpPage.heading()).toBeVisible();
    await plantWhenIssued("login", account.email, KNOWN_OTP);

    const arrived = authorizePage.arrivalAt();
    await loginOtpPage.otp.enter(KNOWN_OTP);
    const at = await arrived;

    expect(`${at.origin}${at.pathname}`).toBe(OIDC_REDIRECT_URI);
    expect(at.searchParams.get("state")).toBe(req.state);
    const code = at.searchParams.get("code");
    expect(code).toBeTruthy();

    const res = await api.oauth.exchangeCode({
      client: conf,
      code: code!,
      verifier: req.verifier
    });
    expect(res.status(), await res.text()).toBe(200);
    const { id_token } = (await res.json()) as { id_token: string };
    expect(jwtPayload(id_token).email).toBe(account.email);
  }
);

test(
  "An existing Ducker ID session goes straight back to the app",
  { tag: ["@TC-OIDC-048", "@smoke"] },
  async ({ page, authorizePage }) => {
    const account = await createAccount({ tag: "oidc-sso" });
    // Sign in the way the login page does; page.request shares the browser's cookie jar.
    await loginInBrowser(page, account.email, account.password);

    const documents = authorizePage.watchNavigations();
    const req = authRequest(conf);
    const at = await authorizePage.gotoExpectingRedirectAway(req.params);

    expect(at.searchParams.get("code")).toBeTruthy();
    expect(at.searchParams.get("state")).toBe(req.state);
    // Only the authorize request and the app itself — no Ducker ID screen in between.
    const paths = documents.map((u) => new URL(u));
    expect(
      paths
        .filter((u) => u.origin !== new URL(OIDC_REDIRECT_URI).origin)
        .map((u) => u.pathname)
    ).toEqual(["/oauth/authorize"]);
  }
);

test(
  "prompt=none in a browser with no session never shows a login screen",
  { tag: "@TC-OIDC-049" },
  async ({ authorizePage }) => {
    const documents = authorizePage.watchNavigations();
    const req = authRequest(conf, { prompt: "none" });
    const at = await authorizePage.gotoExpectingRedirectAway(req.params);

    expect(at.searchParams.get("error")).toBe("login_required");
    expect(at.searchParams.get("state")).toBe(req.state);
    expect(at.searchParams.get("code")).toBeNull();
    expect(documents.some((u) => new URL(u).pathname.endsWith("/login"))).toBe(
      false
    );
  }
);
