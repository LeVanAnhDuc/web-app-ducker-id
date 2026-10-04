// types
import type { Request } from "express";
import type { MagicLinkSendBody, MagicLinkVerifyBody } from "../../types";
import type { LoginResponseDto, MagicLinkSendDto } from "../../dtos";
import type { MagicLinkLoginStrategyDeps } from "./deps";
// others
import { LogMethod } from "@/libs/logger";
import { sendLink } from "./send-link";
import { verifyLink } from "./verify-link";

export class MagicLinkLoginStrategy {
  constructor(private readonly deps: MagicLinkLoginStrategyDeps) {}

  @LogMethod({ name: "Magic link send" })
  sendLink(body: MagicLinkSendBody, req: Request): Promise<MagicLinkSendDto> {
    return sendLink(this.deps, body, req);
  }

  @LogMethod({ name: "Magic link verification" })
  verifyLink(
    body: MagicLinkVerifyBody,
    req: Request
  ): Promise<LoginResponseDto> {
    return verifyLink(this.deps, body, req);
  }
}
