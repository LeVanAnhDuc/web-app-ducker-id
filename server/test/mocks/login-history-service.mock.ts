// types
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";

export function createLoginHistoryServiceMock(): jest.Mocked<LoginHistoryService> {
  return {
    recordSuccessfulLogin: jest.fn(),
    recordFailedLogin: jest.fn()
  } as unknown as jest.Mocked<LoginHistoryService>;
}
