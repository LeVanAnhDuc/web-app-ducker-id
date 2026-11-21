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
import type {
  AdminAppsQueryDto,
  AppIdParamsDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "../dtos/requests";

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
  announcedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WebAppStatusPublic =
  (typeof WEB_APP_STATUS_PUBLIC)[keyof typeof WEB_APP_STATUS_PUBLIC];

// The index signature keeps the handlers assignable to Express's own, whose
// query and params are string dictionaries.
export interface AdminAppsQueryRequest extends Omit<Request, "query"> {
  query: AdminAppsQueryDto & Request["query"];
}

export interface AdminCreateAppRequest extends Omit<Request, "body"> {
  body: CreateAppBodyDto;
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

export interface AdminUpdateAppRequest extends Omit<
  Request,
  "body" | "params"
> {
  body: UpdateAppBodyDto;
  params: AppIdParamsDto & Record<string, string>;
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

export interface UserAppsQueryRequest extends Omit<Request, "query"> {
  query: UserAppsQueryDto & Request["query"];
}

export interface WebAppWithCategories extends WebAppDocument {
  categories: WebAppCategoryDocument[];
}
