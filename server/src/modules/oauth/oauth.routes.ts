// libs
import { Router } from "express";
// types
import type { RateLimiters } from "@/middlewares";
import type { OAuthController } from "./oauth.controller";
// middlewares
import { handleOAuthError, handleOAuthUnexpectedError } from "@/middlewares";
/**
 * KHÁC MỌI MODULE KHÁC: router này KHÔNG mount dưới `/api/v1`.
 *
 * OIDC Discovery bắt buộc `/.well-known/openid-configuration` nằm ở gốc
 * origin, và đường dẫn `/oauth/*` là một phần hợp đồng công khai mà app vệ
 * tinh cấu hình cứng. Xem `mountHttp` trong loaders/http.ts.
 */
export const createOAuthRoutes = (
  controller: OAuthController,
  rl: RateLimiters
): Router => {
  const router = Router();

  router.get("/.well-known/openid-configuration", controller.discovery);
  router.get("/.well-known/jwks.json", controller.jwks);

  const oauth = Router();

  oauth.get("/authorize", rl.loginByIp, controller.authorize);
  oauth.post("/token", rl.loginByIp, controller.token);
  oauth.get("/userinfo", controller.userInfo);
  oauth.get("/logout", controller.logout);

  router.use("/oauth", oauth);

  // Error handler gắn ngay trên router này, chạy trước `handleError` toàn cục
  // để lỗi ra đúng shape { error, error_description } của spec.
  router.use(handleOAuthError);
  router.use(handleOAuthUnexpectedError);

  return router;
};
