// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type {
  TokenEndpointAuthMethod,
  WebAppStatusPublic
} from "@/modules/web-app/types";
// validators
import { IsNotEmptyBody, UnlessMissing } from "@/validators/decorators";
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

// A PATCH: the create rules with every field optional, and at least one of
// them present. An empty body is an object-level failure, field "".
@IsNotEmptyBody({ message: "webApp:validation.body.empty" })
export class UpdateAppBodyDto {
  @ApiProperty(APP_FIELD_DOCS.name)
  @NameRules()
  @UnlessMissing()
  name?: string;

  @ApiProperty(APP_FIELD_DOCS.displayName)
  @DisplayNameRules()
  @UnlessMissing()
  displayName?: string;

  @ApiProperty(APP_FIELD_DOCS.description)
  @DescriptionRules()
  description?: string;

  @ApiProperty(APP_FIELD_DOCS.iconUrl)
  @IconUrlRules()
  iconUrl?: string;

  @ApiProperty(APP_FIELD_DOCS.homeUrl)
  @HomeUrlRules()
  @UnlessMissing()
  homeUrl?: string;

  @ApiProperty(APP_FIELD_DOCS.categoryIds)
  @CategoryIdsRules()
  @UnlessMissing()
  categoryIds?: string[];

  @ApiProperty(APP_FIELD_DOCS.status)
  @StatusRules()
  @UnlessMissing()
  status?: WebAppStatusPublic;

  @ApiProperty(APP_FIELD_DOCS.requiredRoles)
  @RequiredRolesRules()
  @UnlessMissing()
  requiredRoles?: AuthenticationRole[];

  @ApiProperty(APP_FIELD_DOCS.redirectUris)
  @RedirectUrisRules()
  @UnlessMissing()
  redirectUris?: string[];

  @ApiProperty(APP_FIELD_DOCS.postLogoutRedirectUris)
  @PostLogoutRedirectUrisRules()
  postLogoutRedirectUris?: string[];

  @ApiProperty(APP_FIELD_DOCS.tokenEndpointAuthMethod)
  @TokenEndpointAuthMethodRules()
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
}
