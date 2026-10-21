// types
import type { Request, Response } from "express";
import type { TokenRequest } from "./types";
import type { OAuthService } from "./services";
// common
import { OAuthError } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
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
/**
 * Lỗi của /oauth/userinfo theo RFC 6750 §3.1: 401 kèm `WWW-Authenticate:
 * Bearer`. Thiếu token thì header KHÔNG mang mã lỗi (§3.1 — request không có
 * thông tin xác thực); token hỏng thì mang `error="invalid_token"`. Header
 * đặt lên `res` trước khi ném, handleOAuthError chỉ thêm status + body.
 */
const rejectBearer = (
  res: Response,
  description: string,
  hasToken: boolean
): OAuthError => {
  res.set(
    "WWW-Authenticate",
    hasToken
      ? `Bearer error="${OAUTH_ERRORS.INVALID_TOKEN}", error_description="${description}"`
      : "Bearer"
  );

  return new OAuthError({
    error: OAUTH_ERRORS.INVALID_TOKEN,
    description,
    status: STATUS_CODES.UNAUTHORIZED
  });
};

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
      throw rejectBearer(res, "Bearer access token is required", false);
    }

    let payload;

    try {
      payload = verifyOAuthAccessToken(header.slice(7));
    } catch {
      throw rejectBearer(res, "Access token is invalid or expired", true);
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
    res.redirect(target ?? ENV.app.clientUrl);
  };

  discovery = (_req: Request, res: Response): void => {
    const issuer = ENV.oidc.issuer;

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
