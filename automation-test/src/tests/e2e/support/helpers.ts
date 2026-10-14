import type { Page, Request } from "@playwright/test";
import { contactRoutes } from "@/api/contact.client";

// Stubs shared by the SUPPORT UI specs only.

/**
 * Answers POST /contact/submit with a 201 carrying `data` — for cases that
 * must not file a real request (a subject too short for the cleanup prefix,
 * a canned ticket id). `delayMs` holds the answer back so a second click can
 * land while the first is in flight. Resolves with the requests it answered.
 */
export async function stubSubmit(
  page: Page,
  data: Record<string, unknown>,
  { delayMs = 0 }: { delayMs?: number } = {}
): Promise<Request[]> {
  const seen: Request[] = [];
  await page.route(contactRoutes.submit, async (route) => {
    seen.push(route.request());
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: contactRoutes.submitPath,
        message: "ok",
        data
      })
    });
  });
  return seen;
}

/**
 * Answers GET /contacts (the My Requests list) with `status` and an error
 * envelope, or — with `delayMs` and no status — forwards it to the real API
 * late, so the loading state can be seen.
 */
export async function stubMyList(
  page: Page,
  opts: { status: number } | { delayMs: number }
): Promise<void> {
  await page.route(contactRoutes.myList, async (route) => {
    if ("delayMs" in opts) {
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
      await route.continue();
      return;
    }
    await route.fulfill({
      status: opts.status,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: contactRoutes.myListPath,
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      })
    });
  });
}
