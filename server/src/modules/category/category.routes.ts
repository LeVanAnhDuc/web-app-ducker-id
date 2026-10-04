// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { CategoryController } from "./category.controller";
// validators
import {
  categoryIdParamSchema,
  createCategoryBodySchema,
  deleteCategoryBodySchema,
  moveCategoryBodySchema,
  updateCategoryBodySchema
} from "@/validators/schemas/category";
// others
import {
  adminGuard,
  authGuard,
  bodyPipe,
  optionalAuthGuard,
  paramsPipe
} from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createCategoryAdminRoutes = (
  controller: CategoryController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const categories = Router();

  categories.use(authGuard, adminGuard);

  categories.get("/", asyncHandler(controller.list));
  categories.post(
    "/",
    rl.categoryMutationByIpAndUser,
    bodyPipe(createCategoryBodySchema),
    asyncHandler(controller.create)
  );
  categories.patch(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(updateCategoryBodySchema),
    asyncHandler(controller.update)
  );
  categories.post(
    "/:id/move",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(moveCategoryBodySchema),
    asyncHandler(controller.move)
  );
  categories.get(
    "/:id/delete-impact",
    paramsPipe(categoryIdParamSchema),
    asyncHandler(controller.deleteImpact)
  );
  categories.delete(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(deleteCategoryBodySchema),
    asyncHandler(controller.remove)
  );

  router.use("/admin/categories", categories);
  return router;
};

export const createCategoryUserRoutes = (
  controller: CategoryController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();

  router.get(
    "/apps/categories",
    rl.categoriesByIp,
    optionalAuthGuard,
    asyncHandler(controller.listPublic)
  );

  return router;
};
