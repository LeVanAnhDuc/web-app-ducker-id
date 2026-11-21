// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { LoginHistoryService } from "./services";
// common
import {
  Admin,
  Auth,
  Respond,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import {
  LoginHistoryAdminQueryDto,
  LoginHistoryIdParamsDto
} from "./dtos/requests";

@JsonController("/admin/login-history")
@Auth()
@Admin()
export class LoginHistoryAdminController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get("/")
  @Respond({ message: "loginHistory:success.getAllHistory" })
  getAllHistory(
    @ValidQuery(LoginHistoryAdminQueryDto) query: LoginHistoryAdminQueryDto
  ) {
    return this.service.getAllLoginHistory(query);
  }

  @Get("/:id")
  @Respond({ message: "loginHistory:success.getHistoryDetail" })
  getHistoryDetail(
    @ValidParams(LoginHistoryIdParamsDto) params: LoginHistoryIdParamsDto
  ) {
    return this.service.getLoginHistoryDetail(params.id);
  }
}
