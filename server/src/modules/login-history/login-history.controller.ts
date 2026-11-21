// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { LoginHistoryService } from "./services";
// common
import { Auth, Respond, ValidQuery } from "@/common/routing";
// others
import {
  LoginHistoryQueryDto,
  LoginHistoryStatsQueryDto
} from "./dtos/requests";

@JsonController("/login-history")
@Auth()
export class LoginHistoryController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get("/stats")
  @Respond({ message: "loginHistory:success.getMyStats" })
  getMyStats(
    @ValidQuery(LoginHistoryStatsQueryDto) query: LoginHistoryStatsQueryDto
  ) {
    return this.service.getMyLoginStats(query);
  }

  @Get("/")
  @Respond({ message: "loginHistory:success.getMyHistory" })
  getMyHistory(@ValidQuery(LoginHistoryQueryDto) query: LoginHistoryQueryDto) {
    return this.service.getMyLoginHistory(query);
  }
}
