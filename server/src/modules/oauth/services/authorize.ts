// types
import type { Request } from "express";
import type { WebAppDocument } from "@/modules/web-app/types";
import type { SessionRecord } from "@/modules/session/types";
import type {
  AppSignInAudit,
  AuthorizeOutcome,
  AuthorizeParams
} from "../types";
import type { OAuthServiceDeps } from "./deps";
// common
import { OAuthError } from "@/common/exceptions";
// others
import ENV from "@/constants/env";
import { Logger } from "@/libs/logger";
import {
  OAUTH_CODE_CHALLENGE_METHOD,
  OAUTH_CONFIG,
  OAUTH_ERRORS,
  OAUTH_PROMPT,
  OAUTH_RESPONSE_TYPE,
  OAUTH_SCOPES
} from "../constants";
import {
  buildRedirectUrl,
  matchRedirectUri,
  parseScopeParam,
  resolveGrantedScopes
} from "../helpers";
import { resolveClient } from "./shared/resolve-client";
import { canAccessApp } from "@/modules/entitlement/entitlement.helper";

const assertRedirectUri = (
  client: WebAppDocument,
  redirectUri?: string
): void => {
  if (!redirectUri || !matchRedirectUri(client.redirectUris, redirectUri)) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_REQUEST,
      description: "redirect_uri does not match a registered value"
    });
  }
};

/** Validate phần còn lại — từ đây lỗi đã có thể redirect về client. */
const validateAuthorizeParams = (
  client: WebAppDocument,
  query: Record<string, string | undefined>
): AuthorizeParams => {
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
};

/**
 * Fire-and-forget: the redirect never waits on, or fails because of, the
 * audit write. The email lookup lives here rather than in the request path
 * because SessionRecord does not carry it.
 */
const auditAppSignIn = async (
  deps: OAuthServiceDeps,
  { client, session, interactive, req, denied }: AppSignInAudit
): Promise<void> => {
  try {
    const user = await deps.userService.findByAuthId(session.authId);
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

    if (denied) {
      deps.loginHistoryService.recordAppSignInDenied(payload);
      return;
    }

    deps.loginHistoryService.recordAppSignIn(payload);
    await deps.recentAppService.record(
      user._id.toString(),
      client._id.toString()
    );
  } catch (error) {
    Logger.error("Failed to audit app sign-in", {
      error,
      clientId: client.clientId,
      authId: session.authId
    });
  }
};

/** Same rule as the launcher: the role default plus the user's overrides. */
const assertEntitled = async (
  deps: OAuthServiceDeps,
  client: WebAppDocument,
  session: SessionRecord,
  params: AuthorizeParams,
  audit: AppSignInAudit
): Promise<void> => {
  const scope = await deps.accessPolicy.resolveScope(
    session.userId,
    session.roles
  );
  if (canAccessApp(client, scope)) return;

  void auditAppSignIn(deps, { ...audit, denied: true });

  throw new OAuthError({
    error: OAUTH_ERRORS.ACCESS_DENIED,
    description: "User is not entitled to this application",
    redirectUri: params.redirectUri,
    state: params.state
  });
};

const issueCode = async (
  deps: OAuthServiceDeps,
  session: SessionRecord,
  params: AuthorizeParams
): Promise<string> => {
  const code = await deps.oauthRepo.storeCode({
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

  await deps.sessionService.registerClient(session.sid, params.clientId);

  Logger.info("Authorization code issued", {
    clientId: params.clientId,
    userId: session.userId
  });

  return code;
};

/**
 * A resumed request (`auth_req`) means the user was sent to the login page
 * for this app. The auth_time check rules out resuming on top of a session
 * that already existed — e.g. a login finished in another tab — so only a
 * login made within the pending request's lifetime counts as interactive.
 */
const isInteractiveSignIn = (
  authRequestId: string | undefined,
  session: SessionRecord
): boolean => {
  if (!authRequestId) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return (
    nowSeconds - session.authTime <= OAUTH_CONFIG.PENDING_REQUEST_TTL_SECONDS
  );
};

const buildParamsFromQuery = async (
  deps: OAuthServiceDeps,
  query: Record<string, string | undefined>
): Promise<AuthorizeParams> => {
  const client = await resolveClient(deps, query.client_id);
  assertRedirectUri(client, query.redirect_uri);
  return validateAuthorizeParams(client, query);
};

const restorePendingRequest = async (
  deps: OAuthServiceDeps,
  id: string
): Promise<AuthorizeParams> => {
  const pending = await deps.oauthRepo.consumePendingRequest(id);

  if (!pending) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_REQUEST,
      description: "Authorization request expired — please start again"
    });
  }

  return pending;
};

/**
 * GET /oauth/authorize.
 *
 * Có hai đường vào: request mới (đầy đủ tham số) hoặc quay lại sau khi đăng
 * nhập (`auth_req=<id>` — tham số gốc đã được cất ở Redis nên user không sửa
 * được giữa chừng).
 */
export const authorize = async (
  deps: OAuthServiceDeps,
  req: Request
): Promise<AuthorizeOutcome> => {
  const query = req.query as Record<string, string | undefined>;

  const params = query.auth_req
    ? await restorePendingRequest(deps, query.auth_req)
    : await buildParamsFromQuery(deps, query);

  const client = await resolveClient(deps, params.clientId);
  const session = await deps.sessionService.resolve(req);

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

    const requestId = await deps.oauthRepo.storePendingRequest(params);

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
    interactive: isInteractiveSignIn(query.auth_req, session),
    req,
    denied: false
  };

  await assertEntitled(deps, client, session, params, audit);

  const code = await issueCode(deps, session, params);

  void auditAppSignIn(deps, audit);

  return {
    kind: "redirect",
    url: buildRedirectUrl(params.redirectUri, {
      code,
      state: params.state,
      iss: ENV.OIDC_ISSUER
    })
  };
};
