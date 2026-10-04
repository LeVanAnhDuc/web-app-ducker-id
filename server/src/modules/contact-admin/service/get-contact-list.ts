// types
import type { AdminContactsQuery, PaginatedResult } from "../types";
import type { ContactListItemDto } from "../dtos";
import type { ContactRepository } from "../repository/contact-admin.repository";
// common
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toContactListItemDto } from "../dtos";
// others
import { buildContactFilter } from "../helpers";

export const getContactList = async (
  contactRepo: ContactRepository,
  query: AdminContactsQuery
): Promise<PaginatedResult<ContactListItemDto>> => {
  const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
  const {
    page = DEFAULT_PAGE,
    limit: rawLimit = DEFAULT_LIMIT,
    sortBy = "createdAt",
    sortOrder: rawSortOrder = "desc"
  } = query;

  const limit = Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const sortOrder = resolveSortDirection(rawSortOrder);

  const filter = buildContactFilter(query);
  const { data, total } = await contactRepo.findAll(filter, {
    skip,
    limit,
    sort: { [sortBy]: sortOrder }
  });

  return {
    items: data.map(toContactListItemDto),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};
