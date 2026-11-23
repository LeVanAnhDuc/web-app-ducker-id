// types
import type {
  AuthorizeOutcome,
  OAuthQuery,
  TokenRequestBody,
  TokenResponse,
  UserInfoResponse
} from "../types";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/services";
import type { SessionService } from "@/modules/session/session.service";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { RecentAppService } from "@/modules/recent-app/recent-app.service";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { OAuthRepository } from "../repository/oauth.repository";
// others
import { authorize } from "./authorize";
import { exchangeToken } from "./exchange-token";
import { getUserInfo } from "./get-user-info";
import { logout } from "./logout";

export class OAuthService {
  constructor(
    private readonly oauthRepo: OAuthRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly sessionService: SessionService,
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly recentAppService: RecentAppService,
    private readonly accessPolicy: AccessPolicy
  ) {}

  authorize(query: OAuthQuery, sid: string | null): Promise<AuthorizeOutcome> {
    return authorize(
      {
        oauthRepo: this.oauthRepo,
        webAppRepo: this.webAppRepo,
        sessionService: this.sessionService,
        userService: this.userService,
        loginHistoryService: this.loginHistoryService,
        recentAppService: this.recentAppService,
        accessPolicy: this.accessPolicy
      },
      query,
      sid
    );
  }

  exchangeToken(
    body: TokenRequestBody,
    authorizationHeader?: string
  ): Promise<TokenResponse> {
    return exchangeToken(
      {
        oauthRepo: this.oauthRepo,
        webAppRepo: this.webAppRepo,
        authService: this.authService,
        userService: this.userService
      },
      body,
      authorizationHeader
    );
  }

  getUserInfo(
    authId: string,
    userId: string,
    scope: string
  ): Promise<UserInfoResponse> {
    return getUserInfo(
      {
        authService: this.authService,
        userService: this.userService
      },
      authId,
      userId,
      scope
    );
  }

  logout(query: OAuthQuery, sid: string | null): Promise<string | null> {
    return logout(
      {
        webAppRepo: this.webAppRepo,
        sessionService: this.sessionService
      },
      query,
      sid
    );
  }
}
