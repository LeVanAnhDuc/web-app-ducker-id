// types
import type {
  AdminUserListMeta,
  AdminUsersFilter,
  AdminUsersQuery
} from "@/modules/user/types";
import type { AdminUserDto } from "../dtos";
import type { UserServiceDeps } from "./deps";
// common
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toAdminUserDto } from "../dtos";

export const getAdminUsers = async (
  deps: UserServiceDeps,
  query: AdminUsersQuery
): Promise<{ items: AdminUserDto[]; meta: AdminUserListMeta }> => {
  const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
  const {
    page = DEFAULT_PAGE,
    limit: rawLimit = DEFAULT_LIMIT,
    sortBy = "createdAt",
    sortOrder: rawSortOrder,
    search,
    role,
    status
  } = query;

  const limit = Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const sortOrder = resolveSortDirection(rawSortOrder);

  const filter: AdminUsersFilter = {
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(status ? { isActive: status === "active" } : {})
  };

  const { data, total } = await deps.userRepo.findAdminUsers(filter, {
    skip,
    limit,
    sort: { [sortBy]: sortOrder }
  });

  return {
    items: data.map(toAdminUserDto),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
