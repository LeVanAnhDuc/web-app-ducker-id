import type { Locator, Page, Response } from "@playwright/test";
import { copy, fill } from "@/data/copy";

/** The catalogue the dialog reads: `copy` (en) or `copyVi` on a /vi page. */
export type SupportDialogCopy = { support: (typeof copy)["support"] };

// The support dialog — client/src/components/SupportDialog. One component,
// opened from three places: the user menu ("Support", guests included), the
// "Contact administrator" option of /login/alternative and /forgot-password,
// and "Submit new request" on /contacts/me. Two modes: the form (email,
// subject, message, "Send request") and the success screen (ticket code as a
// ShortId, "Submit another request", "Close").
//
// Fields are found by their react-hook-form `name`, not by label: Subject and
// Email build their input through `useFieldProps`, which sets `id = name` and
// so breaks the `<label for>` association shadcn's FormControl would give.
// The success screen's own "Close" button is told apart from the dialog's
// icon-only close (also named "Close") by `data-slot="button"`.
// `new SupportDialog(page, copyVi)` on a /vi page.
export class SupportDialog {
  constructor(
    private readonly page: Page,
    private readonly t: SupportDialogCopy = copy
  ) {}

  root(): Locator {
    return this.page.getByRole("dialog", { name: this.t.support.dialog.title });
  }

  /** Any text inside the dialog (a field error, a hint, a label). */
  text(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.root().getByText(text, options);
  }

  // ── form ────────────────────────────────────────────────────────────────

  emailInput(): Locator {
    return this.root().locator('input[name="email"]');
  }

  subjectInput(): Locator {
    return this.root().locator('input[name="subject"]');
  }

  messageInput(): Locator {
    return this.root().locator('textarea[name="message"]');
  }

  /** Hint under the email field for a guest who typed nothing yet. */
  emailHint(): Locator {
    return this.text(this.t.support.form.input.labelEmailHint);
  }

  /** Hint when the address was carried over from the sign-in screen. */
  emailPrefilledHint(): Locator {
    return this.text(this.t.support.form.input.labelEmailAutoFillHint);
  }

  /** Hint when a signed-in user replies to the account email. */
  emailReadOnlyHint(): Locator {
    return this.text(this.t.support.form.input.labelEmailReadOnlyHint);
  }

  /** The live counter under the message ("20 characters"). */
  charCount(count: number): Locator {
    return this.text(fill(this.t.support.form.hint.charCount, { count }), {
      exact: true
    });
  }

  submitButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.support.form.button.submit
    });
  }

  /** The submit button while the request is in flight ("Sending..."). */
  submittingButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.support.form.button.submitting
    });
  }

  // ── success ─────────────────────────────────────────────────────────────

  successTitle(): Locator {
    return this.text(this.t.support.success.title);
  }

  ticketLabel(): Locator {
    return this.text(this.t.support.success.ticketLabel);
  }

  /** The ticket code: by its ShortId pattern, or a known value. */
  ticketCode(code: string | RegExp): Locator {
    return this.text(code);
  }

  submitAnotherButton(): Locator {
    return this.root().getByRole("button", {
      name: this.t.support.success.button.submitAnother
    });
  }

  closeButton(): Locator {
    return this.root().locator('button[data-slot="button"]', {
      hasText: new RegExp(`^${this.t.support.success.button.close}$`)
    });
  }

  // ── actions ─────────────────────────────────────────────────────────────

  async fill(subject: string, message: string): Promise<void> {
    await this.subjectInput().fill(subject);
    await this.messageInput().fill(message);
  }

  async submit(): Promise<void> {
    await this.submitButton().click();
  }

  /** Clicks "Send request"; resolves with the POST /contact/submit response. */
  async submitAndWait(): Promise<Response> {
    const submitted = this.page.waitForResponse(
      (r) =>
        r.url().includes("/contact/submit") && r.request().method() === "POST"
    );
    await this.submit();
    return submitted;
  }
}
