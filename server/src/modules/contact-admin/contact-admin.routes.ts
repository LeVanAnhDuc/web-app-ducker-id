// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ContactAdminController } from "./contact-admin.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  AdminContactsQueryDto,
  ContactIdParamsDto,
  MyContactsQueryDto,
  SubmitContactBodyDto,
  UpdateContactStatusBodyDto
} from "@/modules/contact-admin/dtos/requests";
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
    bodyPipe(SubmitContactBodyDto),
    handle(controller.submit, {
      status: StatusCodes.CREATED,
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
    queryPipe(AdminContactsQueryDto),
    handle(controller.getContactList, {
      message: "contactAdmin:success.getContactList"
    })
  );

  adminContacts.get(
    "/:id",
    paramsPipe(ContactIdParamsDto),
    handle(controller.getContactDetail, {
      message: "contactAdmin:success.getContactDetail"
    })
  );

  adminContacts.patch(
    "/:id/status",
    paramsPipe(ContactIdParamsDto),
    bodyPipe(UpdateContactStatusBodyDto),
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
    queryPipe(MyContactsQueryDto),
    handle(controller.getMyContacts, {
      message: "contactAdmin:success.getMyContacts"
    })
  );

  myContacts.get(
    "/:id",
    paramsPipe(ContactIdParamsDto),
    handle(controller.getMyContactDetail, {
      message: "contactAdmin:success.getMyContactDetail"
    })
  );

  router.use("/contacts", myContacts);
  return router;
};
