// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ContactAdminController } from "./contact-admin.controller";
// validators
import {
  submitContactSchema,
  contactIdParamSchema,
  updateContactStatusSchema,
  adminListContactsQuerySchema,
  myContactsQuerySchema
} from "@/validators/schemas/contact-admin";
// others
import {
  adminGuard,
  authGuard,
  optionalAuthGuard,
  bodyPipe,
  paramsPipe,
  queryPipe
} from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createContactRoutes = (
  controller: ContactAdminController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const contact = Router();

  contact.post(
    "/submit",
    rl.contactByIp,
    optionalAuthGuard,
    bodyPipe(submitContactSchema),
    asyncHandler(controller.submit)
  );

  router.use("/contact", contact);
  return router;
};

export const createAdminContactsRoutes = (
  controller: ContactAdminController
): Router => {
  const router = Router();
  const adminContacts = Router();

  adminContacts.use(authGuard, adminGuard);

  adminContacts.get(
    "/",
    queryPipe(adminListContactsQuerySchema),
    asyncHandler(controller.getContactList)
  );

  adminContacts.get(
    "/:id",
    paramsPipe(contactIdParamSchema),
    asyncHandler(controller.getContactDetail)
  );

  adminContacts.patch(
    "/:id/status",
    paramsPipe(contactIdParamSchema),
    bodyPipe(updateContactStatusSchema),
    asyncHandler(controller.updateContactStatus)
  );

  router.use("/admin/contacts", adminContacts);
  return router;
};

export const createMyContactsRoutes = (
  controller: ContactAdminController
): Router => {
  const router = Router();
  const myContacts = Router();

  myContacts.use(authGuard);

  myContacts.get(
    "/",
    queryPipe(myContactsQuerySchema),
    asyncHandler(controller.getMyContacts)
  );

  myContacts.get(
    "/:id",
    paramsPipe(contactIdParamSchema),
    asyncHandler(controller.getMyContactDetail)
  );

  router.use("/contacts", myContacts);
  return router;
};
