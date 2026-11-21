// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { LoginHistoryService } from "./services";
// common
import { ApiErrors, Paginated } from "@/common/openapi";
import {
  Admin,
  Auth,
  Respond,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import { AllHistoryItemDto, HistoryDetailItemDto } from "./dtos";
import {
  LoginHistoryAdminQueryDto,
  LoginHistoryIdParamsDto
} from "./dtos/requests";

@JsonController("/admin/login-history")
@Auth()
@Admin()
@OpenAPI({ tags: ["Login History Admin"] })
export class LoginHistoryAdminController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get("/")
  @OpenAPI({ summary: "List every account's sign-in history (admin)" })
  @Respond({
    message: "loginHistory:success.getAllHistory",
    type: Paginated(AllHistoryItemDto)
  })
  getAllHistory(
    @ValidQuery(LoginHistoryAdminQueryDto) query: LoginHistoryAdminQueryDto
  ) {
    return this.service.getAllLoginHistory(query);
  }

  @Get("/:id")
  @OpenAPI({ summary: "One sign-in record (admin)" })
  @ApiErrors(404)
  @Respond({
    message: "loginHistory:success.getHistoryDetail",
    type: HistoryDetailItemDto
  })
  getHistoryDetail(
    @ValidParams(LoginHistoryIdParamsDto) params: LoginHistoryIdParamsDto
  ) {
    return this.service.getLoginHistoryDetail(params.id);
  }
}
