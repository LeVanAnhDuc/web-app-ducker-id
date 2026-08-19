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
  categoryId: string;
  status: WebAppStatusPublic;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  clientId: string;
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
  categoryId: doc.categoryId.toString(),
  status: WEB_APP_STATUS_PUBLIC[doc.status],
  requiredRoles: doc.requiredRoles,
  redirectUris: doc.redirectUris,
  clientId: doc.clientId,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});

export interface AdminAppCreatedDto extends AdminAppDto {
  clientSecret: string;
}

export const toAdminAppCreatedDto = (
  doc: WebAppDocument,
  clientSecret: string
): AdminAppCreatedDto => ({
  ...toAdminAppDto(doc),
  clientSecret
});
