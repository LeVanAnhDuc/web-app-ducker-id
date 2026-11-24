// types
import type { Express, Router } from "express";
import type { OpenAPIV3 } from "openapi-types";
import type { RedisClientType } from "redis";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
// common
import { mountControllers } from "@/common/routing";
// services
import { BULL_BOARD_PATH } from "@/services/queue/queue.module";
// libs
import { buildOpenApiSpec, setupSwagger } from "@/libs/swagger";
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
  // /api-docs goes first: below mountControllers the /api/v1 stop step, the
  // 404 and the error handler are all registered. The document is built once
  // the controllers are mounted, and served by reference from then on.
  const docs: { spec?: OpenAPIV3.Document } = {};
  setupSwagger(app, () => {
    if (!docs.spec) throw new Error("The OpenAPI document is not built yet");
    return docs.spec;
  });

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
  docs.spec = buildOpenApiSpec(parts.controllers);

  app.use("/health", createHealthRouter(parts.redis));

  app.use(handleNotFound);
  app.use(handleError);
};
