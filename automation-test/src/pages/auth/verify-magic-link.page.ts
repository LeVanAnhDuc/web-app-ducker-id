import type { Locator } from "@playwright/test";
import { copy } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN } from "@/data/test-data";
import { BasePage } from "../base.page";

// The page a magic-link email opens — /login/verify-magic-link?token=…&email=…,
// client/src/views/Logins/LoginMagicLinkVerify. It verifies on load, then
// lands on home (valid) or back on /login (invalid).
export class VerifyMagicLinkPage extends BasePage {
  /** Opens the link the email would contain. */
  async goto(email: string, token: string = KNOWN_MAGIC_TOKEN): Promise<void> {
    await this.page.goto(
      `/login/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`
    );
  }

  heading(): Locator {
    return this.page.getByRole("heading", {
      name: copy.login.form.magicLink.titleVerifying
    });
  }
}
