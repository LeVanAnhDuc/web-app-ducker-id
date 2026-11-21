// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { RateLimiters } from "@/middlewares";
import type { CategoryController } from "./category.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  CategoryIdParamsDto,
  CreateCategoryBodyDto,
  DeleteCategoryBodyDto,
  MoveCategoryBodyDto,
  UpdateCategoryBodyDto
} from "@/modules/category/dtos/requests";
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
  rl: RateLimiters
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
    bodyPipe(CreateCategoryBodyDto),
    handle(controller.create, {
      status: StatusCodes.CREATED,
      message: "category:success.create"
    })
  );
  categories.patch(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(CategoryIdParamsDto),
    bodyPipe(UpdateCategoryBodyDto),
    handle(controller.update, { message: "category:success.update" })
  );
  categories.post(
    "/:id/move",
    rl.categoryMutationByIpAndUser,
    paramsPipe(CategoryIdParamsDto),
    bodyPipe(MoveCategoryBodyDto),
    handle(controller.move, { message: "category:success.move" })
  );
  categories.get(
    "/:id/delete-impact",
    paramsPipe(CategoryIdParamsDto),
    handle(controller.deleteImpact, {
      message: "category:success.deleteImpact"
    })
  );
  categories.delete(
    "/:id",
    rl.categoryMutationByIpAndUser,
    paramsPipe(CategoryIdParamsDto),
    bodyPipe(DeleteCategoryBodyDto),
    handle(controller.remove, { status: StatusCodes.NO_CONTENT })
  );

  router.use("/admin/categories", categories);
  return router;
};

export const createCategoryUserRoutes = (
  controller: CategoryController,
  rl: RateLimiters
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
