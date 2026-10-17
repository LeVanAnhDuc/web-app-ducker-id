import { test, expect } from "@/fixtures";
import type { ApiClient } from "@/api";
import { errorOf, setCookie } from "@/api/response";
import { USER_EMAIL, USER_PASSWORD } from "@/config/accounts";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { WRONG_PASSWORD } from "@/data/test-data";
import { createAccount, throwawayEmail } from "@/utils/accounts";
import { jwtPayload } from "@/utils/jwt";

// POST /auth/login — server/src/modules/login (password strategy),
// validators/schemas/login.ts + base.ts (emailSchema: trim, lowercase,
// Joi email, 3–254 chars, no control / zero-width characters).

test.use({ role: "guest" });

let api: ApiClient;
test.beforeEach(async ({ newApi }) => {
  api = await newApi();
});

test(
  "Password login contract: tokens in the body, refresh token only in an HttpOnly cookie",
  { tag: ["@TC-AUTH-026", "@smoke"] },
  async () => {
    const res = await api.auth.login(USER_EMAIL, USER_PASSWORD);
    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      message: string;
      data: Record<string, unknown>;
    };
    expect(Object.keys(body.data).sort()).toEqual(
      ["accessToken", "expiresIn", "idToken"].sort()
    );
    expect(body.data).not.toHaveProperty("refreshToken");
    expect(body.data.expiresIn).toBe(8 * 60 * 60 * 1000);

    const access = jwtPayload<{ sub: string; roles: string }>(
      body.data.accessToken as string
    );
    expect(access.roles).toBe("user");
    const id = jwtPayload<{ email: string }>(body.data.idToken as string);
    expect(id.email).toBe(USER_EMAIL);

    const refresh = setCookie(res, "refreshToken");
    expect(refresh, "refreshToken cookie is set").toBeTruthy();
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/SameSite=Lax/i);
    expect(refresh).toMatch(/Path=\//);
    // IdP session cookie used by /oauth/authorize.
    expect(setCookie(res, "sid")).toMatch(/HttpOnly/i);
  }
);

test(
  "A wrong password and an unknown email get the same answer",
  { tag: ["@TC-AUTH-027"] },
  async () => {
    const account = await createAccount({ tag: "auth-enum" });

    const wrong = await api.auth.login(account.email, WRONG_PASSWORD);
    const unknown = await api.auth.login(
      throwawayEmail("auth-nobody"),
      WRONG_PASSWORD
    );

    expect(wrong.status()).toBe(401);
    expect(unknown.status()).toBe(401);
    const a = await errorOf(wrong);
    const b = await errorOf(unknown);
    expect(a.code).toBe("LOGIN_INVALID_CREDENTIALS");
    expect(b.code).toBe(a.code);
    expect(a.message).toBe(serverMessage.login.errors.invalidCredentials);
    expect(b.message).toBe(a.message);
    expect(setCookie(wrong, "refreshToken")).toBeUndefined();
  }
);

test.describe("Email equivalence classes and length boundaries on the sign-in endpoint", () => {
  // local part ≤ 64 chars, labels ≤ 63 chars — only the total length varies.
  const local = "a".repeat(64);
  const domainOf = (lastLabel: number) =>
    `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(lastLabel)}.com`;
  const len254 = `${local}@${domainOf(57)}`;
  const len255 = `${local}@${domainOf(58)}`;

  test(
    "invalid emails are rejected with VALIDATION_ERROR on the email field",
    { tag: ["@TC-AUTH-003"] },
    async () => {
      expect(len255).toHaveLength(255);
      const invalid: [string, string][] = [
        ["", "empty"],
        ["a@", "too short / no domain"],
        ["user.test.com", "no @"],
        ["user@@test.com", "double @"],
        ["user@test.com​", "zero-width character"],
        [len255, "255 chars (max + 1)"]
      ];
      for (const [email, why] of invalid) {
        const res = await api.auth.login(email, WRONG_PASSWORD);
        expect(res.status(), why).toBe(400);
        const err = await errorOf(res);
        expect(err.code, why).toBe("VALIDATION_ERROR");
        expect(
          err.errors?.map((e) => e.field),
          why
        ).toContain("email");
      }

      const missing = await api.auth.login(USER_EMAIL);
      expect(missing.status()).toBe(400);
      expect((await errorOf(missing)).errors?.[0]).toMatchObject({
        field: "password",
        message: serverMessage.validation.password.required
      });
    }
  );

  test(
    "a 254-character email passes validation (max boundary)",
    { tag: ["@TC-AUTH-003"] },
    async () => {
      expect(len254).toHaveLength(254);
      const res = await api.auth.login(len254, WRONG_PASSWORD);
      // Valid shape, unknown account → credentials error, not validation.
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).code).toBe("LOGIN_INVALID_CREDENTIALS");
    }
  );
});

test(
  "The email is trimmed and case-insensitive",
  { tag: ["@TC-AUTH-004"] },
  async () => {
    const res = await api.auth.login(
      `  ${USER_EMAIL.toUpperCase()}  `,
      USER_PASSWORD
    );
    expect(res.status()).toBe(200);
    const { data } = (await res.json()) as { data: { idToken: string } };
    expect(jwtPayload<{ email: string }>(data.idToken).email).toBe(USER_EMAIL);
  }
);

test(
  "Sign-in errors are translated for Accept-Language: vi",
  { tag: ["@TC-AUTH-030"] },
  async ({ newApi }) => {
    const vi = await newApi({ "Accept-Language": "vi" });
    const res = await vi.auth.login(throwawayEmail("auth-vi"), WRONG_PASSWORD);
    expect(res.status()).toBe(401);
    expect((await errorOf(res)).message).toBe(
      serverMessageVi.login.errors.invalidCredentials
    );

    const invalid = await vi.auth.login("not-an-email", WRONG_PASSWORD);
    const err = await errorOf(invalid);
    expect(err.errors?.find((e) => e.field === "email")?.message).toBe(
      serverMessageVi.validation.email.invalid
    );
  }
);

test(
  "Wrong-typed sign-in and sign-up fields are a validation error, never a 5xx",
  { tag: ["@TC-AUTH-070"] },
  async () => {
    // The per-email rate limiter runs before validation and calls
    // `req.body.email?.toLowerCase()`, which throws on a non-string email.
    // BUG: defects/auth.md#bug-auth-09
    test.fail();
    // Bodies the typed client methods cannot express go through api.call.
    // A throwaway address: the seeded account only ever gets its own password.
    const email = throwawayEmail("auth-types");
    const cases: [string, Record<string, unknown>][] = [
      ["/auth/login", { email: 123, password: WRONG_PASSWORD }],
      ["/auth/login", { email, password: { $ne: "" } }],
      ["/auth/login/otp/verify", { email, otp: 123456 }],
      ["/auth/login/magic-link/verify", { email, token: ["a"] }],
      ["/auth/signup/send-otp", { email: true }]
    ];
    for (const [path, data] of cases) {
      const why = `${path} ${JSON.stringify(data)}`;
      const res = await api.call("post", path, { data });
      expect(res.status(), why).toBeLessThan(500);
      expect(res.status(), why).toBe(400);
      expect((await errorOf(res)).code, why).toBe("VALIDATION_ERROR");
    }
  }
);
