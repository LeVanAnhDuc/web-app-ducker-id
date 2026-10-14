# ADMINENTITLEMENTS — quyết định

## Nguồn

Đọc ngày 2026-10-10.

- `client/src/views/AdminEntitlements/**`
- `client/src/requests/adminEntitlements.ts`
- copy trong `client/src/locales/{en,vi}/adminEntitlements.json`
- `server/src/modules/entitlement/**`
- `server/src/validators/schemas/entitlement.ts`

Đọc thêm ngày 2026-10-14 (`/write-tests admin-entitlements`, bổ sung coverage):

- `README.md` → `## Features` (mục "Admin — app access"), `CLAUDE.md` (mục entitlements, notifications)
- `docs/specs/access-control/design.md` §3, §5, §9, §10; `docs/unfinished-features.md` §1
- `client/src/views/AdminEntitlements/**` (picker, toolbar, `useUpdateUserGrants`, `useAdminUsersSearch`)
- `server/src/modules/entitlement/**` (routes, `services/entitlement-admin/**`), `server/src/constants/redis/rate-limit/index.ts`,
  `server/src/middlewares/common/rate-limiter.middleware.ts`, `server/src/i18n/locales/{en,vi}/entitlement.json`

Chuyển đổi từ `docs/specs/admin-entitlements-picker-refinement/e2e.md`, `docs/specs/admin-entitlements-matrix/e2e.md`,
ma trận kịch bản của `docs/specs/admin-entitlements-user-options/e2e.md` và `docs/specs/access-control/e2e.md`
(dòng 1–12 của ma trận và §9).

## Quyết định chốt

_(chưa có quyết định qua hỏi đáp với user — Q1–Q4 lấy từ code và README lúc viết, Q5–Q10 tự chốt 2026-10-14 chờ user duyệt)_

Các phân định rút ra từ header cũ của file test case:

- **Q1** Module này chứa test case cho `REQ-ADMINENTITLEMENTS-01…04` (`docs/requirements.md`). Phía launcher của kiểm soát
  truy cập được xếp vào module nơi nó hiển thị: TC-APPS-060…062, TC-FAVORITES-029, TC-RECENTLYUSED-029, TC-OIDC-050…052.
- **Q2** Cách quyền truy cập vận hành (kỳ vọng các case dựa vào): khi không có override, user được một app nếu
  `requiredRoles` của app rỗng, có chứa role của họ, hoặc họ là admin — gọi là "role default". `entitlements` chỉ lưu
  ngoại lệ: `allow` vượt ngoài role, `deny` dù role cho phép. `PATCH /admin/entitlements` nhận giá trị admin muốn và chỉ
  lưu override khi nó khác role default (gửi lại giá trị mặc định thì override bị xoá). Mỗi lần quyền truy cập thực tế
  tới một app đang active bị đảo, user được thông báo (ENTITLEMENT_GRANTED / \_REVOKED).
- **Q3** Validation schema của body PATCH (0 / 1 / 50 / 51 user, 0 / 1 / 200 / 201 thay đổi, trùng lặp, sai kiểu) và phần
  còn lại của bảng quyết định §9 được chứng minh bằng unit test server (`validators/schemas/entitlement.spec.ts`,
  `update-matrix.spec.ts`), không lặp lại ở suite này.
- **Q4** Đã bỏ TC-ADMINENTITLEMENTS-026 và -027 (2026-10-10): mọi ô giờ đều sửa được nên không còn trạng thái "0 eligible";
  quyền cấp được API thật lưu nên không còn "chỉ sống trong trang".

Quyết định tự chốt khi chuẩn hóa (user vắng mặt, theo thứ tự thẩm quyền user > docs > code):

- **Q5** (tự quyết 2026-10-14, cần user duyệt): hành vi API có trong `docs/specs/access-control/design.md` §5/§9 và
  `CLAUDE.md` nhưng chưa có requirement (thứ tự `users`, admin được mọi app, 404 user/app lạ không ghi gì, idempotent,
  rate limit PATCH, không thông báo cho app không active) có phải requirement không? → Có: docs nói rõ và code khớp, ghi
  thành requirement → REQ-ADMINENTITLEMENTS-05, -06, -07, -08.
- **Q6** (tự quyết 2026-10-14, cần user duyệt): TC-ADMINENTITLEMENTS-033 đỏ trong lượt chạy đầy đủ vì tài khoản do spec khác
  tạo lọt vào kết quả tìm kiếm — giữ `user2@test.com` hay dùng dữ liệu riêng? → Dùng một tài khoản throwaway riêng của test
  (địa chỉ duy nhất theo lượt chạy) làm phía "role user khớp", giữ `admin@test.com` làm phía "admin bị lọc", và chờ response
  `/admin/users` của đúng từ khoá trước khi kiểm. Kỳ vọng không đổi → REQ-ADMINENTITLEMENTS-01.
- **Q7** (tự quyết 2026-10-14, cần user duyệt): kiểm rate limit của PATCH bằng body nào? → `{ "changes": [] }` (400): limiter
  chạy trước validation nên request vẫn bị đếm, mà không ghi override hay gửi thông báo nào → REQ-ADMINENTITLEMENTS-07.
- **Q8** (tự quyết 2026-10-14, cần user duyệt): TC-ADMINENTITLEMENTS-040 / -041 nằm trong
  `tests/e2e/apps/launcher-access.e2e.ts` (dùng chung tài khoản và phiên của `beforeAll` với các case launcher) — tách ra?
  → Không tách; chỉ đổi tên hai test cho trùng tiêu đề TC. TC mới về thông báo (TC-ADMINENTITLEMENTS-048) viết ở
  `tests/api/admin-entitlements/notifications.api.ts`, không nối thêm vào file của module apps → REQ-ADMINENTITLEMENTS-04, -08.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): `tests/e2e/admin-entitlements/admin-sso.e2e.ts` chứng minh TC-OIDC-052 (module
  oidc) — chuyển đi? → Để nguyên chỗ cũ trong lượt này: test case và đường dẫn `Automated` thuộc `test-cases/oidc.md`, do lượt
  chuẩn hóa module oidc quyết định → không REQ nào của module này.
- **Q10** (tự quyết 2026-10-14, cần user duyệt): TC-ADMINENTITLEMENTS-001, -003, -004 mỗi case có hai test gần trùng (một ở
  `picker.e2e.ts`, một ở `matrix.e2e.ts`) — giữ cả hai? → Gộp về một test mỗi TC trong `picker.e2e.ts`, giữ đủ mọi kỳ vọng của
  cả hai bản (bản của TC-001 "admin role can access the page" chỉ là tập con nên bỏ) → REQ-ADMINENTITLEMENTS-01.

## Tài khoản test

- Catalog (`GET /admin/apps`), tìm user (`GET /admin/users`, limit 6 khi focus / 20 khi có query) và quyền cấp đều là
  thật, không stub.
- Case chỉ đọc dùng `user2@test.com` đã seed (John Doe: `deny` Notes, `allow` Operations Console, từ `entitlements.ts`).
- Case có lưu thì lưu vào một tài khoản throwaway ("Matrix Tester", role `user`), override của nó được xoá sau mỗi test —
  một lần lưu sẽ gửi thông báo cho user đích, mà hộp thư của user seed lại là mốc của suite notifications.
- TC-ADMINENTITLEMENTS-033 dùng tài khoản throwaway riêng ("Role Filter Tester") để từ khoá tìm kiếm là duy nhất (Q6).
- Case API có lưu (TC-ADMINENTITLEMENTS-045, -046, -048) dùng tài khoản throwaway riêng mỗi test, override được xoá trong
  `afterEach`; hộp thư được đọc bằng phiên của chính tài khoản đó.
- Case rate limit (TC-ADMINENTITLEMENTS-047) dùng phiên `admin@test.com` với body không hợp lệ — không ghi gì, bộ đếm
  `rate-limit:entitlement-mutation:*` được xoá trước và sau.
- Với role `user`, role default cấp Blog, IDMS Portal, Team Calendar và Notes, và không cấp Analytics Dashboard và
  Operations Console.

## Dữ kiện server

- `GET` / `PATCH /admin/entitlements`: `authGuard` + `adminGuard`; `PATCH` qua limiter `entitlementMutationByIpAndUser`
  (60 request / 60 s, khoá theo IP + auth id, chạy **trước** `bodyPipe`).
- `userIds` 1–50, `changes` 1–200 (`ENTITLEMENT_LIMITS`); lỗi 404 `ENTITLEMENT_USER_NOT_FOUND` / `ENTITLEMENT_APP_NOT_FOUND`
  (namespace i18n `entitlement`).
- Thông báo chỉ cho cặp có quyền thực tế bị đảo **và** app `active`; gửi qua queue sau khi ghi, không chặn response.

## Ngoài phạm vi

- Hai admin cùng sửa một ô (last-write-wins, upsert theo cặp) — design §10 ghi nhận, không test tự động.
- Validation schema của body PATCH và phần còn lại của bảng quyết định §9 — thuộc unit test server
  (`validators/schemas/entitlement.spec.ts`, `update-matrix.spec.ts`).

## Tech debt liên quan

_(không có)_
