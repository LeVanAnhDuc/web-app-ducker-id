// types
import type { WebAppDocument } from "@/modules/web-app/types";
import type { TokenRequestBody, TokenResponse } from "../types";
import type { OAuthServiceDeps } from "./deps";
// common
import { OAuthError } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
// modules
import { signOAuthToken } from "@/modules/token/helpers";
// others
import { Logger } from "@/libs/logger";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import {
  OAUTH_CONFIG,
  OAUTH_ERRORS,
  OAUTH_GRANT_TYPE_AUTHORIZATION_CODE,
  OAUTH_TOKEN_TYPE
} from "../constants";
import { filterClaimsByScopes, verifyPkceChallenge } from "../helpers";
import { loadClaims } from "./shared/load-claims";
import { resolveClient } from "./shared/resolve-client";

const readBasicSecret = (header?: string): string | undefined => {
  if (!header?.startsWith("Basic ")) return undefined;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");

  if (separator === -1) return undefined;

  return decodeURIComponent(decoded.slice(separator + 1));
};

/**
 * Xác thực client tại /oauth/token.
 *
 * Public client (tokenEndpointAuthMethod = "none") KHÔNG có secret — đây là
 * nhánh mà một SPA tĩnh như badminton đi. Khi đó PKCE là thứ duy nhất chứng
 * minh người đổi code chính là người khởi tạo request, nên secret vắng mặt
 * là đúng thiết kế chứ không phải thiếu sót.
 */
const assertClientAuthentication = (
  client: WebAppDocument,
  body: TokenRequestBody,
  authorizationHeader?: string
): void => {
  if (client.tokenEndpointAuthMethod === "none") return;

  const provided = readBasicSecret(authorizationHeader) ?? body.client_secret;

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
};

const issueTokens = async (
  deps: OAuthServiceDeps,
  record: {
    clientId: string;
    scopes: string[];
    nonce?: string;
    sub: string;
    authId: string;
    sid: string;
    authTime: number;
  }
): Promise<TokenResponse> => {
  const claims = await loadClaims(deps, record.authId, record.sub);

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
};

export const exchangeToken = async (
  deps: OAuthServiceDeps,
  body: TokenRequestBody,
  authorizationHeader?: string
): Promise<TokenResponse> => {
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

  const record = await deps.oauthRepo.consumeCode(body.code);

  if (!record) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_GRANT,
      description: "Authorization code is invalid, expired or already used"
    });
  }

  const client = await resolveClient(deps, record.clientId);

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

  assertClientAuthentication(client, body, authorizationHeader);

  if (!verifyPkceChallenge(body.code_verifier, record.codeChallenge)) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_GRANT,
      description: "PKCE verification failed"
    });
  }

  return issueTokens(deps, record);
};
