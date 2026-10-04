// types
import type {
  AdminContactsQuery,
  ContactStatus,
  MyContactsQuery,
  PaginatedResult,
  SubmitContactBody
} from "../types";
import type {
  ContactDetailItemDto,
  ContactListItemDto,
  SubmitContactResponseDto,
  UpdateContactStatusDto
} from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// others
import { getContactDetail } from "./get-contact-detail";
import { getContactList } from "./get-contact-list";
import { getMyContactDetail } from "./get-my-contact-detail";
import { getMyContacts } from "./get-my-contacts";
import { submitContact } from "./submit-contact";
import { updateContactStatus } from "./update-contact-status";

export class ContactAdminService {
  constructor(private readonly contactRepo: ContactRepository) {}

  submitContact(body: SubmitContactBody): Promise<SubmitContactResponseDto> {
    return submitContact(this.contactRepo, body);
  }

  getContactList(
    query: AdminContactsQuery
  ): Promise<PaginatedResult<ContactListItemDto>> {
    return getContactList(this.contactRepo, query);
  }

  getContactDetail(id: string): Promise<ContactDetailItemDto> {
    return getContactDetail(this.contactRepo, id);
  }

  updateContactStatus(
    id: string,
    status: ContactStatus
  ): Promise<UpdateContactStatusDto> {
    return updateContactStatus(this.contactRepo, id, status);
  }

  getMyContacts(
    userId: string,
    query: MyContactsQuery
  ): Promise<PaginatedResult<ContactListItemDto>> {
    return getMyContacts(this.contactRepo, userId, query);
  }

  getMyContactDetail(
    id: string,
    userId: string
  ): Promise<ContactDetailItemDto> {
    return getMyContactDetail(this.contactRepo, id, userId);
  }
}
