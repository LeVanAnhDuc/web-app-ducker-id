// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { CategoryService } from "./services";
// common
import {
  Admin,
  Auth,
  PathVariable,
  RateLimit,
  Respond,
  ValidBody
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import {
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
    @PathVariable("id", IsRequiredObjectId("category:validation.id.invalid"))
    id: string,
    @ValidBody(UpdateCategoryBodyDto) body: UpdateCategoryBodyDto
  ) {
    return this.service.update(id, body);
  }

  @Post("/:id/move")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.move" })
  move(
    @PathVariable("id", IsRequiredObjectId("category:validation.id.invalid"))
    id: string,
    @ValidBody(MoveCategoryBodyDto) body: MoveCategoryBodyDto
  ) {
    return this.service.move(id, body.direction);
  }

  @Get("/:id/delete-impact")
  @Respond({ message: "category:success.deleteImpact" })
  deleteImpact(
    @PathVariable("id", IsRequiredObjectId("category:validation.id.invalid"))
    id: string
  ) {
    return this.service.deleteImpact(id);
  }

  @Delete("/:id")
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @PathVariable("id", IsRequiredObjectId("category:validation.id.invalid"))
    id: string,
    @ValidBody(DeleteCategoryBodyDto) body: DeleteCategoryBodyDto
  ) {
    await this.service.remove(id, body.reassignments);
  }
}
