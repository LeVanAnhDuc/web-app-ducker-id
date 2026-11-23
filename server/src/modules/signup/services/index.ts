// types
import type {
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "../dtos/requests";
import type {
  CheckEmailDto,
  CompleteSignupDto,
  ResendOtpDto,
  SendOtpDto,
  VerifyOtpDto
} from "../dtos";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../repositories/session-signup.repository";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { EmailAvailableGuard, CooldownGuard } from "../guards";
import type { CreatedAccount, NewAccount } from "./complete-signup";
// common
import { Transactional } from "@/common/stereotypes";
// others
import { LogMethod } from "@/libs/logger";
import { checkEmail } from "./check-email";
import { completeSignup, createUserAccount } from "./complete-signup";
import { resendOtp } from "./resend-otp";
import { sendOtp } from "./send-otp";
import { verifyOtp } from "./verify-otp";

export class SignupService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly otpSignupRepo: OtpSignupRepository,
    private readonly sessionSignupRepo: SessionSignupRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly emailAvailableGuard: EmailAvailableGuard,
    private readonly cooldownGuard: CooldownGuard
  ) {}

  @LogMethod({ name: "SendOtp" })
  sendOtp(body: SendOtpBodyDto): Promise<SendOtpDto> {
    return sendOtp(
      {
        otpSignupRepo: this.otpSignupRepo,
        emailDispatcher: this.emailDispatcher,
        emailAvailableGuard: this.emailAvailableGuard,
        cooldownGuard: this.cooldownGuard
      },
      body
    );
  }

  @LogMethod({ name: "VerifyOtp" })
  verifyOtp(body: VerifyOtpBodyDto): Promise<VerifyOtpDto> {
    return verifyOtp(
      {
        otpSignupRepo: this.otpSignupRepo,
        sessionSignupRepo: this.sessionSignupRepo
      },
      body
    );
  }

  @LogMethod({ name: "ResendOtp" })
  resendOtp(body: ResendOtpBodyDto): Promise<ResendOtpDto> {
    return resendOtp(
      {
        otpSignupRepo: this.otpSignupRepo,
        emailDispatcher: this.emailDispatcher,
        emailAvailableGuard: this.emailAvailableGuard,
        cooldownGuard: this.cooldownGuard
      },
      body
    );
  }

  @LogMethod({ name: "CompleteSignup" })
  completeSignup(body: CompleteSignupBodyDto): Promise<CompleteSignupDto> {
    return completeSignup(
      {
        createUserAccount: (account) => this.createUserAccount(account),
        otpSignupRepo: this.otpSignupRepo,
        sessionSignupRepo: this.sessionSignupRepo,
        emailAvailableGuard: this.emailAvailableGuard
      },
      body
    );
  }

  @Transactional()
  private createUserAccount(account: NewAccount): Promise<CreatedAccount> {
    return createUserAccount(
      { authService: this.authService, userService: this.userService },
      account
    );
  }

  @LogMethod({ name: "CheckEmail" })
  checkEmail(email: string): Promise<CheckEmailDto> {
    return checkEmail(this.userService, email);
  }
}
