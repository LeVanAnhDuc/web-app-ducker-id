# OPS — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `server/src/loaders/health.loader.ts`
- `server/src/libs/swagger/{swagger.setup,openapi}.ts`
- `server/src/middlewares/filters/error.filter.ts`
- `server/src/i18n/` (`middleware.ts`, `locales.config.ts`, `locales/{en,vi}/*.json`)
- `server/src/loaders/queue.loader.ts`

Đọc thêm ngày 2026-10-14 (`/write-tests ops`, bổ sung coverage):

- `README.md` (`## Features` → Operator tooling), `docs/project-goals.md` (dòng Security: "Helmet + Joi validation")
- `server/src/app.ts` (helmet, cors, `express.json({ limit: "10mb" })`, `requestId`)
- `server/src/middlewares/common/request-id.middleware.ts`, `server/.env.example` (`CORS_ORIGINS`)

## Quyết định chốt

- **Q1** Spec gọi tới origin nào? → `/health/*`, `/api-docs*` và `/admin/queues` chỉ được mount trên API; Next client
  chỉ proxy `/api/v1/*`, `/oauth/*` và `/.well-known/*`, không gì khác. Vì vậy các spec đó nói chuyện thẳng với API
  origin (fixture `ops` → `api/ops.client.ts` → `API_URL`: `E2E_API_URL`, mặc định `http://localhost:5000`). Các case về error envelope
  đi qua client origin, đúng cách app gọi API. → REQ-OPS-01, REQ-OPS-02, REQ-OPS-03, REQ-AUTHZ-02
- **Q2** Health check có route `/health` trần không? → **Không** — các probe là `/health/all`, `/health/mongodb` và
  `/health/redis`. → REQ-OPS-01
- **Q3** Kỳ vọng ngôn ngữ của message lấy từ đâu? → Copy được assert lấy từ `server/src/i18n/locales/{en,vi}/`
  (message phía server, không phải catalogue của client). → REQ-OPS-03
- **Q4** (tự quyết 2026-10-14, cần user duyệt): Spec gọi API origin bằng gì sau khi bỏ `helpers/ops.ts`? → client
  `api/ops.client.ts` với context riêng trên `API_URL` (không ghép API prefix), qua fixture `ops`; các case envelope
  vẫn đi client origin qua fixture `api`. Message health (`All services are healthy`…) hardcode trong
  `health.loader.ts`, không qua i18next → lấy từ `serverLiteral.health` trong `data/copy.ts`. → REQ-OPS-01, REQ-OPS-02
- **Q5** (tự quyết 2026-10-14, cần user duyệt): Security header của Helmet có phải requirement không? → **Có**:
  `docs/project-goals.md` ghi "Helmet" ở mục Security; kỳ vọng là bộ mặc định của helmet 7 (`nosniff`, `SAMEORIGIN`,
  HSTS, CSP, không `X-Powered-By`), kiểm trên API origin (client Next có thể tự thêm header riêng). → REQ-OPS-04
- **Q6** (tự quyết 2026-10-14, cần user duyệt): `X-Request-Id` chỉ có trong code (docs chỉ nói `requestId` dùng cho
  log) — hành vi mong muốn hay tình cờ? → coi là mong muốn (middleware chủ đích set header, giới hạn 128 ký tự có hằng
  số riêng); biên 128 / 129. → REQ-OPS-05
- **Q7** (tự quyết 2026-10-14, cần user duyệt): CORS có phải requirement không và origin được phép lấy ở đâu? → **Có**
  (satellite app gọi API cross-origin; `server/.env.example` ghi "thiếu origin ở đây là thứ hỏng đầu tiên"). Origin được
  phép = phần tử đầu của `CORS_ORIGINS` server (`ops.allowedOrigins` ← `CORS_ORIGINS` trong `config/urls.ts`); rỗng thì test skip. Origin lạ
  chỉ cần không có `Access-Control-Allow-Origin` — package `cors` luôn gửi `Allow-Credentials` bất kể origin, vô hại
  khi thiếu Allow-Origin, nên không assert. → REQ-OPS-06
- **Q8** (tự quyết 2026-10-14, cần user duyệt): Body JSON hỏng trả gì? → 400 trong error envelope (lỗi của client,
  không phải 5xx — lăng kính 6 "không có 5xx"); code cụ thể không ép. Code khi đó trả 500 → BUG-OPS-02 (đã sửa 2026-10-15, fix/open-bugs): giờ 400 `MALFORMED_BODY`. → REQ-OPS-03
- **Q9** (tự quyết 2026-10-14, cần user duyệt): Health khi một datastore sập (500 `MONGODB_UNHEALTHY` /
  `REDIS_UNHEALTHY` / `SERVICES_UNHEALTHY`) → TC manual: tắt MongoDB/Redis dùng chung sẽ làm hỏng mọi test khác trong
  lượt chạy. → REQ-OPS-01

## Tài khoản test

Không dùng tài khoản nào — mọi case chạy với vai trò guest, không kèm credential.

## Dữ kiện server

**Locale.** Server chỉ đọc `Accept-Language` (tôn trọng q-weight, bỏ region subtag). Hỗ trợ `vi`, `en`; **mặc định là
`vi`** — thiếu header hoặc header không được hỗ trợ thì trả lời bằng tiếng Việt.

## Ngoài phạm vi

- Body vượt giới hạn 10mb của `express.json` (413): gửi > 10 MB qua stack e2e tốn và chậm; cùng nhánh lỗi với
  BUG-OPS-02 (lỗi của body-parser rơi vào 500) — bản sửa (đã sửa 2026-10-15, fix/open-bugs) map nó sang 413 `PAYLOAD_TOO_LARGE`, vẫn
  không tự động hoá.
- Admin mở được Bull Board: khi viết chưa có guard nào nên không biết admin sẽ xác thực bằng gì (cookie hay Bearer); phía
  từ chối guest đã có TC-OPS-012 / TC-AUTHZ-012. Bull Board giờ nằm sau `adminGuard` (Bearer) — BUG-AUTHZ-01 (đã sửa 2026-10-15, fix/open-bugs);
  trình duyệt không mở thẳng dashboard được nữa, phía admin vẫn chưa test.
- Nội dung từng path trong OpenAPI (schema request/response đúng với route thật): thuộc từng module, không phải ops.

## Tech debt liên quan

_(không có)_
