// types
import type { MyContactsQueryDto } from "../dtos/requests";
import type { ContactRepository } from "../repository/contact-admin.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { ContactListItemDto } from "../dtos";
// others
import { buildContactFilter } from "../helpers";

export const getMyContacts = async (
  contactRepo: ContactRepository,
  userId: string,
  query: MyContactsQueryDto
): Promise<PaginatedResult<ContactListItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildContactFilter(query);
  const { data, total } = await contactRepo.findByUser(userId, filter, {
    skip,
    limit,
    sort
  });

  return {
    items: toDto(ContactListItemDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
