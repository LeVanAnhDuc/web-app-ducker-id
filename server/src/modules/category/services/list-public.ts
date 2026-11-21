// types
import type { CategoryServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
// dtos
import { PublicCategoryDto } from "../dtos";

export const listPublic = async (
  deps: CategoryServiceDeps
): Promise<PublicCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAll();
  return toDto(PublicCategoryDto, docs);
};
