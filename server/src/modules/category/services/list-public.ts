// types
import type { PublicCategoryDto } from "../dtos";
import type { CategoryServiceDeps } from "./deps";
// dtos
import { toPublicCategoryDto } from "../dtos";

export const listPublic = async (
  deps: CategoryServiceDeps
): Promise<PublicCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAll();
  return docs.map(toPublicCategoryDto);
};
