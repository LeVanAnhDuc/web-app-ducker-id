# `@LogMethod` context-only correlation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Steps use checkbox syntax.

**Goal:** Bỏ trích field từ args trong `@LogMethod`; aspect chỉ lấy `requestId` + `userId` từ RequestContext. Email pre-auth chuyển sang business log tường minh trong service/strategy.

**Architecture:** Aspect thuần cross-cutting (lifecycle + duration + correlation từ ALS). Dữ liệu nghiệp vụ do service tự log.

**Tech Stack:** TypeScript (experimentalDecorators), Winston `Logger`, `AsyncLocalStorage` (RequestContext), Jest.

## Global Constraints

- `@LogMethod` KHÔNG đọc args nữa. `LogMethodOptions = { name?, level? }` — bỏ `fields`. Xoá `pickFields`/`resolvePath`.
- baseMeta chỉ từ `RequestContext.getRequestId()` + `getUserId()`; bỏ key khi undefined.
- Giữ invariant feature 1: async/sync, guard never-throw, rethrow error nguyên vẹn.
- Business log thêm vào = ONE `Logger.info` domain-event/action tại success (theo bảng §4 design). KHÔNG log password/otp/token/resetToken — chỉ `email` + meta config.
- KHÔNG đụng `requestLogger`, `RequestContext`, `test/setup.ts`.
- Sau mỗi task chạm `server/src/**`: `cd <worktree> && yarn format && yarn lint && yarn type-check` phải sạch.
- Test trong worktree: `npx jest --testMatch "**/?(*.)+(spec).ts" <path>`. node_modules là junction → KHÔNG `yarn install`.
- Worktree: `server/.worktrees/logmethod-context-correlation`.

---

### Task 1: Rewrite `@LogMethod` (context-only) + spec

**Files:** `src/libs/logger/log-method.decorator.ts`, `src/libs/logger/log-method.decorator.spec.ts`

- [ ] **Step 1: Rewrite decorator** — thay toàn bộ nội dung `log-method.decorator.ts`:

```ts
// others
import { Logger } from "./index";
import { RequestContext } from "@/utils/request-context";

export interface LogMethodOptions {
  name?: string;
  level?: "info" | "debug";
}

export function LogMethod(options: LogMethodOptions = {}): MethodDecorator {
  const { name, level = "info" } = options;

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
      // Aspect chỉ lấy correlation từ RequestContext, KHÔNG đọc args.
      // Logging không bao giờ throw ra business flow.
      let baseMeta: Record<string, unknown> = {};
      try {
        const requestId = RequestContext.getRequestId();
        const userId = RequestContext.getUserId();
        baseMeta = {
          ...(requestId ? { requestId } : {}),
          ...(userId ? { userId } : {})
        };
      } catch {
        baseMeta = {};
      }

      const start = Date.now();

      const logLifecycle = (
        message: string,
        extra?: Record<string, unknown>
      ): void => {
        try {
          Logger[level](message, extra ? { ...baseMeta, ...extra } : baseMeta);
        } catch {
          /* logging must never break the business flow */
        }
      };
      const logCompleted = (): void =>
        logLifecycle(`${label} completed`, { durationMs: Date.now() - start });
      const logFailed = (error: unknown): void => {
        try {
          Logger.error(`${label} failed`, error, {
            ...baseMeta,
            durationMs: Date.now() - start
          });
        } catch {
          /* logging must never break the business flow */
        }
      };

      logLifecycle(`${label} initiated`);

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

- [ ] **Step 2: Rewrite spec** — thay toàn bộ `log-method.decorator.spec.ts`:

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
    jest.spyOn(RequestContext, "getRequestId").mockReturnValue("req-xyz");
    jest.spyOn(RequestContext, "getUserId").mockReturnValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  class Sample {
    @LogMethod({ name: "DoWork" })
    async work(): Promise<string> {
      return "ok";
    }

    @LogMethod({ name: "Boom" })
    async fails(): Promise<void> {
      throw new Error("kaboom");
    }

    @LogMethod()
    async plain(): Promise<number> {
      return 1;
    }
  }

  it("logs initiated + completed with requestId + durationMs; passes result through", async () => {
    const out = await new Sample().work();
    expect(out).toBe("ok");
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {
      requestId: "req-xyz"
    });
    const [msg, meta] = infoSpy.mock.calls[1];
    expect(msg).toBe("DoWork completed");
    expect(meta).toMatchObject({ requestId: "req-xyz" });
    expect(typeof meta.durationMs).toBe("number");
  });

  it("includes userId when authenticated (present in RequestContext)", async () => {
    jest.spyOn(RequestContext, "getUserId").mockReturnValue("user-1");
    await new Sample().work();
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {
      requestId: "req-xyz",
      userId: "user-1"
    });
  });

  it("omits correlation keys that are absent from context", async () => {
    jest.spyOn(RequestContext, "getRequestId").mockReturnValue(undefined);
    jest.spyOn(RequestContext, "getUserId").mockReturnValue(undefined);
    await new Sample().work();
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {});
  });

  it("does NOT read method arguments (no business fields logged)", async () => {
    class WithSecret {
      @LogMethod({ name: "Sec" })
      async run(_body: { email: string; password: string }): Promise<void> {}
    }
    await new WithSecret().run({ email: "a@b.com", password: "secret" });
    const dump = JSON.stringify(infoSpy.mock.calls);
    expect(dump).not.toContain("secret");
    expect(dump).not.toContain("a@b.com");
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

  it("never breaks the business flow if logging itself throws", async () => {
    infoSpy.mockImplementation(() => {
      throw new Error("logger down");
    });
    const out = await new Sample().work();
    expect(out).toBe("ok");
  });

  it("falls back to ClassName.method label when name omitted", async () => {
    await new Sample().plain();
    expect(infoSpy.mock.calls[0][0]).toBe("Sample.plain initiated");
  });
});
```

- [ ] **Step 3:** `npx jest ... src/libs/logger/log-method.decorator.spec.ts` → PASS. Green checks.

---

### Task 2: Migrate `signup.service.ts`

**File:** `src/modules/signup/signup.service.ts`

- [ ] Đổi 5 decorator `@LogMethod({ name, fields })` → `@LogMethod({ name })` (bỏ `fields`).
- [ ] Thêm business log tại success (giữ nguyên warn/debug + "New user registered"):
  - `sendOtp`: trước `return toSendOtpDto(...)` → `Logger.info("Signup OTP sent", { email, expiresIn: OTP_EXPIRY_SECONDS, cooldownSeconds: OTP_COOLDOWN_SECONDS });`
  - `verifyOtp`: trước `return toVerifyOtpDto(...)` → `Logger.info("Signup session issued", { email, sessionExpiresIn: SESSION_EXPIRY_SECONDS });`
  - `resendOtp`: trước `return toResendOtpDto(...)` → `Logger.info("Signup OTP resent", { email, resendCount: currentResendCount, maxResends: MAX_RESEND_COUNT });`
  - `completeSignup`: KHÔNG thêm (đã có "New user registered").
  - `checkEmail`: KHÔNG thêm.
- [ ] Green checks + regression jest.

---

### Task 3: Migrate login strategies

**Files:** `password-login.strategy.ts`, `otp-login.strategy.ts`, `magic-link-login.strategy.ts` (trong `src/modules/login/strategies/`)

- [ ] Bỏ `fields` khỏi mọi decorator (`@LogMethod({ name })`).
- [ ] Thêm business log:
  - `password.authenticate`: ngay trước `return this.completion.complete({...})` → `Logger.info("Password login succeeded", { email });` (file này hiện KHÔNG import `Logger` sau feature 1 → thêm lại `import { Logger, LogMethod } from "@/libs/logger";`).
  - `otp.sendCode`: trước `return toOtpSendDto(...)` cuối (nhánh gửi thật) → `Logger.info("Login OTP sent", { email, expiresIn: this.otpLoginRepo.OTP_EXPIRY_SECONDS, cooldown: this.otpLoginRepo.OTP_COOLDOWN_SECONDS });`
  - `otp.verifyCode`: trước `return this.completion.complete({...})` → `Logger.info("Login OTP verified", { email });`
  - `magic.sendLink`: trước `return toMagicLinkSendDto(...)` cuối (nhánh gửi thật) → `Logger.info("Magic link sent", { email, expiresIn: this.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS, cooldown: this.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS });`
  - `magic.verifyLink`: trước `return this.completion.complete({...})` → `Logger.info("Magic link verified", { email });`
- [ ] Giữ import `Logger` cho otp/magic (đã có); password-login thêm lại `Logger`. Green checks + jest.

---

### Task 4: Migrate forgot-password

**Files:** `otp-forgot-password.strategy.ts`, `magic-link-forgot-password.strategy.ts`, `services/forgot-password.service.ts`

- [ ] Bỏ `fields` khỏi mọi decorator (`{ name }`).
- [ ] Business log (email lấy từ `req.body`, đã có `const { email } = req.body`):
  - `otp.sendCode` (fp): trước `return toSendOtpResponseDto(...)` cuối (nhánh gửi thật) → `Logger.info("Forgot-password OTP sent", { email, expiresIn: this.otpRepo.OTP_EXPIRY_SECONDS, cooldown: this.otpRepo.OTP_COOLDOWN_SECONDS });`
  - `otp.verifyCode` (fp): trước `return toVerifyOtpResponseDto(...)` → `Logger.info("Forgot-password OTP verified", { email });`
  - `magic.sendLink` (fp): trước `return toSendMagicLinkResponseDto(...)` cuối (nhánh gửi thật) → `Logger.info("Forgot-password magic link sent", { email, expiresIn: this.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS, cooldown: this.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS });`
  - `magic.verifyLink` (fp): trước `return toVerifyMagicLinkResponseDto(...)` → `Logger.info("Forgot-password magic link verified", { email });`
  - `forgot-password.service.resetPassword`: chỉ bỏ `fields` (KHÔNG thêm log — audit đã cover). File này sau feature 1 KHÔNG import `Logger` → chỉ cần `@LogMethod({ name })`, giữ `import { LogMethod }`.
- [ ] Strategy files: giữ `Logger` import (fake-success + business log mới). Green checks + jest.

---

### Task 5: Verification + rule sync

- [ ] `cd <worktree> && yarn lint && yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts" && yarn build` — tất cả xanh.
- [ ] Xác nhận không còn `fields:` trong decorator: `grep -rn "LogMethod({" src | grep -i fields` → rỗng.
- [ ] Cập nhật `server/.claude/rules/libs.md` (main repo): ghi `@LogMethod` không nhận `fields`, correlation từ RequestContext (requestId + userId).

## Self-Review

- Aspect bỏ fields/pickFields → §2,§3 design ✅ (Task 1).
- userId từ context → Task 1 spec ✅.
- Business logs theo bảng §4 → Task 2–4 ✅ (skip checkEmail/completeSignup/resetPassword đúng design).
- Never-throw/rethrow/async giữ nguyên → Task 1 ✅.
- Placeholder: không. Type: `LogMethodOptions {name?, level?}` nhất quán.
