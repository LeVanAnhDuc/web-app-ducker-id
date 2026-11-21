// types
import type { AdminUsersFilter } from "@/modules/user/types";
import type { AdminUsersQueryDto } from "../dtos/requests";
import type { PageMeta } from "@/common/pagination";
import type { UserServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { AdminUserDto } from "../dtos";

export const getAdminUsers = async (
  deps: UserServiceDeps,
  query: AdminUsersQueryDto
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
    items: toDto(AdminUserDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
