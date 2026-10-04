// types
import type { RedisClientType } from "redis";
// modules
import { UNLOCK_ACCOUNT_CONFIG } from "./constants";
// others
import { LOGIN } from "@/constants/redis/store";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { hashValue } from "@/utils/crypto/bcrypt";
import { RedisUnlockAccountRepository } from "./unlock-account.repository";

const EMAIL = "user@example.com";
const TOKEN_KEY = `${LOGIN.UNLOCK_TOKEN}:${EMAIL}`;
const TEMP_PASSWORD = "Aa1!bcdefghijklm";
const EXPIRY_SECONDS =
  UNLOCK_ACCOUNT_CONFIG.TEMP_PASSWORD_EXPIRY_MINUTES * SECONDS_PER_MINUTE;

type RedisClientMock = {
  get: jest.Mock;
  incr: jest.Mock;
  expire: jest.Mock;
  setEx: jest.Mock;
  del: jest.Mock;
  ttl: jest.Mock;
};

function createRedisClientMock(): RedisClientMock {
  return {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn()
  };
}

describe("RedisUnlockAccountRepository — temp password", () => {
  let client: RedisClientMock;
  let repo: RedisUnlockAccountRepository;

  beforeEach(() => {
    client = createRedisClientMock();
    repo = new RedisUnlockAccountRepository(
      client as unknown as RedisClientType
    );
  });

  describe("storeTempPassword", () => {
    it("stores only the hash, under the unlock-token key with the 15-minute TTL", async () => {
      await repo.storeTempPassword(EMAIL, TEMP_PASSWORD);

      expect(client.setEx).toHaveBeenCalledTimes(1);
      const [key, ttl, stored] = client.setEx.mock.calls[0];
      expect(key).toBe(TOKEN_KEY);
      expect(ttl).toBe(EXPIRY_SECONDS);
      expect(stored).not.toBe(TEMP_PASSWORD);
      expect(stored).toMatch(/^\$2[aby]\$/);
    });
  });

  describe("consumeTempPassword", () => {
    it("returns false without deleting when no token is stored", async () => {
      client.get.mockResolvedValue(null);

      await expect(
        repo.consumeTempPassword(EMAIL, TEMP_PASSWORD)
      ).resolves.toBe(false);
      expect(client.get).toHaveBeenCalledWith(TOKEN_KEY);
      expect(client.del).not.toHaveBeenCalled();
    });

    it("keeps the stored token when the guess is wrong, so a stranger cannot burn it", async () => {
      client.get.mockResolvedValue(hashValue(TEMP_PASSWORD));

      await expect(
        repo.consumeTempPassword(EMAIL, "wrong-guess")
      ).resolves.toBe(false);
      expect(client.del).not.toHaveBeenCalled();
    });

    it("deletes the key and returns true on a correct temp password", async () => {
      client.get.mockResolvedValue(hashValue(TEMP_PASSWORD));
      client.del.mockResolvedValue(1);

      await expect(
        repo.consumeTempPassword(EMAIL, TEMP_PASSWORD)
      ).resolves.toBe(true);
      expect(client.del).toHaveBeenCalledWith(TOKEN_KEY);
    });

    it("returns false when DEL reports 0 — a concurrent request already consumed it", async () => {
      client.get.mockResolvedValue(hashValue(TEMP_PASSWORD));
      client.del.mockResolvedValue(0);

      await expect(
        repo.consumeTempPassword(EMAIL, TEMP_PASSWORD)
      ).resolves.toBe(false);
    });
  });
});
