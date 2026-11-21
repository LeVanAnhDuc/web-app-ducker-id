// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type {
  TokenEndpointAuthMethod,
  WebAppStatusPublic
} from "@/modules/web-app/types";
// validators
import { IsNotEmptyBody, UnlessMissing } from "@/validators/decorators";
// others
import {
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
  @NameRules()
  @UnlessMissing()
  name?: string;

  @DisplayNameRules()
  @UnlessMissing()
  displayName?: string;

  @DescriptionRules()
  description?: string;

  @IconUrlRules()
  iconUrl?: string;

  @HomeUrlRules()
  @UnlessMissing()
  homeUrl?: string;

  @CategoryIdsRules()
  @UnlessMissing()
  categoryIds?: string[];

  @StatusRules()
  @UnlessMissing()
  status?: WebAppStatusPublic;

  @RequiredRolesRules()
  @UnlessMissing()
  requiredRoles?: AuthenticationRole[];

  @RedirectUrisRules()
  @UnlessMissing()
  redirectUris?: string[];

  @PostLogoutRedirectUrisRules()
  postLogoutRedirectUris?: string[];

  @TokenEndpointAuthMethodRules()
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
}
