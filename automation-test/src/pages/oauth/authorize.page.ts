import type { Page } from "@playwright/test";
import { OIDC_REDIRECT_URI } from "@/data/test-data";
import { authorizePath, type AuthorizeParams } from "@/utils/oidc";
import { BasePage } from "../base.page";

// The browser leg of single sign-on: a satellite app sends the user to
// /oauth/authorize (Express, reached through the client's rewrite — no React
// screen of its own), which answers with a redirect either to Ducker ID's
// /login?auth_req=… or straight back to the app's redirect URI.
//
// The redirect URIs the suite registers (rp.e2e.example.com) do not resolve,
// and `page.route` does not see a navigation's redirect target, so arrival at
// the app is read from the browser's request to it, which carries the code /
// error.

/** How long the whole sign-in may take before the app is reached. */
const ARRIVAL_TIMEOUT = 20_000;

export class AuthorizePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Opens /oauth/authorize?… — for a flow that stops at a Ducker ID screen. */
  async goto(params: AuthorizeParams): Promise<void> {
    await this.page.goto(authorizePath(params));
  }

  /**
   * Records the URL of every top-level document request from now on,
   * redirects included — the screens the browser passed through.
   */
  watchNavigations(): string[] {
    const documents: string[] = [];
    this.page.on("request", (r) => {
      if (r.isNavigationRequest() && r.frame() === this.page.mainFrame())
        documents.push(r.url());
    });
    return documents;
  }

  /** Resolves with the URL the browser is sent to at the satellite app. */
  arrivalAt(redirectUri: string = OIDC_REDIRECT_URI): Promise<URL> {
    return this.page
      .waitForRequest((r) => r.url().startsWith(redirectUri), {
        timeout: ARRIVAL_TIMEOUT
      })
      .then((r) => new URL(r.url()));
  }

  /**
   * Opens /oauth/authorize when the redirect chain is expected to end at the
   * (unresolvable) app host, and resolves with where it arrived.
   */
  async gotoExpectingRedirectAway(
    params: AuthorizeParams,
    redirectUri: string = OIDC_REDIRECT_URI
  ): Promise<URL> {
    const arrived = this.arrivalAt(redirectUri);
    await this.page.goto(authorizePath(params)).catch(() => undefined); // ERR_NAME_NOT_RESOLVED at the app
    return arrived;
  }
}
