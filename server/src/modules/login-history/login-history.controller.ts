// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { LoginHistoryService } from "./services";
// common
import { Paginated } from "@/common/openapi";
import { Auth, Respond, ValidQuery } from "@/common/routing";
// others
import { MyHistoryItemDto, MyLoginStatsDto } from "./dtos";
import {
  LoginHistoryQueryDto,
  LoginHistoryStatsQueryDto
} from "./dtos/requests";

@JsonController("/login-history")
@Auth()
@OpenAPI({ tags: ["Login History"] })
export class LoginHistoryController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get("/stats")
  @OpenAPI({
    summary: "My sign-in statistics",
    description:
      "Totals, per-method and per-device counts and a zero-filled day series for the range, bucketed by the caller's IANA time zone."
  })
  @Respond({
    message: "loginHistory:success.getMyStats",
    type: MyLoginStatsDto
  })
  getMyStats(
    @ValidQuery(LoginHistoryStatsQueryDto) query: LoginHistoryStatsQueryDto
  ) {
    return this.service.getMyLoginStats(query);
  }

  @Get("/")
  @OpenAPI({
    summary: "List my sign-in history",
    description:
      "The caller's own sign-ins, newest first by default. IP addresses are masked."
  })
  @Respond({
    message: "loginHistory:success.getMyHistory",
    type: Paginated(MyHistoryItemDto)
  })
  getMyHistory(@ValidQuery(LoginHistoryQueryDto) query: LoginHistoryQueryDto) {
    return this.service.getMyLoginHistory(query);
  }
}
