// libs
import mongoose from "mongoose";
// types
import type { ClientSession } from "mongoose";
import type { CategoryReassignment } from "../types";
import type { CategoryServiceDeps } from "./deps";
// common
import {
  BadRequestError,
  ConflictRequestError,
  NotFoundError
} from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

/** Every target must be another category that still exists. */
const assertTargetsValid = async (
  deps: CategoryServiceDeps,
  id: string,
  reassignments: CategoryReassignment[],
  session: ClientSession
): Promise<void> => {
  const targets = [...new Set(reassignments.map((r) => r.categoryId))];
  const valid =
    !targets.includes(id) &&
    (targets.length === 0 ||
      (await deps.categoryRepo.countByIds(targets, session)) ===
        targets.length);
  if (!valid) {
    throw new BadRequestError({
      i18nMessage: (t) => t("category:errors.reassignInvalid"),
      code: ERROR_CODES.CATEGORY_REASSIGN_INVALID
    });
  }
};

/**
 * The client sends one target per orphan it was shown. The orphan set is read
 * again inside the transaction: if it no longer matches — an app gained or lost
 * a category since the dialog opened, or an `appId` is not an orphan of this
 * category at all — nothing is written and the client reloads the impact.
 */
const assertCoversOrphans = async (
  deps: CategoryServiceDeps,
  id: string,
  reassignments: CategoryReassignment[],
  session: ClientSession
): Promise<void> => {
  const orphanIds = new Set(
    (await deps.webAppRepo.findOrphansOf(id, session)).map((app) => app._id)
  );

  if (orphanIds.size > 0 && reassignments.length === 0) {
    throw new BadRequestError({
      i18nMessage: (t) => t("category:errors.reassignRequired"),
      code: ERROR_CODES.CATEGORY_REASSIGN_REQUIRED
    });
  }

  const matches =
    reassignments.length === orphanIds.size &&
    reassignments.every((r) => orphanIds.has(r.appId));
  if (!matches) {
    throw new ConflictRequestError({
      i18nMessage: (t) => t("category:errors.impactChanged"),
      code: ERROR_CODES.CATEGORY_IMPACT_CHANGED
    });
  }
};

export const remove = async (
  deps: CategoryServiceDeps,
  id: string,
  reassignments: CategoryReassignment[]
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const category = await deps.categoryRepo.findById(id, session);
      if (!category) {
        throw new NotFoundError({
          i18nMessage: (t) => t("category:errors.notFound"),
          code: ERROR_CODES.CATEGORY_NOT_FOUND
        });
      }

      await assertTargetsValid(deps, id, reassignments, session);
      await assertCoversOrphans(deps, id, reassignments, session);

      await deps.webAppRepo.reassignOrphans(id, reassignments, session);
      await deps.webAppRepo.pullCategory(id, session);
      await deps.categoryRepo.deleteById(id, session);
    });
  } finally {
    await session.endSession();
  }
};
