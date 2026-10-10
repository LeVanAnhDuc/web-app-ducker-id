import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createAccount, throwawayEmail } from "@helpers/accounts";
import { USER_EMAIL, USER_PASSWORD } from "@helpers/env";
import {
  API,
  WRONG_PASSWORD,
  errorOf,
  jwtPayload,
  newApi,
  passwordLogin,
  setCookie
} from "@helpers/auth";

// POST /api/v1/auth/login — server/src/modules/login (password strategy),
// validators/schemas/login.ts + base.ts (emailSchema: trim, lowercase,
// Joi email, 3–254 chars, no control / zero-width characters).

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeEach(async () => {
  api = await newApi();
});
test.afterEach(async () => {
  await api.dispose();
});

test(
  "password login returns tokens in the body and the refresh token only as an HttpOnly cookie",
  { tag: ["@TC-AUTH-026", "@smoke"] },
  async () => {
    const res = await passwordLogin(api, USER_EMAIL, USER_PASSWORD);
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
  "a wrong password and an unknown email get the same answer",
  { tag: ["@TC-AUTH-027"] },
  async () => {
    const account = await createAccount({ tag: "auth-enum" });

    const wrong = await passwordLogin(api, account.email, WRONG_PASSWORD);
    const unknown = await passwordLogin(
      api,
      throwawayEmail("auth-nobody"),
      WRONG_PASSWORD
    );

    expect(wrong.status()).toBe(401);
    expect(unknown.status()).toBe(401);
    const a = await errorOf(wrong);
    const b = await errorOf(unknown);
    expect(a.code).toBe("LOGIN_INVALID_CREDENTIALS");
    expect(b.code).toBe(a.code);
    expect(a.message).toBe("Invalid email or password");
    expect(b.message).toBe(a.message);
    expect(setCookie(wrong, "refreshToken")).toBeUndefined();
  }
);

test.describe("email equivalence classes and boundaries", () => {
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
        const res = await passwordLogin(api, email, WRONG_PASSWORD);
        expect(res.status(), why).toBe(400);
        const err = await errorOf(res);
        expect(err.code, why).toBe("VALIDATION_ERROR");
        expect(
          err.errors?.map((e) => e.field),
          why
        ).toContain("email");
      }

      const missing = await api.post(`${API}/auth/login`, {
        data: { email: USER_EMAIL }
      });
      expect(missing.status()).toBe(400);
      expect((await errorOf(missing)).errors?.[0]).toMatchObject({
        field: "password",
        message: "Password is required"
      });
    }
  );

  test(
    "a 254-character email passes validation (max boundary)",
    { tag: ["@TC-AUTH-003"] },
    async () => {
      expect(len254).toHaveLength(254);
      const res = await passwordLogin(api, len254, WRONG_PASSWORD);
      // Valid shape, unknown account → credentials error, not validation.
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).code).toBe("LOGIN_INVALID_CREDENTIALS");
    }
  );
});

test(
  "email is trimmed and case-insensitive",
  { tag: ["@TC-AUTH-004"] },
  async () => {
    const res = await passwordLogin(
      api,
      `  ${USER_EMAIL.toUpperCase()}  `,
      USER_PASSWORD
    );
    expect(res.status()).toBe(200);
    const { data } = (await res.json()) as { data: { idToken: string } };
    expect(jwtPayload<{ email: string }>(data.idToken).email).toBe(USER_EMAIL);
  }
);

test(
  "errors are translated to Vietnamese for Accept-Language: vi",
  { tag: ["@TC-AUTH-030"] },
  async () => {
    const vi = await newApi({ "Accept-Language": "vi" });
    try {
      const res = await passwordLogin(
        vi,
        throwawayEmail("auth-vi"),
        WRONG_PASSWORD
      );
      expect(res.status()).toBe(401);
      expect((await errorOf(res)).message).toBe(
        "Email hoặc mật khẩu không chính xác"
      );

      const invalid = await passwordLogin(vi, "not-an-email", WRONG_PASSWORD);
      const err = await errorOf(invalid);
      expect(err.errors?.find((e) => e.field === "email")?.message).toBe(
        "Email không hợp lệ"
      );
    } finally {
      await vi.dispose();
    }
  }
);
