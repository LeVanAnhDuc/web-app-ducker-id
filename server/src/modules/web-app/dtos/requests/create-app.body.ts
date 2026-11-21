// libs
import { IsDefined } from "class-validator";
// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type {
  TokenEndpointAuthMethod,
  WebAppStatusPublic
} from "@/modules/web-app/types";
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

// `@IsDefined()` always runs first, wherever it sits in the stack.
export class CreateAppBodyDto {
  @NameRules()
  @IsDefined({ message: "webApp:validation.name.required" })
  name!: string;

  @DisplayNameRules()
  @IsDefined({ message: "webApp:validation.displayName.required" })
  displayName!: string;

  @DescriptionRules()
  description?: string;

  @IconUrlRules()
  iconUrl?: string;

  @HomeUrlRules()
  @IsDefined({ message: "webApp:validation.homeUrl.required" })
  homeUrl!: string;

  @CategoryIdsRules()
  @IsDefined({ message: "webApp:validation.categoryIds.required" })
  categoryIds!: string[];

  @StatusRules()
  @IsDefined({ message: "webApp:validation.status.invalid" })
  status!: WebAppStatusPublic;

  @RequiredRolesRules()
  @IsDefined({ message: "webApp:validation.requiredRoles.required" })
  requiredRoles!: AuthenticationRole[];

  @RedirectUrisRules()
  @IsDefined({ message: "webApp:validation.redirectUris.required" })
  redirectUris!: string[];

  @PostLogoutRedirectUrisRules()
  postLogoutRedirectUris?: string[];

  /**
   * "none" = public client (static SPA, mobile): no client_secret is issued,
   * as nothing in a browser can keep one. PKCE takes that role instead.
   */
  @TokenEndpointAuthMethodRules()
  tokenEndpointAuthMethod?: TokenEndpointAuthMethod;
}
