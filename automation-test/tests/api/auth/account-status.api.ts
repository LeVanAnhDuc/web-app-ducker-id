import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import { hasCode } from "@helpers/redis";
import {
  API,
  KNOWN_MAGIC_TOKEN,
  errorOf,
  newApi,
  setAuthFlags
} from "@helpers/auth";

// Decision table — account status × sign-in method (server/src/modules/login,
// guards/account-active + email-verified; the active check runs first).
//
//   isActive | verifiedEmail | password / OTP verify / magic-link verify
//   ---------+---------------+-----------------------------------------
//   false    | true          | 401 LOGIN_ACCOUNT_INACTIVE
//   false    | false         | 401 LOGIN_ACCOUNT_INACTIVE   (active wins)
//   true     | false         | 401 LOGIN_EMAIL_NOT_VERIFIED
//   true     | true          | 200                          (control row)
//
// Code / link *send* answers 200 for every row but issues nothing to an
// ineligible account. Throwaway accounts with flags set directly stand in for
// the seeded inactive@ / unverified@ accounts, which other specs may change.

test.use({ role: "guest" });

const INACTIVE = {
  code: "LOGIN_ACCOUNT_INACTIVE",
  message: "Your account has been deactivated. Please contact support"
};
const UNVERIFIED = {
  code: "LOGIN_EMAIL_NOT_VERIFIED",
  message: "Please verify your email address before logging in"
};

const ROWS = [
  { isActive: false, verifiedEmail: true, expected: INACTIVE },
  { isActive: false, verifiedEmail: false, expected: INACTIVE },
  { isActive: true, verifiedEmail: false, expected: UNVERIFIED }
];

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

for (const row of ROWS) {
  test(
    `isActive=${row.isActive}, verifiedEmail=${row.verifiedEmail} → ${row.expected.code} for every method`,
    { tag: ["@TC-AUTH-049"] },
    async () => {
      const account = await createAccount({ tag: "auth-status" });
      await setAuthFlags(account.email, {
        isActive: row.isActive,
        verifiedEmail: row.verifiedEmail
      });
      const email = account.email;

      // The real password, and a code / link that are never compared — the
      // status guards answer first.
      const attempts = await Promise.all([
        api.post(`${API}/auth/login`, {
          data: { email, password: account.password }
        }),
        api.post(`${API}/auth/login/otp/verify`, {
          data: { email, otp: "123456" }
        }),
        api.post(`${API}/auth/login/magic-link/verify`, {
          data: { email, token: KNOWN_MAGIC_TOKEN }
        })
      ]);
      for (const res of attempts) {
        expect(res.status(), res.url()).toBe(401);
        const err = await errorOf(res);
        expect(err.code, res.url()).toBe(row.expected.code);
        expect(err.message).toBe(row.expected.message);
      }

      for (const [path, kind] of [
        ["otp/send", "login"],
        ["magic-link/send", "magicLinkLogin"]
      ] as const) {
        const send = await api.post(`${API}/auth/login/${path}`, {
          data: { email }
        });
        expect(send.status(), path).toBe(200);
        expect((await send.json()).data.success).toBe(true);
        expect(await hasCode(kind, email), `${path} issued nothing`).toBe(
          false
        );
      }
    }
  );
}

test(
  "isActive=true, verifiedEmail=true → signed in (control row)",
  { tag: ["@TC-AUTH-049"] },
  async () => {
    const account = await createAccount({ tag: "auth-status-ok" });
    const res = await api.post(`${API}/auth/login`, {
      data: { email: account.email, password: account.password }
    });
    expect(res.status()).toBe(200);
  }
);
