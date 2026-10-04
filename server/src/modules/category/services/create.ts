// types
import type { CreateCategoryBody } from "../types";
import type { AdminCategoryDto } from "../dtos";
import type { CategoryServiceDeps } from "./deps";
// common
import { ConflictRequestError } from "@/common/exceptions";
// dtos
import { toAdminCategoryDto } from "../dtos";
// others
import { generateSlug, withSlugRetry } from "./shared/generate-slug";
import { ERROR_CODES } from "@/constants/error-code";

export const create = async (
  deps: CategoryServiceDeps,
  body: CreateCategoryBody
): Promise<AdminCategoryDto> => {
  const { name } = body;

  if (await deps.categoryRepo.existsByNameEn(name.en)) {
    throw new ConflictRequestError({
      i18nMessage: (t) => t("category:errors.nameTaken"),
      code: ERROR_CODES.CATEGORY_NAME_TAKEN
    });
  }

  const doc = await withSlugRetry(async () => {
    const slug = await generateSlug(deps, name.en);
    const sortOrder = (await deps.categoryRepo.findMaxSortOrder()) + 1;
    return deps.categoryRepo.create({ slug, name, sortOrder });
  });

  return toAdminCategoryDto({ ...doc, appCount: 0 });
};
