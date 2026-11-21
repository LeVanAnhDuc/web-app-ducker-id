// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { LoginHistoryService } from "./services";
// common
import {
  Admin,
  Auth,
  PathVariable,
  RequestParam,
  Respond
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { LoginHistoryAdminQueryDto } from "./dtos/requests";

@JsonController("/admin/login-history")
@Auth()
@Admin()
export class LoginHistoryAdminController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get("/")
  @Respond({ message: "loginHistory:success.getAllHistory" })
  getAllHistory(
    @RequestParam(LoginHistoryAdminQueryDto) query: LoginHistoryAdminQueryDto
  ) {
    return this.service.getAllLoginHistory(query);
  }

  @Get("/:id")
  @Respond({ message: "loginHistory:success.getHistoryDetail" })
  getHistoryDetail(
    @PathVariable("id", IsRequiredObjectId("loginHistory:errors.invalidId"))
    id: string
  ) {
    return this.service.getLoginHistoryDetail(id);
  }
}
