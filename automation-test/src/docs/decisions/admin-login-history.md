# ADMINLOGINHISTORY — quyết định

## Nguồn

Đọc ngày 2026-10-10.

- `client/src/views/AdminLoginHistory/**`
- `client/src/views/AdminLoginHistoryDetail/**`
- `client/src/dataSources/LoginHistory`
- `client/src/components/CustomTable` (link của dòng)
- `client/src/hooks/{useListQuery,useLoginAppOptions}.ts`
- `client/src/locales/{en,vi}/{loginHistory,list}.json`
- `server/src/modules/login-history/**`
- `server/src/validators/schemas/login-history.ts`

Đọc thêm ngày 2026-10-14 (chuẩn hóa + bổ sung phủ, không có user trong phiên):

- `README.md` `## Features` (Admin — login history), `docs/specs/admin-login-history-detail/design.md`,
  `docs/specs/login-history-app-source/design.md`, `docs/specs/login-history-ip-country/design.md`
- `server/src/modules/login-history/{login-history.routes.ts,login-history.controller.ts,constants,helpers,dtos,services}`,
  `repository/impl/mongo-login-history.repository.ts` (bộ lọc text dùng regex đã escape, không phân biệt hoa thường)
- `server/src/middlewares/pipes/validation.pipe.ts`, `server/src/i18n/{config.ts,locales/{en,vi}/{validation,loginHistory}.json}`
- `client/src/views/AdminLoginHistoryDetail/mains/AdminLoginHistoryDetailHeader`, `client/src/dataSources/AdminLoginHistoryDetail`
  (breadcrumb), `client/src/hooks/useLoginAppOptions.ts`, `client/src/components/{LoginAppLabel,CustomPagination}`

Chuyển từ `docs/specs/admin-login-history-detail/e2e.md` và các dòng admin của
`docs/specs/login-history-app-source/e2e.md`; bộ lọc của danh sách trước đây là lỗ hổng chưa phủ, nay là mới.

## Quyết định chốt

Không có quyết định qua hỏi đáp; các mục dưới suy ra từ header cũ, kỳ vọng còn lại lấy từ code và README tại
thời điểm viết.

- **Q1** Ai chặn người không phải admin? → Không có guard vai trò phía client cho `/admin/*`; cổng chặn
  là API (401 `AUTH_MISSING_TOKEN`, 403 `AUTH_ADMIN_ONLY`), nên tầng `api` chứng minh điều này
  (TC-ADMINLOGINHISTORY-034). → REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-02
- **Q2** Tổ hợp lọc và biên của query chứng minh ở tầng nào? → Tổ hợp kết quả lọc và validation ở tầng `api`
  (TC-ADMINLOGINHISTORY-031, -032, -035); tầng `e2e` chỉ kiểm URL ↔ request và cách hiển thị. → REQ-ADMINLOGINHISTORY-01
- **Q3** (tự quyết 2026-10-14, cần user duyệt): API admin nhận `sortBy` / `sortOrder` (chỉ thấy trong code, client không
  dùng) — là hành vi mong muốn hay thừa? → Mong muốn: là một phần hợp đồng API đã ship (schema admin mở rộng danh sách
  trường sắp xếp có chủ đích); ghi thành requirement. → REQ-ADMINLOGINHISTORY-03
- **Q4** (tự quyết 2026-10-14, cần user duyệt): bộ lọc text của API (`ip`, `country`, `city`, `os`, `browser`) khớp một
  phần, không phân biệt hoa thường, theo nghĩa đen (chỉ thấy trong code) — mong muốn hay bug? → Mong muốn: repository
  escape regex có chủ đích và docs không nói khác; ngày trần là trọn ngày được ghi rõ trong comment schema và helper. →
  REQ-ADMINLOGINHISTORY-05
- **Q5** (tự quyết 2026-10-14, cần user duyệt): lỗi validation của `method`, `deviceType`, `clientType`, `userId`,
  `fromDate`, `toDate`, khoảng ngày trả về key i18n thô vì `validation.json` thiếu key — chấp nhận hay bug? → Bug:
  `CLAUDE.md` của repo app nói message lỗi là key i18next **được dịch** theo request; các trường khác của cùng schema đều
  có bản dịch. Ghi BUG-ADMINLOGINHISTORY-02, test đánh `test.fail()` (đã sửa 2026-10-15, fix/open-bugs). → REQ-ADMINLOGINHISTORY-04
- **Q6** (tự quyết 2026-10-14, cần user duyệt): toán tử truy vấn trong query (`status[$ne]=…`) phải bị từ chối ra sao? →
  400 `VALIDATION_ERROR` (Joi từ chối giá trị không phải chuỗi); không bao giờ 200 hay 5xx. → REQ-ADMINLOGINHISTORY-04
- **Q7** (tự quyết 2026-10-14, cần user duyệt): bộ lọc `userId`, `ip`, `country`, `city`, `os`, `browser`, `clientType`,
  `interactive` chỉ có ở API (panel không có) — kiểm ở tầng nào? → Chỉ tầng `api`; panel UI không có chúng nên không
  có case e2e. → REQ-ADMINLOGINHISTORY-05
- **Q8** (tự quyết 2026-10-14, cần user duyệt): skeleton của trang chi tiết chỉ nhận ra được qua class `.animate-pulse`
  (Tailwind) — giữ locator đó? → Giữ nguyên trong page object (markup không có role / label / test id nào tốt hơn); đổi
  khi client thêm `aria-busy` hoặc `data-testid`. → REQ-ADMINLOGINHISTORY-02

## Tài khoản test

- Lần đăng nhập của chính session admin (project `setup`) bảo đảm có ít nhất một dòng.
- Case cần các dòng biết trước sẽ đăng nhập một tài khoản dùng một lần qua API (một lần thành công, một lần
  sai mật khẩu) rồi lọc theo tài khoản đó.
- Case cần một hình dạng bản ghi cụ thể (bất thường, country sentinel, SSO im lặng, kết quả rỗng, lỗi) sẽ
  stub response danh sách hoặc chi tiết bằng `page.route`.
- Các case trình duyệt không ghi gì vào database.
- Case API về ngữ nghĩa bộ lọc (TC-ADMINLOGINHISTORY-039, -040, -048) mỗi case tạo một tài khoản dùng một lần với
  một lần đăng nhập đúng và một lần sai, rồi lọc theo `userId` (auth id) của nó để biết trước kết quả.

## Dữ kiện server

- Kích thước trang 20 (hằng số phía client); `limit` 1…100; `page` ≥ 1; `status` ∈ {success, failed};
  `method` ∈ {password, otp, magic-link, forgot-password, sso}; `deviceType` ∈ {DESKTOP, MOBILE, TABLET,
  UNKNOWN}; `source` ∈ {idp, oauth}; `userId` / `webAppId` 24-hex; `fromDate` ≤ `toDate` (ISO; một ngày trần
  nghĩa là trọn ngày đó); bộ lọc dạng text ≤ 200 ký tự.
- Các dòng xếp mới nhất trước.
- **`userId` của một dòng là auth id của tài khoản (`auths._id`, ref của model), không phải `users._id` mà
  `/admin/users` trả về.**
- Lần đăng nhập được ghi bất đồng bộ, một lúc sau khi login trả lời.
- Id chi tiết sai định dạng trả 400 `VALIDATION_ERROR`, id không tồn tại trả 404. Client ánh xạ cả hai thành
  "Login history record not found." và mọi lỗi khác thành "Could not load this login record. Please try
  again.".
- Mỗi dòng của danh sách là một link tên "View details for {username}" (vi "Xem chi tiết cho {username}").

## Ngoài phạm vi

- Ô tìm kiếm và nút Export: key `loginHistory.toolbar.*` có trong locale nhưng trang admin render
  `showSearch={false}` và không có Export — chưa build.
- Consent screen, introspect / revoke, refresh-token grant (`docs/unfinished-features.md`, phần OIDC) — dòng `sso` của
  lịch sử chỉ được kiểm qua stub ở đây; luồng OIDC thuộc module `oidc`.
- Khách / user thường mở `/admin/login-history` trên trình duyệt: đã phủ ở module `authz` (TC-AUTHZ guest redirect và
  admin-routes-denied), không lặp ở đây; tầng API phủ bởi TC-ADMINLOGINHISTORY-034.

## Tech debt liên quan

_(không có)_
