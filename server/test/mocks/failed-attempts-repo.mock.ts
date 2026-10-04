// types
import type { FailedAttemptsRepository } from "@/modules/login/repositories/failed-attempts.repository";

export function createFailedAttemptsRepoMock(): jest.Mocked<FailedAttemptsRepository> {
  return {
    getCount: jest.fn(),
    trackAttempt: jest.fn(),
    resetAll: jest.fn(),
    checkLockout: jest.fn()
  } as unknown as jest.Mocked<FailedAttemptsRepository>;
}
