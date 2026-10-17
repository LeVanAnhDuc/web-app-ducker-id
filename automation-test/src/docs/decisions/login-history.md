# LOGINHISTORY — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/LoginHistory/**`
- `client/src/dataSources/LoginHistory/index.tsx`
- `client/src/components/LoginAppLabel`
- `client/src/locales/{en,vi}/loginHistory.json`
- `server/src/modules/login-history/**` (`dtos/my-history-item.dto.ts`)
- `server/src/modules/oauth/services/authorize.ts`
- `server/src/validators/schemas/login-history.ts`

Đọc thêm ngày 2026-10-14 (chuẩn hóa + bổ sung phủ, không có user trong phiên):

- `README.md` `## Features` (Login history), `docs/specs/login-history-ip-country/design.md` (che IP, nhãn LOCAL /
  UNKNOWN), `docs/specs/login-history-app-source/design.md`
- `server/src/modules/login-history/{login-history.routes.ts,constants,helpers (maskIp, normalizeIp, buildLoginHistoryFilter),services/get-my-login-history.ts}`,
  `server/src/validators/schemas/login-history.ts`, `server/src/middlewares/pipes/validation.pipe.ts`,
  `server/src/i18n/locales/{en,vi}/{validation,loginHistory}.json`, `server/src/app.ts` (`trust proxy`)
- `client/src/views/LoginHistory/**`, `client/src/dataSources/LoginHistory/index.tsx`, `client/src/hooks/useLoginAppOptions.ts`,
  `client/src/components/PageContainer/{PageToolbar,PageFilterPanel,PageDateRangeFilter,PageEmptyState}`,
  `client/src/utils/index.ts` (`formatLoginLocation`)

Chuyển đổi từ `docs/specs/login-history-app-source/e2e.md` và các dòng phía user của
`docs/specs/login-history-ip-country/e2e.md` (các dòng admin thuộc ADMLOGHIST, nay là module `admin-login-history`).

## Quyết định chốt

- **Q1** Hiển thị, bộ lọc và i18n được kiểm bằng cách stub endpoint danh sách; dòng SSO thật chỉ dùng cho các case cần
  chứng minh việc ghi lịch sử (TC-LOGINHISTORY-010, -011, -027). → REQ-LOGINHISTORY-01…03.
- **Q2** Số lượng chính xác và lần thử thất bại được kiểm trên tài khoản dùng một lần, không trên user seed.
  → REQ-LOGINHISTORY-01, REQ-LOGINHISTORY-03, REQ-LOGINHISTORY-04.
- **Q3** (tự quyết 2026-10-14, cần user duyệt): API của user nhận `sortBy` / `sortOrder`, `clientType` và các bộ lọc
  text `country` / `city` / `os` / `browser` mà trang không dùng (chỉ thấy trong code) — mong muốn hay thừa? → Mong
  muốn: là hợp đồng API đã ship, schema khai rõ từng trường và danh sách sắp xếp riêng cho user; kiểm ở tầng `api`,
  không có case e2e. → REQ-LOGINHISTORY-06
- **Q4** (tự quyết 2026-10-14, cần user duyệt): lỗi validation của `method`, `deviceType`, `clientType`, `fromDate`,
  `toDate` và khoảng ngày trả về key i18n thô vì `validation.json` thiếu key (cùng gốc với BUG-ADMINLOGINHISTORY-02) —
  chấp nhận hay bug? → Bug: `CLAUDE.md` của repo app nói message lỗi là key i18next **được dịch** theo request, và các
  trường khác của cùng schema đều có bản dịch. Ghi BUG-LOGINHISTORY-02, test đánh `test.fail()` (sau gộp vào BUG-ADMINLOGINHISTORY-02 (đã sửa 2026-10-15, fix/open-bugs)). →
  REQ-LOGINHISTORY-07
- **Q5** (tự quyết 2026-10-14, cần user duyệt): che IP công khai chỉ được mô tả trong
  `docs/specs/login-history-ip-country/design.md`, không có trong README — có là requirement không? → Có: design.md là
  nguồn tài liệu đã chốt cho feature (docs > code); README chỉ nói "IP". Môi trường e2e chạy local nên dòng thật chỉ có
  IP private; case API đăng nhập kèm `X-Forwarded-For` công khai và khẳng định không bao giờ thấy IP đầy đủ (nếu server
  không tin header, dòng là IP private, vẫn hợp lệ). Hiển thị nhãn được kiểm qua stub. → REQ-LOGINHISTORY-05
- **Q6** (tự quyết 2026-10-14, cần user duyệt): toán tử truy vấn trong query (`status[$ne]=…`) phải bị từ chối ra sao?
  → 400 `VALIDATION_ERROR` (Joi từ chối giá trị không phải chuỗi), như Q6 của admin-login-history. → REQ-LOGINHISTORY-07
- **Q7** (tự quyết 2026-10-14, cần user duyệt): bộ lọc App của trang lấy danh sách ứng dụng từ đâu? → Từ catalogue của
  chính user (`GET /apps`, `useLoginAppOptions`) cộng "Ducker ID"; test đọc catalogue qua API thay vì gọi tên app seed.
  → REQ-LOGINHISTORY-03
- **Q8** (tự quyết 2026-10-14, cần user duyệt): caption của bảng trên trang của user là "Admin login audit history"
  (dùng chung key `table.caption` với trang admin) — có ghi bug không? → Không ghi: docs không nói gì về caption, chỉ là
  text cho trình đọc màn hình; ghi ở Tech debt để user quyết. → (không REQ)

## Tài khoản test

- Case stub và case SSO thật dùng user seed (`user@test.com`).
- Dòng SSO thật sinh ra bằng các vòng authorize vào OAuth client do spec đăng ký (`utils/oidc-state.ts`); xoá client trong
  `afterAll` cũng xoá các dòng lịch sử và recent-app mà chúng sinh ra.
- Số lượng chính xác và lần thử thất bại dùng tài khoản dùng một lần (TC-LOGINHISTORY-021, -023, -025, -027, -029,
  -035, -038). Lần thử sai mật khẩu gửi từ một client không cookie (`newApi()`), không bao giờ trên user seed.
- Sắp xếp (TC-LOGINHISTORY-034) chỉ đọc lịch sử của user seed.

## Dữ kiện server

- Bộ lọc `status` (success / failed), `method` (password / otp / magic-link / forgot-password / sso), `deviceType`,
  `source` (idp / oauth), `webAppId`, `interactive`, `fromDate` / `toDate` (ISO; mốc chỉ có ngày phủ cả ngày đó;
  `toDate < fromDate` → 400).
- Phân trang `page` ≥ 1, `limit` 1…100.
- Key không biết (vd `userId`) bị loại bỏ ở endpoint của user.
- Client ánh xạ bộ lọc "app" thành `source=idp` hoặc `webAppId=<id>` và bỏ các giá trị lọc không thuộc lựa chọn của nó.
- IP loopback được chuẩn hoá thành `127.0.0.1`; vị trí `LOCAL` / `UNKNOWN` được hiển thị thành nhãn.
- `maskIp` (DTO của user): IP private / loopback giữ nguyên; IPv4 công khai → `a.b.*.*`; IPv6 công khai → ba nhóm đầu
  - `:*:*:*:*:*`. `TRUST_PROXY=loopback` mặc định: request đi qua rewrite của Next trên loopback nên `X-Forwarded-For`
    có thể được tin.
- Sắp xếp của user: `sortBy` ∈ {createdAt, method, status, country}; `ip` / `usernameAttempted` chỉ có ở admin → 400.
- Kích thước trang 20 (hằng số client); pager chỉ hiện khi `totalPages > 1`.
- Bộ lọc text dùng regex đã escape, không phân biệt hoa thường; Joi `trim()` trước khi lọc.

## Ngoài phạm vi

- Lịch sử đăng nhập phía admin (`/admin/login-history`) — thuộc module `admin-login-history`; ở đây chỉ kiểm user bị
  từ chối (TC-LOGINHISTORY-026).
- `GET /login-history/stats` — số liệu của Home, thuộc module `home`; ở đây chỉ kiểm guard (TC-LOGINHISTORY-026).
- Ô tìm kiếm và nút Export (`loginHistory.toolbar.*`): key có trong locale nhưng trang render `showSearch={false}` và
  không có Export — chưa build.
- Access token sau khi đăng xuất: thuộc module `auth` (vòng đời phiên), không lặp ở đây.

## Tech debt liên quan

- Bảng trên trang của user mang caption "Admin login audit history" (`loginHistory.table.caption`, dùng chung với
  admin) — Q8.
- `server/src/i18n/locales/{en,vi}/validation.json` từng thiếu các key `method` / `deviceType` / `clientType` / `fromDate` /
  `toDate` / `dateRange` — BUG-LOGINHISTORY-02 (gộp vào BUG-ADMINLOGINHISTORY-02) (đã sửa 2026-10-15, fix/open-bugs).

- BUG-LOGINHISTORY-01 (`../../defects/login-history.md`): `buildLoginHistoryColumns` không có cột lý do, OS hay cờ bất
  thường, và `MyHistoryItemDto` bỏ mất `isAnomaly` (chỉ DTO của admin có) — TC-LOGINHISTORY-017, -022 (đã sửa 2026-10-15, fix/open-bugs).
