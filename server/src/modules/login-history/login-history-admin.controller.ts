// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { LoginHistoryService } from "./services";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
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
import { AllHistoryItemDto, HistoryDetailItemDto } from "./dtos";
import { LoginHistoryAdminQueryDto } from "./dtos/requests";

// Every failure takes the one key; each keeps its own constraint name so
// `reason` still tells them apart.
const LOGIN_HISTORY_ID = [
  IsRequiredObjectId("loginHistory:errors.invalidId"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the login-history record"
  })
];

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
    @RequestParam(LoginHistoryAdminQueryDto) query: LoginHistoryAdminQueryDto
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
  getHistoryDetail(@PathVariable("id", ...LOGIN_HISTORY_ID) id: string) {
    return this.service.getLoginHistoryDetail(id);
  }
}
