import { test, expect } from "@/fixtures";
import { serverMessage, serverMessageVi } from "@/data/copy";
import { errorBody } from "./helpers";

// The global error envelope and its per-request translation —
// server/src/middlewares/filters/error.filter.ts, server/src/i18n/middleware.ts.
// These go through the client origin, the way the app calls the API (`api`
// fixture → API prefix). Copy: server/src/i18n/locales/{en,vi}/*.json. The
// server's default locale is vi.

test.use({ role: "guest" });

const server = { en: serverMessage, vi: serverMessageVi } as const;
const NOT_FOUND = {
  en: serverMessage.common.errors.notFound,
  vi: serverMessageVi.common.errors.notFound
} as const;

test(
  "An unknown route answers 404 in the error envelope, translated",
  { tag: "@TC-OPS-007" },
  async ({ api, urls }) => {
    const path = `${urls.apiPrefix}/does-not-exist?x=1`;
    for (const lang of ["en", "vi"] as const) {
      const res = await api.call("get", "/does-not-exist?x=1", {
        headers: { "Accept-Language": lang }
      });
      expect(res.status(), lang).toBe(404);
      const body = await errorBody(res, path);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.message, lang).toBe(NOT_FOUND[lang]);
    }
  }
);

test(
  "A validation failure answers 400 with field errors, translated",
  { tag: "@TC-OPS-008" },
  async ({ api, urls }) => {
    for (const lang of ["en", "vi"] as const) {
      const res = await api.call("post", "/auth/login", {
        headers: { "Accept-Language": lang },
        data: { email: "not-an-email" }
      });
      expect(res.status(), lang).toBe(400);
      const body = await errorBody(res, `${urls.apiPrefix}/auth/login`);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.message, lang).toBe(
        server[lang].common.errors.validationFailed
      );
      expect(body.errors).toEqual(
        expect.arrayContaining([
          {
            field: "email",
            reason: "string.email",
            message: server[lang].validation.email.invalid
          },
          {
            field: "password",
            reason: "any.required",
            message: server[lang].validation.password.required
          }
        ])
      );
    }
  }
);

test(
  "A protected endpoint without a token answers 401, translated",
  { tag: "@TC-OPS-009" },
  async ({ api, urls }) => {
    for (const lang of ["en", "vi"] as const) {
      const res = await api.call("get", "/users/me", {
        headers: { "Accept-Language": lang }
      });
      expect(res.status(), lang).toBe(401);
      const body = await errorBody(res, `${urls.apiPrefix}/users/me`);
      expect(body.code).toBe("AUTH_MISSING_TOKEN");
      expect(body.message, lang).toBe(server[lang].common.errors.unauthorized);
    }
  }
);

test(
  "Accept-Language negotiation picks the best supported locale",
  { tag: "@TC-OPS-010" },
  async ({ api }) => {
    const rows: [string | undefined, keyof typeof NOT_FOUND][] = [
      ["vi-VN,vi;q=0.9", "vi"],
      ["en-US", "en"],
      ["en;q=0.5, vi;q=0.9", "vi"],
      ["fr-FR, en;q=0.8", "en"],
      ["fr", "vi"],
      [undefined, "vi"]
    ];
    for (const [header, lang] of rows) {
      const res = await api.call("get", "/does-not-exist", {
        headers: header ? { "Accept-Language": header } : {}
      });
      expect(res.status()).toBe(404);
      const { message } = (await res.json()) as { message: string };
      expect(message, `Accept-Language: ${header}`).toBe(NOT_FOUND[lang]);
    }
  }
);

test(
  "OAuth endpoints are the documented exception to the envelope",
  { tag: "@TC-OPS-011" },
  async ({ api }) => {
    const token = await api.oauth.token({ grant_type: "password" });
    const authorize = await api.oauth.authorize({});
    for (const [label, res, error] of [
      ["token", token, "unsupported_grant_type"],
      ["authorize", authorize, "invalid_request"]
    ] as const) {
      expect(res.status(), label).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error, label).toBe(error);
      expect(typeof body.error_description).toBe("string");
      for (const k of ["code", "timestamp", "path", "message"]) {
        expect(body, `${label} carries envelope field ${k}`).not.toHaveProperty(
          k
        );
      }
    }
  }
);

test(
  "A malformed JSON body answers 400 in the error envelope, not 500",
  { tag: "@TC-OPS-016" },
  async ({ api, urls }) => {
    const res = await api.call("post", "/auth/login", {
      headers: { "Content-Type": "application/json", "Accept-Language": "en" },
      data: '{"email": "user@test.com", "password":'
    });
    expect(res.status()).toBe(400);
    const body = await errorBody(res, `${urls.apiPrefix}/auth/login`);
    expect(body.code).not.toBe("INTERNAL_SERVER_ERROR");
    expect(body.message).not.toBe(serverMessage.common.errors.internalServer);
  }
);
