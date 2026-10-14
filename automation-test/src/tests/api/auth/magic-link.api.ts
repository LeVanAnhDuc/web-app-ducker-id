import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { errorOf, setCookie } from "@/api/response";
import { pattern, serverMessage } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN } from "@/data/test-data";
import { createAccount, throwawayEmail } from "@/utils/accounts";
import { hasCode, plantCode } from "@/utils/redis";

// /auth/login/magic-link/{send,verify} — server/src/modules/login
// (strategies/magic-link-login). Token: 64 random bytes as hex (128 chars,
// lower-case), 15 min, 60 s cooldown, single use.

test.use({ role: "guest" });

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

const loginErrors = serverMessage.login.errors;

test(
  "A magic link works once; malformed tokens fail validation",
  { tag: ["@TC-AUTH-039"] },
  async () => {
    const account = await createAccount({ tag: "auth-ml-ok" });
    const email = account.email;
    expect((await api.auth.sendMagicLink(email)).status()).toBe(200);
    await plantCode("magicLinkLogin", email, KNOWN_MAGIC_TOKEN);

    // Token boundaries: 127 / 129 chars, upper-case hex, empty.
    const malformed: [string, string][] = [
      [KNOWN_MAGIC_TOKEN.slice(1), "string.length"],
      [KNOWN_MAGIC_TOKEN + "a", "string.length"],
      [KNOWN_MAGIC_TOKEN.toUpperCase(), "string.pattern.base"],
      ["", "string.empty"]
    ];
    for (const [token, reason] of malformed) {
      const res = await api.auth.verifyMagicLink(email, token);
      expect(res.status(), `token len ${token.length}`).toBe(400);
      expect((await errorOf(res)).errors).toContainEqual(
        expect.objectContaining({ field: "token", reason })
      );
    }

    // Right shape, wrong value → 401 and the real link still works.
    const wrong = await api.auth.verifyMagicLink(email, "f".repeat(128));
    expect(wrong.status()).toBe(401);
    expect((await errorOf(wrong)).code).toBe("LOGIN_MAGIC_LINK_INVALID");

    const ok = await api.auth.verifyMagicLink(email, KNOWN_MAGIC_TOKEN);
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data.accessToken).toBeTruthy();
    expect(setCookie(ok, "refreshToken")).toMatch(/HttpOnly/i);

    const replay = await api.auth.verifyMagicLink(email, KNOWN_MAGIC_TOKEN);
    expect(replay.status()).toBe(401);
    const err = await errorOf(replay);
    expect(err.code).toBe("LOGIN_MAGIC_LINK_INVALID");
    expect(err.message).toBe(loginErrors.invalidMagicLink);
  }
);

test(
  "Magic-link send hides whether the address exists and enforces a cooldown",
  { tag: ["@TC-AUTH-040"] },
  async () => {
    const account = await createAccount({ tag: "auth-ml-send" });
    const unknown = throwawayEmail("auth-ml-nobody");
    const expected = { success: true, expiresIn: 900, cooldown: 60 };

    const real = await api.auth.sendMagicLink(account.email);
    const ghost = await api.auth.sendMagicLink(unknown);
    expect((await real.json()).data).toEqual(expected);
    expect((await ghost.json()).data).toEqual(expected);
    expect(await hasCode("magicLinkLogin", account.email)).toBe(true);
    expect(await hasCode("magicLinkLogin", unknown)).toBe(false);

    for (const email of [account.email, unknown]) {
      const again = await api.auth.sendMagicLink(email);
      expect(again.status()).toBe(400);
      const err = await errorOf(again);
      expect(err.code).toBe("LOGIN_MAGIC_LINK_COOLDOWN");
      expect(err.message).toMatch(
        pattern(loginErrors.magicLinkCooldown, {}, { exact: true })
      );
    }
  }
);
