# AUTHZ — quyết định

## Nguồn

Đọc ngày 2026-10-10. Test case cho `REQ-AUTHZ-01` … `REQ-AUTHZ-03` (trước đây ở `docs/requirements.md`).

- Guard: `server/src/middlewares/guards/` (`authGuard` → 401 `AUTH_MISSING_TOKEN` / `JWT_INVALID`, `adminGuard` → 403
  `AUTH_ADMIN_ONLY`).
- Router admin: `server/src/modules/{user,login-history,contact-admin,web-app,category}/*.routes.ts`, tất cả đều mount
  sau `authGuard, adminGuard`.
- Client: `AuthGuardLayout` / `SessionGate` (chỉ xác thực — không có guard vai trò phía client),
  `client/src/views/AdminDashboard`, copy trong `client/src/locales/{en,vi}/adminDashboard.json`.
- Chuyển từ các khối từ chối truy cập của suite cũ `client/e2e/admin-authz/` và các hàng AuthN / AuthZ trong
  `docs/specs/category-management/design.md` §6.

Đọc thêm ngày 2026-10-14 (lượt chuẩn hóa, `/write-tests authz` chạy tự động, user vắng mặt):

- `README.md` `## Features` (các mục "Admin — …", Bull Board).
- `server/src/loaders/modules.loader.ts` (thứ tự mount), `server/src/modules/entitlement/entitlement.routes.ts`
  (`/admin/entitlements` GET + PATCH, cũng sau `authGuard, adminGuard`), `server/src/middlewares/guards/*.ts`,
  `server/src/modules/token/helpers/index.ts` (access token và ID token cùng ký RS256, cùng `iss` / `aud` = issuer;
  refresh token HS256), `server/src/types/global.d.ts` (ID token không có `authId`).
- `client/src/components/UserMenu/mains/AdminEntryItem` (mục "Admin Console" chỉ render khi `roles === "admin"`),
  `client/src/layouts/AppHeader` (huy hiệu "Admin Mode" theo pathname `/admin*`),
  `client/src/layouts/AdminLayout/components/BackToDashboardLink`, `client/src/locales/{en,vi}/{admin,common}.json`.

## Quyết định chốt

- **Q1** Kỹ thuật nào phủ module này? → bảng quyết định vai trò (guest / user / admin) × endpoint; phân vùng tương
  đương trên token (không có / rác / sai scheme / không ký); đoán lỗi (Error Guessing) cho việc thiếu guard phía
  client; i18n `vi` trên trang landing và trên message từ chối của API. → REQ-AUTHZ-01, REQ-AUTHZ-02, REQ-AUTHZ-03
- **Q2** Dữ liệu admin được bảo vệ ở tầng nào? → ở API (`adminGuard`); client không có guard vai trò, nên e2e kiểm rằng
  non-admin không bao giờ thấy dữ liệu admin, còn việc chặn shell admin phía client là bug đang mở (TC-AUTHZ-018) — BUG-AUTHZ-02 (đã sửa 2026-10-15, fix/open-bugs): `AdminGuardLayout` đưa
  non-admin về trang chủ. →
  REQ-AUTHZ-02

- **Q3 (tự quyết 2026-10-14, cần user duyệt):** Bảng role × endpoint (TC-AUTHZ-007/008/010) có cần cả
  `/admin/entitlements` (thêm sau khi bảng 18 endpoint được viết) không? → Có: bảng phủ **mọi** router admin đang
  mount, nay là 20 lời gọi (thêm GET + PATCH `/admin/entitlements`); kỳ vọng mỗi ô giữ nguyên. → REQ-AUTHZ-01,
  REQ-AUTHZ-02
- **Q4 (tự quyết 2026-10-14, cần user duyệt):** Docs không nói gì về việc dùng nhầm loại token. ID token / refresh
  token / token bị sửa claim `roles` làm Bearer thì sao? → Bị từ chối, không bao giờ 2xx. Mã lỗi theo code hiện tại:
  sửa claim và refresh token (HS256) trượt bước xác minh chữ ký → 403 `JWT_INVALID`; ID token qua được chữ ký nhưng
  thiếu `authId` → 401 `AUTH_INVALID_TOKEN`. → REQ-AUTHZ-05 (mới)
- **Q5 (tự quyết 2026-10-14, cần user duyệt):** Mục "Admin Console" trong user menu chỉ có trong code. Hành vi mong
  muốn hay bug? → Mong muốn (đúng nguyên tắc chỉ cho admin thấy lối vào admin; README gọi khu vực này là admin
  console). → REQ-AUTHZ-04 (mới)
- **Q6 (tự quyết 2026-10-14, cần user duyệt):** "Back to User Dashboard" và huy hiệu "Admin Mode" chỉ có trong code.
  Ghi thành requirement? → Có, P2: shell admin là một phần của trang landing mà module này sở hữu. → REQ-AUTHZ-06 (mới)
- **Q7 (tự quyết 2026-10-14, cần user duyệt):** TC-AUTHZ-002/003/004 trùng một phần bảng TC-AUTHZ-007/008. Giữ hay
  bỏ? → Giữ (hồi quy có tên cho các thao tác nguy hiểm nhất: khoá / mở khoá / reset mật khẩu, và router categories),
  nhưng chuyển từ `tests/e2e/authz/admin-routes-denied.e2e.ts` sang `tests/api/authz/admin-endpoints.api.ts` vì
  `Layer: api`. TC-AUTHZ-006 (guest → `/admin/categories`) chuyển sang `tests/e2e/authz/guest-redirect.e2e.ts`. Không
  kỳ vọng nào đổi. → REQ-AUTHZ-01, REQ-AUTHZ-02
- **Q8 (tự quyết 2026-10-14, cần user duyệt):** Mỗi module admin đã tự chứng minh 401/403 của mình
  (TC-ADMINUSERS, TC-ADMINENTITLEMENTS-038/039, TC-ADMINCONTACT, TC-ADMINLOGINHISTORY…). Module này thêm gì? → Chỉ
  bảng quét toàn bộ (để một router admin mới quên guard lộ ra ở một chỗ), các lớp token (REQ-AUTHZ-05) và guard phía
  client; không thêm case 401/403 theo từng module. Endpoint chỉ cần đăng nhập (`/users/me`, `/contacts`…) thuộc module
  của chúng. → REQ-AUTHZ-01, REQ-AUTHZ-02

## Tài khoản test

- `user@test.com` (đã seed) — session user thường cho các case non-admin.
- `admin@test.com` (đã seed) — session admin cho các hàng đối chứng và trang landing; không bao giờ bị thay đổi.
- Guest — context không có cookie / không kèm token.
- TC-AUTHZ-019 / 020 đăng nhập `user@test.com` / `admin@test.com` qua API bằng đúng mật khẩu của chúng để lấy token
  thô (access, ID, refresh); không đổi trạng thái tài khoản nào.
- Các thao tác lock / unlock / reset-password nhắm vào một ObjectId giữ chỗ, vì guard chạy trước mọi lookup; không tạo
  tài khoản dùng một lần.

## Ngoài phạm vi

- Scheme viết thường (`bearer <token>`): `authGuard` chỉ nhận đúng `Bearer ` nên trả 401 `AUTH_MISSING_TOKEN` — an
  toàn, docs không nói, không test.
- Access token hết hạn (8 giờ): không tạo được token hết hạn mà không giữ khoá ký của server; `verifyToken` map
  `TokenExpiredError` → 403 `JWT_EXPIRED` (đọc code).
- Endpoint chỉ cần đăng nhập (không phải admin) — 401 của chúng nằm ở module tương ứng (Q8).

## Tech debt liên quan

- Vai trò đọc từ claim `roles` của access token, không tra lại DB: admin bị hạ quyền vẫn giữ quyền admin tới khi
  access token hết hạn (8 giờ). Không test được với tài khoản seed (chỉ đọc) và docs không nói — ghi nhận ở đây.
