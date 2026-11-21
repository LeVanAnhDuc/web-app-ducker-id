// libs
import { JsonController, Post, Req } from "routing-controllers";
// types
import type { Request } from "express";
import type { TokenService } from "./services";
// common
import { Respond } from "@/common/routing";

@JsonController("/auth/token")
export class TokenController {
  constructor(private readonly service: TokenService) {}

  // No middleware in the chain: presence, signature, revocation and account
  // checks are the guards TokenService runs on the cookie value.
  @Post("/refresh")
  @Respond({ message: "login:success.tokenRefreshed" })
  refreshToken(@Req() req: Request) {
    return this.service.refreshAccessToken(req.cookies?.refreshToken);
  }
}
