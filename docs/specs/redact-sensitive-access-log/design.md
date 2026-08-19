# Design — Redact sensitive data in access log

> Feature: `redact-sensitive-access-log` · Side: **BE-only** (`server/`) · Type: fix (security)
> Phát hiện khi thảo luận `@LogMethod` vs `requestLogger`. Output brainstorm → đầu vào `writing-plans`.

## 1. Vấn đề

`src/middlewares/common/request-logger.middleware.ts` log **body/query/params thô** ở level `http`:

```ts
Logger.http(`${req.method} ${req.originalUrl}`, {
  requestId, ip, userAgent,
  body: req.body,     // ← chứa password/otp/token với request login/signup/reset
  query: req.query,   // ← token có thể lọt qua URL (magic link)
  params: req.params
});
```

→ credential (password, otp, reset/session/refresh token) bị ghi nguyên văn vào file log `logs/combined-*.log`. Đây là lỗ rò dữ liệu nhạy cảm cần vá.

## 2. Quyết định (đã chốt)

| Hạng mục | Quyết định |
| --- | --- |
| Cách vá | **Redact key nhạy cảm (blocklist)** — giữ debug value, thay value nhạy cảm bằng `"[REDACTED]"` |
| Match | **Case-insensitive substring** trên tập gốc → tự bắt biến thể (giảm rủi ro sót key mới); chấp nhận over-redact field vô hại trùng chuỗi (access log ưu tiên an toàn) |
| Phạm vi | body + query + params (3 thứ đang log) |

## 3. Component — `redactSensitive`

**Vị trí**: `src/utils/redact/index.ts` (utils vì có thể tái dùng ở log site khác về sau).

```ts
function redactSensitive(value: unknown): unknown;
```

**Hành vi**:
- Duyệt đệ quy: với **object**, nếu tên key khớp mẫu nhạy cảm → value thành `"[REDACTED]"` (giữ key để biết field tồn tại); ngược lại đệ quy vào value. Với **array** → map đệ quy từng phần tử. Giá trị non-object (string/number/boolean/null) → trả nguyên.
- **KHÔNG mutate input** — trả cấu trúc mới (deep copy các nhánh chạm tới).
- **An toàn tài nguyên**: giới hạn **độ sâu** (mặc định 6) — quá sâu → `"[REDACTED:depth]"` (hoặc dừng đệ quy, giữ nguyên primitive); tránh vòng lặp/độ sâu vô hạn với body bất thường.

**Tập mẫu nhạy cảm** (substring, lowercase): `password`, `otp`, `token`, `secret`, `authorization`, `credential`, `apikey`, `api_key`, `cookie`.
- Bắt được: `password`/`newPassword`/`currentPassword`/`confirmPassword`, `otp`, `token`/`accessToken`/`refreshToken`/`resetToken`/`sessionToken`, `secret`.

## 4. Áp vào `requestLogger`

```ts
// others
import { redactSensitive } from "@/utils/redact";
...
Logger.http(`${req.method} ${req.originalUrl}`, {
  requestId: req.requestId,
  ip: req.ip,
  userAgent: req.get("user-agent"),
  body: redactSensitive(req.body),
  query: redactSensitive(req.query),
  params: redactSensitive(req.params)
});
```

`res.on("finish")` log (chỉ requestId/duration/statusCode) — **không đổi** (không chứa dữ liệu nhạy cảm).

## 5. Testing

- **Util `redact/index.spec.ts`** (chính):
  - Object phẳng: `{ email, password }` → password thành `[REDACTED]`, email nguyên.
  - Nested: `{ user: { newPassword } }` → redact sâu.
  - Array: `[{ token }]` → redact trong phần tử.
  - Case-insensitive: `PassWord`, `AccessToken`.
  - Biến thể: `refreshToken`, `resetToken`, `confirmPassword` đều bị redact.
  - Key an toàn (`email`, `fullName`, `page`) giữ nguyên.
  - Non-object input (`"x"`, `123`, `null`, `undefined`) → trả nguyên.
  - **Không mutate** input gốc (assert object gốc còn nguyên value).
  - Cap độ sâu: object lồng quá sâu không crash.
- **requestLogger** `request-logger.middleware.spec.ts`: gọi middleware với `req.body = { email, password }` (spy `Logger.http`) → assert meta.body.password === `[REDACTED]`, meta.body.email nguyên; `next()` được gọi.

## 6. Rule / doc sync

- Thêm `src/utils/redact/` → cập nhật `.claude/rules/utils.md` (main repo — `.claude` gitignored trong worktree).

## 7. Ngoài phạm vi (YAGNI)

- KHÔNG log/redact header (hiện không log Authorization header).
- KHÔNG allowlist per-route.
- KHÔNG đụng các log site khác (chỉ requestLogger); util để mở sẵn cho tương lai nhưng không đi rải rác lúc này.
