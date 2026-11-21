// libs
import { Get, JsonController, Res } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Response } from "express";
import type { CategoryService } from "./services";
// common
import { PublicCategoryDto } from "./dtos";
import { OptionalAuth, RateLimit, Respond } from "@/common/routing";

/**
 * Short enough that a rename or delete reaches the /apps filter quickly, long
 * enough to absorb a burst of launcher loads (DR-19).
 */
const PUBLIC_CACHE_CONTROL = "public, max-age=60";

@JsonController("/apps/categories")
@OpenAPI({ tags: ["Categories"] })
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get("/")
  @OpenAPI({
    summary: "List categories (public)",
    description:
      "Every category in display order, for the launcher filter. Names come in both languages; the client picks one by locale.\n\n**Caching:** `Cache-Control: public, max-age=60`."
  })
  @RateLimit("categoriesByIp")
  @OptionalAuth()
  @Respond({ message: "category:success.list", type: [PublicCategoryDto] })
  async listPublic(@Res() res: Response) {
    const data = await this.service.listPublic();
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    return data;
  }
}
