import type { Request } from "@playwright/test";
import { API_PREFIX } from "@/config/urls";

// Shared by the admin-categories UI specs only: the endpoints the browser
// calls, as page.route() patterns and request matchers.

/** The collection endpoint as the browser calls it (client origin + prefix). */
export const CATEGORIES_PATH = `${API_PREFIX}/admin/categories`;

/** page.route() pattern for GET / POST /admin/categories (the collection). */
export const CATEGORIES_ROUTE = `**${CATEGORIES_PATH}`;

/** page.route() pattern for POST /admin/categories/:id/move. */
export const MOVE_ROUTE = `**${CATEGORIES_PATH}/*/move`;

/** page.route() pattern for GET /admin/categories/:id/delete-impact. */
export const DELETE_IMPACT_ROUTE = "**/delete-impact";

/** The create request: POST /admin/categories. */
export const isCreateCategoryRequest = (req: Request): boolean =>
  req.method() === "POST" && req.url().endsWith(CATEGORIES_PATH);

/** A delete request: DELETE /admin/categories/:id. */
export const isDeleteCategoryRequest = (req: Request): boolean =>
  req.method() === "DELETE" && req.url().includes(CATEGORIES_PATH);
