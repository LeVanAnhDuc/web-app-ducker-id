# Redact sensitive data in access log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Steps use checkbox syntax.

**Goal:** Vá lỗ rò credential trong `requestLogger` bằng util `redactSensitive` che value của key nhạy cảm trong body/query/params.

**Tech Stack:** TypeScript, Winston `Logger`, Express, Jest.

## Global Constraints

- Util ở `src/utils/redact/index.ts` — pure, stateless, **named export** (không default; `utils.md` R3), không đọc `process.env`, không side effect.
- Match: case-insensitive **substring** trên tập `["password","otp","token","secret","authorization","credential","apikey","api_key","cookie"]`.
- KHÔNG mutate input; cap độ sâu (MAX_DEPTH=6).
- Chỉ đụng `requestLogger` (không rải util ra log site khác lúc này).
- Test worktree: `npx jest --testMatch "**/?(*.)+(spec).ts" <path>`; node_modules là junction → KHÔNG `yarn install`.
- Sau mỗi task: `cd <worktree> && yarn format && yarn lint && yarn type-check` sạch.
- Worktree: `server/.worktrees/redact-sensitive-access-log`.

---

### Task 1: Util `redactSensitive` + spec

**Files:** `src/utils/redact/index.ts` (create), `src/utils/redact/index.spec.ts` (create)

- [ ] **Step 1: Viết test thất bại** — `src/utils/redact/index.spec.ts`:

```ts
// others
import { redactSensitive } from "./index";

describe("redactSensitive", () => {
  it("redacts sensitive keys in a flat object, keeps the rest", () => {
    expect(redactSensitive({ email: "a@b.com", password: "secret" })).toEqual({
      email: "a@b.com",
      password: "[REDACTED]"
    });
  });

  it("redacts nested and array values", () => {
    expect(
      redactSensitive({ user: { newPassword: "x" }, list: [{ token: "t" }] })
    ).toEqual({
      user: { newPassword: "[REDACTED]" },
      list: [{ token: "[REDACTED]" }]
    });
  });

  it("matches case-insensitively and by substring variants", () => {
    expect(
      redactSensitive({
        PassWord: "1",
        accessToken: "2",
        refreshToken: "3",
        confirmPassword: "4",
        otp: "5"
      })
    ).toEqual({
      PassWord: "[REDACTED]",
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
      confirmPassword: "[REDACTED]",
      otp: "[REDACTED]"
    });
  });

  it("returns non-object values unchanged", () => {
    expect(redactSensitive("x")).toBe("x");
    expect(redactSensitive(123)).toBe(123);
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const input = { password: "secret", email: "a@b.com" };
    redactSensitive(input);
    expect(input.password).toBe("secret");
  });

  it("caps recursion depth without crashing", () => {
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 50; i++) deep = { nested: deep };
    expect(() => redactSensitive(deep)).not.toThrow();
  });
});
```

- [ ] **Step 2:** `npx jest ... src/utils/redact/index.spec.ts` → FAIL (module missing).

- [ ] **Step 3: Tạo util** — `src/utils/redact/index.ts`:

```ts
const SENSITIVE_PATTERNS = [
  "password",
  "otp",
  "token",
  "secret",
  "authorization",
  "credential",
  "apikey",
  "api_key",
  "cookie"
];

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1);
  }
  return out;
}

/**
 * Deep-copy `value`, replacing the value of any key whose name matches a
 * sensitive substring (case-insensitive) with "[REDACTED]". Pure — never
 * mutates the input. Used before logging request payloads.
 */
export function redactSensitive(value: unknown): unknown {
  return redactValue(value, 0);
}
```

- [ ] **Step 4:** `npx jest ... src/utils/redact/index.spec.ts` → PASS (6 tests). Green checks.

---

### Task 2: Áp vào `requestLogger` + spec + rule sync

**Files:** `src/middlewares/common/request-logger.middleware.ts` (modify), `src/middlewares/common/request-logger.middleware.spec.ts` (create), `server/.claude/rules/utils.md` (main repo)

- [ ] **Step 1: Sửa middleware** — thêm import + bọc body/query/params:

Thêm vào group `// others`: `import { redactSensitive } from "@/utils/redact";`

Đổi block `Logger.http(...)` đầu (entry) thành:
```ts
  Logger.http(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    body: redactSensitive(req.body),
    query: redactSensitive(req.query),
    params: redactSensitive(req.params)
  });
```
Block `res.on("finish", ...)` giữ nguyên (không chứa dữ liệu nhạy cảm).

- [ ] **Step 2: Test middleware** — `src/middlewares/common/request-logger.middleware.spec.ts`:

```ts
// others
import { Logger } from "@/libs/logger";
import { requestLogger } from "./request-logger.middleware";

describe("requestLogger", () => {
  afterEach(() => jest.restoreAllMocks());

  it("redacts sensitive fields in the logged body and calls next", () => {
    const httpSpy = jest
      .spyOn(Logger, "http")
      .mockImplementation(() => undefined);
    const next = jest.fn();
    const req = {
      method: "POST",
      originalUrl: "/api/v1/auth/login",
      requestId: "r1",
      ip: "127.0.0.1",
      get: () => "jest",
      body: { email: "a@b.com", password: "secret" },
      query: {},
      params: {}
    } as never;
    const res = { on: jest.fn() } as never;

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const meta = httpSpy.mock.calls[0][1] as { body: Record<string, unknown> };
    expect(meta.body).toEqual({ email: "a@b.com", password: "[REDACTED]" });
  });
});
```

> Lưu ý: `test/setup.ts` đã mock `@/libs/logger` (Logger.http = jest.fn) → `jest.spyOn` hoạt động; `res.on` là jest.fn nên handler `finish` không chạy.

- [ ] **Step 3:** Green checks + `npx jest ... request-logger.middleware.spec.ts` PASS.

- [ ] **Step 4: Rule sync** — `server/.claude/rules/utils.md` (main repo): thêm `redact/` vào danh sách sub-folder concern (util che dữ liệu nhạy cảm trước khi log).

---

### Task 3: Full verification

- [ ] `cd <worktree> && yarn lint && yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts" && yarn build` — tất cả xanh.

## Self-Review

- §3 util → Task 1 (đủ case test incl. no-mutate + depth cap). ✅
- §4 áp requestLogger → Task 2. ✅
- §5 testing → Task 1 + 2. ✅
- §6 rule sync → Task 2 Step 4. ✅
- Placeholder: không. Type: `redactSensitive(value: unknown): unknown` nhất quán.
