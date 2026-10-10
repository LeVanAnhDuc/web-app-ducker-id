// types
import type { AdminUsersFilter, AdminUsersQuery } from "@/modules/user/types";
import type { AdminUserDto } from "../dtos";
import type { PageMeta } from "@/common/pagination";
import type { UserServiceDeps } from "./deps";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toAdminUserDto } from "../dtos";

export const getAdminUsers = async (
  deps: UserServiceDeps,
  query: AdminUsersQuery
): Promise<{ items: AdminUserDto[]; meta: PageMeta }> => {
  const { page, limit, skip, sort } = resolvePaging(query);
  const { search, role, status } = query;

  const filter: AdminUsersFilter = {
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(status ? { isActive: status === "active" } : {})
  };

  const { data, total } = await deps.userRepo.findAdminUsers(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toAdminUserDto),
    meta: toPageMeta(total, page, limit)
  };
};
