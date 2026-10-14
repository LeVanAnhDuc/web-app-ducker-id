# ADMINUSERS — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/AdminUsers/**`
- `client/src/dataSources/AdminUsers`
- `client/src/hooks/useListQuery.ts`
- `client/src/libs/query-client.ts` (toast lỗi toàn cục)
- `client/src/locales/{en,vi}/{adminUsers,list}.json`
- `server/src/modules/user/**` (`set-user-active.ts`, `admin-reset-password.ts`, `get-admin-users.ts`)
- `server/src/validators/schemas/user.ts`

Chuyển đổi từ `docs/specs/admin-users-list/e2e.md`, `docs/specs/admin-lock-unlock-user/e2e.md`, các dòng phía admin
của `docs/specs/admin-reset-password/e2e.md` và các dòng admin-users của `docs/specs/unified-list-experience/e2e.md`.

Đọc thêm ngày 2026-10-14 (lượt `/write-tests admin-users`, chuẩn hóa + bổ sung):

- `README.md` → `## Features` ("Admin — user accounts", "Not built yet" → Admin force logout)
- `docs/specs/admin-users-list/design.md`, `docs/specs/admin-lock-unlock-user/{design,security-report}.md`,
  `docs/specs/admin-reset-password/design.md`, `docs/unfinished-features.md` §2
- `server/src/modules/user/user.routes.ts`, `user.controller.ts`, `repository/impl/mongo-user.repository.ts`
  (`findAdminUsers`: regex escape, sort), `server/src/common/pagination/index.ts` (sort mặc định `createdAt` giảm dần)
- `server/src/middlewares/common/rate-limiter.middleware.ts` (`adminUserMutationByIpAndUser`),
  `server/src/constants/redis/rate-limit/index.ts` (`USER.ADMIN_MUTATION`: 20 / 900 s)
- `server/src/modules/token/guards/auth-active.guard.ts` (refresh khi `isActive=false`)
- `server/src/i18n/locales/{en,vi}/{user,common}.json`
- `client/src/components/CustomPagination`, `client/src/components/ui/pagination.tsx`,
  `client/src/components/PageContainer/PageEmptyState`, `client/src/views/AdminUsers/components/UserRowActions`

Phạm vi ban đầu của module: danh sách người dùng admin tại `/admin/users`, khoá và mở khoá tài khoản, và đặt lại
mật khẩu của người dùng (REQ-ADMINUSERS-01…03). Lượt 2026-10-14 thêm REQ-ADMINUSERS-04…07 cho hành vi đã ship nhưng
chưa có requirement.

## Quyết định chốt

- Q1 (tự quyết 2026-10-14, cần user duyệt): rate limit 20 / 15 phút theo IP + admin trên khoá / mở khoá / reset chỉ có
  trong code — `security-report.md` của lock-unlock ghi "ACCEPTED, có thể thêm sau", design reset §7 đề nghị thêm. Đây
  là hành vi mong muốn hay bug? → coi là hành vi mong muốn (đóng mục còn mở của hai tài liệu đó, giống mọi mutation
  admin khác) → REQ-ADMINUSERS-07, TC-ADMINUSERS-062.
- Q2 (tự quyết 2026-10-14, cần user duyệt): sau khi khoá, phiên đang mở của người bị khoá thế nào? → theo
  `admin-lock-unlock-user/design.md` §1–2 ("soft lock"): access token còn dùng tới hết hạn, refresh bị từ chối với
  `REFRESH_TOKEN_INVALID`. Status 403 lấy từ code (tài liệu chỉ chốt mã lỗi, "không phải 401 chung chung") →
  REQ-ADMINUSERS-06, TC-ADMINUSERS-061.
- Q3 (tự quyết 2026-10-14, cần user duyệt): focus sau khi đóng dialog khoá / reset về `<body>` trước đây ghi là tech
  debt "không assert"; hai design doc yêu cầu "focus về trigger khi đóng". → tài liệu thắng code: thành requirement
  (thuộc REQ-02 / REQ-03), test viết kỳ vọng đúng kèm `test.fail()` → BUG-ADMINUSERS-03, TC-ADMINUSERS-065, -066.
- Q4 (tự quyết 2026-10-14, cần user duyệt): seed chỉ có 5 tài khoản nên thanh phân trang không chắc hiện. Có tạo 21
  tài khoản để có trang 2 thật không? → không; test cho response danh sách đi qua thật nhưng nâng `meta.totalPages`
  lên tối thiểu 2, rồi kiểm click "Go to next page" gọi `page=2` thật và ghi URL. Hành vi phân trang phía server đã
  có TC-ADMINUSERS-027 → REQ-ADMINUSERS-01, TC-ADMINUSERS-060.
- Q5 (tự quyết 2026-10-14, cần user duyệt): sort (`sortBy` / `sortOrder`) chỉ có ở API, bảng không có control sort
  (design admin-users-list hàng 6 "flag follow-up"). Có kiểm không? → kiểm ở tầng API như hợp đồng đã ship (mặc định
  mới nhất trước; `fullName` theo code point vì MongoDB không đặt collation); UI sort → Ngoài phạm vi →
  REQ-ADMINUSERS-01, TC-ADMINUSERS-029.
- Q6 (tự quyết 2026-10-14, cần user duyệt): rào chắn (tự khoá, tự reset, admin cuối cùng, idempotent, được thao tác
  admin khác) và quyền truy cập trước đây gộp trong REQ-02 / REQ-03 / REQ-01. → tách thành REQ-ADMINUSERS-05 (rào chắn)
  và REQ-ADMINUSERS-04 (chỉ admin); các TC cũ (002, 003, 026, 034, 035, 036, 042, 045, 052) giữ nguyên kỳ vọng, chỉ
  thêm REQ mới vào dòng Requirement.
- Q7 (tự quyết 2026-10-14, cần user duyệt): reset một admin khác có được không? → được (design reset §2 "Cho phép
  reset admin khác", không có luật "admin cuối cùng" cho reset) → REQ-ADMINUSERS-05, TC-ADMINUSERS-067.

## Tài khoản test

- Danh sách chỉ đọc và assert trên các tài khoản seed `admin@test.com`, `user@test.com` và `unverified@test.com`
  (không bao giờ đăng nhập, nên `lastLoginAt` luôn null).
- Mọi thao tác khoá, mở khoá và reset nhắm vào một tài khoản tạm từ `createAccount()`; trang được mở với
  `?search=<email>` để dòng đó luôn hiện trên màn hình bất kể database đang chứa gì.
- Case tự khoá mình khôi phục admin trong `afterEach` (access token vẫn dùng được sau khi bị khoá).
- Admin thứ hai (bảng quyết định, reset admin khác, người thao tác của case rate limit) là một tài khoản tạm được nâng
  quyền bằng `utils/admin-users.ts → promoteToAdmin` (ghi thẳng `auths.roles`, chỉ nhận địa chỉ throwaway).
- Mật khẩu tạm thời của lần reset được đọc từ job data của hàng đợi BullMQ `email` (`utils/admin-users.ts →
readTempPassword`).
- Case rate limit (`tests/api/admin-users/rate-limit.api.ts`) đặt `keepRateLimits`, chỉ đếm trên bucket của admin tạm
  và xoá `rate-limit:admin-user-mutation:*` sau test, nên `admin@test.com` không bao giờ bị chặn.

## Dữ kiện server

- Kích thước trang 20; `limit` 1…100; `page` là số nguyên ≥ 1; `search` ≤ 200 ký tự sau `trim`, khớp tên hoặc email,
  không phân biệt hoa thường, được escape regex; `role` ∈ {user, admin}; `status` ∈ {active, locked};
  `sortBy` ∈ {createdAt, fullName, lastLoginAt}, mặc định `createdAt` giảm dần.
- Id sai định dạng trả 400 `VALIDATION_ERROR`, id không tồn tại trả 404 `USER_NOT_FOUND`; tự khoá mình trả 403
  `ADMIN_CANNOT_LOCK_SELF`, tự reset mình trả 403 `ADMIN_CANNOT_RESET_SELF`.
- Thao tác thay đổi của admin bị rate limit 20 / 15 phút theo IP + admin (`rate-limit:admin-user-mutation:ip-user:`),
  chạy sau guard admin và **trước** bước kiểm id; vượt ngưỡng trả 429 `TOO_MANY_REQUESTS`.
- Refresh của tài khoản bị khoá: 403 `REFRESH_TOKEN_INVALID` (`AuthActiveGuard`); `authGuard` không đọc lại `isActive`.
- Mật khẩu tạm thời của lần reset (16 ký tự) chỉ rời server qua email; suite đọc nó từ job data của hàng đợi BullMQ
  `email` (`readTempPassword`).
- Không có guard role phía client cho `/admin/*`: người không phải admin thấy khung trang và lỗi 403 của API.
- Toast lỗi 5xx ("Server error. Please try again later.") là chuỗi cứng trong `client/src/libs/query-client.ts`, không
  nằm trong locale — giữ ở `data/test-data.ts → SERVER_ERROR_TOAST`. Nhãn của `CustomPagination` ("Go to next page")
  cũng là chuỗi cứng tiếng Anh.

## Ngoài phạm vi

- Việc người dùng bị buộc đổi mật khẩu sau khi bị reset, và việc reset đăng xuất các phiên cũ (`tokenVersion`), thuộc
  module password (TC-PASSWORD-042…045).
- Thông báo `PASSWORD_CHANGED` gửi cho người bị reset thuộc module notifications.
- Nhánh `ADMIN_CANNOT_LOCK_LAST_ADMIN` (TC-ADMINUSERS-045) chỉ kiểm thủ công / bằng unit test `user.service` của
  server: muốn chạm tới phải vô hiệu hoá `admin@test.com`, thứ mà mọi spec khác phụ thuộc vào.
- **Force logout**: dialog và toast nối vào mock, không có endpoint (README "Not built yet",
  `useForceLogoutAdminUser`). Không test.
- Control sort trên bảng: chưa build (Q5). Sort chỉ kiểm ở API.
- Ma trận role × endpoint toàn bộ `/admin/*` và token giả mạo thuộc module authz (TC-AUTHZ-002, 003, 007…009); module
  này chỉ giữ TC-ADMINUSERS-026 cho bốn endpoint của nó.

## Tech debt liên quan

- `AdminUsersTable` không có nhánh lỗi (BUG-ADMINUSERS-01) và không thông báo khi tải xong (BUG-ADMINUSERS-02) kể từ
  đợt refactor unified-list.
- Dialog khoá / reset mở từ `DropdownMenuItem` đã unmount nên focus khi đóng rơi về `<body>` (BUG-ADMINUSERS-03).
- Hai locator giữ nguyên từ bộ test cũ vì markup không cho gì tốt hơn: skeleton `.animate-pulse`
  (`UsersTableSkeleton` không có role / testid) và panel Filters `[data-slot="popover-content"]`.
