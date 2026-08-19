// types
import type { LoginAuditService } from "@/modules/login/services/login-audit.service";

export function createLoginAuditServiceMock(): jest.Mocked<LoginAuditService> {
  return {
    recordSuccess: jest.fn(),
    recordInvalidCredentials: jest.fn(),
    recordInvalidPassword: jest.fn(),
    recordInactiveAccount: jest.fn(),
    recordEmailNotVerified: jest.fn(),
    recordInvalidOtp: jest.fn(),
    recordInvalidMagicLink: jest.fn()
  } as unknown as jest.Mocked<LoginAuditService>;
}
