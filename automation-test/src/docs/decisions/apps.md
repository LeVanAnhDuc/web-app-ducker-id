# APPS — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/Apps/**`
- `client/src/components/AppCard`
- `client/src/layouts/AppHeader/components/HeaderSearch/**`
- `client/src/hooks/useListQuery.ts`, `client/src/hooks/useOpenApp.ts`
- `client/src/locales/{en,vi}/{apps,list,dashboard}.json`
- `server/src/modules/{web-app,category}`
- `server/src/validators/schemas/web-app.ts`

Đọc thêm ngày 2026-10-14 (chuẩn hoá theo `/write-tests apps`, chạy tự động — user không có mặt):

- `README.md` → `## Features` (App launcher dashboard, Recently used)
- `docs/specs/header-search/design.md`, `docs/specs/apps-category-ssr/{design,security-report}.md`,
  `docs/specs/web-app-user-list/design.md`, `docs/specs/apps-api-integration/design.md`
- `client/src/layouts/AppHeader/**` (HeaderSearch, AdminLayout cũng render header), `client/src/hooks/useListQuery.ts`
- `server/src/modules/web-app/{web-app.routes.ts,services/list-user-apps.ts,helpers,dtos/user-app.dto.ts}`,
  `server/src/modules/category/{category.routes.ts,dtos/public-category.dto.ts}`,
  `server/src/middlewares/{pipes,guards/optional-auth.guard.ts,common/rate-limiter.middleware.ts}`,
  `server/src/constants/redis/rate-limit/index.ts`, `server/src/i18n/locales/en/{validation,common,category}.json`

Chuyển đổi từ `docs/specs/web-app-user-list/e2e.md`, `docs/specs/header-search/e2e.md`,
`docs/specs/apps-api-integration/e2e.md`, `docs/specs/apps-category-ssr` (qua `web-app-user-list/e2e.md`) và các dòng
phía user của `docs/specs/unified-list-experience/e2e.md`.

## Quyết định chốt

- **Q1** Suite không bao giờ gọi tên một app seed: catalogue được đọc từ `GET /apps` lúc chạy, vì database chạy test
  không chắc có Blog / Notes / IDMS Portal của seeder. → REQ-APPS-01. (Ngoại lệ: nhóm phân quyền TC-APPS-060…062 gọi
  tên Notes, Blog, Operations Console.)
- **Q2** Các trạng thái cần nhiều app hơn số đang có (phân trang, icon null, lỗi tải) được dựng bằng cách stub
  `GET /apps` với `page.route`, không tạo dữ liệu thật. → REQ-APPS-01, REQ-APPS-02.
- **Q3** Cách role mặc định và ngoại lệ theo từng user kết hợp với nhau do `admin-entitlements.md` định nghĩa; module
  này chỉ kiểm hệ quả trên `/apps` (TC-APPS-060…062). → REQ-APPS-01, REQ-APPS-06.

- **Q4** (tự quyết 2026-10-14, cần user duyệt): `GET /apps` và `GET /apps/categories` có phải chỉ trả trường hiển thị
  không? → Có: security report của `apps-category-ssr` chốt DTO công khai chỉ `_id`, `slug`, tên; `UserAppDto` chỉ có
  trường hiển thị. Kiểm bằng danh sách key chính xác. → REQ-APPS-07 (TC-APPS-065, 067).
- **Q5** (tự quyết 2026-10-14, cần user duyệt): giới hạn 100 request / 5 phút mỗi IP và cache 60 giây của danh sách
  danh mục chỉ có trong spec + security report, README không nói — có là requirement không? → Có (docs > code; đều là
  quyết định có chủ đích của feature). → REQ-APPS-10 (TC-APPS-038…040, 065, 066).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): tìm kiếm có khớp mô tả và bỏ khoảng trắng hai đầu không? → Có: design
  của header-search ghi "match theo name và description"; trim chỉ thấy trong Joi nhưng client cũng trim trước khi gửi,
  nên coi là hành vi mong muốn. → REQ-APPS-09 (TC-APPS-054, 064).
- **Q7** (tự quyết 2026-10-14, cần user duyệt): chọn một ứng dụng trong ô tìm kiếm header có ghi lần mở như nút Open
  không? → Có: README "Every Open button records the launch", dòng kết quả mang nhãn "Open <name>" và gọi cùng
  `useOpenApp`. → REQ-APPS-03, REQ-APPS-04 (TC-APPS-073).
- **Q8** (tự quyết 2026-10-14, cần user duyệt): `search` chỉ gồm khoảng trắng gửi thẳng API (Joi trim thành chuỗi rỗng)
  phải trả gì? → Docs không nói và client không bao giờ gửi (cả toolbar lẫn header đều trim) → ngoài phạm vi, không viết
  TC. → REQ-APPS-08, REQ-APPS-09.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): kiểm thông điệp `VALIDATION_ERROR` theo ngôn ngữ nào? → Gửi
  `Accept-Language: en`, so với `serverMessage.validation.<field>.invalid` và `common.errors.validationFailed`. →
  REQ-APPS-08 (TC-APPS-063).
- **Q10** (tự quyết 2026-10-14, cần user duyệt): một test cũ chứng minh cùng lúc TC-APPS-062 và TC-OIDC-051 — tên test
  không thể trùng hai tiêu đề → tách thành hai test cùng file, giữ nguyên mọi kỳ vọng (card hiện sau khi cấp; SSO bị từ
  chối rồi cho qua). → REQ-APPS-01.
- **Q11** (tự quyết 2026-10-14, cần user duyệt): TC-APPS-038…040 là case tầng API nhưng nằm trong file e2e → chuyển sang
  `tests/api/apps/categories.api.ts` (cùng kỳ vọng; phiên ẩn danh / user / admin lấy từ fixture `guestApi` / `userApi` /
  `adminApi` thay cho đăng nhập tay). Test trong `launcher-access.e2e.ts` mang TC của module khác (FAVORITES, RECENTLYUSED,
  OIDC, ADMINENTITLEMENTS) được đổi tên theo tiêu đề TC của module đó. → REQ-APPS-02, REQ-APPS-10.

## Tài khoản test

- Case trình duyệt và API đọc catalogue bằng user seed (`user@test.com`) và admin seed.
- Các app user _không_ được thấy được đăng ký riêng cho từng spec qua admin API
  (`utils/catalog.ts → createFixtureApps`: một app admin-only, một app inactive, tên `e2e-oidc-*`) và bị xoá trong
  `afterAll`.
- Bản ghi lần mở app (launch) qua API được ghi trên tài khoản dùng một lần. Hai case trình duyệt (TC-APPS-015, 073)
  bấm Open bằng user seed — chỉ thêm một lần mở vào lịch sử, không đổi trạng thái tài khoản.
- TC-APPS-072 chạy với admin seed trên `/admin`.
- Nhóm phân quyền (TC-APPS-060…062) chạy trên tài khoản dùng một lần (role `user`); override được ghi qua admin API và
  được gỡ sau mỗi test.

## Dữ kiện server

- Kích thước trang 20 (client), `limit` 1…100, `page` ≥ 1 (Joi `integer().min(1)`), `search` ≤ 200 ký tự,
  `categoryId` phải là ObjectId 24 ký tự hex, key query không biết bị loại bỏ.
- User thấy các app ACTIVE có `requiredRoles` chứa `user` (hoặc rỗng), điều chỉnh theo mọi ngoại lệ theo từng user mà
  admin đã đặt (TC-APPS-060…062); admin thấy mọi app ACTIVE.
- Tìm kiếm trên header lấy 5 kết quả (`HEADER_SEARCH_RESULT_LIMIT`) sau debounce 300 ms.
- Kết quả rỗng là `totalPages: 0`.
- Lỗi query: 400 `VALIDATION_ERROR`, message `common:errors.validationFailed`, `errors[] = { field, reason, message }`
  (`validation:<field>.invalid`).
- `search` khớp `name`, `displayName`, `description` (regex đã escape, không phân biệt hoa thường).
- `GET /apps/categories`: limiter `categoriesByIp` 100 / 300 s (`rate-limit:categories:ip:`) → `optionalAuthGuard` →
  `Cache-Control: public, max-age=60`; vượt giới hạn trả 429 `TOO_MANY_REQUESTS`, message
  `category:errors.rateLimitExceeded`.
- Header search: Enter khi chưa chọn dòng nào và query không rỗng → `router.push(/apps?search=<q>)`.

## Ngoài phạm vi

- Thông báo theo trang "{total} apps loaded" của thiết kế cũ: không còn được nối, các key `apps.announce.*` không được
  dùng (TC-APPS-017 chỉ kiểm "Đã áp dụng bộ lọc.").
- Fallback danh mục khi fetch phía server Next.js lỗi (TC-APPS-047) không tự động hoá: request lỗi chạy trong process
  server trước khi HTML được stream nên `page.route` không chặn được — kiểm tay.

- `search` chỉ gồm khoảng trắng gửi thẳng API (Q8).
- Thứ tự danh mục của một ứng dụng (danh mục đầu là chính) do form admin quyết định — kiểm ở `admin-apps`.

## Tech debt liên quan

- BUG-APPS-01 (`../../defects/apps.md`): alert lỗi tải nằm trong children của `PageContent` và bị trạng thái rỗng thay
  thế khi query lỗi không có item.
- TC-ADMINENTITLEMENTS-041 (trong `tests/e2e/apps/launcher-access.e2e.ts`) chờ cố định 2 giây để chứng minh _không_
  có thông báo — không có sự kiện nào để chờ; giữ nguyên từ bộ cũ.
