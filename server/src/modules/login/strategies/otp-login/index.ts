// types
import type { Request } from "express";
import type { OtpSendBodyDto, OtpVerifyBodyDto } from "../../dtos/requests";
import type { LoginResponseDto, OtpSendDto } from "../../dtos";
import type { OtpLoginStrategyDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { sendCode } from "./send-code";
import { verifyCode } from "./verify-code";

export class OtpLoginStrategy {
  constructor(private readonly deps: OtpLoginStrategyDeps) {}

  @LogMethod({ name: "Login OTP send" })
  sendCode(body: OtpSendBodyDto, req: Request): Promise<OtpSendDto> {
    return sendCode(this.deps, body, req);
  }

  @LogMethod({ name: "Login OTP verification" })
  verifyCode(body: OtpVerifyBodyDto, req: Request): Promise<LoginResponseDto> {
    return verifyCode(this.deps, body, req);
  }
}
