// types
import type { Express, Router } from "express";
import type { RedisClientType } from "redis";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
// common
import { mountControllers } from "@/common/routing";
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
  controllers: object[];
  rateLimiters: RateLimiters;
}

export const mountHttp = (app: Express, parts: HttpParts): void => {
  app.use(BULL_BOARD_PATH, adminGuard, parts.bullBoardRouter);

  // OIDC discovery must sit at the origin root and `/oauth/*` is a public
  // path every registered satellite app has hard-coded, so this router is
  // mounted straight onto `app`, not under `/api/v1`.
  app.use(parts.oauthRouter);

  // Every /api/v1 route is an annotated controller. handleNotFound and
  // handleError below must stay after this call: mountControllers stops the
  // request after a controller answers, because routing-controllers calls
  // next() once it has sent a response.
  mountControllers(app, parts.controllers, parts.rateLimiters);

  app.use("/health", createHealthRouter(parts.redis));

  app.use(handleNotFound);
  app.use(handleError);
};
