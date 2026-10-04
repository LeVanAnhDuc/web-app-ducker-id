// types
import type { Request, Response } from "express";
import type { WebAppDocument } from "@/modules/web-app/types";
import type { WebAppRepository } from "@/modules/web-app/repositories";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { SessionService } from "@/modules/session/session.service";
import type { SessionRecord } from "@/modules/session/types";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { OAuthRepository } from "./oauth.repository";
import type {
  AuthorizeParams,
  TokenRequestBody,
  TokenResponse,
  UserInfoResponse
} from "./types";
// common
import { OAuthError } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
// modules
import { WEB_APP_STATUSES } from "@/modules/web-app/constants";
import { signOAuthToken } from "@/modules/token/helpers";
// others
import ENV from "@/constants/env";
import { Logger } from "@/libs/logger";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import {
  OAUTH_CODE_CHALLENGE_METHOD,
  OAUTH_CONFIG,
  OAUTH_ERRORS,
  OAUTH_GRANT_TYPE_AUTHORIZATION_CODE,
  OAUTH_PROMPT,
  OAUTH_RESPONSE_TYPE,
  OAUTH_SCOPES,
  OAUTH_TOKEN_TYPE
} from "./constants";
import {
  buildRedirectUrl,
  filterClaimsByScopes,
  matchRedirectUri,
  parseScopeParam,
  resolveGrantedScopes,
  verifyPkceChallenge
} from "./helpers";

interface AppSignInAudit {
  client: WebAppDocument;
  session: SessionRecord;
  interactive: boolean;
  req: Request;
  denied: boolean;
}

type AuthorizeOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "login"; url: string };

export class OAuthService {
  constructor(
    private readonly oauthRepo: OAuthRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly sessionService: SessionService,
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly loginHistoryService: LoginHistoryService
  ) {}

  // ── authorize ──────────────────────────────────────────────────────────

  /**
   * Bước 1 và 2 tách riêng khỏi phần còn lại vì cho tới khi client_id và
   * redirect_uri được xác thực thì KHÔNG được redirect lỗi về đâu cả — làm vậy
   * là biến IdP thành open redirector. Hai lỗi này trả JSON.
   */
  private async resolveClient(clientId?: string): Promise<WebAppDocument> {
    if (!clientId) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        description: "client_id is required"
      });
    }

    const client = await this.webAppRepo.findByClientId(clientId);

    if (!client || client.status !== WEB_APP_STATUSES.ACTIVE) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_CLIENT,
        description: "Unknown or inactive client",
        status: STATUS_CODES.UNAUTHORIZED
      });
    }

    return client;
  }

  private assertRedirectUri(
    client: WebAppDocument,
    redirectUri?: string
  ): void {
    if (!redirectUri || !matchRedirectUri(client.redirectUris, redirectUri)) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        description: "redirect_uri does not match a registered value"
      });
    }
  }

  /** Validate phần còn lại — từ đây lỗi đã có thể redirect về client. */
  private validateAuthorizeParams(
    client: WebAppDocument,
    query: Record<string, string | undefined>
  ): AuthorizeParams {
    const redirectUri = query.redirect_uri as string;
    const state = query.state;

    const fail = (error: string, description: string): never => {
      throw new OAuthError({ error, description, redirectUri, state });
    };

    if (query.response_type !== OAUTH_RESPONSE_TYPE) {
      fail(
        OAUTH_ERRORS.UNSUPPORTED_RESPONSE_TYPE,
        "Only response_type=code is supported"
      );
    }

    if (!client.responseTypes.includes(OAUTH_RESPONSE_TYPE)) {
      fail(
        OAUTH_ERRORS.UNAUTHORIZED_CLIENT,
        "Client is not allowed to use response_type=code"
      );
    }

    // PKCE bắt buộc cho MỌI client (OAuth 2.1 / RFC 9700), không chỉ public.
    if (!query.code_challenge) {
      fail(OAUTH_ERRORS.INVALID_REQUEST, "code_challenge is required");
    }

    if (query.code_challenge_method !== OAUTH_CODE_CHALLENGE_METHOD) {
      fail(OAUTH_ERRORS.INVALID_REQUEST, "code_challenge_method must be S256");
    }

    const requested = parseScopeParam(query.scope);

    if (!requested.includes(OAUTH_SCOPES.OPENID)) {
      fail(OAUTH_ERRORS.INVALID_SCOPE, "scope must include openid");
    }

    const granted = resolveGrantedScopes(requested, client.scopes);

    if (granted.length !== requested.length) {
      fail(
        OAUTH_ERRORS.INVALID_SCOPE,
        "Requested scope exceeds what this client is registered for"
      );
    }

    return {
      clientId: client.clientId,
      redirectUri,
      responseType: OAUTH_RESPONSE_TYPE,
      scopes: granted,
      state,
      nonce: query.nonce,
      codeChallenge: query.code_challenge as string,
      codeChallengeMethod: OAUTH_CODE_CHALLENGE_METHOD,
      prompt: query.prompt
    };
  }

  private assertEntitled(
    client: WebAppDocument,
    session: SessionRecord,
    params: AuthorizeParams,
    audit: AppSignInAudit
  ): void {
    if (client.requiredRoles.length === 0) return;
    if (client.requiredRoles.includes(session.roles as never)) return;

    void this.auditAppSignIn({ ...audit, denied: true });

    throw new OAuthError({
      error: OAUTH_ERRORS.ACCESS_DENIED,
      description: "User is not entitled to this application",
      redirectUri: params.redirectUri,
      state: params.state
    });
  }

  private async issueCode(
    session: SessionRecord,
    params: AuthorizeParams
  ): Promise<string> {
    const code = await this.oauthRepo.storeCode({
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes,
      nonce: params.nonce,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      sub: session.userId,
      authId: session.authId,
      sid: session.sid,
      authTime: session.authTime
    });

    await this.sessionService.registerClient(session.sid, params.clientId);

    Logger.info("Authorization code issued", {
      clientId: params.clientId,
      userId: session.userId
    });

    return code;
  }

  /**
   * GET /oauth/authorize.
   *
   * Có hai đường vào: request mới (đầy đủ tham số) hoặc quay lại sau khi đăng
   * nhập (`auth_req=<id>` — tham số gốc đã được cất ở Redis nên user không sửa
   * được giữa chừng).
   */
  async authorize(req: Request): Promise<AuthorizeOutcome> {
    const query = req.query as Record<string, string | undefined>;

    const params = query.auth_req
      ? await this.restorePendingRequest(query.auth_req)
      : await this.buildParamsFromQuery(query);

    const client = await this.resolveClient(params.clientId);
    const session = await this.sessionService.resolve(req);

    if (!session) {
      // prompt=none nghĩa là client chỉ dò xem có phiên không, tuyệt đối không
      // được hiện bất kỳ UI nào (OIDC Core §3.1.2.1).
      if (params.prompt === OAUTH_PROMPT.NONE) {
        throw new OAuthError({
          error: OAUTH_ERRORS.LOGIN_REQUIRED,
          description: "No active session at the identity provider",
          redirectUri: params.redirectUri,
          state: params.state
        });
      }

      const requestId = await this.oauthRepo.storePendingRequest(params);

      // `app` chỉ để màn hình chờ nói được "đang chuyển về đâu" — tên hiển thị
      // vốn đã công khai trong catalog launcher, không phải thông tin nhạy cảm.
      // Nó KHÔNG được dùng cho bất kỳ quyết định bảo mật nào.
      return {
        kind: "login",
        url: buildRedirectUrl(`${ENV.CLIENT_URL}/login`, {
          auth_req: requestId,
          app: client.displayName
        })
      };
    }

    const audit: AppSignInAudit = {
      client,
      session,
      interactive: this.isInteractiveSignIn(query.auth_req, session),
      req,
      denied: false
    };

    this.assertEntitled(client, session, params, audit);

    const code = await this.issueCode(session, params);

    void this.auditAppSignIn(audit);

    return {
      kind: "redirect",
      url: buildRedirectUrl(params.redirectUri, {
        code,
        state: params.state,
        iss: ENV.OIDC_ISSUER
      })
    };
  }

  /**
   * A resumed request (`auth_req`) means the user was sent to the login page
   * for this app. The auth_time check rules out resuming on top of a session
   * that already existed — e.g. a login finished in another tab — so only a
   * login made within the pending request's lifetime counts as interactive.
   */
  private isInteractiveSignIn(
    authRequestId: string | undefined,
    session: SessionRecord
  ): boolean {
    if (!authRequestId) return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return (
      nowSeconds - session.authTime <= OAUTH_CONFIG.PENDING_REQUEST_TTL_SECONDS
    );
  }

  /**
   * Fire-and-forget: the redirect never waits on, or fails because of, the
   * audit write. The email lookup lives here rather than in the request path
   * because SessionRecord does not carry it.
   */
  private async auditAppSignIn({
    client,
    session,
    interactive,
    req,
    denied
  }: AppSignInAudit): Promise<void> {
    try {
      const user = await this.userService.findByAuthId(session.authId);
      if (!user) return;

      const payload = {
        userId: session.authId,
        usernameAttempted: user.email,
        app: {
          webAppId: client._id,
          clientName: client.displayName,
          interactive
        },
        req
      };

      if (denied) this.loginHistoryService.recordAppSignInDenied(payload);
      else this.loginHistoryService.recordAppSignIn(payload);
    } catch (error) {
      Logger.error("Failed to audit app sign-in", {
        error,
        clientId: client.clientId,
        authId: session.authId
      });
    }
  }

  private async buildParamsFromQuery(
    query: Record<string, string | undefined>
  ): Promise<AuthorizeParams> {
    const client = await this.resolveClient(query.client_id);
    this.assertRedirectUri(client, query.redirect_uri);
    return this.validateAuthorizeParams(client, query);
  }

  private async restorePendingRequest(id: string): Promise<AuthorizeParams> {
    const pending = await this.oauthRepo.consumePendingRequest(id);

    if (!pending) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        description: "Authorization request expired — please start again"
      });
    }

    return pending;
  }

  // ── token ──────────────────────────────────────────────────────────────

  /**
   * Xác thực client tại /oauth/token.
   *
   * Public client (tokenEndpointAuthMethod = "none") KHÔNG có secret — đây là
   * nhánh mà một SPA tĩnh như badminton đi. Khi đó PKCE là thứ duy nhất chứng
   * minh người đổi code chính là người khởi tạo request, nên secret vắng mặt
   * là đúng thiết kế chứ không phải thiếu sót.
   */
  private assertClientAuthentication(
    client: WebAppDocument,
    body: TokenRequestBody,
    authorizationHeader?: string
  ): void {
    if (client.tokenEndpointAuthMethod === "none") return;

    const provided =
      this.readBasicSecret(authorizationHeader) ?? body.client_secret;

    if (
      !provided ||
      !client.clientSecretHash ||
      !isValidHashedValue(provided, client.clientSecretHash)
    ) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_CLIENT,
        description: "Client authentication failed",
        status: STATUS_CODES.UNAUTHORIZED
      });
    }
  }

  private readBasicSecret(header?: string): string | undefined {
    if (!header?.startsWith("Basic ")) return undefined;

    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");

    if (separator === -1) return undefined;

    return decodeURIComponent(decoded.slice(separator + 1));
  }

  async exchangeToken(
    body: TokenRequestBody,
    authorizationHeader?: string
  ): Promise<TokenResponse> {
    if (body.grant_type !== OAUTH_GRANT_TYPE_AUTHORIZATION_CODE) {
      throw new OAuthError({
        error: OAUTH_ERRORS.UNSUPPORTED_GRANT_TYPE,
        description: "Only grant_type=authorization_code is supported"
      });
    }

    if (!body.code || !body.code_verifier) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        description: "code and code_verifier are required"
      });
    }

    const record = await this.oauthRepo.consumeCode(body.code);

    if (!record) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "Authorization code is invalid, expired or already used"
      });
    }

    const client = await this.resolveClient(record.clientId);

    if (body.client_id && body.client_id !== record.clientId) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "Authorization code was issued to a different client"
      });
    }

    if (body.redirect_uri && body.redirect_uri !== record.redirectUri) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "redirect_uri does not match the authorization request"
      });
    }

    this.assertClientAuthentication(client, body, authorizationHeader);

    if (!verifyPkceChallenge(body.code_verifier, record.codeChallenge)) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "PKCE verification failed"
      });
    }

    return this.issueTokens(record);
  }

  private async issueTokens(record: {
    clientId: string;
    scopes: string[];
    nonce?: string;
    sub: string;
    authId: string;
    sid: string;
    authTime: number;
  }): Promise<TokenResponse> {
    const claims = await this.loadClaims(record.authId, record.sub);

    const accessToken = signOAuthToken(
      {
        sub: record.sub,
        authId: record.authId,
        sid: record.sid,
        scope: record.scopes.join(" ")
      },
      record.clientId,
      OAUTH_CONFIG.ACCESS_TOKEN_TTL
    );

    const idToken = signOAuthToken(
      {
        sub: record.sub,
        sid: record.sid,
        auth_time: record.authTime,
        ...(record.nonce && { nonce: record.nonce }),
        ...filterClaimsByScopes(claims, record.scopes)
      },
      record.clientId,
      OAUTH_CONFIG.ID_TOKEN_TTL
    );

    Logger.info("OAuth tokens issued", {
      clientId: record.clientId,
      userId: record.sub
    });

    return {
      access_token: accessToken,
      id_token: idToken,
      token_type: OAUTH_TOKEN_TYPE,
      expires_in: OAUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
      scope: record.scopes.join(" ")
    };
  }

  // ── userinfo ───────────────────────────────────────────────────────────

  private async loadClaims(
    authId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    const [auth, user] = await Promise.all([
      this.authService.findById(authId),
      this.userService.findByAuthId(authId)
    ]);

    if (!user) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "User no longer exists",
        status: STATUS_CODES.UNAUTHORIZED
      });
    }

    return {
      sub: userId,
      name: user.fullName,
      picture: user.avatar ?? null,
      email: user.email,
      email_verified: Boolean(auth?.verifiedEmail)
    };
  }

  async getUserInfo(
    authId: string,
    userId: string,
    scope: string
  ): Promise<UserInfoResponse> {
    const claims = await this.loadClaims(authId, userId);
    const scopes = parseScopeParam(scope);

    return {
      sub: userId,
      ...filterClaimsByScopes(claims, scopes)
    } as UserInfoResponse;
  }

  // ── logout ─────────────────────────────────────────────────────────────

  /**
   * RP-initiated logout. Không có back-channel logout vì app vệ tinh tĩnh
   * (GitHub Pages) không có endpoint server để nhận webhook — access token TTL
   * 15 phút là thứ giới hạn bán kính ảnh hưởng thay cho nó.
   */
  async logout(req: Request, res: Response): Promise<string | null> {
    const query = req.query as Record<string, string | undefined>;
    await this.sessionService.end(req, res);

    const target = query.post_logout_redirect_uri;
    if (!target || !query.client_id) return null;

    const client = await this.webAppRepo.findByClientId(query.client_id);

    if (!client || !client.postLogoutRedirectUris.includes(target)) {
      return null;
    }

    return buildRedirectUrl(target, { state: query.state });
  }
}
