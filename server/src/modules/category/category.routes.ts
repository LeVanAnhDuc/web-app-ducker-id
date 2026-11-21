// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { CategoryController } from "./category.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
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

export const createCategoryAdminRoutes = (
  controller: CategoryController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const categories = Router();

  categories.use(authGuard, adminGuard);

  categories.get(
    "/",
    handle(controller.list, { message: "category:success.list" })
  );
  categories.post(
    "/",
    rl.categoryMutationByIpAndUser,
    bodyPipe(createCategoryBodySchema),
    handle(controller.create, {
      status: STATUS_CODES.CREATED,
      message: "category:success.create"
    })
  );
  categories.patch(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(updateCategoryBodySchema),
    handle(controller.update, { message: "category:success.update" })
  );
  categories.post(
    "/:id/move",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(moveCategoryBodySchema),
    handle(controller.move, { message: "category:success.move" })
  );
  categories.get(
    "/:id/delete-impact",
    paramsPipe(categoryIdParamSchema),
    handle(controller.deleteImpact, {
      message: "category:success.deleteImpact"
    })
  );
  categories.delete(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(categoryIdParamSchema),
    bodyPipe(deleteCategoryBodySchema),
    handle(controller.remove, { status: STATUS_CODES.NO_CONTENT })
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
    handle(controller.listPublic, { message: "category:success.list" })
  );

  return router;
};
