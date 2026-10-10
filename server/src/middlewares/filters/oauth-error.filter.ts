// types
import type { ErrorRequestHandler } from "express";
// common
import { OAuthError } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
// modules
import { OAUTH_ERRORS } from "@/modules/oauth/constants";
import { buildRedirectUrl } from "@/modules/oauth/helpers";
// others
import { Logger } from "@/libs/logger";

/**
 * Error handler gắn riêng vào router OAuth, chạy TRƯỚC `handleError` toàn cục.
 *
 * Hai kiểu trả lỗi theo RFC 6749:
 * - đã xác thực được redirect_uri → 302 kèm ?error=... (§4.1.2.1)
 * - chưa xác thực được → JSON { error, error_description } (§5.2). Tuyệt đối
 *   không redirect ở nhánh này, vì redirect_uri chưa đáng tin.
 */
export const handleOAuthError: ErrorRequestHandler = (err, _req, res, next) => {
  if (!(err instanceof OAuthError)) {
    next(err);
    return;
  }

  Logger.warn("OAuth request rejected", {
    error: err.oauthError,
    description: err.description
  });

  if (err.redirectUri) {
    const url = buildRedirectUrl(err.redirectUri, {
      error: err.oauthError,
      error_description: err.description,
      state: err.state
    });

    res.redirect(url);
    return;
  }

  res.status(err.status).json({
    error: err.oauthError,
    ...(err.description && { error_description: err.description })
  });
};

/** Lỗi không lường trước trong luồng OAuth vẫn phải ra đúng shape của spec. */
export const handleOAuthUnexpectedError: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next
) => {
  Logger.error("Unexpected error in OAuth flow", {
    error: err instanceof Error ? err.message : err
  });

  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    error: OAUTH_ERRORS.SERVER_ERROR
  });
};
