// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { WebAppDocument, WebAppStatusPublic } from "../types";
// common
import {
  Expose,
  ExposeDate,
  ExposeFrom,
  ExposeId,
  ExposeIds,
  ExposeOrNull,
  toDto
} from "@/common/dto";
// others
import { WEB_APP_STATUS_PUBLIC } from "../constants";

/** Source: a web-app record. The admin view — OAuth client settings included, never the secret hash. */
export class AdminAppDto {
  @ExposeId() _id!: string;
  @Expose() name!: string;
  @Expose() displayName!: string;
  @ExposeOrNull() description!: string | null;
  @ExposeOrNull() iconUrl!: string | null;
  @Expose() homeUrl!: string;
  @ExposeIds() categoryIds!: string[];
  @ExposeFrom<WebAppDocument>((doc) => WEB_APP_STATUS_PUBLIC[doc.status])
  status!: WebAppStatusPublic;
  @Expose() requiredRoles!: AuthenticationRole[];
  @Expose() redirectUris!: string[];
  @ExposeFrom<WebAppDocument>((doc) => doc.postLogoutRedirectUris ?? [])
  postLogoutRedirectUris!: string[];
  @Expose() clientId!: string;
  @Expose() tokenEndpointAuthMethod!: string;
  @ExposeDate() createdAt!: string;
  @ExposeDate() updatedAt!: string;
}

export interface AdminAppCreatedDto extends AdminAppDto {
  /** null với public client — không có secret nào để trả về. */
  clientSecret: string | null;
}

// The secret is shown once, at creation, and lives on no record — it is
// passed in, so a forgotten argument still fails to compile.
export const toAdminAppCreatedDto = (
  doc: WebAppDocument,
  clientSecret: string | null
): AdminAppCreatedDto => ({ ...toDto(AdminAppDto, doc), clientSecret });
