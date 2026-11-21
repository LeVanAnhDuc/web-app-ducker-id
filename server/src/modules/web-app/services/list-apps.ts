// types
import type { AdminAppsQueryDto } from "../dtos/requests";
import type { WebAppServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
// dtos
import { AdminAppDto } from "../dtos";
// others
import { buildWebAppFilter } from "../helpers";

export const listApps = async (
  deps: WebAppServiceDeps,
  query: AdminAppsQueryDto
): Promise<{ items: AdminAppDto[] }> => {
  const filter = buildWebAppFilter(query);
  const docs = await deps.webAppRepo.findAll(filter);
  return { items: toDto(AdminAppDto, docs) };
};
