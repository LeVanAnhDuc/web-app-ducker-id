// types
import type { DeleteImpactDto } from "../dtos";
import type { CategoryServiceDeps } from "./deps";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toDeleteImpactDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const deleteImpact = async (
  deps: CategoryServiceDeps,
  id: string
): Promise<DeleteImpactDto> => {
  const category = await deps.categoryRepo.findById(id);
  if (!category) {
    throw new NotFoundError({
      i18nMessage: (t) => t("category:errors.notFound"),
      code: ERROR_CODES.CATEGORY_NOT_FOUND
    });
  }

  const [total, orphaned] = await Promise.all([
    deps.webAppRepo.countByCategory(id),
    deps.webAppRepo.findOrphansOf(id)
  ]);
  return toDeleteImpactDto(total, orphaned);
};
