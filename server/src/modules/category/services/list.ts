// types
import type { AdminCategoryDto } from "../dtos";
import type { CategoryServiceDeps } from "./deps";
// dtos
import { toAdminCategoryDto } from "../dtos";

export const list = async (
  deps: CategoryServiceDeps
): Promise<AdminCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAllWithAppCount();
  return docs.map(toAdminCategoryDto);
};
