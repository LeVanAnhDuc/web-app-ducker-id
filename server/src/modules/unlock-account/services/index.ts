// types
import type { Request } from "express";
import type {
  UnlockRequestBodyDto,
  UnlockVerifyBodyDto
} from "../dtos/requests";
import type { UnlockRequestDto, UnlockVerifyDto } from "../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { LoginService } from "@/modules/login/services/login";
import type { UnlockAccountRepository } from "../repository/unlock-account.repository";
import type {
  CooldownGuard,
  RateLimitGuard,
  AuthExistsGuard,
  TempPasswordValidGuard
} from "../guards";
// others
import { unlockRequest } from "./unlock-request";
import { unlockVerify } from "./unlock-verify";

export class UnlockAccountService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly loginService: LoginService,
    private readonly unlockAccountRepo: UnlockAccountRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly cooldownGuard: CooldownGuard,
    private readonly rateLimitGuard: RateLimitGuard,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly tempPasswordValidGuard: TempPasswordValidGuard
  ) {}

  unlockRequest(
    body: UnlockRequestBodyDto,
    req: Request
  ): Promise<UnlockRequestDto> {
    return unlockRequest(
      {
        loginService: this.loginService,
        unlockAccountRepo: this.unlockAccountRepo,
        emailDispatcher: this.emailDispatcher,
        cooldownGuard: this.cooldownGuard,
        rateLimitGuard: this.rateLimitGuard,
        authExistsGuard: this.authExistsGuard
      },
      body,
      req
    );
  }

  unlockVerify(
    body: UnlockVerifyBodyDto,
    req: Request
  ): Promise<UnlockVerifyDto> {
    return unlockVerify(
      {
        authService: this.authService,
        loginHistoryService: this.loginHistoryService,
        loginService: this.loginService,
        authExistsGuard: this.authExistsGuard,
        tempPasswordValidGuard: this.tempPasswordValidGuard
      },
      body,
      req
    );
  }
}
