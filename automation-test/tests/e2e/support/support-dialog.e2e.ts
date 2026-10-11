import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { loginInBrowser } from "@helpers/password";
import {
  deleteSupportRequests,
  SUPPORT_MESSAGE,
  supportSubject
} from "@helpers/support";

// Submitting a support request from the support dialog — as a guest (from
// the login alternative screen) and as a signed-in user (user menu →
// Support). Role: guest; the signed-in cases sign a throwaway account into
// the same browser context, so the seeded user's request list is untouched.
// Test cases: test-cases/support.md (TC-SUPPORT-030 … 036).
//
// Every request filed here has a subject under the SUPPORT prefix and is
// deleted in afterAll (helpers/support.ts).

test.use({ role: "guest" });

const SHORT_ID_RE = /^[0-9a-f]{6}\.\.\.$/;

const dialogOf = (page: Page, name: RegExp | string = "Contact Support") =>
  page.getByRole("dialog", { name });

const fill = async (page: Page, subject: string, message: string) => {
  const dialog = dialogOf(page);
  await dialog.locator('input[name="subject"]').fill(subject);
  await dialog.locator('textarea[name="message"]').fill(message);
};

/** Opens the dialog from the alternative sign-in screen for `email`. */
const openAsGuest = async (page: Page, email: string) => {
  await page.goto(`/login/alternative?email=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: /Contact administrator/ }).click();
  await expect(dialogOf(page)).toBeVisible({ timeout: 15_000 });
};

/** Signs `email` into this browser and opens the dialog from the user menu. */
const openSignedIn = async (page: Page, email: string, password: string) => {
  await loginInBrowser(page, email, password);
  await page.goto("/");
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Support" }).click();
  await expect(dialogOf(page)).toBeVisible();
};

test.afterAll(async () => {
  await deleteSupportRequests();
});

test(
  "a guest submits a request and gets a ticket code",
  { tag: ["@TC-SUPPORT-030", "@smoke"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "support-guest" });
    await openAsGuest(page, account.email);
    const dialog = dialogOf(page);

    // The address typed on the login screen is pre-filled and editable.
    const email = dialog.locator('input[name="email"]');
    await expect(email).toHaveValue(account.email);
    await expect(email).not.toHaveAttribute("readonly", /.*/);
    await expect(
      dialog.getByText("Email pre-filled — change it if needed.")
    ).toBeVisible();

    const subject = supportSubject("guest-ui");
    await fill(page, subject, SUPPORT_MESSAGE);
    const submitted = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/contact/submit") &&
        r.request().method() === "POST"
    );
    await dialog.getByRole("button", { name: "Send request" }).click();
    const res = await submitted;
    expect(res.status()).toBe(201);
    const id = ((await res.json()) as { data: { id: string } }).data.id;

    await expect(dialog.getByText("Thanks for reaching out")).toBeVisible();
    await expect(dialog.getByText("Request code")).toBeVisible();
    const code = dialog.getByText(SHORT_ID_RE);
    await expect(code).toHaveText(`${id.slice(0, 6)}...`);
  }
);

test(
  "a signed-in user submits from the user menu and finds it under My Requests",
  { tag: ["@TC-SUPPORT-031", "@smoke"] },
  async ({ page }) => {
    const account = await createAccount({ tag: "support-user" });
    await openSignedIn(page, account.email, account.password);
    const dialog = dialogOf(page);

    // A signed-in user replies to their account email; it cannot be changed.
    const email = dialog.locator('input[name="email"]');
    await expect(email).toHaveValue(account.email);
    await expect(email).toHaveAttribute("readonly", /.*/);
    await expect(
      dialog.getByText("We'll reply to your account email.")
    ).toBeVisible();

    const subject = supportSubject("user-ui");
    await fill(page, subject, SUPPORT_MESSAGE);
    await dialog.getByRole("button", { name: "Send request" }).click();
    await expect(dialog.getByText(SHORT_ID_RE)).toBeVisible({
      timeout: 10_000
    });
    await dialog
      .locator('button[data-slot="button"]', { hasText: /^Close$/ })
      .click();
    await expect(dialog).toBeHidden();

    await page.goto("/contacts/me");
    await expect(page.getByText(subject, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View details for ticket/ })
    ).toHaveCount(1);
  }
);

test.describe("validation [BVA]", () => {
  const noPost = (page: Page) => {
    const seen = { posted: false };
    page.on("request", (r) => {
      if (r.url().includes("/contact/submit")) seen.posted = true;
    });
    return seen;
  };

  for (const [label, message, error] of [
    ["empty message", "", "Please enter message"],
    [
      "19-character message",
      "x".repeat(19),
      "Message must be at least 20 characters"
    ]
  ] as const) {
    test(
      `an ${label} is refused with its message before anything is sent`,
      { tag: "@TC-SUPPORT-032" },
      async ({ page }) => {
        const seen = noPost(page);
        await openAsGuest(page, "nobody@e2e.example.com");
        await fill(page, supportSubject("valid"), message);
        await dialogOf(page)
          .getByRole("button", { name: "Send request" })
          .click();
        await expect(dialogOf(page).getByText(error)).toBeVisible();
        await expect(
          dialogOf(page).locator('textarea[name="message"]')
        ).toHaveAttribute("aria-invalid", "true");
        expect(seen.posted).toBe(false);
      }
    );
  }

  for (const [label, subject, error] of [
    ["empty subject", "", "Please enter subject"],
    ["4-character subject", "abcd", "Subject must be at least 5 characters"],
    [
      "201-character subject",
      "s".repeat(201),
      "Subject must not exceed 200 characters"
    ]
  ] as const) {
    test(
      `a ${label} is refused with its message before anything is sent`,
      { tag: "@TC-SUPPORT-036" },
      async ({ page }) => {
        // BUG: BUG-019 — SubjectField is not a FormField (useFieldProps overrides the
        // id and skips the field context), so a zod error on subject blocks
        // the submit silently — no message, aria-invalid stays "false".
        test.fail();
        const seen = noPost(page);
        await openAsGuest(page, "nobody@e2e.example.com");
        await fill(page, subject, SUPPORT_MESSAGE);
        await dialogOf(page)
          .getByRole("button", { name: "Send request" })
          .click();
        expect(seen.posted).toBe(false);
        await expect(dialogOf(page).getByText(error)).toBeVisible({
          timeout: 3_000
        });
      }
    );
  }

  test(
    "the exact minimums (5 / 20 characters) are accepted",
    { tag: "@TC-SUPPORT-032" },
    async ({ page }) => {
      await openAsGuest(page, "nobody@e2e.example.com");
      // A prefix keeps the 5-character subject sweepable by the cleanup.
      await page.route("**/api/v1/contact/submit", (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            path: "/api/v1/contact/submit",
            message: "ok",
            data: { id: "0123456789abcdef01234567", subject: "abcde" }
          })
        })
      );
      await fill(page, "abcde", "x".repeat(20));
      await expect(
        dialogOf(page).getByText("20 characters", { exact: true })
      ).toBeVisible();
      await dialogOf(page)
        .getByRole("button", { name: "Send request" })
        .click();
      await expect(dialogOf(page).getByText("012345...")).toBeVisible();
    }
  );
});

test(
  "Submit another request returns to an empty form; Close closes [ST]",
  { tag: "@TC-SUPPORT-033" },
  async ({ page }) => {
    await page.route("**/api/v1/contact/submit", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/contact/submit",
          message: "ok",
          data: { id: "abcdef0123456789abcdef01" }
        })
      })
    );
    await openAsGuest(page, "nobody@e2e.example.com");
    const dialog = dialogOf(page);
    await fill(page, supportSubject("again"), SUPPORT_MESSAGE);
    await dialog.getByRole("button", { name: "Send request" }).click();
    await expect(dialog.getByText("abcdef...")).toBeVisible();

    await dialog
      .getByRole("button", { name: "Submit another request" })
      .click();
    await expect(dialog.locator('input[name="subject"]')).toHaveValue("");
    await expect(dialog.locator('textarea[name="message"]')).toHaveValue("");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
);

test(
  "a failed or rate-limited submit keeps the form and says why",
  { tag: "@TC-SUPPORT-034" },
  async ({ page }) => {
    await page.route("**/api/v1/contact/submit", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          timestamp: new Date().toISOString(),
          path: "/api/v1/contact/submit"
        })
      })
    );
    await openAsGuest(page, "nobody@e2e.example.com");
    const subject = supportSubject("limited");
    await fill(page, subject, SUPPORT_MESSAGE);
    await dialogOf(page).getByRole("button", { name: "Send request" }).click();
    await expect(page.locator("#announcer")).toHaveText(
      "Too many requests. Please wait before trying again."
    );
    await expect(dialogOf(page).locator('input[name="subject"]')).toHaveValue(
      subject
    );
    await expect(
      dialogOf(page).getByText("Thanks for reaching out")
    ).toHaveCount(0);
  }
);

test(
  "the dialog in Vietnamese",
  { tag: "@TC-SUPPORT-035" },
  async ({ page }) => {
    await page.goto(
      `/vi/login/alternative?email=${encodeURIComponent("nobody@e2e.example.com")}`
    );
    await page
      .getByRole("button", {
        name: /Liên hệ quản trị viên|Contact administrator/
      })
      .click();
    const dialog = dialogOf(page, "Liên hệ hỗ trợ");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText("Email phản hồi")).toBeVisible();
    await expect(
      dialog.getByText("Tiêu đề", { exact: false }).first()
    ).toBeVisible();
    await expect(dialog.getByText("Mô tả chi tiết")).toBeVisible();
    await expect(dialog.getByText("Tối thiểu 20 ký tự")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Gửi yêu cầu" })
    ).toBeVisible();
    const text = await dialog.innerText();
    expect(text).not.toMatch(/support\.(form|dialog|success)\./);
  }
);

test(
  "an account that never filed a request sees the empty state and can start one",
  { tag: "@TC-SUPPORT-037" },
  async ({ page }) => {
    const account = await createAccount({ tag: "support-empty" });
    await loginInBrowser(page, account.email, account.password);
    await page.goto("/contacts/me");
    await expect(
      page.getByRole("heading", { name: "No requests submitted yet" })
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /clear filters/i })
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: /submit new request/i })
      .first()
      .click();
    await expect(dialogOf(page)).toBeVisible();
  }
);
