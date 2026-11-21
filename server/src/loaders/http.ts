// libs
import { Router } from "express";
// types
import type { Express } from "express";
import type { RedisClientType } from "redis";
// services
import { BULL_BOARD_PATH } from "@/services/queue/queue.module";
// middlewares
import { adminGuard, handleError, handleNotFound } from "@/middlewares";
// others
import { createHealthRouter } from "./health";

interface HttpParts {
  redis: RedisClientType;
  bullBoardRouter: Router;
  oauthRouter: Router;
  apiRouters: Router[];
}

export const mountHttp = (app: Express, parts: HttpParts): void => {
  app.use(BULL_BOARD_PATH, adminGuard, parts.bullBoardRouter);

  // OIDC discovery must sit at the origin root and `/oauth/*` is a public
  // path every registered satellite app has hard-coded, so this router is
  // mounted straight onto `app`, not under `/api/v1`.
  app.use(parts.oauthRouter);

  const v1Router = Router();
  parts.apiRouters.forEach((router) => v1Router.use(router));
  app.use("/api/v1", v1Router);

  app.use("/health", createHealthRouter(parts.redis));

  app.use(handleNotFound);
  app.use(handleError);
};
