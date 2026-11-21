// types
import type {
  LoginHistoryDocument,
  LoginSource,
  PopulatedLoginWebApp
} from "@/modules/login-history/types";
// common
import { ExposeFrom } from "@/common/dto";
// modules
import { LOGIN_SOURCES } from "@/modules/login-history/constants";

export interface LoginAppDto {
  id: string | null;
  name: string;
  iconUrl: string | null;
}

const isPopulated = (
  value: LoginHistoryDocument["webAppId"]
): value is PopulatedLoginWebApp =>
  typeof value === "object" && value !== null && "displayName" in value;

// Rows written before these fields existed are IdP sign-ins with a user
// present, so missing values fall back to that rather than to "unknown".
const sourceOf = (doc: LoginHistoryDocument): LoginSource =>
  doc.source ?? LOGIN_SOURCES.IDP;

const appOf = (doc: LoginHistoryDocument): LoginAppDto | null => {
  if (sourceOf(doc) !== LOGIN_SOURCES.OAUTH) return null;

  const webApp = doc.webAppId;

  // A deleted app leaves an unpopulated (null) ref — the snapshot keeps the
  // row readable.
  return isPopulated(webApp)
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
};

/** Which app a sign-in was for — the base of every login-history item DTO. */
export class LoginAppFieldsDto {
  @ExposeFrom(sourceOf) source!: LoginSource;
  @ExposeFrom(appOf) app!: LoginAppDto | null;
  @ExposeFrom<LoginHistoryDocument>((doc) => doc.interactive ?? true)
  interactive!: boolean;
}
