// types
import type { AdminAppsQuery } from "../types";
import type { AdminAppDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// dtos
import { toAdminAppDto } from "../dtos";
// others
import { buildWebAppFilter } from "../helpers";

export const listApps = async (
  deps: WebAppServiceDeps,
  query: AdminAppsQuery
): Promise<{ items: AdminAppDto[] }> => {
  const filter = buildWebAppFilter(query);
  const docs = await deps.webAppRepo.findAll(filter);
  return { items: docs.map(toAdminAppDto) };
};
