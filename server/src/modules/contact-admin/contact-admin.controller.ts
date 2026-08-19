// types
import type { Response } from "express";
import type { ContactAdminService } from "./contact-admin.service";
import type {
  SubmitContactRequest,
  AdminContactsQueryRequest,
  ContactIdParamRequest,
  UpdateContactStatusRequest,
  MyContactsQueryRequest
} from "./types";
// common
import { OkSuccess, CreatedSuccess } from "@/common/responses";
// others
import { RequestContext } from "@/utils/request-context";

export class ContactAdminController {
  constructor(private readonly service: ContactAdminService) {}

  submit = async (req: SubmitContactRequest, res: Response): Promise<void> => {
    const data = await this.service.submitContact(req.body);
    new CreatedSuccess({
      data,
      message: "contactAdmin:success.submitted"
    }).send(req, res);
  };

  getContactList = async (
    req: AdminContactsQueryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getContactList(req.query);
    new OkSuccess({
      data,
      message: "contactAdmin:success.getContactList"
    }).send(req, res);
  };

  getContactDetail = async (
    req: ContactIdParamRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getContactDetail(req.params.id);
    new OkSuccess({
      data,
      message: "contactAdmin:success.getContactDetail"
    }).send(req, res);
  };

  updateContactStatus = async (
    req: UpdateContactStatusRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.updateContactStatus(
      req.params.id,
      req.body.status
    );
    new OkSuccess({
      data,
      message: "contactAdmin:success.updateContactStatus"
    }).send(req, res);
  };

  getMyContacts = async (
    req: MyContactsQueryRequest,
    res: Response
  ): Promise<void> => {
    const userId = RequestContext.requireUserId();
    const data = await this.service.getMyContacts(userId, req.query);
    new OkSuccess({
      data,
      message: "contactAdmin:success.getMyContacts"
    }).send(req, res);
  };

  getMyContactDetail = async (
    req: ContactIdParamRequest,
    res: Response
  ): Promise<void> => {
    const userId = RequestContext.requireUserId();
    const data = await this.service.getMyContactDetail(req.params.id, userId);
    new OkSuccess({
      data,
      message: "contactAdmin:success.getMyContactDetail"
    }).send(req, res);
  };
}
