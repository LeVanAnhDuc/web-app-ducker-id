import { test, expect } from "@/fixtures";
import type { Page, Request } from "@playwright/test";
import { loginInBrowser } from "@/api/session";
import { contactRoutes } from "@/api/contact.client";
import { SupportDialog } from "@/components/support-dialog.component";
import { Announcer } from "@/components/announcer.component";
import { copy, copyVi, fill } from "@/data/copy";
import { SUPPORT_MESSAGE } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import {
  deleteSupportRequests,
  SHORT_ID_RE,
  shortId,
  supportSubject
} from "@/utils/contacts";
import { stubSubmit } from "./helpers";

// Submitting a support request from the support dialog — as a guest (from
// the login alternative screen or the user menu) and as a signed-in user
// (user menu → Support). Role: guest; the signed-in cases sign a throwaway
// account into the same browser context, so the seeded user's request list
// is untouched.
// Test cases: test-cases/support.md (TC-SUPPORT-030 … 037, 054 … 057).
//
// Every request filed here has a subject under the SUPPORT prefix and is
// deleted in afterAll (utils/contacts.ts → deleteSupportRequests).

test.use({ role: "guest" });

const t = copy.support;
const v = copy.common.validation;
const NOBODY = "nobody@e2e.example.com";

/** Records whether the page ever sends POST /contact/submit. */
const watchSubmits = (page: Page) => {
  const seen: Request[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/contact/submit")) seen.push(r);
  });
  return seen;
};

test.afterAll(async () => {
  await deleteSupportRequests();
});

test(
  "A guest submits from the support dialog",
  { tag: ["@TC-SUPPORT-030", "@smoke"] },
  async ({ loginAlternativePage, supportDialog: dialog }) => {
    const account = await createAccount({ tag: "support-guest" });
    await loginAlternativePage.goto(account.email);
    await loginAlternativePage.contactAdminOption().click();
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });

    // The address typed on the login screen is pre-filled and editable.
    await expect(dialog.emailInput()).toHaveValue(account.email);
    await expect(dialog.emailInput()).not.toHaveAttribute("readonly", /.*/);
    await expect(dialog.emailPrefilledHint()).toBeVisible();

    await dialog.fill(supportSubject("guest-ui"), SUPPORT_MESSAGE);
    const res = await dialog.submitAndWait();
    expect(res.status()).toBe(201);
    const id = ((await res.json()) as { data: { id: string } }).data.id;

    await expect(dialog.successTitle()).toBeVisible();
    await expect(dialog.ticketLabel()).toBeVisible();
    await expect(dialog.ticketCode(SHORT_ID_RE)).toHaveText(shortId(id));
  }
);

test(
  "A signed-in user submits from the user menu",
  { tag: ["@TC-SUPPORT-031", "@smoke"] },
  async ({ page, homePage, myRequestsPage, supportDialog: dialog }) => {
    const account = await createAccount({ tag: "support-user" });
    await loginInBrowser(page, account.email, account.password);
    await homePage.goto();
    await homePage.userMenu.openSupport();
    await expect(dialog.root()).toBeVisible();

    // A signed-in user replies to their account email; it cannot be changed.
    await expect(dialog.emailInput()).toHaveValue(account.email);
    await expect(dialog.emailInput()).toHaveAttribute("readonly", /.*/);
    await expect(dialog.emailReadOnlyHint()).toBeVisible();

    const subject = supportSubject("user-ui");
    await dialog.fill(subject, SUPPORT_MESSAGE);
    await dialog.submit();
    await expect(dialog.ticketCode(SHORT_ID_RE)).toBeVisible({
      timeout: 10_000
    });
    await dialog.closeButton().click();
    await expect(dialog.root()).toBeHidden();

    await myRequestsPage.goto();
    await expect(myRequestsPage.exactText(subject)).toBeVisible();
    await expect(myRequestsPage.rowLinks()).toHaveCount(1);
  }
);

test.describe("validation [BVA]", () => {
  test.describe("Message length rules and exact minimums", () => {
    for (const [label, message, error] of [
      ["empty message", "", v.message.required],
      ["19-character message", "x".repeat(19), v.message.minLength]
    ] as const) {
      test(
        `an ${label} is refused with its message before anything is sent`,
        { tag: "@TC-SUPPORT-032" },
        async ({ page, loginAlternativePage, supportDialog: dialog }) => {
          const seen = watchSubmits(page);
          await loginAlternativePage.goto(NOBODY);
          await loginAlternativePage.contactAdminOption().click();
          await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
          await dialog.fill(supportSubject("valid"), message);
          await dialog.submit();
          await expect(dialog.text(error)).toBeVisible();
          await expect(dialog.messageInput()).toHaveAttribute(
            "aria-invalid",
            "true"
          );
          expect(seen).toHaveLength(0);
        }
      );
    }

    test(
      "the exact minimums (5 / 20 characters) are accepted",
      { tag: "@TC-SUPPORT-032" },
      async ({ page, loginAlternativePage, supportDialog: dialog }) => {
        await loginAlternativePage.goto(NOBODY);
        await loginAlternativePage.contactAdminOption().click();
        await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
        // Stubbed: a 5-character subject cannot carry the cleanup prefix.
        await stubSubmit(page, {
          id: "0123456789abcdef01234567",
          subject: "abcde"
        });
        await dialog.fill("abcde", "x".repeat(20));
        await expect(dialog.charCount(20)).toBeVisible();
        await dialog.submit();
        await expect(dialog.ticketCode("012345...")).toBeVisible();
      }
    );
  });

  test.describe("Subject length errors are shown", () => {
    for (const [label, subject, error] of [
      ["empty subject", "", v.subject.required],
      ["4-character subject", "abcd", v.subject.minLength],
      ["201-character subject", "s".repeat(201), v.subject.maxLength]
    ] as const) {
      test(
        `a ${label} is refused with its message before anything is sent`,
        { tag: "@TC-SUPPORT-036" },
        async ({ page, loginAlternativePage, supportDialog: dialog }) => {
          // SubjectField is a FormField, so its zod error and aria-invalid
          // reach the DOM (fixed BUG-SUPPORT-01).
          const seen = watchSubmits(page);
          await loginAlternativePage.goto(NOBODY);
          await loginAlternativePage.contactAdminOption().click();
          await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
          await dialog.fill(subject, SUPPORT_MESSAGE);
          await dialog.submit();
          expect(seen).toHaveLength(0);
          await expect(dialog.text(error)).toBeVisible({ timeout: 3_000 });
        }
      );
    }
  });

  test(
    "An invalid reply-to email is refused with its message",
    { tag: "@TC-SUPPORT-055" },
    async ({ page, loginAlternativePage, supportDialog: dialog }) => {
      // EmailField is a FormField too (fixed BUG-SUPPORT-03).
      const seen = watchSubmits(page);
      await loginAlternativePage.goto(NOBODY);
      await loginAlternativePage.contactAdminOption().click();
      await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
      await dialog.emailInput().fill("not-an-email");
      await dialog.fill(supportSubject("bad-email"), SUPPORT_MESSAGE);
      await dialog.submit();
      expect(seen).toHaveLength(0);
      await expect(dialog.text(v.email.invalid)).toBeVisible({
        timeout: 3_000
      });
    }
  );
});

test(
  "Submit another and close",
  { tag: "@TC-SUPPORT-033" },
  async ({ page, loginAlternativePage, supportDialog: dialog }) => {
    await stubSubmit(page, { id: "abcdef0123456789abcdef01" });
    await loginAlternativePage.goto(NOBODY);
    await loginAlternativePage.contactAdminOption().click();
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
    await dialog.fill(supportSubject("again"), SUPPORT_MESSAGE);
    await dialog.submit();
    await expect(dialog.ticketCode("abcdef...")).toBeVisible();

    await dialog.submitAnotherButton().click();
    await expect(dialog.subjectInput()).toHaveValue("");
    await expect(dialog.messageInput()).toHaveValue("");

    await page.keyboard.press("Escape");
    await expect(dialog.root()).toBeHidden();
  }
);

test(
  "A rate-limited submit keeps the form and says why",
  { tag: "@TC-SUPPORT-034" },
  async ({ page, loginAlternativePage, supportDialog: dialog }) => {
    await page.route(contactRoutes.submit, (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          timestamp: new Date().toISOString(),
          path: contactRoutes.submitPath
        })
      })
    );
    await loginAlternativePage.goto(NOBODY);
    await loginAlternativePage.contactAdminOption().click();
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
    const subject = supportSubject("limited");
    await dialog.fill(subject, SUPPORT_MESSAGE);
    await dialog.submit();
    await expect(new Announcer(page).region()).toHaveText(
      t.announce.rateLimitError
    );
    await expect(dialog.subjectInput()).toHaveValue(subject);
    await expect(dialog.successTitle()).toHaveCount(0);
  }
);

test(
  "A failed submit keeps the form and says why",
  { tag: "@TC-SUPPORT-057" },
  async ({ page, loginAlternativePage, supportDialog: dialog }) => {
    await page.route(contactRoutes.submit, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
          path: contactRoutes.submitPath
        })
      })
    );
    await loginAlternativePage.goto(NOBODY);
    await loginAlternativePage.contactAdminOption().click();
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
    const subject = supportSubject("server-error");
    await dialog.fill(subject, SUPPORT_MESSAGE);
    await dialog.submit();
    await expect(new Announcer(page).region()).toHaveText(t.announce.error);
    await expect(dialog.subjectInput()).toHaveValue(subject);
    await expect(dialog.messageInput()).toHaveValue(SUPPORT_MESSAGE);
    await expect(dialog.successTitle()).toHaveCount(0);
  }
);

test(
  "Double-clicking Send request files one request",
  { tag: "@TC-SUPPORT-056" },
  async ({ page, loginAlternativePage, supportDialog: dialog }) => {
    // The stub answers late, so the second click lands while the first
    // request is still in flight.
    const seen = await stubSubmit(
      page,
      { id: "fedcba9876543210fedcba98" },
      { delayMs: 1_500 }
    );
    await loginAlternativePage.goto(NOBODY);
    await loginAlternativePage.contactAdminOption().click();
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
    await dialog.fill(supportSubject("double"), SUPPORT_MESSAGE);
    await dialog.submitButton().dblclick();
    await expect(dialog.ticketCode("fedcba...")).toBeVisible({
      timeout: 10_000
    });
    expect(seen).toHaveLength(1);
  }
);

test(
  "A guest opens Support from the user menu with an empty email",
  { tag: "@TC-SUPPORT-054" },
  async ({ loginPage, supportDialog: dialog }) => {
    await loginPage.goto();
    await loginPage.userMenu.openSupport();
    await expect(dialog.root()).toBeVisible();

    // No address is known: the field is empty, editable and optional.
    await expect(dialog.emailInput()).toHaveValue("");
    await expect(dialog.emailInput()).toBeEditable();
    await expect(dialog.emailHint()).toBeVisible();

    await dialog.fill(supportSubject("guest-menu"), SUPPORT_MESSAGE);
    const res = await dialog.submitAndWait();
    expect(res.status()).toBe(201);
    await expect(dialog.ticketCode(SHORT_ID_RE)).toBeVisible();
  }
);

test(
  "The dialog in Vietnamese",
  { tag: "@TC-SUPPORT-035" },
  async ({ page, loginAlternativePage }) => {
    const tv = copyVi.support;
    await loginAlternativePage.goto(NOBODY, "/vi");
    await loginAlternativePage
      .contactAdminOption(
        new RegExp(
          `${copyVi.login.form.alternative.contactAdmin.title}|${copy.login.form.alternative.contactAdmin.title}`
        )
      )
      .click();
    const dialog = new SupportDialog(page, copyVi);
    await expect(dialog.root()).toBeVisible({ timeout: 15_000 });
    await expect(dialog.text(tv.form.input.labelEmail)).toBeVisible();
    await expect(
      dialog.text(tv.form.input.labelSubject, { exact: false }).first()
    ).toBeVisible();
    await expect(dialog.text(tv.form.input.labelMessage)).toBeVisible();
    await expect(
      dialog.text(fill(tv.form.hint.minChars, { count: 20 }))
    ).toBeVisible();
    await expect(dialog.submitButton()).toBeVisible();
    const text = await dialog.root().innerText();
    expect(text).not.toMatch(/support\.(form|dialog|success)\./);
  }
);

test(
  "An account with no requests sees the empty state",
  { tag: "@TC-SUPPORT-037" },
  async ({ page, myRequestsPage: list, supportDialog: dialog }) => {
    const account = await createAccount({ tag: "support-empty" });
    await loginInBrowser(page, account.email, account.password);
    await list.goto();
    await expect(list.emptyHeading()).toBeVisible();
    await expect(list.table()).toHaveCount(0);
    await expect(list.clearFiltersButton()).toHaveCount(0);
    await list.openSupportDialog();
    await expect(dialog.root()).toBeVisible();
  }
);
