// types
import type { CategoryRepository } from "../repository/category.repository";
// common
import { toDto } from "@/common/dto";
// dtos
import { AdminCategoryDto } from "../dtos";

export const list = async (
  categoryRepo: CategoryRepository
): Promise<AdminCategoryDto[]> => {
  const docs = await categoryRepo.findAllWithAppCount();
  return toDto(AdminCategoryDto, docs);
};
