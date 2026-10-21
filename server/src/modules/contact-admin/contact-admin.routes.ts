// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ContactAdminController } from "./contact-admin.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
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
    handle(controller.submit, {
      status: STATUS_CODES.CREATED,
      message: "contactAdmin:success.submitted"
    })
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
    handle(controller.getContactList, {
      message: "contactAdmin:success.getContactList"
    })
  );

  adminContacts.get(
    "/:id",
    paramsPipe(contactIdParamSchema),
    handle(controller.getContactDetail, {
      message: "contactAdmin:success.getContactDetail"
    })
  );

  adminContacts.patch(
    "/:id/status",
    paramsPipe(contactIdParamSchema),
    bodyPipe(updateContactStatusSchema),
    handle(controller.updateContactStatus, {
      message: "contactAdmin:success.updateContactStatus"
    })
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
    handle(controller.getMyContacts, {
      message: "contactAdmin:success.getMyContacts"
    })
  );

  myContacts.get(
    "/:id",
    paramsPipe(contactIdParamSchema),
    handle(controller.getMyContactDetail, {
      message: "contactAdmin:success.getMyContactDetail"
    })
  );

  router.use("/contacts", myContacts);
  return router;
};
