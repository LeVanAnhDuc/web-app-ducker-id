// types
import type { CategoryRepository } from "../repository/category.repository";
// common
import { toDto } from "@/common/dto";
// dtos
import { PublicCategoryDto } from "../dtos";

export const listPublic = async (
  categoryRepo: CategoryRepository
): Promise<PublicCategoryDto[]> => {
  const docs = await categoryRepo.findAll();
  return toDto(PublicCategoryDto, docs);
};
