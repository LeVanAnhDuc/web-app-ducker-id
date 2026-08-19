jest.mock("../helpers", () => ({
  __esModule: true,
  getSecondsUntilMidnightUTC: jest.fn(() => 3600)
}));
// types
import type { RedisClientType } from "redis";
// modules
import { LOGIN_LOCKOUT } from "../constants";
// others
import { LOGIN } from "@/constants/redis/store";
import { getSecondsUntilMidnightUTC } from "../helpers";
import { RedisFailedAttemptsRepository } from "./failed-attempts.repository";

const mockedSecondsUntilMidnight =
  getSecondsUntilMidnightUTC as jest.MockedFunction<
    typeof getSecondsUntilMidnightUTC
  >;

const EMAIL = "user@example.com";
const ATTEMPTS_KEY = `${LOGIN.FAILED_ATTEMPTS}:${EMAIL}`;
const LOCKOUT_KEY = `${LOGIN.LOCKOUT}:${EMAIL}`;

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

describe("RedisFailedAttemptsRepository", () => {
  let client: RedisClientMock;
  let repo: RedisFailedAttemptsRepository;

  beforeEach(() => {
    client = createRedisClientMock();
    repo = new RedisFailedAttemptsRepository(
      client as unknown as RedisClientType
    );
    mockedSecondsUntilMidnight.mockReturnValue(3600);
  });

  describe("getCount", () => {
    it("returns parsed count when key exists", async () => {
      client.get.mockResolvedValue("4");

      await expect(repo.getCount(EMAIL)).resolves.toBe(4);
      expect(client.get).toHaveBeenCalledWith(ATTEMPTS_KEY);
    });

    it("returns 0 when key missing", async () => {
      client.get.mockResolvedValue(null);

      await expect(repo.getCount(EMAIL)).resolves.toBe(0);
    });

    it("returns 0 when stored value is empty string", async () => {
      client.get.mockResolvedValue("");

      await expect(repo.getCount(EMAIL)).resolves.toBe(0);
    });
  });

  describe("trackAttempt", () => {
    it("sets midnight expiry only on first attempt", async () => {
      client.incr.mockResolvedValue(1);

      const result = await repo.trackAttempt(EMAIL);

      expect(client.incr).toHaveBeenCalledWith(ATTEMPTS_KEY);
      expect(client.expire).toHaveBeenCalledWith(ATTEMPTS_KEY, 3600);
      expect(client.setEx).not.toHaveBeenCalled();
      expect(result).toEqual({ attemptCount: 1, lockoutSeconds: 0 });
    });

    it("does not set expiry on subsequent attempts below threshold", async () => {
      client.incr.mockResolvedValue(2);

      const result = await repo.trackAttempt(EMAIL);

      expect(client.expire).not.toHaveBeenCalled();
      expect(client.setEx).not.toHaveBeenCalled();
      expect(result).toEqual({ attemptCount: 2, lockoutSeconds: 0 });
    });

    it("sets lockout key when count reaches MAX_ATTEMPTS", async () => {
      client.incr.mockResolvedValue(LOGIN_LOCKOUT.MAX_ATTEMPTS);

      const result = await repo.trackAttempt(EMAIL);

      expect(client.setEx).toHaveBeenCalledWith(
        LOCKOUT_KEY,
        LOGIN_LOCKOUT.LOCKOUT_SECONDS,
        String(LOGIN_LOCKOUT.MAX_ATTEMPTS)
      );
      expect(result).toEqual({
        attemptCount: LOGIN_LOCKOUT.MAX_ATTEMPTS,
        lockoutSeconds: LOGIN_LOCKOUT.LOCKOUT_SECONDS
      });
    });

    it("keeps lockout active when count exceeds MAX_ATTEMPTS", async () => {
      client.incr.mockResolvedValue(LOGIN_LOCKOUT.MAX_ATTEMPTS + 5);

      const result = await repo.trackAttempt(EMAIL);

      expect(client.setEx).toHaveBeenCalledWith(
        LOCKOUT_KEY,
        LOGIN_LOCKOUT.LOCKOUT_SECONDS,
        String(LOGIN_LOCKOUT.MAX_ATTEMPTS + 5)
      );
      expect(result.lockoutSeconds).toBe(LOGIN_LOCKOUT.LOCKOUT_SECONDS);
    });
  });

  describe("resetAll", () => {
    it("deletes both attempts and lockout keys in parallel", async () => {
      client.del.mockResolvedValue(1);

      await repo.resetAll(EMAIL);

      expect(client.del).toHaveBeenCalledWith(ATTEMPTS_KEY);
      expect(client.del).toHaveBeenCalledWith(LOCKOUT_KEY);
      expect(client.del).toHaveBeenCalledTimes(2);
    });
  });

  describe("checkLockout", () => {
    it("reports locked with TTL when key has positive ttl", async () => {
      client.ttl.mockResolvedValue(120);

      await expect(repo.checkLockout(EMAIL)).resolves.toEqual({
        isLocked: true,
        remainingSeconds: 120
      });
      expect(client.ttl).toHaveBeenCalledWith(LOCKOUT_KEY);
    });

    it("reports not locked when key missing (ttl=-2)", async () => {
      client.ttl.mockResolvedValue(-2);

      await expect(repo.checkLockout(EMAIL)).resolves.toEqual({
        isLocked: false,
        remainingSeconds: 0
      });
    });

    it("reports not locked when key has no expiry (ttl=-1)", async () => {
      client.ttl.mockResolvedValue(-1);

      await expect(repo.checkLockout(EMAIL)).resolves.toEqual({
        isLocked: false,
        remainingSeconds: 0
      });
    });

    it("reports not locked when ttl=0 (just expired)", async () => {
      client.ttl.mockResolvedValue(0);

      await expect(repo.checkLockout(EMAIL)).resolves.toEqual({
        isLocked: false,
        remainingSeconds: 0
      });
    });
  });
});
