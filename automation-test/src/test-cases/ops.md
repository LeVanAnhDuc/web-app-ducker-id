# OPS — test case

Công cụ vận hành: health check, tài liệu OpenAPI cùng Swagger UI, error envelope dịch theo từng request, và các header
mọi response mang (Helmet, `X-Request-Id`, CORS) (REQ-OPS-01…06).

Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/ops.md

### TC-OPS-001 — The aggregate health check reports MongoDB and Redis up

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — lớp healthy)
- **Tiền điều kiện:** API, MongoDB và Redis đang chạy
- **Bước:**
  1. `GET /health/all` trên API origin.
- **Mong đợi:** 200 success envelope, message `All services are healthy`,
  `data.mongodb.status = up`, `data.redis.status = up`,
  `data.redis.latency_ms` là số không âm hoặc null.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-002 — Each datastore has its own health probe

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — mỗi datastore một probe)
- **Tiền điều kiện:** API, MongoDB và Redis đang chạy
- **Bước:**
  1. `GET /health/mongodb`; `GET /health/redis`.
- **Mong đợi:** cả hai trả 200; `MongoDB is healthy` với `data.mongodb.status = up`;
  `Redis is healthy` với `data.redis.status = up` và có trường latency. Mỗi probe
  chỉ báo về store của chính nó.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-003 — /health itself is not a probe

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — operator và load balancer thường probe `/health`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /health` và `GET /health/unknown` trên API origin.
- **Mong đợi:** 404 trong error envelope chuẩn (`code: NOT_FOUND`) — các đường
  probe thật là ba đường trong TC-OPS-001/002. Ghi lại đường mà monitor phải
  trỏ tới.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-004 — Swagger UI is served at /api-docs

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api-docs` (theo redirect sang `/api-docs/`).
- **Mong đợi:** trang 200 `text/html` khởi động Swagger UI (tham chiếu asset
  `swagger-ui`) và script init mà trang tải được phục vụ.
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-005 — /api-docs.json is a valid OpenAPI 3 document

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** checklist dựa trên đặc tả (cấu trúc OpenAPI 3.0, phân giải `$ref`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api-docs.json`; duyệt mọi path, operation và `$ref`.
- **Mong đợi:** 200 JSON; `openapi` là `3.x.y`; `info.title` và
  `info.version` là chuỗi; có một mục `servers`; `paths` không rỗng; mọi operation
  có object `responses`; mọi `$ref` cục bộ phân giải được bên trong tài liệu.
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-006 — The OpenAPI document covers every mounted API module

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — module được wire trong `modules.loader.ts` nhưng không có trong `openapi.ts`)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Kiểm `paths` có một route của mỗi module đã mount (auth login, users, admin
     apps, admin categories, recent apps, login history, admin login history,
     notifications, favorites, admin contacts, unlock).
- **Mong đợi:** module nào cũng có ít nhất một path được tài liệu hoá. (Từng là
  BUG-OPS-01, đã sửa 2026-10-15.)
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-007 — An unknown route answers 404 in the error envelope, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — locale en / vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/does-not-exist?x=1` với `Accept-Language: en`, rồi `vi`.
- **Mong đợi:** 404 `{ code: NOT_FOUND, message, timestamp, path }` với
  `path = /api/v1/does-not-exist?x=1`, `timestamp` là thời điểm ISO lệch hiện tại
  vài giây; message `Not Found` (en) / `Không tìm thấy` (vi); không có `data`.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-008 — A validation failure answers 400 with field errors, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — email sai + thiếu password), locale en / vi
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST /api/v1/auth/login` với `{ email: "not-an-email" }` bằng en, rồi vi.
- **Mong đợi:** 400 `code: VALIDATION_ERROR`; message `Validation failed` /
  `Dữ liệu không hợp lệ`; `errors[]` có `email` (`string.email`) và
  `password` (`any.required`) kèm message đã dịch.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-009 — A protected endpoint without a token answers 401, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — locale en / vi)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/users/me` không kèm token bằng en, rồi vi.
- **Mong đợi:** 401 `code: AUTH_MISSING_TOKEN`; message `Unauthorized access` /
  `Không có quyền truy cập`; đủ các trường của envelope.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-010 — Accept-Language negotiation picks the best supported locale

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương + bảng quyết định trên header — `vi-VN,vi;q=0.9`,
  `en-US`, `en;q=0.5, vi;q=0.9`, `fr-FR, en;q=0.8`, `fr`, không có header
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi route 404 với từng header.
- **Mong đợi:** `vi-VN…` → vi; `en-US` → en; q-weight → vi; `fr-FR, en;q=0.8`
  → en (locale được hỗ trợ đầu tiên); `fr` và không có header → vi (mặc định của server).
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-011 — OAuth endpoints are the documented exception to the envelope

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** dựa trên đặc tả (dạng body RFC 6749 §5.2, design §4)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST /oauth/token` với grant type không được hỗ trợ.
  2. `GET /oauth/authorize` không có `client_id`.
- **Mong đợi:** body phẳng `{ error, error_description }`, không có `code`,
  `timestamp`, `path` — thư viện OIDC client phải parse được.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-012 — The Bull Board queue dashboard requires an admin

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — UI vận hành được mount mà không có guard)
- **Tiền điều kiện:** API chạy cùng Redis (queue bật)
- **Bước:**
  1. `GET /admin/queues` và `GET /admin/queues/api/queues` trên API origin,
     không kèm credential.
- **Mong đợi:** 401/403 (hoặc hoàn toàn không mount) — payload email job (chứa
  mã OTP) không lộ ra cho người chưa đăng nhập. (Từng là BUG-AUTHZ-01, đã sửa
  2026-10-15: Bull Board nằm sau `adminGuard`.)
- **Automated:** `tests/api/ops/queues.api.ts`

### TC-OPS-013 — Every API response carries the Helmet security headers

- **Requirement:** REQ-OPS-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP — response thành công / error envelope / tài liệu JSON)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /health/all`, `GET /health/unknown`, `GET /api-docs.json` trên API origin.
- **Mong đợi:** cả ba có `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Strict-Transport-Security` có `max-age`, có `Content-Security-Policy`, và không có `X-Powered-By`.
- **Automated:** `tests/api/ops/headers.api.ts`

### TC-OPS-014 — Every response carries an X-Request-Id, echoing a caller's id up to 128 characters

- **Requirement:** REQ-OPS-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (độ dài id 128 / 129), phân vùng tương đương (không gửi id)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /health/all` hai lần không kèm `X-Request-Id`.
  2. Gửi lại với `X-Request-Id` dài 128 ký tự, rồi 129 ký tự.
- **Mong đợi:** bước 1: mỗi response có một UUID v4 khác nhau; 128 ký tự được trả lại nguyên văn; 129 ký tự bị thay
  bằng UUID mới.
- **Automated:** `tests/api/ops/headers.api.ts`

### TC-OPS-015 — CORS answers only the configured origins, with credentials

- **Requirement:** REQ-OPS-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (origin trong `CORS_ORIGINS` / origin lạ), bảo mật
- **Tiền điều kiện:** `CORS_ORIGINS` của server không rỗng (rỗng → skip)
- **Bước:**
  1. Preflight `OPTIONS <API prefix>/auth/login` trên API origin với `Origin` = origin đầu của `CORS_ORIGINS`.
  2. Lặp lại với `Origin: https://evil.e2e.example.com`.
- **Mong đợi:** bước 1: 204, `Access-Control-Allow-Origin` = đúng origin đó, `Access-Control-Allow-Credentials: true`.
  Bước 2: không có `Access-Control-Allow-Origin` (trình duyệt chặn), không 5xx.
- **Automated:** `tests/api/ops/headers.api.ts`

### TC-OPS-016 — A malformed JSON body answers 400 in the error envelope, not 500

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (Error Guessing — body JSON cắt ngang), bảo mật (không 5xx)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST <API prefix>/auth/login` với `Content-Type: application/json` và body `{"email": "user@test.com", "password":`.
- **Mong đợi:** 400 trong error envelope (`code`, `message`, `timestamp`, `path`), không phải
  `INTERNAL_SERVER_ERROR` (`MALFORMED_BODY`). (Từng là BUG-OPS-02, đã sửa 2026-10-15.)
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-017 — A datastore that is down makes its health probe answer 500

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (datastore up → down → up)
- **Tiền điều kiện:** một stack riêng không ai khác dùng (MongoDB và Redis tắt được)
- **Bước:**
  1. Tắt Redis; `GET /health/redis` và `GET /health/all`.
  2. Bật lại Redis, tắt MongoDB; `GET /health/mongodb` và `GET /health/all`.
  3. Bật lại MongoDB; `GET /health/all`.
- **Mong đợi:** bước 1: 500 `REDIS_UNHEALTHY` và 500 `SERVICES_UNHEALTHY` (message `Services down: Redis`);
  bước 2: 500 `MONGODB_UNHEALTHY` và `Services down: MongoDB`; bước 3: lại 200 như TC-OPS-001. Mọi lỗi trong error
  envelope.
- **Automated:** manual — phải tắt MongoDB/Redis của chính server đang chạy; stack e2e dùng chung một Redis cloud và
  một DB seed cho mọi spec, tắt chúng làm đỏ mọi test khác trong lượt chạy.
