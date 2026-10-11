import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, throwawayEmail } from "@helpers/accounts";
import { deleteKeys, findKeys, hasCode, plantCode } from "@helpers/redis";
import {
  API,
  KNOWN_TEMP_PASSWORD,
  WRONG_PASSWORD,
  errorOf,
  failPasswords,
  jwtPayload,
  lockAccount,
  newApi,
  passwordLogin,
  setAuthFlags,
  setCookie
} from "@helpers/auth";

// Lockout: server/src/modules/login (password-lockout guard,
// redis-failed-attempts repository) — 10 wrong passwords → locked 1800 s.
// Unlock: server/src/modules/unlock-account — request (cooldown 60 s,
// 3 / hour, only for an active AND locked account) emails a temporary
// password (≥ 12 chars, 15 min, single use); verify signs in and sets
// mustChangePassword.

test.use({ role: "guest" });

const REQUEST = `${API}/auth/unlock/request`;
const VERIFY = `${API}/auth/unlock/verify`;

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

test(
  "attempt 9 is a plain failure, attempt 10 locks, and the right password is refused while locked",
  { tag: ["@TC-AUTH-043"] },
  async () => {
    const account = await createAccount({ tag: "auth-lock-bva" });

    const ninth = await failPasswords(account.email, 9);
    expect(ninth.status).toBe(401);
    expect(ninth.error.code).toBe("LOGIN_INVALID_CREDENTIALS");

    const tenth = await passwordLogin(api, account.email, WRONG_PASSWORD);
    expect(tenth.status()).toBe(429);
    const lock = await errorOf(tenth);
    expect(lock.code).toBe("LOGIN_ACCOUNT_LOCKED");
    expect(lock.message).toBe(
      "Account temporarily locked after 10 failed attempts. Please try again in 1800 seconds"
    );

    const right = await passwordLogin(api, account.email, account.password);
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
  "a successful sign-in resets the failed-attempt counter",
  { tag: ["@TC-AUTH-044"] },
  async () => {
    const account = await createAccount({ tag: "auth-lock-reset" });
    await failPasswords(account.email, 9);

    const ok = await passwordLogin(api, account.email, account.password);
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
  "a locked user requests an unlock code, verifies it and gets back in",
  { tag: ["@TC-AUTH-045"] },
  async () => {
    const account = await createAccount({ tag: "auth-unlock-ok" });
    await lockAccount(account.email);

    const req = await api.post(REQUEST, { data: { email: account.email } });
    expect(req.status()).toBe(200);
    // (Success `message` fields come back as raw i18n keys server-wide —
    // see the AUTH report; only `data` is asserted here.)
    expect((await req.json()).data).toEqual({ success: true });
    expect(await hasCode("unlock", account.email)).toBe(true);
    await plantCode("unlock", account.email, KNOWN_TEMP_PASSWORD);

    const verify = await api.post(VERIFY, {
      data: { email: account.email, tempPassword: KNOWN_TEMP_PASSWORD }
    });
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
        (await passwordLogin(api, account.email, account.password)).status()
      )
      .toBe(200);
  }
);

test(
  "unlock refuses invalid transitions: not locked, wrong code, reused code",
  { tag: ["@TC-AUTH-046"] },
  async () => {
    const account = await createAccount({ tag: "auth-unlock-bad" });

    // active (not locked) → request is refused.
    const notLocked = await api.post(REQUEST, {
      data: { email: account.email }
    });
    expect(notLocked.status()).toBe(400);
    const nl = await errorOf(notLocked);
    expect(nl.code).toBe("UNLOCK_ACCOUNT_NOT_LOCKED");
    expect(nl.message).toBe("Account is not locked");

    // active → locked → unlock requested
    await lockAccount(account.email);
    expect(
      (await api.post(REQUEST, { data: { email: account.email } })).status()
    ).toBe(200);
    await plantCode("unlock", account.email, KNOWN_TEMP_PASSWORD);

    // Wrong code → refused, and the real code is NOT burned by the guess.
    const wrong = await api.post(VERIFY, {
      data: { email: account.email, tempPassword: "WrongTemp@2026" }
    });
    expect(wrong.status()).toBe(401);
    const w = await errorOf(wrong);
    expect(w.code).toBe("UNLOCK_INVALID_TEMP_PASSWORD");
    expect(w.message).toBe("Invalid or expired temporary password");

    const ok = await api.post(VERIFY, {
      data: { email: account.email, tempPassword: KNOWN_TEMP_PASSWORD }
    });
    expect(ok.status()).toBe(200);

    // consumed → a replay is refused.
    const replay = await api.post(VERIFY, {
      data: { email: account.email, tempPassword: KNOWN_TEMP_PASSWORD }
    });
    expect(replay.status()).toBe(401);
    expect((await errorOf(replay)).code).toBe("UNLOCK_INVALID_TEMP_PASSWORD");

    // Unknown address → same 401 family, no account disclosed.
    const ghost = await api.post(VERIFY, {
      data: {
        email: throwawayEmail("auth-unlock-ghost"),
        tempPassword: KNOWN_TEMP_PASSWORD
      }
    });
    expect(ghost.status()).toBe(401);
    expect((await errorOf(ghost)).message).toBe(
      "Invalid or expired temporary password"
    );
  }
);

test(
  "unlock request: no enumeration, disabled account, cooldown, hourly limit, code length",
  { tag: ["@TC-AUTH-047"] },
  async () => {
    // Unknown address → the same generic success as a real one.
    const ghost = throwawayEmail("auth-unlock-rl");
    const first = await api.post(REQUEST, { data: { email: ghost } });
    expect(first.status()).toBe(200);
    expect((await first.json()).data).toEqual({ success: true });
    expect(await hasCode("unlock", ghost)).toBe(false);

    // Second request inside 60 s → cooldown.
    const early = await api.post(REQUEST, { data: { email: ghost } });
    expect(early.status()).toBe(400);
    const cd = await errorOf(early);
    expect(cd.code).toBe("UNLOCK_COOLDOWN");
    expect(cd.message).toMatch(
      /^Please wait \d+ seconds before requesting another unlock email$/
    );

    // 3 requests per hour (BVA: 3rd allowed, 4th refused). The cooldown key
    // is dropped between calls to stand in for the 60 s passing.
    for (const n of [2, 3]) {
      await deleteKeys(`unlock-cooldown:${ghost}`);
      const res = await api.post(REQUEST, { data: { email: ghost } });
      expect(res.status(), `request #${n}`).toBe(200);
    }
    await deleteKeys(`unlock-cooldown:${ghost}`);
    const fourth = await api.post(REQUEST, { data: { email: ghost } });
    expect(fourth.status()).toBe(429);
    const rl = await errorOf(fourth);
    expect(rl.code).toBe("UNLOCK_RATE_LIMIT");
    expect(rl.message).toBe("Too many unlock requests. Please try again later");

    // A deactivated account cannot be unlocked by its owner.
    const disabledAccount = await createAccount({ tag: "auth-unlock-off" });
    await setAuthFlags(disabledAccount.email, { isActive: false });
    const disabled = await api.post(REQUEST, {
      data: { email: disabledAccount.email }
    });
    expect(disabled.status()).toBe(400);
    const d = await errorOf(disabled);
    expect(d.code).toBe("UNLOCK_ACCOUNT_DISABLED");
    expect(d.message).toBe(
      "Account has been suspended. Please contact support"
    );

    // Temporary password length: 11 chars refused by validation, 12 accepted.
    const short = await api.post(VERIFY, {
      data: { email: ghost, tempPassword: "a".repeat(11) }
    });
    expect(short.status()).toBe(400);
    expect((await errorOf(short)).errors).toContainEqual(
      expect.objectContaining({
        field: "tempPassword",
        reason: "string.min",
        message: "Temporary password must be at least 12 characters"
      })
    );
    const twelve = await api.post(VERIFY, {
      data: { email: ghost, tempPassword: "a".repeat(12) }
    });
    expect(twelve.status()).toBe(401);
  }
);
