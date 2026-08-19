// types
import type { RateLimiterMiddleware } from "@/middlewares";
// others
import { MongoContactRepository } from "./contact-admin.repository";
import { ContactAdminService } from "./contact-admin.service";
import { ContactAdminController } from "./contact-admin.controller";
import {
  createContactRoutes,
  createAdminContactsRoutes,
  createMyContactsRoutes
} from "./contact-admin.routes";

export const createContactAdminModule = (
  rateLimiter: RateLimiterMiddleware
) => {
  const contactRepo = new MongoContactRepository();
  const service = new ContactAdminService(contactRepo);
  const controller = new ContactAdminController(service);

  return {
    contactAdminRouter: createContactRoutes(controller, rateLimiter),
    adminContactsRouter: createAdminContactsRoutes(controller),
    myContactsRouter: createMyContactsRoutes(controller)
  };
};
