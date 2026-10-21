// common
import { STATUS_CODES } from "@/common/http";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { AppError } from "./base.exception";

export interface OAuthErrorOptions {
  /** Mã lỗi theo chuẩn OAuth/OIDC — giá trị của field `error` trong response. */
  error: string;
  description?: string;
  status?: number;
  /**
   * Khi đã xác thực được redirect_uri thì lỗi phải quay về client qua redirect
   * (RFC 6749 §4.1.2.1). Bỏ trống → trả JSON, dùng cho trường hợp client_id
   * hoặc redirect_uri không hợp lệ, lúc đó redirect là lỗ hổng open redirect.
   */
  redirectUri?: string;
  state?: string;
}

/**
 * Lỗi của luồng OAuth. Không dùng envelope ErrorPattern chung vì RFC 6749 §5.2
 * quy định body phải là { error, error_description } — app vệ tinh và thư viện
 * OIDC dựa vào đúng shape đó. Được format bởi `handleOAuthError`.
 */
export class OAuthError extends AppError {
  readonly oauthError: string;
  readonly description?: string;
  readonly redirectUri?: string;
  readonly state?: string;

  constructor(opts: OAuthErrorOptions) {
    super({
      status: opts.status ?? STATUS_CODES.BAD_REQUEST,
      code: ERROR_CODES.OAUTH_ERROR,
      message: opts.description ?? opts.error
    });
    this.name = "OAuthError";
    this.oauthError = opts.error;
    this.description = opts.description;
    this.redirectUri = opts.redirectUri;
    this.state = opts.state;
  }
}
