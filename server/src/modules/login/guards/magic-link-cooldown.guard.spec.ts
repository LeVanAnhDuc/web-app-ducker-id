// types
import type { MagicLinkLoginRepository } from "../repositories/magic-link-login.repository";
// common
import { BadRequestError } from "@/exceptions";
// others
import { createMagicLinkLoginRepoMock } from "@test/mocks/magic-link-login-repo.mock";
import { MagicLinkCooldownGuard } from "./magic-link-cooldown.guard";
import { ERROR_CODES } from "@/constants/error-code";

const EMAIL = "user@example.com";

describe("MagicLinkCooldownGuard", () => {
  let repo: jest.Mocked<MagicLinkLoginRepository>;
  let guard: MagicLinkCooldownGuard;

  beforeEach(() => {
    repo = createMagicLinkLoginRepoMock();
    guard = new MagicLinkCooldownGuard(repo);
  });

  it("returns silently when cooldown has expired", async () => {
    repo.getCooldownRemaining.mockResolvedValue(0);

    await expect(guard.assert(EMAIL)).resolves.toBeUndefined();
  });

  it("throws LOGIN_MAGIC_LINK_COOLDOWN with interpolated seconds when cooldown is active", async () => {
    repo.getCooldownRemaining.mockResolvedValue(77);

    const error = await guard.assert(EMAIL).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as BadRequestError).code).toBe(
      ERROR_CODES.LOGIN_MAGIC_LINK_COOLDOWN
    );
    expect((error as BadRequestError).key).toBe(
      "login:errors.magicLinkCooldown"
    );
    expect((error as BadRequestError).params).toEqual({
      seconds: 77
    });
  });
});
