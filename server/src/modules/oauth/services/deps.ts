// types
import type { WebAppRepository } from "@/modules/web-app/repositories/web-app.repository";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { SessionService } from "@/modules/session/services";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { OAuthRepository } from "../repository/oauth.repository";

export interface OAuthServiceDeps {
  oauthRepo: OAuthRepository;
  webAppRepo: WebAppRepository;
  sessionService: SessionService;
  authService: AuthenticationService;
  userService: UserService;
  loginHistoryService: LoginHistoryService;
}
