// types
import type { UserCategoryDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// dtos
import { toUserCategoryDto } from "../dtos";

export const listUserCategories = async (
  deps: WebAppServiceDeps
): Promise<UserCategoryDto[]> => {
  const docs = await deps.categoryRepo.findAll();
  return docs.map(toUserCategoryDto);
};
