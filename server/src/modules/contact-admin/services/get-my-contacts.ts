// types
import type { MyContactsQuery } from "../types";
import type { ContactListItemDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toContactListItemDto } from "../dtos";
// others
import { buildContactFilter } from "../helpers";

export const getMyContacts = async (
  contactRepo: ContactRepository,
  userId: string,
  query: MyContactsQuery
): Promise<PaginatedResult<ContactListItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildContactFilter(query);
  const { data, total } = await contactRepo.findByUser(userId, filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toContactListItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
