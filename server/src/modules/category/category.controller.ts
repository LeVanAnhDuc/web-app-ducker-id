// libs
import { Get, JsonController, Res } from "routing-controllers";
// types
import type { Response } from "express";
import type { CategoryService } from "./services";
// common
import { OptionalAuth, RateLimit, Respond } from "@/common/routing";

/**
 * Short enough that a rename or delete reaches the /apps filter quickly, long
 * enough to absorb a burst of launcher loads (DR-19).
 */
const PUBLIC_CACHE_CONTROL = "public, max-age=60";

@JsonController("/apps/categories")
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get("/")
  @RateLimit("categoriesByIp")
  @OptionalAuth()
  @Respond({ message: "category:success.list" })
  async listPublic(@Res() res: Response) {
    const data = await this.service.listPublic();
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    return data;
  }
}
