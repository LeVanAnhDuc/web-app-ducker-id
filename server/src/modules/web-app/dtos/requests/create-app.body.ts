// libs
import { IsDefined } from "class-validator";
// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type {
  TokenEndpointAuthMethod,
  WebAppStatusPublic
} from "@/modules/web-app/types";
// common
import { ApiProperty } from "@/common/openapi";
// others
import {
  APP_FIELD_DOCS,
  CategoryIdsRules,
  DescriptionRules,
  DisplayNameRules,
  HomeUrlRules,
  IconUrlRules,
  NameRules,
  PostLogoutRedirectUrisRules,
  RedirectUrisRules,
  RequiredRolesRules,
  StatusRules,
  TokenEndpointAuthMethodRules
} from "./app-fields";

// `@IsDefined()` always runs first, wherever it sits in the stack.
export class CreateAppBodyDto {
  @ApiProperty(APP_FIELD_DOCS.name)
  @NameRules()
  @IsDefined({ message: "webApp:validation.name.required" })
  name!: string;

  @ApiProperty(APP_FIELD_DOCS.displayName)
  @DisplayNameRules()
  @IsDefined({ message: "webApp:validation.displayName.required" })
  displayName!: string;

  @ApiProperty(APP_FIELD_DOCS.description)
  @DescriptionRules()
  description?: string;

  @ApiProperty(APP_FIELD_DOCS.iconUrl)
  @IconUrlRules()
  iconUrl?: string;

  @ApiProperty(APP_FIELD_DOCS.homeUrl)
  @HomeUrlRules()
  @IsDefined({ message: "webApp:validation.homeUrl.required" })
  homeUrl!: string;

  @ApiProperty(APP_FIELD_DOCS.categoryIds)
  @CategoryIdsRules()
  @IsDefined({ message: "webApp:validation.categoryIds.required" })
  categoryIds!: string[];

  @ApiProperty(APP_FIELD_DOCS.status)
  @StatusRules()
  @IsDefined({ message: "webApp:validation.status.invalid" })
  status!: WebAppStatusPublic;

  @ApiProperty(APP_FIELD_DOCS.requiredRoles)
  @RequiredRolesRules()
  @IsDefined({ message: "webApp:validation.requiredRoles.required" })
  requiredRoles!: AuthenticationRole[];

  @ApiProperty(APP_FIELD_DOCS.redirectUris)
  @RedirectUrisRules()
  @IsDefined({ message: "webApp:validation.redirectUris.required" })
  redirectUris!: string[];

  @ApiProperty(APP_FIELD_DOCS.postLogoutRedirectUris)
  @PostLogoutRedirectUrisRules()
  postLogoutRedirectUris?: string[];

  /**
   * "none" = public client (static SPA, mobile): no client_secret is issued,
   * as nothing in a browser can keep one. PKCE takes that role instead.
   */
  @ApiProperty(APP_FIELD_DOCS.tokenEndpointAuthMethod)
  @TokenEndpointAuthMethodRules()
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
}
