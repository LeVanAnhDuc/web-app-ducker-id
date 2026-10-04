// types
import type { CategoryServiceDeps } from "../deps";
// common
import { BadRequestError } from "@/common/exceptions";
// modules
import { pickFreeSlug, slugifyCategoryName } from "../../category.helper";
import { CATEGORY_CONFIG } from "../../constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";

/**
 * Not a helper: it reads the slugs already in use. `excludeId` lets a rename
 * keep its own slug, so changing only the case of `name.en` adds no suffix.
 */
export const generateSlug = async (
  deps: CategoryServiceDeps,
  nameEn: string,
  excludeId?: string
): Promise<string> => {
  const base = slugifyCategoryName(nameEn);
  if (!base) {
    // The body pipe rejects these first; this guards direct service callers.
    throw new BadRequestError({
      i18nMessage: (t) => t("category:errors.nameNoSlug"),
      code: ERROR_CODES.CATEGORY_NAME_NO_SLUG
    });
  }
  const taken = await deps.categoryRepo.findSlugFamily(base, excludeId);
  return pickFreeSlug(base, taken);
};

/**
 * Two writes can pick the same free slug between the read and the insert; the
 * unique index rejects the second, which then recomputes and tries again.
 */
export const withSlugRetry = async <T>(write: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await write();
    } catch (err) {
      const slugTaken =
        isDuplicateKeyError(err) && getDuplicatedField(err) === "slug";
      if (!slugTaken || attempt >= CATEGORY_CONFIG.SLUG_MAX_ATTEMPTS) throw err;
    }
  }
};
