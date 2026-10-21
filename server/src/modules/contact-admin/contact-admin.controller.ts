// types
import type { ContactAdminService } from "./services";
import type {
  SubmitContactRequest,
  AdminContactsQueryRequest,
  ContactIdParamRequest,
  UpdateContactStatusRequest,
  MyContactsQueryRequest
} from "./types";
// others
import { RequestContext } from "@/utils/request-context";

export class ContactAdminController {
  constructor(private readonly service: ContactAdminService) {}

  submit = async (req: SubmitContactRequest) =>
    this.service.submitContact(req.body, req.ip ?? null);

  getContactList = async (req: AdminContactsQueryRequest) =>
    this.service.getContactList(req.query);

  getContactDetail = async (req: ContactIdParamRequest) =>
    this.service.getContactDetail(req.params.id);

  updateContactStatus = async (req: UpdateContactStatusRequest) =>
    this.service.updateContactStatus(req.params.id, req.body.status);

  getMyContacts = async (req: MyContactsQueryRequest) => {
    const userId = RequestContext.requireUserId();
    return this.service.getMyContacts(userId, req.query);
  };

  getMyContactDetail = async (req: ContactIdParamRequest) => {
    const userId = RequestContext.requireUserId();
    return this.service.getMyContactDetail(req.params.id, userId);
  };
}
