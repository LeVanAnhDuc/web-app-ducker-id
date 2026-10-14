import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";
import type { ApiClient } from "@/api";
import { errorOf, setCookie } from "@/api/response";
import { fill, pattern, serverMessage } from "@/data/copy";
import {
  KNOWN_MAGIC_TOKEN,
  KNOWN_OTP,
  KNOWN_TEMP_PASSWORD,
  WRONG_PASSWORD
} from "@/data/test-data";
import { createAccount, throwawayEmail } from "@/utils/accounts";
import { failPasswords, lockAccount, setAuthFlags } from "@/utils/auth";
import { deleteKeys, findKeys, hasCode, plantCode } from "@/utils/redis";
import { jwtPayload } from "@/utils/jwt";

// Lockout: server/src/modules/login (password-lockout guard,
// redis-failed-attempts repository) — 10 wrong passwords → locked 1800 s.
// Unlock: server/src/modules/unlock-account — request (cooldown 60 s,
// 3 / hour, only for an active AND locked account) emails a temporary
// password (≥ 12 chars, 15 min, single use); verify signs in and sets
// mustChangePassword.

test.use({ role: "guest" });
// Locking takes ten real bcrypt sign-ins against the cloud Redis (~20 s).
test.slow(true, "every test locks an account with ten wrong passwords");

const unlockErrors = serverMessage.unlockAccount.errors;

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

test(
  "Lockout boundary: attempt 9 fails, attempt 10 locks, the right password is refused",
  { tag: ["@TC-AUTH-043", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "auth-lock-bva" });

    const ninth = await failPasswords(account.email, 9);
    expect(ninth.status).toBe(401);
    expect(ninth.error.code).toBe("LOGIN_INVALID_CREDENTIALS");

    const tenth = await api.auth.login(account.email, WRONG_PASSWORD);
    expect(tenth.status()).toBe(429);
    const lock = await errorOf(tenth);
    expect(lock.code).toBe("LOGIN_ACCOUNT_LOCKED");
    expect(lock.message).toBe(
      fill(serverMessage.login.errors.accountLocked, {
        attempts: 10,
        seconds: 1800
      })
    );

    const right = await api.auth.login(account.email, account.password);
    expect(right.status()).toBe(429);
    const still = await errorOf(right);
    expect(still.code).toBe("LOGIN_ACCOUNT_LOCKED");
    const seconds = Number(/in (\d+) seconds/.exec(still.message)?.[1]);
    expect(seconds).toBeGreaterThan(1700);
    expect(seconds).toBeLessThanOrEqual(1800);
    expect(setCookie(right, "refreshToken")).toBeUndefined();
  }
);

test(
  "A successful sign-in resets the failed-attempt counter",
  { tag: ["@TC-AUTH-044"] },
  async () => {
    const account = await createAccount({ tag: "auth-lock-reset" });
    await failPasswords(account.email, 9);

    const ok = await api.auth.login(account.email, account.password);
    expect(ok.status()).toBe(200);

    // The reset is fire-and-forget on the server; wait for the counter to go.
    await expect
      .poll(async () => findKeys(`login-failed-attempts:${account.email}`))
      .toEqual([]);

    // Nine more wrong passwords are still below the threshold.
    const ninth = await failPasswords(account.email, 9);
    expect(ninth.status).toBe(401);
  }
);

test(
  "A locked user requests an unlock code, verifies it and gets back in",
  { tag: ["@TC-AUTH-045", "@smoke"] },
  async () => {
    const account = await createAccount({ tag: "auth-unlock-ok" });
    await lockAccount(account.email);

    const req = await api.auth.requestUnlock(account.email);
    expect(req.status()).toBe(200);
    // (Success `message` fields come back as raw i18n keys server-wide —
    // see the AUTH report; only `data` is asserted here.)
    expect((await req.json()).data).toEqual({ success: true });
    expect(await hasCode("unlock", account.email)).toBe(true);
    await plantCode("unlock", account.email, KNOWN_TEMP_PASSWORD);

    const verify = await api.auth.verifyUnlock(
      account.email,
      KNOWN_TEMP_PASSWORD
    );
    expect(verify.status()).toBe(200);
    const { data } = await verify.json();
    expect(data).not.toHaveProperty("refreshToken");
    expect(setCookie(verify, "refreshToken")).toMatch(/HttpOnly/i);
    expect(
      jwtPayload<{ mustChangePassword: boolean }>(data.idToken)
        .mustChangePassword
    ).toBe(true);

    // The lock is gone: the account's own password works again.
    await expect
      .poll(async () =>
        (await api.auth.login(account.email, account.password)).status()
      )
      .toBe(200);
  }
);

test(
  "Unlock refuses invalid transitions",
  { tag: ["@TC-AUTH-046"] },
  async () => {
    const account = await createAccount({ tag: "auth-unlock-bad" });

    // active (not locked) → request is refused.
    const notLocked = await api.auth.requestUnlock(account.email);
    expect(notLocked.status()).toBe(400);
    const nl = await errorOf(notLocked);
    expect(nl.code).toBe("UNLOCK_ACCOUNT_NOT_LOCKED");
    expect(nl.message).toBe(unlockErrors.accountNotLocked);

    // active → locked → unlock requested
    await lockAccount(account.email);
    expect((await api.auth.requestUnlock(account.email)).status()).toBe(200);
    await plantCode("unlock", account.email, KNOWN_TEMP_PASSWORD);

    // Wrong code → refused, and the real code is NOT burned by the guess.
    const wrong = await api.auth.verifyUnlock(account.email, "WrongTemp@2026");
    expect(wrong.status()).toBe(401);
    const w = await errorOf(wrong);
    expect(w.code).toBe("UNLOCK_INVALID_TEMP_PASSWORD");
    expect(w.message).toBe(unlockErrors.invalidTempPassword);

    const ok = await api.auth.verifyUnlock(account.email, KNOWN_TEMP_PASSWORD);
    expect(ok.status()).toBe(200);

    // consumed → a replay is refused.
    const replay = await api.auth.verifyUnlock(
      account.email,
      KNOWN_TEMP_PASSWORD
    );
    expect(replay.status()).toBe(401);
    expect((await errorOf(replay)).code).toBe("UNLOCK_INVALID_TEMP_PASSWORD");

    // Unknown address → same 401 family, no account disclosed.
    const ghost = await api.auth.verifyUnlock(
      throwawayEmail("auth-unlock-ghost"),
      KNOWN_TEMP_PASSWORD
    );
    expect(ghost.status()).toBe(401);
    expect((await errorOf(ghost)).message).toBe(
      unlockErrors.invalidTempPassword
    );
  }
);

test(
  "Unlock request guards: no enumeration, disabled account, cooldown, hourly limit, code length",
  { tag: ["@TC-AUTH-047"] },
  async () => {
    // Unknown address → the same generic success as a real one.
    const ghost = throwawayEmail("auth-unlock-rl");
    const first = await api.auth.requestUnlock(ghost);
    expect(first.status()).toBe(200);
    expect((await first.json()).data).toEqual({ success: true });
    expect(await hasCode("unlock", ghost)).toBe(false);

    // Second request inside 60 s → cooldown.
    const early = await api.auth.requestUnlock(ghost);
    expect(early.status()).toBe(400);
    const cd = await errorOf(early);
    expect(cd.code).toBe("UNLOCK_COOLDOWN");
    expect(cd.message).toMatch(
      pattern(unlockErrors.unlockCooldown, {}, { exact: true })
    );

    // 3 requests per hour (BVA: 3rd allowed, 4th refused). The cooldown key
    // is dropped between calls to stand in for the 60 s passing.
    for (const n of [2, 3]) {
      await deleteKeys(`unlock-cooldown:${ghost}`);
      const res = await api.auth.requestUnlock(ghost);
      expect(res.status(), `request #${n}`).toBe(200);
    }
    await deleteKeys(`unlock-cooldown:${ghost}`);
    const fourth = await api.auth.requestUnlock(ghost);
    expect(fourth.status()).toBe(429);
    const rl = await errorOf(fourth);
    expect(rl.code).toBe("UNLOCK_RATE_LIMIT");
    expect(rl.message).toBe(unlockErrors.unlockRateLimit);

    // A deactivated account cannot be unlocked by its owner.
    const disabledAccount = await createAccount({ tag: "auth-unlock-off" });
    await setAuthFlags(disabledAccount.email, { isActive: false });
    const disabled = await api.auth.requestUnlock(disabledAccount.email);
    expect(disabled.status()).toBe(400);
    const d = await errorOf(disabled);
    expect(d.code).toBe("UNLOCK_ACCOUNT_DISABLED");
    expect(d.message).toBe(unlockErrors.accountDisabled);

    // Temporary password length: 11 chars refused by validation, 12 accepted.
    const short = await api.auth.verifyUnlock(ghost, "a".repeat(11));
    expect(short.status()).toBe(400);
    expect((await errorOf(short)).errors).toContainEqual(
      expect.objectContaining({
        field: "tempPassword",
        reason: "string.min",
        message: serverMessage.unlockAccount.validation.tempPasswordTooShort
      })
    );
    const twelve = await api.auth.verifyUnlock(ghost, "a".repeat(12));
    expect(twelve.status()).toBe(401);
  }
);

test(
  "A password-locked account cannot sign in with a code or a magic link",
  { tag: ["@TC-AUTH-064"] },
  async () => {
    // Only the password strategy runs PasswordLockoutGuard; the OTP and
    // magic-link strategies never look at the lock (decisions Q3).
    // BUG: defects/auth.md#bug-auth-06
    test.fail();
    const account = await createAccount({ tag: "auth-lock-bypass" });
    await lockAccount(account.email);

    // A send that issues nothing for a locked account is also a refusal;
    // whatever IS issued must not sign the account in.
    expect((await api.auth.sendLoginOtp(account.email)).status()).toBe(200);
    let byCode: APIResponse | null = null;
    if (await hasCode("login", account.email)) {
      await plantCode("login", account.email, KNOWN_OTP);
      byCode = await api.auth.verifyLoginOtp(account.email, KNOWN_OTP);
    }

    expect((await api.auth.sendMagicLink(account.email)).status()).toBe(200);
    let byLink: APIResponse | null = null;
    if (await hasCode("magicLinkLogin", account.email)) {
      await plantCode("magicLinkLogin", account.email, KNOWN_MAGIC_TOKEN);
      byLink = await api.auth.verifyMagicLink(account.email, KNOWN_MAGIC_TOKEN);
    }

    for (const [method, res] of [
      ["one-time code", byCode],
      ["magic link", byLink]
    ] as const) {
      if (res === null) continue;
      expect(res.status(), method).toBe(429);
      expect((await errorOf(res)).code, method).toBe("LOGIN_ACCOUNT_LOCKED");
      expect(setCookie(res, "refreshToken"), method).toBeUndefined();
    }
  }
);
