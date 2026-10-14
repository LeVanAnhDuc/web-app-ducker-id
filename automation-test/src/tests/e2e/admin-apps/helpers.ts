import { expect, type Request } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";
import type { AdminAppFormSheet } from "@/pages/admin/admin-apps.page";

// Shared by the admin-apps UI specs only: request matchers for the registry
// endpoints the browser calls, and the "fill a valid register form" step.

/** The collection endpoint as the browser calls it (client origin + prefix). */
const APPS_PATH = `${API_PREFIX}/admin/apps`;

/** page.route() pattern for POST / GET /admin/apps (the collection). */
export const APPS_COLLECTION_ROUTE = `**${APPS_PATH}`;

/** page.route() pattern for PATCH /admin/apps/:id (one app). */
export const APP_ITEM_ROUTE = `**${APPS_PATH}/*`;

/** The register request: POST /admin/apps. */
export const isCreateAppRequest = (req: Request): boolean =>
  req.method() === "POST" && req.url().endsWith(APPS_PATH);

/** An update request: PATCH /admin/apps/:id. */
export const isUpdateAppRequest = (req: Request): boolean =>
  req.method() === "PATCH" && /\/admin\/apps\//.test(req.url());

/**
 * Fills every required field of the register sheet with valid values and
 * switches the app to inactive, so a regular user's launcher never lists it
 * while it exists.
 */
export async function fillRequired(
  sheet: AdminAppFormSheet,
  name: string,
  { categories = ["Content"] }: { categories?: string[] } = {}
): Promise<void> {
  await sheet.nameInput().fill(name);
  await sheet.displayNameInput().fill(`E2E ${name}`);
  await sheet.homeUrlInput().fill("https://e2e.example.com");
  await sheet.pickCategories(categories);
  await sheet.addRedirectUri("https://e2e.example.com/callback");
  // Keep the app out of every user's launcher while it exists.
  await sheet.statusSwitch().click();
  await expect(sheet.statusSwitch()).not.toBeChecked();
}
