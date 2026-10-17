import type { Locator, Page } from "@playwright/test";

// The 6-slot one-time-code input (input-otp, client/src/components/ui/input-otp)
// used by the login-code and sign-up verification screens. It renders one real
// <input> under the slots; the component submits on the 6th digit.
export class OtpInput {
  constructor(private readonly page: Page) {}

  input(): Locator {
    return this.page.locator('input[data-slot="input-otp"]');
  }

  async enter(code: string): Promise<void> {
    const input = this.input();
    await input.click();
    await input.pressSequentially(code);
  }
}
