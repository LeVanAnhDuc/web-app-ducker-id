// types
import type { PaginatedResult } from "@/common/pagination";
import type { ContactStatus } from "./types";
import type {
  AdminContactsQueryDto,
  MyContactsQueryDto,
  SubmitContactBodyDto
} from "./dtos/requests";
import type { ContactRepository } from "./repository/contact-admin.repository";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { NotFoundError } from "@/exceptions";
// dtos
import {
  AdminContactDetailItemDto,
  ContactDetailItemDto,
  ContactListItemDto,
  SubmitContactResponseDto,
  UpdateContactStatusDto
} from "./dtos";
// others
import { CONTACT_STATUSES } from "./constants";
import { buildContactFilter } from "./helpers";
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export class ContactAdminService {
  constructor(private readonly contactRepo: ContactRepository) {}

  async submitContact(
    body: SubmitContactBodyDto,
    ipAddress: string | null
  ): Promise<SubmitContactResponseDto> {
    const { message, subject, email } = body;

    // MUST come from RequestContext (server-verified JWT), never from client body.
    const userId = RequestContext.getUserId() ?? null;

    const contact = await this.contactRepo.create({
      email,
      subject,
      message,
      status: CONTACT_STATUSES.NEW,
      userId,
      ipAddress
    });

    return toDto(SubmitContactResponseDto, contact);
  }

  async getContactList(
    query: AdminContactsQueryDto
  ): Promise<PaginatedResult<ContactListItemDto>> {
    const { page, limit, skip, sort } = resolvePaging(query);

    const filter = buildContactFilter(query);
    const { data, total } = await this.contactRepo.findAll(filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(ContactListItemDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  async getContactDetail(id: string): Promise<AdminContactDetailItemDto> {
    const doc = await this.contactRepo.findById(id);

    if (!doc) {
      throw new NotFoundError({
        key: "contactAdmin:errors.notFound",
        code: ERROR_CODES.CONTACT_NOT_FOUND
      });
    }

    return toDto(AdminContactDetailItemDto, doc);
  }

  async updateContactStatus(
    id: string,
    status: ContactStatus
  ): Promise<UpdateContactStatusDto> {
    const updated = await this.contactRepo.updateStatus(id, status);

    if (!updated) {
      throw new NotFoundError({
        key: "contactAdmin:errors.notFound",
        code: ERROR_CODES.CONTACT_NOT_FOUND
      });
    }

    return toDto(UpdateContactStatusDto, updated);
  }

  async getMyContacts(
    userId: string,
    query: MyContactsQueryDto
  ): Promise<PaginatedResult<ContactListItemDto>> {
    const { page, limit, skip, sort } = resolvePaging(query);

    const filter = buildContactFilter(query);
    const { data, total } = await this.contactRepo.findByUser(userId, filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(ContactListItemDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  async getMyContactDetail(
    id: string,
    userId: string
  ): Promise<ContactDetailItemDto> {
    const doc = await this.contactRepo.findByIdForUser(id, userId);

    if (!doc) {
      // Own vs. other-user's contact are indistinguishable to the caller —
      // both surface as 404 CONTACT_NOT_FOUND to avoid leaking existence.
      throw new NotFoundError({
        key: "contactAdmin:errors.notFound",
        code: ERROR_CODES.CONTACT_NOT_FOUND
      });
    }

    return toDto(ContactDetailItemDto, doc);
  }
}
