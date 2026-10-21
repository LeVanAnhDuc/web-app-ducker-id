// libs
import { Router } from "express";
// types
import type { TokenController } from "./token.controller";
// common
import { handle } from "@/common/responses";
// others

export const createTokenRoutes = (controller: TokenController): Router => {
  const router = Router();
  const token = Router();

  token.post(
    "/refresh",
    handle(controller.refreshToken, { message: "login:success.tokenRefreshed" })
  );

  router.use("/auth/token", token);
  return router;
};
