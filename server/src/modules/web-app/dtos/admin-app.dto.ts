// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { WebAppDocument, WebAppStatusPublic } from "../types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "../constants";

export interface AdminAppDto {
  _id: string;
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categoryIds: string[];
  status: WebAppStatusPublic;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  clientId: string;
  tokenEndpointAuthMethod: string;
  createdAt: string;
  updatedAt: string;
}

export const toAdminAppDto = (doc: WebAppDocument): AdminAppDto => ({
  _id: doc._id.toString(),
  name: doc.name,
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  categoryIds: doc.categoryIds.map(String),
  status: WEB_APP_STATUS_PUBLIC[doc.status],
  requiredRoles: doc.requiredRoles,
  redirectUris: doc.redirectUris,
  postLogoutRedirectUris: doc.postLogoutRedirectUris ?? [],
  clientId: doc.clientId,
  tokenEndpointAuthMethod: doc.tokenEndpointAuthMethod,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});

export interface AdminAppCreatedDto extends AdminAppDto {
  /** null với public client — không có secret nào để trả về. */
  clientSecret: string | null;
}

export const toAdminAppCreatedDto = (
  doc: WebAppDocument,
  clientSecret: string | null
): AdminAppCreatedDto => ({
  ...toAdminAppDto(doc),
  clientSecret
});
