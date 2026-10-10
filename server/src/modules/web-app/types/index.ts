// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { WebAppCategoryDocument } from "@/modules/category/types";
import type {
  WEB_APP_STATUSES,
  TOKEN_ENDPOINT_AUTH_METHODS,
  WEB_APP_STATUS_PUBLIC
} from "@/modules/web-app/constants";

export type WebAppStatus =
  (typeof WEB_APP_STATUSES)[keyof typeof WEB_APP_STATUSES];

export type TokenEndpointAuthMethod =
  (typeof TOKEN_ENDPOINT_AUTH_METHODS)[keyof typeof TOKEN_ENDPOINT_AUTH_METHODS];

export interface WebAppDocument {
  _id: Schema.Types.ObjectId;
  categoryIds: Schema.Types.ObjectId[];
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  clientId: string;
  clientSecretHash: string | null;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  backchannelLogoutUri: string | null;
  grantTypes: string[];
  responseTypes: string[];
  scopes: string[];
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  requiredRoles: AuthenticationRole[];
  status: WebAppStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WebAppStatusPublic =
  (typeof WEB_APP_STATUS_PUBLIC)[keyof typeof WEB_APP_STATUS_PUBLIC];

export interface AdminAppsQuery {
  search?: string;
  status?: WebAppStatusPublic;
  categoryId?: string;
}

export interface AdminAppsQueryRequest extends Omit<Request, "query"> {
  query: AdminAppsQuery;
}

export interface AdminAppCreateBody {
  name: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  homeUrl: string;
  categoryIds: string[];
  status: WebAppStatusPublic;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  /**
   * "none" = public client (SPA tĩnh, mobile) — KHÔNG sinh client_secret, vì
   * không có chỗ nào trong trình duyệt giữ được bí mật. PKCE thay vai trò đó.
   */
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
  postLogoutRedirectUris?: string[];
  scopes?: string[];
}

export interface AdminCreateAppRequest extends Omit<Request, "body"> {
  body: AdminAppCreateBody;
}

export interface WebAppCreateInput {
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categoryIds: string[];
  status: WebAppStatus;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  clientId: string;
  clientSecretHash: string | null;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  scopes: string[];
}

export interface AdminAppUpdateBody {
  name?: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  homeUrl?: string;
  categoryIds?: string[];
  status?: WebAppStatusPublic;
  requiredRoles?: AuthenticationRole[];
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
  scopes?: string[];
}

export interface AdminAppIdParams {
  id: string;
}

export interface AdminUpdateAppRequest extends Omit<
  Request,
  "body" | "params"
> {
  body: AdminAppUpdateBody;
  params: { id: string };
}

export interface WebAppUpdateInput {
  name?: string;
  displayName?: string;
  description?: string | null;
  iconUrl?: string | null;
  homeUrl?: string;
  categoryIds?: string[];
  status?: WebAppStatus;
  requiredRoles?: AuthenticationRole[];
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
  scopes?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface UserAppsQuery extends Partial<PaginationParams> {
  search?: string;
  categoryId?: string;
}

export interface UserAppsQueryRequest extends Omit<Request, "query"> {
  query: UserAppsQuery;
}

export interface WebAppWithCategories extends WebAppDocument {
  categories: WebAppCategoryDocument[];
}
