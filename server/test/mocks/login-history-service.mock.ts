// types
import type { LoginHistoryService } from "@/modules/login-history/services";

export function createLoginHistoryServiceMock(): jest.Mocked<LoginHistoryService> {
  return {
    recordSuccessfulLogin: jest.fn(),
    recordFailedLogin: jest.fn(),
    recordAppSignIn: jest.fn(),
    recordAppSignInDenied: jest.fn()
  } as unknown as jest.Mocked<LoginHistoryService>;
}
