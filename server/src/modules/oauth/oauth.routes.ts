// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { OAuthController } from "./oauth.controller";
// middlewares
import { handleOAuthError, handleOAuthUnexpectedError } from "@/middlewares";
// others
import { asyncHandler } from "@/utils/async-handler";

/**
 * KHÁC MỌI MODULE KHÁC: router này KHÔNG mount dưới `/api/v1`.
 *
 * OIDC Discovery bắt buộc `/.well-known/openid-configuration` nằm ở gốc
 * origin, và đường dẫn `/oauth/*` là một phần hợp đồng công khai mà app vệ
 * tinh cấu hình cứng. Xem `mountOAuthRoutes` trong modules.loader.ts.
 */
export const createOAuthRoutes = (
  controller: OAuthController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();

  router.get("/.well-known/openid-configuration", controller.discovery);
  router.get("/.well-known/jwks.json", controller.jwks);

  const oauth = Router();

  oauth.get("/authorize", rl.loginByIp, asyncHandler(controller.authorize));
  oauth.post("/token", rl.loginByIp, asyncHandler(controller.token));
  oauth.get("/userinfo", asyncHandler(controller.userInfo));
  oauth.get("/logout", asyncHandler(controller.logout));

  router.use("/oauth", oauth);

  // Error handler gắn ngay trên router này, chạy trước `handleError` toàn cục
  // để lỗi ra đúng shape { error, error_description } của spec.
  router.use(handleOAuthError);
  router.use(handleOAuthUnexpectedError);

  return router;
};
