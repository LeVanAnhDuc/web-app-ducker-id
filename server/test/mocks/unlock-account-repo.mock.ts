// types
import type { UnlockAccountRepository } from "@/modules/unlock-account/repository/unlock-account.repository";
// modules
import { UNLOCK_ACCOUNT_CONFIG } from "@/modules/unlock-account/constants";
// others
import { SECONDS_PER_MINUTE } from "@/constants/time";

export function createUnlockAccountRepoMock(): jest.Mocked<UnlockAccountRepository> {
  return {
    COOLDOWN_SECONDS: UNLOCK_ACCOUNT_CONFIG.COOLDOWN_SECONDS,
    MAX_REQUESTS_PER_HOUR: UNLOCK_ACCOUNT_CONFIG.MAX_REQUESTS_PER_HOUR,
    TEMP_PASSWORD_EXPIRY_SECONDS:
      UNLOCK_ACCOUNT_CONFIG.TEMP_PASSWORD_EXPIRY_MINUTES * SECONDS_PER_MINUTE,
    getCooldownRemaining: jest.fn(),
    setCooldown: jest.fn(),
    incrementRequestCount: jest.fn(),
    hasExceededRateLimit: jest.fn(),
    storeTempPassword: jest.fn(),
    consumeTempPassword: jest.fn()
  } as unknown as jest.Mocked<UnlockAccountRepository>;
}
