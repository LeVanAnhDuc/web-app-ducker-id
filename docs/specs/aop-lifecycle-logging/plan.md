# AOP Lifecycle Logging (`@LogMethod`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay pattern log `initiated`/`completed` lặp thủ công ở service/strategy bằng một method decorator `@LogMethod` lo lifecycle + duration + auto-error + correlation.

**Architecture:** Một method decorator `@LogMethod` sống cạnh `Logger` trong `src/libs/logger/`, wrap `descriptor.value` để log `"{label} initiated"` → chạy method → `"{label} completed"` + `durationMs`, hoặc `"{label} failed"` + rethrow. Correlation `requestId` lấy từ `RequestContext` (AsyncLocalStorage sẵn có, mở rộng để giữ `requestId`). Meta nghiệp vụ được tách khỏi lifecycle: log config-only bị bỏ, domain-event có giá trị (vd "new user registered") giữ lại tường minh.

**Tech Stack:** TypeScript (ES6 target, `experimentalDecorators: true`), Winston (`Logger` wrapper), Express, `async_hooks.AsyncLocalStorage`, Jest.

## Global Constraints

- Đặt decorator ở `src/libs/logger/` (KHÔNG `src/common/decorators/`) — tránh cycle layering `common ↔ utils` (`utils/request-context` đã import `@/common/exceptions`); cohesive với `Logger`; barrel export `{ Logger, LogMethod }`.
- KHÔNG break public signature của `Logger` (rule `libs.md`) — chỉ thêm param optional.
- KHÔNG log args/return mặc định. Chỉ log **opt-in field an toàn** khai báo per-method. TUYỆT ĐỐI không để `password` / `otp` / `token` lọt vào log.
- Aspect KHÔNG được đổi behavior method: passthrough return value, rethrow error nguyên vẹn (để `asyncHandler` → global error handler chạy đúng).
- Phạm vi: chỉ public method của **service + strategy** (KHÔNG guard/repo/controller/audit-collaborator).
- Import group theo `.claude/rules/imports.md`: `LogMethod` cùng group `// others` với `Logger` (`@/libs/logger`).
- Sau mỗi task đụng `server/src/**`: `cd server && yarn format && yarn lint && yarn type-check` phải sạch (server CLAUDE.md).
- Test trong worktree: jest `<rootDir>` glob hỏng trong `.worktrees/` → chạy `cd server && npx jest --testMatch "**/?(*.)+(spec).ts" <path>` (xem lý do ở memory `reference_jest_worktree_testmatch`).
- Worktree chưa có `node_modules` → cần `yarn install` (hoặc junction tới main) trước khi chạy lint/type-check/test.

---

### Task 1: Mở rộng `RequestContext` giữ `requestId`

**Files:**
- Modify: `server/src/utils/request-context.ts`
- Test: `server/src/utils/request-context.spec.ts` (create)

**Interfaces:**
- Consumes: `AsyncLocalStorage` store hiện có; `req.requestId` (set bởi `request-id.middleware.ts`, đã có augmentation trong `src/types/global.d.ts`).
- Produces: `RequestContext.getRequestId(): string | undefined` — Task 2 dùng để lấy correlation id.

- [ ] **Step 1: Viết test thất bại**

Create `server/src/utils/request-context.spec.ts`:

```ts
// modules
import { RequestContext } from "./request-context";

describe("RequestContext requestId", () => {
  it("stores and reads requestId within the async context", () => {
    const mw = RequestContext.middleware();
    let seen: string | undefined;
    mw({ requestId: "req-123" } as never, {} as never, () => {
      seen = RequestContext.getRequestId();
    });
    expect(seen).toBe("req-123");
  });

  it("returns undefined outside any request context", () => {
    expect(RequestContext.getRequestId()).toBeUndefined();
  });

  it("setRequestId updates the current store", () => {
    const mw = RequestContext.middleware();
    let seen: string | undefined;
    mw({} as never, {} as never, () => {
      RequestContext.setRequestId("manual-1");
      seen = RequestContext.getRequestId();
    });
    expect(seen).toBe("manual-1");
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `cd server && npx jest --testMatch "**/?(*.)+(spec).ts" src/utils/request-context.spec.ts`
Expected: FAIL (`getRequestId is not a function`).

- [ ] **Step 3: Sửa `request-context.ts`**

Sửa interface + middleware + thêm 2 method. Thay block hiện tại:

```ts
interface RequestStore {
  user?: RequestUserPayload;
  requestId?: string;
}

// AsyncLocalStorage share data across the same Async Context
const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  middleware:
    (): RequestHandler =>
    (req, _res, next) => {
      storage.run({}, () => {
        const store = storage.getStore();
        if (store && req.requestId) store.requestId = req.requestId;
        next();
      });
    },

  setRequestId: (requestId: string): void => {
    const store = storage.getStore();
    if (store) store.requestId = requestId;
  },

  getRequestId: (): string | undefined => storage.getStore()?.requestId,

  setUser: (user: RequestUserPayload): void => {
    const store = storage.getStore();
    if (store) store.user = user;
  },
  // ... giữ nguyên getUser / getUserId / requireUser / requireUserId / requireAuthId
```

Đổi tham số đầu của `middleware` từ `_req` → `req` (import `RequestHandler` đã có). Giữ nguyên toàn bộ method còn lại. KHÔNG cần sửa `app.ts` (thứ tự middleware `requestId` → `RequestContext.middleware()` đã đúng, requestId có sẵn khi context mở).

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run: `cd server && npx jest --testMatch "**/?(*.)+(spec).ts" src/utils/request-context.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Green checks**

Run: `cd server && yarn format && yarn lint && yarn type-check`
Expected: sạch. (Không commit — Review ON, commit gom cuối.)

---

### Task 2: `@LogMethod` decorator + `Logger.error` meta + rule sync

**Files:**
- Create: `server/src/libs/logger/log-method.decorator.ts`
- Modify: `server/src/libs/logger/index.ts` (thêm `meta` optional cho `Logger.error`; re-export `LogMethod`)
- Modify: `server/.claude/rules/libs.md` (ghi `log-method.decorator.ts` + public export `LogMethod`)
- Test: `server/src/libs/logger/log-method.decorator.spec.ts` (create)

**Interfaces:**
- Consumes: `Logger` (`./index`), `RequestContext.getRequestId()` (Task 1).
- Produces:
  - `interface LogMethodOptions { name?: string; fields?: string[]; level?: "info" | "debug" }`
  - `function LogMethod(options?: LogMethodOptions): MethodDecorator`
  - `Logger.error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void`
  - `fields` hỗ trợ **dot-path** (`"body.email"`); meta key = segment cuối (`email`).

- [ ] **Step 1: Viết test thất bại**

Create `server/src/libs/logger/log-method.decorator.spec.ts`:

```ts
// others
import { Logger } from "./index";
import { LogMethod } from "./log-method.decorator";
import { RequestContext } from "@/utils/request-context";

describe("LogMethod", () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(Logger, "info").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger, "error").mockImplementation(() => undefined);
    jest
      .spyOn(RequestContext, "getRequestId")
      .mockReturnValue("req-xyz");
  });

  afterEach(() => jest.restoreAllMocks());

  class Sample {
    @LogMethod({ name: "DoWork", fields: ["email"] })
    async work(body: { email: string; password: string }): Promise<string> {
      return `ok:${body.email}`;
    }

    @LogMethod({ fields: ["body.email"] })
    async nested(req: { body: { email: string } }): Promise<number> {
      return req.body.email.length;
    }

    @LogMethod({ name: "Boom" })
    async fails(): Promise<void> {
      throw new Error("kaboom");
    }
  }

  it("logs initiated + completed with opt-in field, requestId, durationMs; passes result through", async () => {
    const out = await new Sample().work({ email: "a@b.com", password: "secret" });
    expect(out).toBe("ok:a@b.com");

    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {
      email: "a@b.com",
      requestId: "req-xyz"
    });
    const [msg, meta] = infoSpy.mock.calls[1];
    expect(msg).toBe("DoWork completed");
    expect(meta).toMatchObject({ email: "a@b.com", requestId: "req-xyz" });
    expect(typeof meta.durationMs).toBe("number");
  });

  it("does NOT log fields that were not opted in (no credential leak)", async () => {
    await new Sample().work({ email: "a@b.com", password: "secret" });
    const allMeta = JSON.stringify(infoSpy.mock.calls);
    expect(allMeta).not.toContain("secret");
    expect(allMeta).not.toContain("password");
  });

  it("resolves dot-path fields from the first argument", async () => {
    await new Sample().nested({ body: { email: "deep@b.com" } });
    expect(infoSpy).toHaveBeenNthCalledWith(1, "Sample.nested initiated", {
      email: "deep@b.com",
      requestId: "req-xyz"
    });
  });

  it("logs failed + rethrows original error, does not log completed", async () => {
    await expect(new Sample().fails()).rejects.toThrow("kaboom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [msg, err, meta] = errorSpy.mock.calls[0];
    expect(msg).toBe("Boom failed");
    expect(err).toBeInstanceOf(Error);
    expect(typeof meta.durationMs).toBe("number");
    expect(infoSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("completed"),
      expect.anything()
    );
  });

  it("falls back to ClassName.method label when name omitted", async () => {
    await new Sample().nested({ body: { email: "x@y.com" } });
    expect(infoSpy.mock.calls[0][0]).toBe("Sample.nested initiated");
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `cd server && npx jest --testMatch "**/?(*.)+(spec).ts" src/libs/logger/log-method.decorator.spec.ts`
Expected: FAIL (`Cannot find module './log-method.decorator'`).

- [ ] **Step 3: Tạo decorator**

Create `server/src/libs/logger/log-method.decorator.ts`:

```ts
// others
import { Logger } from "./index";
import { RequestContext } from "@/utils/request-context";

export interface LogMethodOptions {
  name?: string;
  fields?: string[];
  level?: "info" | "debug";
}

function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj
    );
}

function pickFields(
  arg: unknown,
  fields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields.length || typeof arg !== "object" || arg === null) return out;
  for (const path of fields) {
    const value = resolvePath(arg, path);
    if (value !== undefined) {
      const key = path.split(".").pop() as string;
      out[key] = value;
    }
  }
  return out;
}

export function LogMethod(options: LogMethodOptions = {}): MethodDecorator {
  const { name, fields = [], level = "info" } = options;

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    const className = target.constructor?.name ?? "";
    const methodName = String(propertyKey);
    const label =
      name ?? (className ? `${className}.${methodName}` : methodName);

    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
      const picked = pickFields(args[0], fields);
      const requestId = RequestContext.getRequestId();
      const baseMeta: Record<string, unknown> = {
        ...picked,
        ...(requestId ? { requestId } : {})
      };

      Logger[level](`${label} initiated`, baseMeta);
      const start = Date.now();

      const logCompleted = (): void => {
        Logger[level](`${label} completed`, {
          ...baseMeta,
          durationMs: Date.now() - start
        });
      };
      const logFailed = (error: unknown): void => {
        Logger.error(`${label} failed`, error, {
          ...baseMeta,
          durationMs: Date.now() - start
        });
      };

      let result: unknown;
      try {
        result = original.apply(this, args);
      } catch (error) {
        logFailed(error);
        throw error;
      }

      if (result instanceof Promise) {
        return result.then(
          (value) => {
            logCompleted();
            return value;
          },
          (error) => {
            logFailed(error);
            throw error;
          }
        );
      }

      logCompleted();
      return result;
    };

    return descriptor;
  };
}
```

- [ ] **Step 4: Mở rộng `Logger.error` + re-export**

Trong `server/src/libs/logger/index.ts`, đổi `error` method thành:

```ts
  static error(
    message: string,
    error?: Error | unknown,
    meta?: Record<string, unknown>
  ): void {
    if (error instanceof Error) {
      logger.error(`${message} - ${error.message}`, { ...meta, stack: error.stack });
    } else if (error) {
      logger.error(`${message} - ${JSON.stringify(error)}`, meta);
    } else {
      logger.error(message, meta);
    }
  }
```

Thêm dòng re-export ở cuối file (trước/sau `export default Logger;`):

```ts
export { LogMethod } from "./log-method.decorator";
export type { LogMethodOptions } from "./log-method.decorator";
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd server && npx jest --testMatch "**/?(*.)+(spec).ts" src/libs/logger/log-method.decorator.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Rule sync `libs.md`**

Trong `server/.claude/rules/libs.md`, mục Logger: thêm `log-method.decorator.ts` vào cấu trúc + ghi rõ `LogMethod` là public API export qua barrel `@/libs/logger`. Ví dụ thêm dòng vào block cấu trúc:

```
  logger/
    winston.ts                 # Raw winston instance (internal, private)
    log-method.decorator.ts    # @LogMethod — lifecycle logging aspect (public)
    index.ts                   # Logger wrapper + re-export LogMethod (public API)
```

Và 1 câu ở phần "Logger": `@LogMethod` (từ barrel) là aspect log lifecycle cho public method service/strategy — xem `docs/specs/aop-lifecycle-logging/`.

- [ ] **Step 7: Green checks**

Run: `cd server && yarn format && yarn lint && yarn type-check`
Expected: sạch.

---

### Task 3: Migrate `signup.service.ts`

**Files:**
- Modify: `server/src/modules/signup/signup.service.ts`

**Interfaces:**
- Consumes: `LogMethod` từ `@/libs/logger`.

**Quy tắc migrate (áp cho mọi task migrate):**
1. Thêm import `LogMethod` từ `@/libs/logger` (cùng dòng/nhóm với `Logger`, group `// others`).
2. Mỗi public method trong bảng dưới → gắn `@LogMethod({ name, fields })` ngay trên method.
3. Xoá dòng `Logger.info("... initiated", ...)` đầu method.
4. Xử lý dòng `completed`/`finished` theo cột "Xử lý completed".
5. GIỮ NGUYÊN mọi log `warn` / `debug` / `info` mang ngữ nghĩa nghiệp vụ khác (fake-success, skipped, tracked, locked...).
6. Nếu sau khi xoá, `Logger` không còn được dùng trong file → xoá import `Logger`; nếu còn → giữ.

**Bảng method:**

| Method | Decorator | Xử lý dòng completed |
| --- | --- | --- |
| `sendOtp` | `@LogMethod({ name: "SendOtp", fields: ["email"] })` | Xoá `"SendOtp completed"` (chỉ config `expiresIn/cooldownSeconds` — aspect + DTO đã đủ) |
| `verifyOtp` | `@LogMethod({ name: "VerifyOtp", fields: ["email"] })` | Xoá `"VerifyOtp completed successfully"` |
| `resendOtp` | `@LogMethod({ name: "ResendOtp", fields: ["email"] })` | Xoá `"ResendOtp completed"` (đã có debug `"Resend attempt tracked"` giữ nguyên) |
| `completeSignup` | `@LogMethod({ name: "CompleteSignup", fields: ["email"] })` | **Đổi** `"CompleteSignup finished - new user registered"` → domain-event log (xem dưới) |
| `checkEmail` | `@LogMethod({ name: "CheckEmail", fields: ["email"] })` | Xoá `"CheckEmail completed"` (email-only) |

`Logger` vẫn còn dùng (warn/debug + domain-event) → GIỮ import `Logger`, thêm `LogMethod`.

- [ ] **Step 1: Thêm import**

Sửa dòng `import { Logger } from "@/libs/logger";` → `import { Logger, LogMethod } from "@/libs/logger";`.

- [ ] **Step 2: Gắn decorator + xoá boilerplate cho 5 method** theo bảng trên.

Ví dụ `sendOtp` (bỏ L79 initiated + L97-101 completed, thêm decorator):

```ts
@LogMethod({ name: "SendOtp", fields: ["email"] })
async sendOtp(body: SendOtpBody, req: Request): Promise<SendOtpDto> {
  const { email } = body;
  const { language } = req;

  await this.cooldownGuard.assert(email);
  // ... phần thân giữ nguyên, KHÔNG còn Logger.info initiated/completed ...
  return toSendOtpDto(OTP_EXPIRY_SECONDS, OTP_COOLDOWN_SECONDS);
}
```

- [ ] **Step 3: Đổi log `completeSignup` thành domain event**

Thay block `Logger.info("CompleteSignup finished - new user registered", { email, userId: ... })` bằng:

```ts
Logger.info("New user registered", {
  email,
  userId: account.userId.toString()
});
```

(Giữ `Logger.debug("Signup data cleaned up", { email })` nguyên.)

- [ ] **Step 4: Green checks + verify sạch boilerplate**

Run:
```
cd server && yarn format && yarn lint && yarn type-check
```
Expected: sạch. Sau đó xác nhận không còn `initiated`/`completed` boilerplate trong file:
```
cd server && grep -nE "initiated|completed" src/modules/signup/signup.service.ts
```
Expected: không còn dòng nào (chỉ còn nếu có comment/text khác — không có).

---

### Task 4: Migrate login strategies

**Files:**
- Modify: `server/src/modules/login/strategies/password-login.strategy.ts`
- Modify: `server/src/modules/login/strategies/otp-login.strategy.ts`
- Modify: `server/src/modules/login/strategies/magic-link-login.strategy.ts`

**Interfaces:** Consumes `LogMethod` từ `@/libs/logger`.

**Bảng method:**

| File | Method | Decorator | Xử lý completed | Còn dùng `Logger`? |
| --- | --- | --- | --- | --- |
| password | `authenticate` | `@LogMethod({ name: "Password login", fields: ["email"] })` | (không có completed) | **Không** → xoá import `Logger`, thay bằng `LogMethod` |
| otp | `sendCode` | `@LogMethod({ name: "Login OTP send", fields: ["email"] })` | Xoá `"Login OTP send completed"` | Có (debug skipped + warn) → giữ `Logger`, thêm `LogMethod` |
| otp | `verifyCode` | `@LogMethod({ name: "Login OTP verification", fields: ["email"] })` | (không có completed) | — |
| magic-link | `sendLink` | `@LogMethod({ name: "Magic link send", fields: ["email"] })` | Xoá `"Magic link send completed"` | Có (debug skipped) → giữ `Logger`, thêm `LogMethod` |
| magic-link | `verifyLink` | `@LogMethod({ name: "Magic link verification", fields: ["email"] })` | (không có completed) | — |

- [ ] **Step 1: password-login.strategy.ts**

Đổi import: xoá `import { Logger } from "@/libs/logger";`, thêm `import { LogMethod } from "@/libs/logger";` (group `// others`). Gắn decorator lên `authenticate`, xoá L43 `Logger.info("Password login initiated", { email })`.

```ts
@LogMethod({ name: "Password login", fields: ["email"] })
async authenticate(body: PasswordLoginBody, req: Request): Promise<LoginResponseDto> {
  const { email, password } = body;
  await this.passwordLockoutGuard.assert(email);
  // ... giữ nguyên phần còn lại ...
}
```

- [ ] **Step 2: otp-login.strategy.ts**

Đổi import `Logger` → `Logger, LogMethod`. Gắn decorator lên `sendCode` (xoá L51 initiated + L89-93 completed) và `verifyCode` (xoá L107 initiated). GIỮ `Logger.debug("Login OTP send skipped ...")` và `Logger.warn("Login OTP resend limit exceeded", ...)`.

- [ ] **Step 3: magic-link-login.strategy.ts**

Đổi import `Logger` → `Logger, LogMethod`. Gắn decorator lên `sendLink` (xoá L48 initiated + L83-87 completed) và `verifyLink` (xoá L101 initiated). GIỮ `Logger.debug("Magic link send skipped ...")`.

- [ ] **Step 4: Green checks + verify**

Run:
```
cd server && yarn format && yarn lint && yarn type-check
cd server && grep -rnE "\"[^\"]*(initiated|completed)" src/modules/login/strategies
```
Expected: lint/type-check sạch; grep không còn dòng log initiated/completed.

---

### Task 5: Migrate forgot-password (strategies + service.resetPassword)

**Files:**
- Modify: `server/src/modules/forgot-password/strategies/otp-forgot-password.strategy.ts`
- Modify: `server/src/modules/forgot-password/strategies/magic-link-forgot-password.strategy.ts`
- Modify: `server/src/modules/forgot-password/services/forgot-password.service.ts`

**Interfaces:** Consumes `LogMethod` từ `@/libs/logger`.

**LƯU Ý dot-path**: các method này nhận **1 arg `req`** với email ở `req.body.email` → dùng `fields: ["body.email"]` (KHÔNG `["email"]`).

**KHÔNG đụng** `forgot-password-audit.service.ts`: nó là audit collaborator, chỉ có `warn` (thất bại) + `info "Forgot password reset completed successfully"` (domain-event audit) — GIỮ NGUYÊN toàn bộ.

**KHÔNG decorate** các façade `sendOtp/verifyOtp/sendMagicLink/verifyMagicLink` trong `forgot-password.service.ts` (chúng chỉ `return this.strategy...` — decorate ở strategy đã đủ, decorate cả 2 sẽ double-log).

**Bảng method:**

| File | Method | Decorator | Xử lý completed | Còn dùng `Logger`? |
| --- | --- | --- | --- | --- |
| otp strategy | `sendCode` | `@LogMethod({ name: "Forgot password OTP send", fields: ["body.email"] })` | Xoá `"... OTP send completed"` | Có (fake-success info) → giữ `Logger` |
| otp strategy | `verifyCode` | `@LogMethod({ name: "Forgot password OTP verification", fields: ["body.email"] })` | Xoá `"... OTP verified successfully"` | — |
| magic strategy | `sendLink` | `@LogMethod({ name: "Forgot password magic link send", fields: ["body.email"] })` | Xoá `"... magic link send completed"` | Có (fake-success info) → giữ `Logger` |
| magic strategy | `verifyLink` | `@LogMethod({ name: "Forgot password magic link verification", fields: ["body.email"] })` | Xoá `"... magic link verified successfully"` | — |
| service | `resetPassword` | `@LogMethod({ name: "Forgot password reset", fields: ["body.email"] })` | (completed nằm ở audit — giữ) | **Không** → xoá import `Logger`, thay `LogMethod` |

- [ ] **Step 1: otp-forgot-password.strategy.ts**

Import `Logger` → `Logger, LogMethod`. Decorator lên `sendCode` (xoá L43 initiated + L74-78 completed) và `verifyCode` (xoá L89 initiated + L105 "verified successfully"). GIỮ `Logger.info("Forgot password OTP - email not found or inactive (fake success)", ...)`.

- [ ] **Step 2: magic-link-forgot-password.strategy.ts**

Import `Logger` → `Logger, LogMethod`. Decorator lên `sendLink` (xoá L53 initiated + L80-84 completed) và `verifyLink` (xoá L97 initiated + L117 "verified successfully"). GIỮ fake-success `Logger.info(...)`.

- [ ] **Step 3: forgot-password.service.ts**

Xoá `import { Logger } from "@/libs/logger";`, thêm `import { LogMethod } from "@/libs/logger";`. Decorator lên `resetPassword`, xoá L66 `Logger.info("Forgot password reset initiated", { email })`. Façade methods giữ nguyên (không decorator).

```ts
@LogMethod({ name: "Forgot password reset", fields: ["body.email"] })
async resetPassword(req: FPResetPasswordRequest): Promise<ResetPasswordResponseDto> {
  const { email, resetToken, newPassword } = req.body;
  await this.resetTokenValidGuard.assert(email, resetToken);
  // ... giữ nguyên phần còn lại; audit.recordPasswordReset vẫn log "completed successfully" ...
}
```

- [ ] **Step 4: Green checks + verify**

Run:
```
cd server && yarn format && yarn lint && yarn type-check
cd server && grep -rnE "\"[^\"]*(initiated|completed)" src/modules/forgot-password
```
Expected: lint/type-check sạch; grep chỉ còn `"Forgot password reset completed successfully"` trong `forgot-password-audit.service.ts` (đây là domain-event audit, GIỮ chủ đích) — không còn dòng nào khác.

---

### Task 6: Full verification (BE green-checks gate §4.7)

**Files:** none (verification only)

- [ ] **Step 1: Chạy full suite trong worktree**

```
cd server && yarn lint && yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts" && yarn build
```
Expected: tất cả xanh (lint 0 error, type-check 0 error, jest all pass gồm 2 spec mới, build thành công).

- [ ] **Step 2: Xác nhận không còn boilerplate initiated/completed trong scope**

```
cd server && grep -rnE "Logger\.(info|debug)\([\"'][^\"']*(initiated|completed)" src/modules
```
Expected: **không còn dòng nào** (mọi lifecycle log đã chuyển sang `@LogMethod`). Domain-event "New user registered" và audit "reset completed successfully" KHÔNG khớp pattern này (không chứa "initiated"/generic "completed" ở dạng lifecycle boilerplate — riêng audit chứa "completed successfully" sẽ khớp; xác nhận đó là dòng audit chủ đích giữ).

> Nếu Step 2 còn dòng ngoài dự kiến → quay lại task migrate tương ứng.

---

## Self-Review

**Spec coverage** (đối chiếu `design.md`):
- §3 component `@LogMethod` → Task 2. ✅
- §4 hành vi runtime (initiated/completed/duration/failed/rethrow/sync-async) → Task 2 (test đủ case). ✅
- §5 correlation mở rộng `RequestContext` → Task 1. ✅ (Điều chỉnh so với design: seed requestId trong `RequestContext.middleware` thay vì thêm middleware ở `app.ts` — sạch hơn, không đổi thứ tự.)
- §6 meta nghiệp vụ tách riêng (giữ domain-event / bỏ config) → Task 3–5 (bảng "Xử lý completed"). ✅
- §7 error/edge (ngoài request context, sync) → Task 2 (requestId optional; nhánh non-Promise). ✅
- §8 testing → Task 1 + Task 2 spec. ✅
- §9 migration theo module → Task 3–5. ✅
- §10 rule sync → Task 2 Step 6 (`libs.md`). ✅ (Vị trí đổi common→libs nên chỉ cần `libs.md`, không cần `common.md`.)
- §11 out-of-scope (không guard/repo/controller/audit) → tôn trọng trong Task 5 (audit giữ nguyên). ✅

**Điều chỉnh có chủ đích so với design (ghi rõ)**:
1. Decorator đặt ở `src/libs/logger/` thay vì `src/common/decorators/` — tránh cycle layering `common↔utils`, cohesive với `Logger`. (Design §3 đã nêu đây là option; chọn tại plan vì lý do kỹ thuật cycle.)
2. `fields` hỗ trợ dot-path để cover forgot-password (`req.body.email`).
3. Correlation seed trong `RequestContext.middleware` (không thêm middleware `app.ts`).

**Placeholder scan**: không có TBD/TODO; mọi step có lệnh + code cụ thể. ✅

**Type consistency**: `LogMethodOptions { name?, fields?, level? }`, `LogMethod(options?)`, `Logger.error(msg, error?, meta?)`, `RequestContext.getRequestId()` dùng nhất quán Task 1→5. ✅
