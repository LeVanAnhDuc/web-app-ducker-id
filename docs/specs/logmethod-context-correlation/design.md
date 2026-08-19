# Design — `@LogMethod` redesign: context-only correlation

> Feature: `logmethod-context-correlation` · Side: **BE-only** (`server/`) · Type: refactor
> Tiếp nối feature `aop-lifecycle-logging` (đã merge PR #21). Output brainstorm hội thoại → đầu vào `writing-plans`.

## 1. Vấn đề với thiết kế hiện tại

`@LogMethod({ fields })` trích giá trị log bằng cách đọc **`args[0]` + dot-path** (`"email"` hoặc `"body.email"` tùy method truyền `body` hay `req` trước). Hệ quả:

- **Coupling vị trí arg + chain**: dễ khai sai (`email` vs `body.email`).
- **Lỗi âm thầm**: path sai → field chỉ **biến mất** khỏi log, không throw/không cảnh báo → observability gap không ai biết.
- **Sai concern**: aspect (cross-cutting) đi moi **dữ liệu nghiệp vụ** từ tham số — trộn 2 mối quan tâm.

## 2. Quyết định (đã chốt với user)

| Hạng mục | Quyết định |
| --- | --- |
| Aspect lấy gì | **Chỉ từ RequestContext**: `requestId` luôn + `userId` khi đã auth (`RequestContext.getUserId()` → `user.sub`) |
| Bỏ | option `fields`, hàm `pickFields`, `resolvePath` — aspect KHÔNG còn đọc args |
| Email pre-auth | Giữ dưới dạng **business log tường minh** (1 domain-event/action, kèm `email` + meta hữu ích) trong service/strategy |

Triết lý: **aspect chỉ lo cross-cutting** (lifecycle + duration + correlation); **dữ liệu nghiệp vụ do service tự log**. Đồng thời hoàn tất đúng ý đồ "convert completed → domain-event" còn dở từ feature 1 (khi đó meta config bị *bỏ*; nay tái hiện dưới dạng event có nghĩa).

## 3. Aspect mới — `@LogMethod`

```ts
interface LogMethodOptions {
  name?: string;                 // label; mặc định "ClassName.method"
  level?: "info" | "debug";      // mặc định "info"
}                                // ❌ KHÔNG còn `fields`
```

**Hành vi**: `baseMeta` build từ RequestContext:
```ts
const requestId = RequestContext.getRequestId();
const userId = RequestContext.getUserId();
baseMeta = { ...(requestId ? { requestId } : {}), ...(userId ? { userId } : {}) };
```
Rồi log `"{label} initiated"` → chạy method → `"{label} completed"` + `durationMs`, hoặc `"{label} failed"` + rethrow. Giữ nguyên các invariant feature 1: async/sync, guard không-bao-giờ-throw, rethrow error nguyên vẹn. **Gỡ bỏ** `pickFields`/`resolvePath`/vòng lặp fields.

- Request đã auth (qua `auth.guard` → `RequestContext.setUser`) → log có `userId`.
- Luồng pre-auth (login/signup/forgot-password) → không có user → log chỉ `requestId`.

## 4. Business logs (giữ email qua domain-event tường minh)

Đổi mọi decorator từ `@LogMethod({ name, fields })` → `@LogMethod({ name })`. Với các action pre-auth, **thêm 1 `Logger.info` domain-event** tại điểm thành công (kèm `email` + meta thật sự hữu ích — tái hiện meta đã bị bỏ ở feature 1). ONE line/action, không nhân đôi lifecycle.

| Method | Business log thêm vào (tại success) |
| --- | --- |
| `signup.sendOtp` | `Logger.info("Signup OTP sent", { email, expiresIn: OTP_EXPIRY_SECONDS, cooldownSeconds: OTP_COOLDOWN_SECONDS })` |
| `signup.verifyOtp` | `Logger.info("Signup session issued", { email, sessionExpiresIn: SESSION_EXPIRY_SECONDS })` |
| `signup.resendOtp` | `Logger.info("Signup OTP resent", { email, resendCount: currentResendCount, maxResends: MAX_RESEND_COUNT })` (giữ nguyên `debug("Resend attempt tracked")`) |
| `signup.completeSignup` | **Không thêm** — đã có `Logger.info("New user registered", { email, userId })` |
| `signup.checkEmail` | **Không thêm** — read-only tầm thường, `requestId` đủ |
| `password.authenticate` | `Logger.info("Password login succeeded", { email })` (ngay trước `return this.completion.complete(...)`) |
| `otp.sendCode` (login) | `Logger.info("Login OTP sent", { email, expiresIn, cooldown })` (nhánh gửi thật; nhánh ineligible đã có `debug` skipped) |
| `otp.verifyCode` (login) | `Logger.info("Login OTP verified", { email })` |
| `magic.sendLink` (login) | `Logger.info("Magic link sent", { email, expiresIn, cooldown })` (nhánh gửi thật) |
| `magic.verifyLink` (login) | `Logger.info("Magic link verified", { email })` |
| `otp.sendCode` (fp) | `Logger.info("Forgot-password OTP sent", { email, expiresIn, cooldown })` (nhánh gửi thật; fake-success đã có info) |
| `otp.verifyCode` (fp) | `Logger.info("Forgot-password OTP verified", { email })` |
| `magic.sendLink` (fp) | `Logger.info("Forgot-password magic link sent", { email, expiresIn, cooldown })` |
| `magic.verifyLink` (fp) | `Logger.info("Forgot-password magic link verified", { email })` |
| `forgot-password.service.resetPassword` | **Không thêm** — audit đã log `"Forgot password reset completed successfully", { email }` |

Giữ nguyên mọi `warn`/`debug`/fake-success/audit hiện có.

## 5. Files

- `src/libs/logger/log-method.decorator.ts` — rewrite (bỏ fields/pickFields/resolvePath; thêm userId).
- `src/libs/logger/log-method.decorator.spec.ts` — cập nhật test (bỏ test field; thêm test userId-from-context; giữ lifecycle/error/never-throw).
- `src/modules/signup/signup.service.ts` — decorators bỏ fields + 3 business log.
- `src/modules/login/strategies/{password,otp,magic-link}-login.strategy.ts` — decorators bỏ fields + business logs.
- `src/modules/forgot-password/strategies/{otp,magic-link}-forgot-password.strategy.ts` — decorators bỏ fields + business logs.
- `src/modules/forgot-password/services/forgot-password.service.ts` — decorator bỏ fields (không thêm log).
- `server/.claude/rules/libs.md` (main repo, `.claude` gitignored trong worktree) — cập nhật ghi chú `LogMethod` (bỏ `fields`, correlation từ RequestContext).

`test/setup.ts` no-op `LogMethod` mock **giữ nguyên** (đã bỏ qua option nên không phụ thuộc `fields`).

## 6. Testing

- **Decorator spec**: `initiated`/`completed`+`durationMs`/`failed`+rethrow; `baseMeta` = `requestId` (+ `userId` khi mock `getUserId`); aspect KHÔNG đọc args (không còn field); never-throw khi Logger lỗi. Bỏ các test field/dot-path/primitive-guard cũ.
- **Existing service/strategy specs**: vẫn pass (aspect no-op trong test qua `test/setup.ts`; business `Logger.info` mới được mock nuốt bởi Logger mock).

## 7. Ngoài phạm vi (YAGNI)

- KHÔNG đụng `requestLogger` middleware (tầng HTTP, bổ sung — xem thảo luận trace root-span vs child-span).
- KHÔNG thêm business log cho read tầm thường (`checkEmail`) / chỗ đã cover (`completeSignup`, `resetPassword`).
- KHÔNG đổi `RequestContext` (đã có `getRequestId` + `getUserId`).
