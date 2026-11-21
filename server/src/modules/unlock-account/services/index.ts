// types
import type { Request } from "express";
import type {
  UnlockRequestBodyDto,
  UnlockVerifyBodyDto
} from "../dtos/requests";
import type { UnlockRequestDto, UnlockVerifyDto } from "../dtos";
import type { UnlockAccountServiceDeps } from "./deps";
// others
import { unlockRequest } from "./unlock-request";
import { unlockVerify } from "./unlock-verify";

export class UnlockAccountService {
  constructor(private readonly deps: UnlockAccountServiceDeps) {}

  unlockRequest(
    body: UnlockRequestBodyDto,
    req: Request
  ): Promise<UnlockRequestDto> {
    return unlockRequest(this.deps, body, req);
  }

  unlockVerify(
    body: UnlockVerifyBodyDto,
    req: Request
  ): Promise<UnlockVerifyDto> {
    return unlockVerify(this.deps, body, req);
  }
}
