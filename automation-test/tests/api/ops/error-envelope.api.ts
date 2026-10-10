import { test, expect } from "@fixtures";
import type { APIResponse } from "@playwright/test";
import type { ErrorEnvelope } from "@helpers/ops";

// The global error envelope and its per-request translation —
// server/src/middlewares/filters/error.filter.ts, server/src/i18n/middleware.ts.
// Copy: server/src/i18n/locales/{en,vi}/*.json (server messages). The
// server's default locale is vi.

test.use({ role: "guest" });

const NOT_FOUND = { en: "Not Found", vi: "Không tìm thấy" } as const;

async function errorBody(res: APIResponse, path: string): Promise<ErrorEnvelope> {
  const body = (await res.json()) as ErrorEnvelope & Record<string, unknown>;
  expect(typeof body.code).toBe("string");
  expect(typeof body.message).toBe("string");
  expect(body.path).toBe(path);
  expect(body.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  expect(Math.abs(Date.now() - Date.parse(body.timestamp))).toBeLessThan(60_000);
  expect(body).not.toHaveProperty("data");
  return body;
}

test(
  "an unknown route answers 404 in the error envelope, translated",
  { tag: "@TC-OPS-007" },
  async ({ guestApi }) => {
    const path = "/api/v1/does-not-exist?x=1";
    for (const lang of ["en", "vi"] as const) {
      const res = await guestApi.get(path, { headers: { "Accept-Language": lang } });
      expect(res.status(), lang).toBe(404);
      const body = await errorBody(res, path);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.message, lang).toBe(NOT_FOUND[lang]);
    }
  }
);

test(
  "a validation failure answers 400 with translated field errors",
  { tag: "@TC-OPS-008" },
  async ({ guestApi }) => {
    const expected = {
      en: {
        message: "Validation failed",
        email: "Please provide a valid email address",
        password: "Password is required"
      },
      vi: {
        message: "Dữ liệu không hợp lệ",
        email: "Email không hợp lệ",
        password: "Mật khẩu là bắt buộc"
      }
    } as const;
    for (const lang of ["en", "vi"] as const) {
      const res = await guestApi.post("/api/v1/auth/login", {
        headers: { "Accept-Language": lang },
        data: { email: "not-an-email" }
      });
      expect(res.status(), lang).toBe(400);
      const body = await errorBody(res, "/api/v1/auth/login");
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.message, lang).toBe(expected[lang].message);
      expect(body.errors).toEqual(
        expect.arrayContaining([
          { field: "email", reason: "string.email", message: expected[lang].email },
          { field: "password", reason: "any.required", message: expected[lang].password }
        ])
      );
    }
  }
);

test(
  "a protected endpoint without a token answers 401, translated",
  { tag: "@TC-OPS-009" },
  async ({ guestApi }) => {
    const expected = { en: "Unauthorized access", vi: "Không có quyền truy cập" } as const;
    for (const lang of ["en", "vi"] as const) {
      const res = await guestApi.get("/api/v1/users/me", {
        headers: { "Accept-Language": lang }
      });
      expect(res.status(), lang).toBe(401);
      const body = await errorBody(res, "/api/v1/users/me");
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
      expect(body.message, lang).toBe(expected[lang]);
    }
  }
);

test(
  "Accept-Language negotiation picks the best supported locale",
  { tag: "@TC-OPS-010" },
  async ({ guestApi }) => {
    const rows: [string | undefined, keyof typeof NOT_FOUND][] = [
      ["vi-VN,vi;q=0.9", "vi"],
      ["en-US", "en"],
      ["en;q=0.5, vi;q=0.9", "vi"],
      ["fr-FR, en;q=0.8", "en"],
      ["fr", "vi"],
      [undefined, "vi"]
    ];
    for (const [header, lang] of rows) {
      const res = await guestApi.get("/api/v1/does-not-exist", {
        headers: header ? { "Accept-Language": header } : {}
      });
      expect(res.status()).toBe(404);
      const { message } = (await res.json()) as ErrorEnvelope;
      expect(message, `Accept-Language: ${header}`).toBe(NOT_FOUND[lang]);
    }
  }
);

test(
  "OAuth endpoints are the documented exception to the envelope",
  { tag: "@TC-OPS-011" },
  async ({ guestApi }) => {
    const token = await guestApi.post("/oauth/token", { form: { grant_type: "password" } });
    const authorize = await guestApi.get("/oauth/authorize", { maxRedirects: 0 });
    for (const [label, res, error] of [
      ["token", token, "unsupported_grant_type"],
      ["authorize", authorize, "invalid_request"]
    ] as const) {
      expect(res.status(), label).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error, label).toBe(error);
      expect(typeof body.error_description).toBe("string");
      for (const k of ["code", "timestamp", "path", "message"]) {
        expect(body, `${label} carries envelope field ${k}`).not.toHaveProperty(k);
      }
    }
  }
);
