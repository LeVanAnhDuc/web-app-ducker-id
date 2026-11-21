// types
import type { Request } from "express";
import type {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto
} from "../../dtos/requests";
import type { LoginResponseDto, MagicLinkSendDto } from "../../dtos";
import type { MagicLinkLoginStrategyDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { sendLink } from "./send-link";
import { verifyLink } from "./verify-link";

export class MagicLinkLoginStrategy {
  constructor(private readonly deps: MagicLinkLoginStrategyDeps) {}

  @LogMethod({ name: "Magic link send" })
  sendLink(
    body: MagicLinkSendBodyDto,
    req: Request
  ): Promise<MagicLinkSendDto> {
    return sendLink(this.deps, body, req);
  }

  @LogMethod({ name: "Magic link verification" })
  verifyLink(
    body: MagicLinkVerifyBodyDto,
    req: Request
  ): Promise<LoginResponseDto> {
    return verifyLink(this.deps, body, req);
  }
}
