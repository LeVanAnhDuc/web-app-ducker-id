# Design — AOP Lifecycle Logging (`@LogMethod`)

> Feature: `aop-lifecycle-logging` · Side: **BE-only** (`server/`) · Type: refactor
> Output của `superpowers:brainstorming` — đầu vào cho `superpowers:writing-plans`.

## 1. Bối cảnh & vấn đề

Hiện tại pattern log `"X initiated"` / `"X completed"` được lặp lại thủ công ở đầu/cuối **hầu hết** các method của service và strategy (`signup`, `login/strategies`, `forgot-password`, ...). Hệ quả:

- **Trùng lặp (boilerplate)**: mỗi method 2 dòng `Logger.info(...)` gần như giống nhau.
- **Không nhất quán**: label, meta, có/không log duration, có/không log error mỗi nơi mỗi khác.
- **Trộn 2 loại thông tin** trong cùng dòng log: (1) *lifecycle* generic (bắt đầu/kết thúc) và (2) *meta nghiệp vụ đặc thù* (`expiresIn`, `cooldownSeconds`, `resendCount`...).

Mục tiêu (đã chốt với user): **chuẩn hóa toàn diện** bằng lập trình hướng khía cạnh (AOP) — một aspect lo lifecycle + duration + auto-error + correlation; meta nghiệp vụ tách riêng, tường minh.

## 2. Quyết định thiết kế (đã chốt)

| Hạng mục | Quyết định |
| --- | --- |
| **Mục tiêu** | Chuẩn hóa toàn diện: aspect = lifecycle + timing + error + correlation |
| **Cơ chế** | **Method decorator** `@LogMethod` (Phương án A) — vì opt-in field per-method + scope service/strategy + xoá boilerplate rõ nhất |
| **Args/Return** | **Opt-in field an toàn**: mặc định KHÔNG log args; khai báo per-method field cần log (vd `email`) |
| **Phạm vi** | Public method của **service + strategy** |
| **Correlation** | Tái dùng `RequestContext` (AsyncLocalStorage sẵn có), mở rộng để giữ `requestId` |

**Phương án đã loại**:
- **B — Proxy wrapper ở factory**: opt-in field per-method trở nên vướng (vẫn cần metadata registry → quay lại decorator); Proxy chặn cả internal call, khó giới hạn "public use-case method"; magic vô hình khó đọc.
- **C — HOF wrapper tường minh**: vẫn là boilerplate bọc thân hàm, không xoá noise thị giác — chính là vấn đề gốc.

## 3. Component: `@LogMethod`

**Vị trí**: `server/src/common/decorators/log-method.decorator.ts` (cross-cutting primitive, cùng tầng `common/exceptions`, `common/responses`). Barrel `common/decorators/index.ts` nếu ≥2 file (theo 1-file-vs-folder rule).

**Không cần `reflect-metadata`** — chỉ wrap `descriptor.value`, không đọc param types.

### API

```ts
interface LogMethodOptions {
  name?: string;              // label log; mặc định = "ClassName.methodName"
  fields?: string[];          // field an toàn trích từ arg đầu (opt-in) — vd ["email"]
  level?: "info" | "debug";   // mặc định "info"
}

function LogMethod(options?: LogMethodOptions): MethodDecorator;
```

### Ví dụ dùng

```ts
@LogMethod({ fields: ["email"] })
async sendOtp(body: SendOtpBody, req: Request): Promise<SendOtpDto> { ... }
```

## 4. Hành vi runtime (data flow)

Khi method được gọi, decorator wrap thân method như sau:

1. Resolve `label = options.name ?? "${ClassName}.${methodName}"`.
2. Trích opt-in fields: với mỗi `field` trong `options.fields`, đọc `args[0]?.[field]` (convention: arg đầu là `body`/DTO — khớp pattern `{ email }` hiện tại). Field `undefined` thì bỏ qua.
3. Đọc `requestId` từ `RequestContext.getRequestId()` (undefined nếu ngoài request context, vd job — chấp nhận được, không crash).
4. `Logger[level]("${label} initiated", { ...fields, requestId })`.
5. Ghi `start = Date.now()`, gọi `original.apply(this, args)`.
   - Xử lý được cả sync/async: nếu kết quả là `Promise` thì `await`; ngược lại dùng trực tiếp.
6. **Success** → `Logger[level]("${label} completed", { ...fields, requestId, durationMs })`.
7. **Error** → `Logger.error("${label} failed", error)` (kèm `durationMs` trong meta nếu Logger API hỗ trợ) → **rethrow error nguyên vẹn**.

**Bất biến (invariants)**:
- Giữ nguyên `this` binding qua `apply`.
- Passthrough return value & exception — **KHÔNG đổi behavior** của method.
- Aspect KHÔNG được throw lỗi của chính nó làm hỏng business flow.
- Rethrow error để `asyncHandler` → global error handler vẫn xử lý như cũ.

> **Lưu ý về `Logger.error` signature**: hiện `Logger.error(message, error?)` nhận `Error | unknown` chứ không phải meta object. Để đính kèm `durationMs`/`requestId` vào log lỗi cần cân nhắc (a) enrich error message, hoặc (b) mở rộng `Logger.error` nhận thêm meta. Quyết định cụ thể để `writing-plans` chốt; ưu tiên KHÔNG break signature công khai của `Logger` (theo `libs.md`).

## 5. Correlation — mở rộng `RequestContext`

Hiện `src/utils/request-context.ts` giữ `AsyncLocalStorage<RequestStore>` với `RequestStore { user? }`. `requestId` đang nằm trên `req.requestId` (set bởi `request-id.middleware.ts`) — **chưa vào ALS store** nên domain layer không lấy được.

**Thay đổi**:
- `RequestStore { user?; requestId?: string }`.
- Thêm `setRequestId(id: string)` + `getRequestId(): string | undefined`.
- Trong `app.ts`, **ngay sau** `RequestContext.middleware()` (đã mở ALS context), seed `RequestContext.setRequestId(req.requestId)` (1 middleware/dòng nhỏ). Thứ tự hiện tại: `requestId` → `RequestContext.middleware()` → `requestLogger`; chèn seed sau `RequestContext.middleware()`.

Nhờ đó service/strategy lấy `requestId` mà **không phải truyền `req`** xuống domain layer.

## 6. Xử lý meta nghiệp vụ (theo mục tiêu "chuẩn hóa toàn diện")

Aspect chỉ lo lifecycle + duration + error + correlation. Các log mang **meta nghiệp vụ** hiện gắn vào dòng "completed" (`expiresIn`, `cooldownSeconds`, `resendCount`, `sessionExpiresIn`...) được xử lý **per-method khi migrate**:

- **Giữ lại** dưới dạng log domain-event tường minh, đổi tên rõ nghĩa (vd `Logger.info("OTP issued", { expiresIn, cooldownSeconds })`), **hoặc**
- **Bỏ** nếu dư thừa / trùng thông tin.

Các log `warn` / `error` / `debug` nghiệp vụ hiện có (OTP locked, resend limit exceeded, race-condition duplicate key...) **giữ nguyên** — không thuộc phạm vi aspect.

## 7. Error handling & edge cases

- Method throw → log `failed` + rethrow nguyên vẹn (asyncHandler → global error handler vẫn chạy đúng).
- Ngoài request context (job/queue worker) → `requestId` undefined, aspect vẫn chạy bình thường.
- Method sync (hiếm trong scope này) → wrapper vẫn đo duration + log đúng, không ép thành Promise nếu nguồn là sync.
- Logging nội bộ aspect lỗi → không được propagate làm hỏng business flow.

## 8. Testing

Unit test co-located `log-method.decorator.spec.ts` (theo Test File Naming của server CLAUDE.md), spy `Logger`:

- Log `initiated` + `completed` đúng `label`, đúng opt-in `fields`, có `durationMs` trong meta completed.
- Case error: log `failed` + **rethrow đúng error**.
- Passthrough return value (kết quả method giữ nguyên).
- `requestId` lấy từ `RequestContext` (mock ALS) → xuất hiện trong meta.
- `fields` opt-in: field KHÔNG khai báo → KHÔNG xuất hiện trong meta (đảm bảo không rò credential).
- Ngoài request context: `requestId` undefined, không throw.

## 9. Migration plan

Migrate **theo module** (danh sách từ grep `initiated|completed`):

- `modules/signup/signup.service.ts`
- `modules/login/strategies/{password,otp,magic-link}-login.strategy.ts`
- `modules/forgot-password/strategies/{otp,magic-link}-forgot-password.strategy.ts`
- `modules/forgot-password/services/forgot-password.service.ts`
- (các service/strategy khác nếu phát hiện thêm khi implement)

Với mỗi method public trong scope:
1. Xoá 2 dòng `Logger.info("X initiated"...)` / `Logger.info("X completed"...)`.
2. Gắn `@LogMethod({ fields: [...] })` với opt-in field an toàn.
3. Xử lý meta nghiệp vụ theo §6 (giữ dưới dạng domain-event log hoặc bỏ).

**Loại trừ khỏi migration**: seeder / swagger / server.ts (không phải service/strategy public method) — chỉ khớp grep do chứa chuỗi text, không áp aspect.

## 10. Rule / doc sync (File Sync)

- Thêm `src/common/decorators/` → cập nhật rule tương ứng (`.claude/rules/` cho `common/`) trong cùng commit.
- Mở rộng `RequestContext` (`src/utils/request-context.ts`) → kiểm tra consumer, cập nhật nếu đụng public surface (`utils.md` R6).
- Cân nhắc ghi convention "lifecycle logging qua `@LogMethod`" vào rule/skill BE để nhất quán về sau.

## 11. Ngoài phạm vi (YAGNI)

- KHÔNG áp cho guard / repository / controller (chỉ service + strategy).
- KHÔNG auto-log toàn bộ args + redact (đã loại — dùng opt-in field).
- KHÔNG Proxy-wrap toàn instance.
- KHÔNG thêm tracing/OpenTelemetry span (chỉ log; observability nâng cao để sau nếu cần).
