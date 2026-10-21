// types
import type { Express } from "express";
// others
import { Logger } from "@/libs/logger";
import { connectInfrastructure } from "./infrastructure";
import { createServices } from "./services";
import { createModules } from "./modules";
import { mountHttp } from "./http";

/**
 * The composition root: connect → wire → mount. Returns the shutdown, which
 * closes in reverse order — queues first, since their workers still use Redis.
 * Failures are not logged here; `server.ts` logs them once and exits.
 */
export const bootstrap = async (app: Express): Promise<() => Promise<void>> => {
  const infrastructure = await connectInfrastructure();
  const services = createServices();
  const { oauthRouter, apiRouters } = createModules({
    redis: infrastructure.redis,
    emailDispatcher: services.emailDispatcher,
    notificationDispatcher: services.notificationDispatcher
  });

  mountHttp(app, {
    redis: infrastructure.redis,
    bullBoardRouter: services.bullBoardRouter,
    oauthRouter,
    apiRouters
  });

  Logger.info("Server bootstrapped");

  return async () => {
    await services.close();
    await infrastructure.close();
  };
};
