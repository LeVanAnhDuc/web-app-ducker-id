// types
import type { AdminAppsQueryDto } from "../dtos/requests";
import type { WebAppRepository } from "../repository/web-app.repository";
// common
import { toDto } from "@/common/dto";
// dtos
import { AdminAppDto } from "../dtos";
// others
import { buildWebAppFilter } from "../helpers";

export const listApps = async (
  webAppRepo: WebAppRepository,
  query: AdminAppsQueryDto
): Promise<{ items: AdminAppDto[] }> => {
  const filter = buildWebAppFilter(query);
  const docs = await webAppRepo.findAll(filter);
  return { items: toDto(AdminAppDto, docs) };
};
