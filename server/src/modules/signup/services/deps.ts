// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../repositories/session-signup.repository";
import type { EmailAvailableGuard, CooldownGuard } from "../guards";

export interface SignupServiceDeps {
  authService: AuthenticationService;
  userService: UserService;
  otpSignupRepo: OtpSignupRepository;
  sessionSignupRepo: SessionSignupRepository;
  emailDispatcher: EmailDispatcher;
  emailAvailableGuard: EmailAvailableGuard;
  cooldownGuard: CooldownGuard;
}
