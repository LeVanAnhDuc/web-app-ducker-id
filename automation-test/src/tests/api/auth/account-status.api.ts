import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { errorOf } from "@/api/response";
import { serverMessage } from "@/data/copy";
import { KNOWN_MAGIC_TOKEN } from "@/data/test-data";
import { createAccount } from "@/utils/accounts";
import { setAuthFlags } from "@/utils/auth";
import { hasCode } from "@/utils/redis";

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
  message: serverMessage.login.errors.accountInactive
};
const UNVERIFIED = {
  code: "LOGIN_EMAIL_NOT_VERIFIED",
  message: serverMessage.login.errors.emailNotVerified
};

const ROWS = [
  { isActive: false, verifiedEmail: true, expected: INACTIVE },
  { isActive: false, verifiedEmail: false, expected: INACTIVE },
  { isActive: true, verifiedEmail: false, expected: UNVERIFIED }
];

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

test.describe("Account status × sign-in method decision table", () => {
  for (const row of ROWS) {
    test(
      `isActive=${row.isActive}, verifiedEmail=${row.verifiedEmail} → ${row.expected.code} for every method`,
      { tag: ["@TC-AUTH-049", "@smoke"] },
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
          api.auth.login(email, account.password),
          api.auth.verifyLoginOtp(email, "123456"),
          api.auth.verifyMagicLink(email, KNOWN_MAGIC_TOKEN)
        ]);
        for (const res of attempts) {
          expect(res.status(), res.url()).toBe(401);
          const err = await errorOf(res);
          expect(err.code, res.url()).toBe(row.expected.code);
          expect(err.message).toBe(row.expected.message);
        }

        for (const [path, kind, sendCode] of [
          ["otp/send", "login", api.auth.sendLoginOtp],
          ["magic-link/send", "magicLinkLogin", api.auth.sendMagicLink]
        ] as const) {
          const send = await sendCode(email);
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
    { tag: ["@TC-AUTH-049", "@smoke"] },
    async () => {
      const account = await createAccount({ tag: "auth-status-ok" });
      const res = await api.auth.login(account.email, account.password);
      expect(res.status()).toBe(200);
    }
  );
});
