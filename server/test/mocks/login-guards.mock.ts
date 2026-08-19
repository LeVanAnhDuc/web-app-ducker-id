// types
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  OtpLockoutGuard,
  OtpCooldownGuard,
  MagicLinkCooldownGuard
} from "@/modules/login/guards";

export function createAccountExistsGuardMock(): jest.Mocked<AccountExistsGuard> {
  return {
    tryFind: jest.fn(),
    isLoginEligible: jest.fn(),
    assert: jest.fn(),
    assertWithCredentialAudit: jest.fn()
  } as unknown as jest.Mocked<AccountExistsGuard>;
}

export function createAccountActiveGuardMock(): jest.Mocked<AccountActiveGuard> {
  return {
    assert: jest.fn(),
    assertWithAudit: jest.fn()
  } as unknown as jest.Mocked<AccountActiveGuard>;
}

export function createEmailVerifiedGuardMock(): jest.Mocked<EmailVerifiedGuard> {
  return {
    assert: jest.fn(),
    assertWithAudit: jest.fn()
  } as unknown as jest.Mocked<EmailVerifiedGuard>;
}

export function createPasswordLockoutGuardMock(): jest.Mocked<PasswordLockoutGuard> {
  return {
    assert: jest.fn()
  } as unknown as jest.Mocked<PasswordLockoutGuard>;
}

export function createOtpLockoutGuardMock(): jest.Mocked<OtpLockoutGuard> {
  return {
    assert: jest.fn()
  } as unknown as jest.Mocked<OtpLockoutGuard>;
}

export function createOtpCooldownGuardMock(): jest.Mocked<OtpCooldownGuard> {
  return {
    assert: jest.fn()
  } as unknown as jest.Mocked<OtpCooldownGuard>;
}

export function createMagicLinkCooldownGuardMock(): jest.Mocked<MagicLinkCooldownGuard> {
  return {
    assert: jest.fn()
  } as unknown as jest.Mocked<MagicLinkCooldownGuard>;
}
