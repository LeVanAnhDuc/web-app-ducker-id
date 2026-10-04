// types
import type { Request, Response } from "express";
import type { TokenRequest } from "./types";
import type { OAuthService } from "./oauth.service";
// common
import { OAuthError } from "@/common/exceptions";
// others
import ENV from "@/constants/env";
import { getPublicJwk, SIGNING_ALGORITHM } from "@/libs/jwks";
import {
  OAUTH_CODE_CHALLENGE_METHOD,
  OAUTH_ERRORS,
  OAUTH_GRANT_TYPE_AUTHORIZATION_CODE,
  OAUTH_RESPONSE_TYPE,
  OAUTH_SUPPORTED_SCOPES
} from "./constants";
import { verifyOAuthAccessToken } from "@/modules/token/helpers";

/**
 * Controller này CỐ Ý không dùng `OkSuccess`/`ResponsePattern` như mọi module
 * khác: RFC 6749 §5.1 và OIDC Discovery quy định body phải là JSON phẳng đúng
 * shape chuẩn. Bọc thêm envelope sẽ làm mọi thư viện OIDC client không parse
 * được. Đây là ngoại lệ duy nhất trong codebase.
 */
export class OAuthController {
  constructor(private readonly service: OAuthService) {}

  authorize = async (req: Request, res: Response): Promise<void> => {
    const outcome = await this.service.authorize(req);
    res.redirect(outcome.url);
  };

  token = async (req: TokenRequest, res: Response): Promise<void> => {
    const tokens = await this.service.exchangeToken(
      req.body,
      req.headers.authorization
    );

    // Token không bao giờ được cache ở proxy hay trình duyệt (RFC 6749 §5.1).
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.json(tokens);
  };

  userInfo = async (req: Request, res: Response): Promise<void> => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        description: "Bearer access token is required"
      });
    }

    let payload;

    try {
      payload = verifyOAuthAccessToken(header.slice(7));
    } catch {
      throw new OAuthError({
        error: OAUTH_ERRORS.INVALID_GRANT,
        description: "Access token is invalid or expired"
      });
    }

    const info = await this.service.getUserInfo(
      payload.authId,
      payload.sub,
      payload.scope
    );

    res.set("Cache-Control", "no-store");
    res.json(info);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const target = await this.service.logout(req, res);
    res.redirect(target ?? ENV.CLIENT_URL);
  };

  discovery = (_req: Request, res: Response): void => {
    const issuer = ENV.OIDC_ISSUER;

    res.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      end_session_endpoint: `${issuer}/oauth/logout`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      response_types_supported: [OAUTH_RESPONSE_TYPE],
      grant_types_supported: [OAUTH_GRANT_TYPE_AUTHORIZATION_CODE],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: [SIGNING_ALGORITHM],
      scopes_supported: OAUTH_SUPPORTED_SCOPES,
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
        "none"
      ],
      code_challenge_methods_supported: [OAUTH_CODE_CHALLENGE_METHOD],
      claims_supported: [
        "sub",
        "name",
        "picture",
        "email",
        "email_verified",
        "auth_time",
        "sid",
        "nonce"
      ]
    });
  };

  jwks = (_req: Request, res: Response): void => {
    res.json({ keys: [getPublicJwk()] });
  };
}
