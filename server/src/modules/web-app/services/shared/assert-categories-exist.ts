// types
import type { WebAppServiceDeps } from "../deps";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

/**
 * A category can be deleted in another tab while the app form is open; saving
 * with its id must fail on the field, not leave a dangling reference.
 * The body pipe has already rejected duplicates.
 */
export const assertCategoriesExist = async (
  deps: WebAppServiceDeps,
  categoryIds: string[]
): Promise<void> => {
  const found = await deps.categoryRepo.countByIds(categoryIds);
  if (found !== categoryIds.length) {
    throw new BadRequestError({
      i18nMessage: (t) => t("webApp:validation.categoryIds.notFound"),
      code: ERROR_CODES.WEB_APP_CATEGORY_NOT_FOUND
    });
  }
};
