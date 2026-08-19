// types
import type { MagicLinkLoginRepository } from "@/modules/login/repositories";
// modules
import { MAGIC_LINK_CONFIG } from "@/modules/login/constants";
// others
import { SECONDS_PER_MINUTE } from "@/constants/time";

export function createMagicLinkLoginRepoMock(): jest.Mocked<MagicLinkLoginRepository> {
  return {
    MAGIC_LINK_EXPIRY_SECONDS:
      MAGIC_LINK_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE,
    MAGIC_LINK_COOLDOWN_SECONDS: MAGIC_LINK_CONFIG.COOLDOWN_SECONDS,
    createToken: jest.fn(),
    storeHashed: jest.fn(),
    verifyToken: jest.fn(),
    clearToken: jest.fn(),
    getCooldownRemaining: jest.fn(),
    setCooldown: jest.fn(),
    clearCooldown: jest.fn(),
    createAndStoreToken: jest.fn(),
    setCooldownAfterSend: jest.fn(),
    cleanupAll: jest.fn()
  } as unknown as jest.Mocked<MagicLinkLoginRepository>;
}
