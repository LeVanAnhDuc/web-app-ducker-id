jest.mock("@/utils/crypto/secure-token");
jest.mock("@/utils/crypto/bcrypt");
// types
import type { RedisClientType } from "redis";
// modules
import { MAGIC_LINK_CONFIG } from "../constants";
// others
import { LOGIN } from "@/constants/redis/store";
import { generateSecureToken } from "@/utils/crypto/secure-token";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { RedisMagicLinkLoginRepository } from "./magic-link-login.repository";

const mockedGenerateSecureToken = generateSecureToken as jest.MockedFunction<
  typeof generateSecureToken
>;
const mockedHashValue = hashValue as jest.MockedFunction<typeof hashValue>;
const mockedIsValidHashedValue = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;

const EMAIL = "user@example.com";
const TOKEN_KEY = `${LOGIN.MAGIC_LINK}:${EMAIL}`;
const COOLDOWN_KEY = `${LOGIN.MAGIC_LINK_COOLDOWN}:${EMAIL}`;

type RedisClientMock = {
  get: jest.Mock;
  setEx: jest.Mock;
  del: jest.Mock;
  ttl: jest.Mock;
};

function createRedisClientMock(): RedisClientMock {
  return {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn()
  };
}

describe("RedisMagicLinkLoginRepository", () => {
  let client: RedisClientMock;
  let repo: RedisMagicLinkLoginRepository;

  beforeEach(() => {
    client = createRedisClientMock();
    repo = new RedisMagicLinkLoginRepository(
      client as unknown as RedisClientType
    );
  });

  describe("constants exposed via instance", () => {
    it("derives MAGIC_LINK_EXPIRY_SECONDS from MAGIC_LINK_CONFIG.EXPIRY_MINUTES", () => {
      expect(repo.MAGIC_LINK_EXPIRY_SECONDS).toBe(
        MAGIC_LINK_CONFIG.EXPIRY_MINUTES * 60
      );
    });

    it("uses MAGIC_LINK_CONFIG.COOLDOWN_SECONDS as cooldown", () => {
      expect(repo.MAGIC_LINK_COOLDOWN_SECONDS).toBe(
        MAGIC_LINK_CONFIG.COOLDOWN_SECONDS
      );
    });
  });

  describe("createToken", () => {
    it("calls generateSecureToken with TOKEN_LENGTH", () => {
      mockedGenerateSecureToken.mockReturnValue("tok-xyz");

      expect(repo.createToken()).toBe("tok-xyz");
      expect(mockedGenerateSecureToken).toHaveBeenCalledWith(
        MAGIC_LINK_CONFIG.TOKEN_LENGTH
      );
    });
  });

  describe("storeHashed", () => {
    it("stores hashed token at the magic-link key with provided expiry", async () => {
      mockedHashValue.mockReturnValue("hashed-tok");

      await repo.storeHashed(EMAIL, "raw-tok", 900);

      expect(mockedHashValue).toHaveBeenCalledWith("raw-tok");
      expect(client.setEx).toHaveBeenCalledWith(TOKEN_KEY, 900, "hashed-tok");
    });
  });

  describe("verifyToken", () => {
    it("returns false when stored hash missing", async () => {
      client.get.mockResolvedValue(null);

      await expect(repo.verifyToken(EMAIL, "raw")).resolves.toBe(false);
      expect(client.get).toHaveBeenCalledWith(TOKEN_KEY);
      expect(mockedIsValidHashedValue).not.toHaveBeenCalled();
    });

    it("returns true when bcrypt comparison succeeds", async () => {
      client.get.mockResolvedValue("stored-hash");
      mockedIsValidHashedValue.mockReturnValue(true);

      await expect(repo.verifyToken(EMAIL, "raw")).resolves.toBe(true);
      expect(mockedIsValidHashedValue).toHaveBeenCalledWith(
        "raw",
        "stored-hash"
      );
    });

    it("returns false when bcrypt comparison fails", async () => {
      client.get.mockResolvedValue("stored-hash");
      mockedIsValidHashedValue.mockReturnValue(false);

      await expect(repo.verifyToken(EMAIL, "raw")).resolves.toBe(false);
    });
  });

  describe("clearToken", () => {
    it("deletes the magic-link key", async () => {
      await repo.clearToken(EMAIL);

      expect(client.del).toHaveBeenCalledWith(TOKEN_KEY);
    });
  });

  describe("getCooldownRemaining", () => {
    it("returns 0 when key missing (TTL_KEY_MISSING = -2)", async () => {
      client.ttl.mockResolvedValue(-2);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(0);
      expect(client.ttl).toHaveBeenCalledWith(COOLDOWN_KEY);
    });

    it("returns full cooldown when key has no expiry (TTL_NO_EXPIRY = -1)", async () => {
      client.ttl.mockResolvedValue(-1);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(
        MAGIC_LINK_CONFIG.COOLDOWN_SECONDS
      );
    });

    it("returns the actual ttl when positive", async () => {
      client.ttl.mockResolvedValue(42);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(42);
    });
  });

  describe("setCooldown", () => {
    it("setEx cooldown key with given seconds and value '1'", async () => {
      await repo.setCooldown(EMAIL, 30);

      expect(client.setEx).toHaveBeenCalledWith(COOLDOWN_KEY, 30, "1");
    });
  });

  describe("clearCooldown", () => {
    it("deletes the cooldown key", async () => {
      await repo.clearCooldown(EMAIL);

      expect(client.del).toHaveBeenCalledWith(COOLDOWN_KEY);
    });
  });

  describe("createAndStoreToken", () => {
    it("clears prior token, hashes new token, stores with expiry, returns plain token", async () => {
      mockedGenerateSecureToken.mockReturnValue("plain-tok");
      mockedHashValue.mockReturnValue("hashed");

      const token = await repo.createAndStoreToken(EMAIL);

      expect(client.del).toHaveBeenCalledWith(TOKEN_KEY);
      expect(client.setEx).toHaveBeenCalledWith(
        TOKEN_KEY,
        repo.MAGIC_LINK_EXPIRY_SECONDS,
        "hashed"
      );
      expect(token).toBe("plain-tok");
    });
  });

  describe("setCooldownAfterSend", () => {
    it("calls setCooldown with MAGIC_LINK_COOLDOWN_SECONDS", async () => {
      await repo.setCooldownAfterSend(EMAIL);

      expect(client.setEx).toHaveBeenCalledWith(
        COOLDOWN_KEY,
        repo.MAGIC_LINK_COOLDOWN_SECONDS,
        "1"
      );
    });
  });

  describe("cleanupAll", () => {
    it("clears both token and cooldown keys", async () => {
      await repo.cleanupAll(EMAIL);

      expect(client.del).toHaveBeenCalledWith(TOKEN_KEY);
      expect(client.del).toHaveBeenCalledWith(COOLDOWN_KEY);
    });
  });
});
