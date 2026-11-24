// types
import type {
  LoginHistoryDocument,
  LoginSource,
  PopulatedLoginWebApp
} from "@/modules/login-history/types";
// common
import { ExposeFrom } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { LOGIN_SOURCES } from "@/modules/login-history/constants";

/** The satellite app a sign-in was for. Plain data: `appOf` builds object literals typed as it. */
export class LoginAppDto {
  @ApiProperty({
    type: "string",
    nullable: true,
    example: "507f1f77bcf86cd799439011"
  })
  id!: string | null;

  @ApiProperty({ type: "string", example: "Satellite Monitor" })
  name!: string;

  @ApiProperty({
    type: "string",
    nullable: true,
    example: "https://cdn.example.com/icons/monitor.png"
  })
  iconUrl!: string | null;
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
  @ApiProperty({
    type: "string",
    enum: Object.values(LOGIN_SOURCES),
    example: LOGIN_SOURCES.IDP
  })
  @ExposeFrom(sourceOf)
  source!: LoginSource;

  @ApiProperty({
    type: LoginAppDto,
    nullable: true,
    description: "The satellite app signed in to; null for an IdP sign-in"
  })
  @ExposeFrom(appOf)
  app!: LoginAppDto | null;

  @ApiProperty({ example: true })
  @ExposeFrom<LoginHistoryDocument>((doc) => doc.interactive ?? true)
  interactive!: boolean;
}
