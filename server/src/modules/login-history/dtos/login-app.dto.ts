// types
import type {
  LoginHistoryDocument,
  LoginSource,
  PopulatedLoginWebApp
} from "@/modules/login-history/types";
// modules
import { LOGIN_SOURCES } from "@/modules/login-history/constants";

export interface LoginAppDto {
  id: string | null;
  name: string;
  iconUrl: string | null;
}

export interface LoginAppFieldsDto {
  source: LoginSource;
  app: LoginAppDto | null;
  interactive: boolean;
}

const isPopulated = (
  value: LoginHistoryDocument["webAppId"]
): value is PopulatedLoginWebApp =>
  typeof value === "object" && value !== null && "displayName" in value;

// Rows written before these fields existed are IdP sign-ins with a user
// present, so missing values fall back to that rather than to "unknown".
export const toLoginAppFieldsDto = (
  doc: LoginHistoryDocument
): LoginAppFieldsDto => {
  const source = doc.source ?? LOGIN_SOURCES.IDP;
  const interactive = doc.interactive ?? true;

  if (source !== LOGIN_SOURCES.OAUTH) {
    return { source, app: null, interactive };
  }

  const webApp = doc.webAppId;

  // A deleted app leaves an unpopulated (null) ref — the snapshot keeps the
  // row readable.
  const app: LoginAppDto = isPopulated(webApp)
    ? {
        id: webApp._id.toString(),
        name: webApp.displayName,
        iconUrl: webApp.iconUrl ?? null
      }
    : {
        id: webApp ? webApp.toString() : null,
        name: doc.clientName ?? "",
        iconUrl: null
      };

  return { source, app, interactive };
};
