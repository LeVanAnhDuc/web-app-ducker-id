// types
import type { Request } from "express";
import type { MagicLinkVerifyBodyDto } from "../../dtos/requests";
import type { LoginResponseDto } from "../../dtos";
import type { MagicLinkLoginRepository } from "../../repositories/magic-link-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";
// common
import { UnauthorizedError } from "@/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export const verifyLink = async (
  deps: {
    accountExistsGuard: AccountExistsGuard;
    accountActiveGuard: AccountActiveGuard;
    emailVerifiedGuard: EmailVerifiedGuard;
    passwordLockoutGuard: PasswordLockoutGuard;
    magicLinkLoginRepo: MagicLinkLoginRepository;
    audit: LoginAuditService;
    completion: LoginCompletionService;
  },
  body: MagicLinkVerifyBodyDto,
  req: Request
): Promise<LoginResponseDto> => {
  const { email, token } = body;

  // A password lockout locks the ACCOUNT, not only the password method —
  // otherwise a magic link is a way around it (BUG-AUTH-06).
  await deps.passwordLockoutGuard.assert(email);

  const { auth, user } = await deps.accountExistsGuard.assert(email);

  deps.accountActiveGuard.assertWithAudit(
    auth,
    email,
    LOGIN_METHODS.MAGIC_LINK,
    req
  );
  deps.emailVerifiedGuard.assertWithAudit(
    auth,
    email,
    LOGIN_METHODS.MAGIC_LINK,
    req
  );

  const isValid = await deps.magicLinkLoginRepo.verifyToken(email, token);
  if (!isValid) {
    deps.audit.recordInvalidMagicLink({ auth, email, req });
    throw new UnauthorizedError({
      key: "login:errors.invalidMagicLink",
      code: ERROR_CODES.LOGIN_MAGIC_LINK_INVALID
    });
  }

  withRetry(() => deps.magicLinkLoginRepo.cleanupAll(email), {
    operationName: "cleanupMagicLinkData",
    context: { email }
  });

  Logger.info("Magic link verified", { email });

  return deps.completion.complete({
    auth,
    user,
    method: LOGIN_METHODS.MAGIC_LINK,
    req
  });
};
