import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, throwawayEmail } from "@helpers/accounts";
import { hasCode, plantCode } from "@helpers/redis";
import {
  API,
  KNOWN_MAGIC_TOKEN,
  errorOf,
  newApi,
  setCookie
} from "@helpers/auth";

// /api/v1/auth/login/magic-link/{send,verify} — server/src/modules/login
// (strategies/magic-link-login). Token: 64 random bytes as hex (128 chars,
// lower-case), 15 min, 60 s cooldown, single use.

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

const SEND = `${API}/auth/login/magic-link/send`;
const VERIFY = `${API}/auth/login/magic-link/verify`;

test(
  "a magic link signs in once and is refused on reuse; malformed tokens fail validation",
  { tag: ["@TC-AUTH-039"] },
  async () => {
    const account = await createAccount({ tag: "auth-ml-ok" });
    const email = account.email;
    expect((await api.post(SEND, { data: { email } })).status()).toBe(200);
    await plantCode("magicLinkLogin", email, KNOWN_MAGIC_TOKEN);

    // Token boundaries: 127 / 129 chars, upper-case hex, empty.
    const malformed: [string, string][] = [
      [KNOWN_MAGIC_TOKEN.slice(1), "string.length"],
      [KNOWN_MAGIC_TOKEN + "a", "string.length"],
      [KNOWN_MAGIC_TOKEN.toUpperCase(), "string.pattern.base"],
      ["", "string.empty"]
    ];
    for (const [token, reason] of malformed) {
      const res = await api.post(VERIFY, { data: { email, token } });
      expect(res.status(), `token len ${token.length}`).toBe(400);
      expect((await errorOf(res)).errors).toContainEqual(
        expect.objectContaining({ field: "token", reason })
      );
    }

    // Right shape, wrong value → 401 and the real link still works.
    const wrong = await api.post(VERIFY, {
      data: { email, token: "f".repeat(128) }
    });
    expect(wrong.status()).toBe(401);
    expect((await errorOf(wrong)).code).toBe("LOGIN_MAGIC_LINK_INVALID");

    const ok = await api.post(VERIFY, {
      data: { email, token: KNOWN_MAGIC_TOKEN }
    });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data.accessToken).toBeTruthy();
    expect(setCookie(ok, "refreshToken")).toMatch(/HttpOnly/i);

    const replay = await api.post(VERIFY, {
      data: { email, token: KNOWN_MAGIC_TOKEN }
    });
    expect(replay.status()).toBe(401);
    const err = await errorOf(replay);
    expect(err.code).toBe("LOGIN_MAGIC_LINK_INVALID");
    expect(err.message).toBe("Invalid or expired magic link");
  }
);

test(
  "send hides whether the address exists and enforces a cooldown",
  { tag: ["@TC-AUTH-040"] },
  async () => {
    const account = await createAccount({ tag: "auth-ml-send" });
    const unknown = throwawayEmail("auth-ml-nobody");
    const expected = { success: true, expiresIn: 900, cooldown: 60 };

    const real = await api.post(SEND, { data: { email: account.email } });
    const ghost = await api.post(SEND, { data: { email: unknown } });
    expect((await real.json()).data).toEqual(expected);
    expect((await ghost.json()).data).toEqual(expected);
    expect(await hasCode("magicLinkLogin", account.email)).toBe(true);
    expect(await hasCode("magicLinkLogin", unknown)).toBe(false);

    for (const email of [account.email, unknown]) {
      const again = await api.post(SEND, { data: { email } });
      expect(again.status()).toBe(400);
      const err = await errorOf(again);
      expect(err.code).toBe("LOGIN_MAGIC_LINK_COOLDOWN");
      expect(err.message).toMatch(
        /^Please wait \d+ seconds before requesting a new magic link$/
      );
    }
  }
);
