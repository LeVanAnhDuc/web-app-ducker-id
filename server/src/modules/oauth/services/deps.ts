// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { SessionService } from "@/modules/session/services";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { RecentAppService } from "@/modules/recent-app/services";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { OAuthRepository } from "../repository/oauth.repository";

export interface OAuthServiceDeps {
  oauthRepo: OAuthRepository;
  webAppRepo: WebAppRepository;
  sessionService: SessionService;
  authService: AuthenticationService;
  userService: UserService;
  loginHistoryService: LoginHistoryService;
  recentAppService: RecentAppService;
  accessPolicy: AccessPolicy;
}
