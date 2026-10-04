// types
import type { FilterQuery } from "mongoose";
import type {
  AdminAppsQuery,
  WebAppDocument,
  WebAppStatus,
  WebAppStatusPublic,
  WebAppWithCategories
} from "../types";
import type { WebAppCategoryDocument } from "@/modules/category/types";
// modules
import { WEB_APP_STATUSES, CLIENT_CREDENTIALS_CONFIG } from "../constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { escapeRegex } from "@/utils/string/escape-regex";
import { generateSecureToken } from "@/utils/crypto/secure-token";

const PUBLIC_TO_STATUS = {
  active: WEB_APP_STATUSES.ACTIVE,
  inactive: WEB_APP_STATUSES.INACTIVE
} as const;

export const buildWebAppFilter = (
  query: AdminAppsQuery
): FilterQuery<WebAppDocument> => {
  const filter: FilterQuery<WebAppDocument> = {};

  if (query.status) filter.status = PUBLIC_TO_STATUS[query.status];
  if (query.categoryId) filter.categoryIds = query.categoryId;

  if (query.search) {
    const searchRegex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { name: searchRegex },
      { displayName: searchRegex },
      { description: searchRegex }
    ];
  }

  return filter;
};

export const toInternalStatus = (status: WebAppStatusPublic): WebAppStatus =>
  PUBLIC_TO_STATUS[status];

export const generateClientId = (): string =>
  `${CLIENT_CREDENTIALS_CONFIG.CLIENT_ID_PREFIX}${generateSecureToken(
    CLIENT_CREDENTIALS_CONFIG.CLIENT_ID_RANDOM_BYTES
  )}`;

export const generateClientSecret = (): string =>
  generateSecureToken(CLIENT_CREDENTIALS_CONFIG.CLIENT_SECRET_RANDOM_BYTES);

/**
 * The launcher's visibility rule for a single app: it must exist and be
 * active, and a non-admin only sees apps whose requiredRoles include `user`.
 * Mirrors the filter `findActiveByIds` applies to a list.
 */
export const isAppVisibleTo = (
  app: Pick<WebAppDocument, "status" | "requiredRoles"> | null,
  role?: string
): boolean =>
  app !== null &&
  app.status === WEB_APP_STATUSES.ACTIVE &&
  (role === AUTHENTICATION_ROLES.ADMIN ||
    app.requiredRoles.includes(AUTHENTICATION_ROLES.USER));

/**
 * Virtual populate returns categories in query order; the admin's order lives
 * in `categoryIds`. A populated id with no match (deleted mid-request) drops out.
 */
export const orderByCategoryIds = (
  app: Pick<WebAppWithCategories, "categoryIds" | "categories">
): WebAppCategoryDocument[] => {
  const byId = new Map(
    (app.categories ?? []).map((category) => [
      category._id.toString(),
      category
    ])
  );
  return app.categoryIds.flatMap((id) => byId.get(id.toString()) ?? []);
};
