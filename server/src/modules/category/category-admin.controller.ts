// libs
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Patch, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { CategoryService } from "./services";
// common
import { ApiErrors, ApiProperty } from "@/common/openapi";
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
import { AdminCategoryDto, DeleteImpactDto } from "./dtos";
import {
  CreateCategoryBodyDto,
  DeleteCategoryBodyDto,
  MoveCategoryBodyDto,
  UpdateCategoryBodyDto
} from "./dtos/requests";

const CATEGORY_ID = [
  IsRequiredObjectId("category:validation.id.invalid"),
  ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "MongoDB ObjectId of the category"
  })
];

@JsonController("/admin/categories")
@Auth()
@Admin()
@OpenAPI({ tags: ["Categories Admin"] })
export class CategoryAdminController {
  constructor(private readonly service: CategoryService) {}

  @Get("/")
  @OpenAPI({ summary: "List categories with app counts" })
  @Respond({ message: "category:success.list", type: [AdminCategoryDto] })
  list() {
    return this.service.list();
  }

  @Post("/")
  @OpenAPI({
    summary: "Create a category",
    description:
      "The slug is generated from name.en; a taken slug gets a -2, -3… suffix. Created last in the order."
  })
  @ApiErrors(409)
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({
    status: StatusCodes.CREATED,
    message: "category:success.create",
    type: AdminCategoryDto
  })
  create(@ValidBody(CreateCategoryBodyDto) body: CreateCategoryBodyDto) {
    return this.service.create(body);
  }

  @Patch("/:id")
  @OpenAPI({
    summary: "Rename a category",
    description:
      "Changing name.en regenerates the slug; changing only name.vi keeps it."
  })
  @ApiErrors(404, 409)
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.update", type: AdminCategoryDto })
  update(
    @PathVariable("id", ...CATEGORY_ID) id: string,
    @ValidBody(UpdateCategoryBodyDto) body: UpdateCategoryBodyDto
  ) {
    return this.service.update(id, body);
  }

  @Post("/:id/move")
  @OpenAPI({
    summary: "Move a category up or down",
    description:
      "Renumbers every sortOrder and returns the new list. Moving past either end is a no-op."
  })
  @ApiErrors(404)
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ message: "category:success.move", type: [AdminCategoryDto] })
  move(
    @PathVariable("id", ...CATEGORY_ID) id: string,
    @ValidBody(MoveCategoryBodyDto) body: MoveCategoryBodyDto
  ) {
    return this.service.move(id, body.direction);
  }

  @Get("/:id/delete-impact")
  @OpenAPI({ summary: "Preview what deleting a category would affect" })
  @ApiErrors(404)
  @Respond({ message: "category:success.deleteImpact", type: DeleteImpactDto })
  deleteImpact(@PathVariable("id", ...CATEGORY_ID) id: string) {
    return this.service.deleteImpact(id);
  }

  @Delete("/:id")
  @OpenAPI({
    summary: "Delete a category",
    description:
      "Runs in one transaction. Apps that keep another category just lose this one. Apps whose only category is this one must each get a target in `reassignments`; the set must match the current orphans exactly.\n\n- 400 `CATEGORY_REASSIGN_REQUIRED`: orphans exist and no reassignments were sent\n- 400 `CATEGORY_REASSIGN_INVALID`: a target is this category or no longer exists\n- 409 `CATEGORY_IMPACT_CHANGED`: the orphan set changed since it was read"
  })
  @ApiErrors(404, 409)
  @RateLimit("categoryMutationByIpAndUser")
  @Respond({ status: StatusCodes.NO_CONTENT })
  async remove(
    @PathVariable("id", ...CATEGORY_ID) id: string,
    @ValidBody(DeleteCategoryBodyDto) body: DeleteCategoryBodyDto
  ) {
    await this.service.remove(id, body.reassignments);
  }
}
