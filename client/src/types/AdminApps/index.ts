// types
import type { AuthenticationRole } from "@/types/User";
// others
import type APP_STATUS from "@/constants/appStatus";
import type TOKEN_AUTH_METHOD from "@/constants/tokenAuthMethod";

export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS];

export type TokenAuthMethod =
  (typeof TOKEN_AUTH_METHOD)[keyof typeof TOKEN_AUTH_METHOD];

export interface WebApp {
  _id: string;
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categoryIds: string[];
  status: AppStatus;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  clientId: string;
  tokenEndpointAuthMethod: TokenAuthMethod;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAppsQueryParams {
  search?: string;
  status?: AppStatus;
  categoryId?: string;
}

export interface AdminAppFormValues {
  name: string;
  displayName: string;
  description: string;
  iconUrl: string;
  homeUrl: string;
  categoryIds: string[];
  status: AppStatus;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  tokenEndpointAuthMethod: TokenAuthMethod;
}

export type AdminAppCreateInput = AdminAppFormValues;

export type AdminAppUpdateInput = AdminAppFormValues;

/** clientSecret = null với public client — không có secret nào để hiện. */
export type AdminAppCreateResult = WebApp & { clientSecret: string | null };
