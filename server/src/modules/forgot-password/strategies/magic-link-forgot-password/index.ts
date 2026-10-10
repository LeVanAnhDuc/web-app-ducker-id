// types
import type {
  FPMagicLinkSendRequest,
  FPMagicLinkVerifyRequest
} from "../../types";
import type {
  SendMagicLinkResponseDto,
  VerifyMagicLinkResponseDto
} from "../../dtos";
import type { MagicLinkForgotPasswordStrategyDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { sendLink } from "./send-link";
import { verifyLink } from "./verify-link";

export class MagicLinkForgotPasswordStrategy {
  constructor(private readonly deps: MagicLinkForgotPasswordStrategyDeps) {}

  @LogMethod({ name: "Forgot password magic link send" })
  sendLink(req: FPMagicLinkSendRequest): Promise<SendMagicLinkResponseDto> {
    return sendLink(this.deps, req);
  }

  @LogMethod({ name: "Forgot password magic link verification" })
  verifyLink(
    req: FPMagicLinkVerifyRequest
  ): Promise<VerifyMagicLinkResponseDto> {
    return verifyLink(this.deps, req);
  }
}
