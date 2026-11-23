// types
import type { CategoryMoveDirection } from "../types";
import type { AdminCategoryDto } from "../dtos";
import type { CategoryRepository } from "../repository/category.repository";
// common
import { NotFoundError } from "@/exceptions";
// modules
import { CATEGORY_MOVE_DIRECTIONS } from "../constants";
// others
import { list } from "./list";
import { ERROR_CODES } from "@/constants/error-code";

/**
 * Rewrites every `sortOrder` to its index instead of swapping two values: two
 * concurrent creates can leave equal `sortOrder`s, and a swap between equals
 * changes nothing. Moving past either end is a no-op, not an error — another
 * tab may already have moved the row there.
 *
 * Runs in the transaction `CategoryService.move` opens (`@Transactional()`).
 */
export const move = async (
  categoryRepo: CategoryRepository,
  id: string,
  direction: CategoryMoveDirection
): Promise<AdminCategoryDto[]> => {
  const ordered = (await categoryRepo.findAll()).map((doc) =>
    doc._id.toString()
  );
  const from = ordered.indexOf(id);
  if (from === -1) {
    throw new NotFoundError({
      key: "category:errors.notFound",
      code: ERROR_CODES.CATEGORY_NOT_FOUND
    });
  }

  const to = direction === CATEGORY_MOVE_DIRECTIONS.UP ? from - 1 : from + 1;
  if (to >= 0 && to < ordered.length) {
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  }

  await categoryRepo.setSortOrders(ordered);

  return list(categoryRepo);
};
