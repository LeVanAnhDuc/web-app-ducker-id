// types
import type { CategoryName } from "../types";
import type { UpdateCategoryBodyDto } from "../dtos/requests";
import type { CategoryServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
import { ConflictRequestError, NotFoundError } from "@/exceptions";
// dtos
import { AdminCategoryDto } from "../dtos";
// others
import { generateSlug, withSlugRetry } from "./shared/generate-slug";
import { ERROR_CODES } from "@/constants/error-code";

const notFound = () =>
  new NotFoundError({
    key: "category:errors.notFound",
    code: ERROR_CODES.CATEGORY_NOT_FOUND
  });

export const update = async (
  deps: CategoryServiceDeps,
  id: string,
  body: UpdateCategoryBodyDto
): Promise<AdminCategoryDto> => {
  const existing = await deps.categoryRepo.findById(id);
  if (!existing) throw notFound();

  const name: CategoryName = {
    en: body.name.en ?? existing.name.en,
    vi: body.name.vi ?? existing.name.vi
  };
  // The slug always follows name.en (DR-7), so it only moves when en does.
  const enChanged = name.en !== existing.name.en;

  if (enChanged && (await deps.categoryRepo.existsByNameEn(name.en, id))) {
    throw new ConflictRequestError({
      key: "category:errors.nameTaken",
      code: ERROR_CODES.CATEGORY_NAME_TAKEN
    });
  }

  const updated = await withSlugRetry(async () => {
    const slug = enChanged
      ? await generateSlug(deps, name.en, id)
      : existing.slug;
    return deps.categoryRepo.updateById(id, { slug, name });
  });
  if (!updated) throw notFound();

  const appCount = await deps.webAppRepo.countByCategory(id);
  return toDto(AdminCategoryDto, { ...updated, appCount });
};
