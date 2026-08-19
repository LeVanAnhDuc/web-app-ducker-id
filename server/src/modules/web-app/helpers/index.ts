// types
import type { FilterQuery } from "mongoose";
import type {
  AdminAppsQuery,
  WebAppDocument,
  WebAppStatus,
  WebAppStatusPublic
} from "../types";
// modules
import { WEB_APP_STATUSES, CLIENT_CREDENTIALS_CONFIG } from "../constants";
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
  if (query.categoryId) filter.categoryId = query.categoryId;

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
