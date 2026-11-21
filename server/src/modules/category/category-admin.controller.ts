// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { CategoryService } from "./services";
// common
import {
  Admin,
  Auth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams
} from "@/common/routing";
// others
import {
  CategoryIdParamsDto,
  CreateCategoryBodyDto,
  DeleteCategoryBodyDto,
  MoveCategoryBodyDto,
  UpdateCategoryBodyDto
} from "./dtos/requests";

@JsonController("/admin/categories")
@Auth()
@Admin()
export class CategoryAdminController {
  constructor(private readonly service: CategoryService) {}

  @Get("/")
  @Respond({ message: "category:success.list" })
  list() {
    return this.service.list();
  }

  @Post("/")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({
    status: StatusCodes.CREATED,
    message: "category:success.create"
  })
  create(@ValidBody(CreateCategoryBodyDto) body: CreateCategoryBodyDto) {
    return this.service.create(body);
  }

  @Patch("/:id")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.update" })
  update(
    @ValidParams(CategoryIdParamsDto) params: CategoryIdParamsDto,
    @ValidBody(UpdateCategoryBodyDto) body: UpdateCategoryBodyDto
  ) {
    return this.service.update(params.id, body);
  }

  @Post("/:id/move")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.move" })
  move(
    @ValidParams(CategoryIdParamsDto) params: CategoryIdParamsDto,
    @ValidBody(MoveCategoryBodyDto) body: MoveCategoryBodyDto
  ) {
    return this.service.move(params.id, body.direction);
  }

  @Get("/:id/delete-impact")
  @Respond({ message: "category:success.deleteImpact" })
  deleteImpact(@ValidParams(CategoryIdParamsDto) params: CategoryIdParamsDto) {
    return this.service.deleteImpact(params.id);
  }

  @Delete("/:id")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @ValidParams(CategoryIdParamsDto) params: CategoryIdParamsDto,
    @ValidBody(DeleteCategoryBodyDto) body: DeleteCategoryBodyDto
  ) {
    await this.service.remove(params.id, body.reassignments);
  }
}
