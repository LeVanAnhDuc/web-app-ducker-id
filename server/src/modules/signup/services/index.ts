// types
import type {
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "../dtos/requests";
import type {
  CheckEmailDto,
  CompleteSignupResult,
  ResendOtpDto,
  SendOtpDto,
  VerifyOtpDto
} from "../dtos";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../repositories/session-signup.repository";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { EmailAvailableGuard, CooldownGuard } from "../guards";
// others
import { LogMethod } from "@/libs/logger";
import { checkEmail } from "./check-email";
import { completeSignup } from "./complete-signup";
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
  completeSignup(body: CompleteSignupBodyDto): Promise<CompleteSignupResult> {
    return completeSignup(
      {
        authService: this.authService,
        userService: this.userService,
        otpSignupRepo: this.otpSignupRepo,
        sessionSignupRepo: this.sessionSignupRepo,
        emailAvailableGuard: this.emailAvailableGuard
      },
      body
    );
  }

  @LogMethod({ name: "CheckEmail" })
  checkEmail(email: string): Promise<CheckEmailDto> {
    return checkEmail(this.userService, email);
  }
}
