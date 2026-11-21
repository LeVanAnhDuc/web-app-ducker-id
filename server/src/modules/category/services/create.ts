// types
import type { CreateCategoryBodyDto } from "../dtos/requests";
import type { CategoryRepository } from "../repository/category.repository";
// common
import { toDto } from "@/common/dto";
import { ConflictRequestError } from "@/exceptions";
// dtos
import { AdminCategoryDto } from "../dtos";
// others
import { generateSlug, withSlugRetry } from "./shared/generate-slug";
import { ERROR_CODES } from "@/constants/error-code";

export const create = async (
  categoryRepo: CategoryRepository,
  body: CreateCategoryBodyDto
): Promise<AdminCategoryDto> => {
  const { name } = body;

  if (await categoryRepo.existsByNameEn(name.en)) {
    throw new ConflictRequestError({
      key: "category:errors.nameTaken",
      code: ERROR_CODES.CATEGORY_NAME_TAKEN
    });
  }

  const doc = await withSlugRetry(async () => {
    const slug = await generateSlug(categoryRepo, name.en);
    const sortOrder = (await categoryRepo.findMaxSortOrder()) + 1;
    return categoryRepo.create({ slug, name, sortOrder });
  });

  return toDto(AdminCategoryDto, { ...doc, appCount: 0 });
};
