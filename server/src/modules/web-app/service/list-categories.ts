// types
import type { AdminCategoryDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// dtos
import { toAdminCategoryDto } from "../dtos";

export const listCategories = async (
  deps: WebAppServiceDeps
): Promise<AdminCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAll();
  return docs.map(toAdminCategoryDto);
};
