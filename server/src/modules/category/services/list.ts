// types
import type { CategoryServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
// dtos
import { AdminCategoryDto } from "../dtos";

export const list = async (
  deps: CategoryServiceDeps
): Promise<AdminCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAllWithAppCount();
  return toDto(AdminCategoryDto, docs);
};
