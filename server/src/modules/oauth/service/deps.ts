// types
import type { WebAppRepository } from "@/modules/web-app/repositories/web-app.repository";
import type { AuthenticationService } from "@/modules/authentication/service";
import type { UserService } from "@/modules/user/service";
import type { SessionService } from "@/modules/session/service";
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
