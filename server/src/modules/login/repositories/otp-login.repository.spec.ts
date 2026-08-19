jest.mock("@/utils/crypto/otp");
jest.mock("@/utils/crypto/bcrypt");
// types
import type { RedisClientType } from "redis";
// modules
import { LOGIN_OTP_CONFIG } from "../constants";
// others
import { LOGIN } from "@/constants/redis/store";
import { generateOtp } from "@/utils/crypto/otp";
import { hashValue, isValidHashedValue } from "@/utils/crypto/bcrypt";
import { SECONDS_PER_MINUTE } from "@/constants/time";
import { RedisOtpLoginRepository } from "./otp-login.repository";

const mockedGenerateOtp = generateOtp as jest.MockedFunction<
  typeof generateOtp
>;
const mockedHashValue = hashValue as jest.MockedFunction<typeof hashValue>;
const mockedIsValidHashedValue = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;

const EMAIL = "user@example.com";
const OTP_KEY = `${LOGIN.OTP}:${EMAIL}`;
const COOLDOWN_KEY = `${LOGIN.OTP_COOLDOWN}:${EMAIL}`;
const FAILED_ATTEMPTS_KEY = `${LOGIN.OTP_FAILED_ATTEMPTS}:${EMAIL}`;
const RESEND_COUNT_KEY = `${LOGIN.OTP_RESEND_COUNT}:${EMAIL}`;

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

describe("RedisOtpLoginRepository", () => {
  let client: RedisClientMock;
  let repo: RedisOtpLoginRepository;

  beforeEach(() => {
    client = createRedisClientMock();
    repo = new RedisOtpLoginRepository(client as unknown as RedisClientType);
  });

  describe("derived constants", () => {
    it("OTP_EXPIRY_SECONDS is EXPIRY_MINUTES * 60", () => {
      expect(repo.OTP_EXPIRY_SECONDS).toBe(
        LOGIN_OTP_CONFIG.EXPIRY_MINUTES * SECONDS_PER_MINUTE
      );
    });

    it("OTP_COOLDOWN_SECONDS uses configured value", () => {
      expect(repo.OTP_COOLDOWN_SECONDS).toBe(LOGIN_OTP_CONFIG.COOLDOWN_SECONDS);
    });
  });

  describe("createOtp", () => {
    it("calls generateOtp with configured LENGTH", () => {
      mockedGenerateOtp.mockReturnValue("123456");

      expect(repo.createOtp()).toBe("123456");
      expect(mockedGenerateOtp).toHaveBeenCalledWith(LOGIN_OTP_CONFIG.LENGTH);
    });
  });

  describe("storeHashed", () => {
    it("hashes otp and persists with expiry", async () => {
      mockedHashValue.mockReturnValue("hashed-otp");

      await repo.storeHashed(EMAIL, "raw", 300);

      expect(mockedHashValue).toHaveBeenCalledWith("raw");
      expect(client.setEx).toHaveBeenCalledWith(OTP_KEY, 300, "hashed-otp");
    });
  });

  describe("clearOtp", () => {
    it("deletes the OTP key", async () => {
      await repo.clearOtp(EMAIL);

      expect(client.del).toHaveBeenCalledWith(OTP_KEY);
    });
  });

  describe("verify", () => {
    it("returns false when no hash stored", async () => {
      client.get.mockResolvedValue(null);

      await expect(repo.verify(EMAIL, "123456")).resolves.toBe(false);
      expect(mockedIsValidHashedValue).not.toHaveBeenCalled();
    });

    it("returns true when bcrypt comparison passes", async () => {
      client.get.mockResolvedValue("stored");
      mockedIsValidHashedValue.mockReturnValue(true);

      await expect(repo.verify(EMAIL, "123456")).resolves.toBe(true);
      expect(mockedIsValidHashedValue).toHaveBeenCalledWith("123456", "stored");
    });

    it("returns false when bcrypt comparison fails", async () => {
      client.get.mockResolvedValue("stored");
      mockedIsValidHashedValue.mockReturnValue(false);

      await expect(repo.verify(EMAIL, "wrong")).resolves.toBe(false);
    });
  });

  describe("getCooldownRemaining", () => {
    it("returns 0 when key missing", async () => {
      client.ttl.mockResolvedValue(-2);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(0);
    });

    it("returns full cooldown when key has no expiry", async () => {
      client.ttl.mockResolvedValue(-1);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(
        LOGIN_OTP_CONFIG.COOLDOWN_SECONDS
      );
    });

    it("returns ttl when positive", async () => {
      client.ttl.mockResolvedValue(15);

      await expect(repo.getCooldownRemaining(EMAIL)).resolves.toBe(15);
      expect(client.ttl).toHaveBeenCalledWith(COOLDOWN_KEY);
    });
  });

  describe("setCooldown / clearCooldown", () => {
    it("setCooldown writes value '1' with given ttl", async () => {
      await repo.setCooldown(EMAIL, 60);
      expect(client.setEx).toHaveBeenCalledWith(COOLDOWN_KEY, 60, "1");
    });

    it("clearCooldown deletes key", async () => {
      await repo.clearCooldown(EMAIL);
      expect(client.del).toHaveBeenCalledWith(COOLDOWN_KEY);
    });
  });

  describe("incrementFailedAttempts", () => {
    it("sets lockout-window expiry only on first attempt", async () => {
      client.incr.mockResolvedValue(1);

      const result = await repo.incrementFailedAttempts(EMAIL);

      expect(client.incr).toHaveBeenCalledWith(FAILED_ATTEMPTS_KEY);
      expect(client.expire).toHaveBeenCalledWith(
        FAILED_ATTEMPTS_KEY,
        LOGIN_OTP_CONFIG.LOCKOUT_DURATION_MINUTES * SECONDS_PER_MINUTE
      );
      expect(result).toBe(1);
    });

    it("does not set expiry on subsequent attempts", async () => {
      client.incr.mockResolvedValue(3);

      const result = await repo.incrementFailedAttempts(EMAIL);

      expect(client.expire).not.toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });

  describe("getFailedAttemptCount", () => {
    it("parses stored count", async () => {
      client.get.mockResolvedValue("4");
      await expect(repo.getFailedAttemptCount(EMAIL)).resolves.toBe(4);
    });

    it("returns 0 when missing", async () => {
      client.get.mockResolvedValue(null);
      await expect(repo.getFailedAttemptCount(EMAIL)).resolves.toBe(0);
    });
  });

  describe("clearFailedAttempts", () => {
    it("deletes the failed-attempts key", async () => {
      await repo.clearFailedAttempts(EMAIL);
      expect(client.del).toHaveBeenCalledWith(FAILED_ATTEMPTS_KEY);
    });
  });

  describe("isLocked", () => {
    it("returns true when count >= MAX_FAILED_ATTEMPTS", async () => {
      client.get.mockResolvedValue(
        String(LOGIN_OTP_CONFIG.MAX_FAILED_ATTEMPTS)
      );

      await expect(repo.isLocked(EMAIL)).resolves.toBe(true);
    });

    it("returns false when count below threshold", async () => {
      client.get.mockResolvedValue(
        String(LOGIN_OTP_CONFIG.MAX_FAILED_ATTEMPTS - 1)
      );

      await expect(repo.isLocked(EMAIL)).resolves.toBe(false);
    });

    it("returns false when no count yet", async () => {
      client.get.mockResolvedValue(null);

      await expect(repo.isLocked(EMAIL)).resolves.toBe(false);
    });
  });

  describe("incrementResendCount", () => {
    it("sets window expiry only on first increment", async () => {
      client.incr.mockResolvedValue(1);

      const result = await repo.incrementResendCount(EMAIL, 300);

      expect(client.incr).toHaveBeenCalledWith(RESEND_COUNT_KEY);
      expect(client.expire).toHaveBeenCalledWith(RESEND_COUNT_KEY, 300);
      expect(result).toBe(1);
    });

    it("does not set expiry on later increments", async () => {
      client.incr.mockResolvedValue(2);

      const result = await repo.incrementResendCount(EMAIL, 300);

      expect(client.expire).not.toHaveBeenCalled();
      expect(result).toBe(2);
    });
  });

  describe("getResendAttemptCount", () => {
    it("parses stored count", async () => {
      client.get.mockResolvedValue("2");
      await expect(repo.getResendAttemptCount(EMAIL)).resolves.toBe(2);
    });

    it("returns 0 when missing", async () => {
      client.get.mockResolvedValue(null);
      await expect(repo.getResendAttemptCount(EMAIL)).resolves.toBe(0);
    });
  });

  describe("clearResendCount", () => {
    it("deletes the resend-count key", async () => {
      await repo.clearResendCount(EMAIL);
      expect(client.del).toHaveBeenCalledWith(RESEND_COUNT_KEY);
    });
  });

  describe("hasExceededResendLimit", () => {
    it("returns true when resend count >= MAX_RESEND_ATTEMPTS", async () => {
      client.get.mockResolvedValue(
        String(LOGIN_OTP_CONFIG.MAX_RESEND_ATTEMPTS)
      );

      await expect(repo.hasExceededResendLimit(EMAIL)).resolves.toBe(true);
    });

    it("returns false when below limit", async () => {
      client.get.mockResolvedValue(
        String(LOGIN_OTP_CONFIG.MAX_RESEND_ATTEMPTS - 1)
      );

      await expect(repo.hasExceededResendLimit(EMAIL)).resolves.toBe(false);
    });
  });

  describe("createAndStoreOtp", () => {
    it("clears prior OTP, hashes new, stores with expiry, returns plain otp", async () => {
      mockedGenerateOtp.mockReturnValue("987654");
      mockedHashValue.mockReturnValue("hashed");

      const otp = await repo.createAndStoreOtp(EMAIL);

      expect(client.del).toHaveBeenCalledWith(OTP_KEY);
      expect(client.setEx).toHaveBeenCalledWith(
        OTP_KEY,
        repo.OTP_EXPIRY_SECONDS,
        "hashed"
      );
      expect(otp).toBe("987654");
    });
  });

  describe("setRateLimits", () => {
    it("sets cooldown and increments resend window in parallel", async () => {
      client.incr.mockResolvedValue(1);

      await repo.setRateLimits(EMAIL);

      expect(client.setEx).toHaveBeenCalledWith(
        COOLDOWN_KEY,
        repo.OTP_COOLDOWN_SECONDS,
        "1"
      );
      expect(client.incr).toHaveBeenCalledWith(RESEND_COUNT_KEY);
      expect(client.expire).toHaveBeenCalledWith(
        RESEND_COUNT_KEY,
        repo.OTP_EXPIRY_SECONDS
      );
    });
  });

  describe("cleanupAll", () => {
    it("clears OTP, cooldown, failed attempts, resend count", async () => {
      await repo.cleanupAll(EMAIL);

      expect(client.del).toHaveBeenCalledWith(OTP_KEY);
      expect(client.del).toHaveBeenCalledWith(COOLDOWN_KEY);
      expect(client.del).toHaveBeenCalledWith(FAILED_ATTEMPTS_KEY);
      expect(client.del).toHaveBeenCalledWith(RESEND_COUNT_KEY);
      expect(client.del).toHaveBeenCalledTimes(4);
    });
  });
});
