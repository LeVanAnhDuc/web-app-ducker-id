// types
import type { AdminContactsQueryDto } from "../dtos/requests";
import type { ContactRepository } from "../repository/contact-admin.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { ContactListItemDto } from "../dtos";
// others
import { buildContactFilter } from "../helpers";

export const getContactList = async (
  contactRepo: ContactRepository,
  query: AdminContactsQueryDto
): Promise<PaginatedResult<ContactListItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildContactFilter(query);
  const { data, total } = await contactRepo.findAll(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: toDto(ContactListItemDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
