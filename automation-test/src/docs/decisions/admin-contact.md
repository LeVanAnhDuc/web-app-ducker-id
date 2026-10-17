# ADMINCONTACT — quyết định

## Nguồn

Đọc ngày 2026-10-10; đọc lại 2026-10-14 (lượt chuẩn hóa `/write-tests admin-contact`).

- `client/src/views/AdminContact/**`
- `client/src/views/AdminContactDetail/**`
- `client/src/dataSources/{ContactAdmin,AdminContactDetail}`
- `client/src/components/ShortId`
- `client/src/hooks/useListQuery.ts`
- `client/src/locales/{en,vi}/{contactAdmin,list}.json`
- `server/src/modules/contact-admin/**`
- `server/src/validators/schemas/contact-admin.ts`
- 2026-10-14: `README.md` (`## Features` → Admin — login history and support inbox), `docs/project-goals.md`
  (Quản trị, Admin role), `docs/unfinished-features.md`, `client/src/views/AdminContactDetail/{hooks,mains}/**`,
  `client/src/dataSources/ContactAdmin` (cột Email "—"), `server/src/modules/contact-admin/{services,dtos,helpers,
repository,constants}/**`, `server/src/middlewares/pipes/validation.pipe.ts`, `server/src/i18n/locales/{en,vi}/contactAdmin.json`,
  `server/src/common/pagination`

Chuyển từ các dòng admin của `docs/specs/contact-ticket-id-display/e2e.md` và phần delta
`contact-detail-fullid-cleanup` của nó (`docs/specs/contact-detail-fullid-cleanup/`). Tìm kiếm và bộ lọc của
danh sách, trang chi tiết, luồng trạng thái và hợp đồng API trước đây là lỗ hổng chưa phủ, nay là mới.

## Quyết định chốt

Không có quyết định qua hỏi đáp; các mục dưới suy ra từ header cũ và test case, kỳ vọng còn lại lấy từ code và
README tại thời điểm viết.

- **Q1** Server có chặn chuyển trạng thái sai thứ tự không? → Không: `PATCH /admin/contacts/:id/status` nhận
  bất kỳ trạng thái nào trong ba từ bất kỳ trạng thái nào. TC-ADMINCONTACT-028 ghi lại hành vi hiện tại (mở
  lại, nhảy cóc đều được chấp nhận) để một guard sau này là thay đổi có chủ đích. → REQ-ADMINCONTACT-03
- **Q2** Ai chặn người không phải admin? → API (401 `AUTH_MISSING_TOKEN`, 403 `AUTH_ADMIN_ONLY`), chứng minh ở
  tầng `api` (TC-ADMINCONTACT-034). → REQ-ADMINCONTACT-01…03
- **Q3** (tự quyết 2026-10-14, cần user duyệt): controller trả `message` bằng các key `contactAdmin:success.getContactList`
  / `getContactDetail` / `updateContactStatus`, và Joi dùng `contactAdmin:errors.invalidId` / `statusInvalid` /
  `statusRequired` — không key nào có trong `server/src/i18n/locales/{en,vi}/contactAdmin.json`, nên phản hồi mang
  nguyên key. `CLAUDE.md` của app: "error and success text is an i18next key translated per request" → theo tài liệu:
  thông điệp phải được dịch; code lệch → BUG-ADMINCONTACT-02 (TC-ADMINCONTACT-035) (đã sửa 2026-10-15, fix/open-bugs) → REQ-ADMINCONTACT-04 (mới).
- **Q4** (tự quyết 2026-10-14, cần user duyệt): `docs/project-goals.md` ghi luồng `new → in-progress → resolved`, README
  và code dùng `processing` → theo README (tài liệu mới hơn, khớp hợp đồng API): giá trị là `processing`, nhãn
  "Processing" → REQ-ADMINCONTACT-03.
- **Q5** (tự quyết 2026-10-14, cần user duyệt): yêu cầu gửi không kèm email hiện "—" ở cột Email và trang chi tiết bỏ hẳn
  trường Email (chỉ thấy trong code: `dataSources/ContactAdmin`, `ContactDetailCard`) → coi là hành vi mong muốn (cùng
  quy ước "—" của client cho giá trị trống) → REQ-ADMINCONTACT-01/02 (TC-ADMINCONTACT-038).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): select trạng thái bị khoá khi một lần đổi đang chạy (`disabled={isPending}`,
  chỉ thấy trong code) → coi là hành vi mong muốn (chặn double submit, lăng kính đoán lỗi) → REQ-ADMINCONTACT-03
  (TC-ADMINCONTACT-040).
- **Q7** (tự quyết 2026-10-14, cần user duyệt): danh sách sort được theo `createdAt` / `priority` / `status` + `sortOrder`
  (Joi `adminListContactsQuerySchema`; design `my-contacts` §3 "pagination/sort như getContactList" coi đó là chuẩn của
  danh sách admin). UI không có cột sort được nên chỉ kiểm ở API (TC-ADMINCONTACT-037); `priority` sort theo chuỗi
  (`high < low < medium`) nên không kiểm thứ tự của nó, chỉ kiểm validation (TC-ADMINCONTACT-032) → REQ-ADMINCONTACT-01.
- **Q8** (tự quyết 2026-10-14, cần user duyệt): phân trang chỉ kiểm ở API (biên trang cuối / quá trang cuối,
  TC-ADMINCONTACT-036); phân trang UI cần hơn 20 yêu cầu do chính test gửi, đã có ở module dùng chung `CustomPagination`
  (`admin-login-history`) → REQ-ADMINCONTACT-01.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): `search` và `email` được Joi `.trim()` trước khi so khớp (chỉ thấy trong
  code) → coi là hành vi mong muốn (ô tìm kiếm không phân biệt khoảng trắng thừa) → REQ-ADMINCONTACT-01
  (TC-ADMINCONTACT-041).
- **Q10** (tự quyết 2026-10-14, cần user duyệt): tên test cũ lệch tiêu đề TC → đổi tên test theo tiêu đề TC; TC có nhiều
  test (011, 014, 023, 024, 032, 033, 034) gom vào `test.describe("<tiêu đề TC>")`, giữ tên con mô tả. TC-ADMINCONTACT-021
  có một test e2e và một test api cùng tên tiêu đề TC. Không đổi kỳ vọng nào.
- **Q11** (tự quyết 2026-10-14, cần user duyệt): truy cập của user thường vào `/admin/contact` (403, trang trống) đã được
  module `authz` chứng minh (TC-AUTHZ-001, 008) → không lặp ở đây; module này giữ guest → `/login` (TC-ADMINCONTACT-018)
  và ma trận guest/user × endpoint của riêng hộp thư (TC-ADMINCONTACT-034).

## Tài khoản test

- Không test nào đọc hay sửa yêu cầu do người khác gửi.
- Mỗi test tự gửi yêu cầu của mình qua `POST /contact/submit` công khai (dưới vai guest, hoặc dưới
  `user@test.com` khi người gửi là quan trọng) với subject bắt đầu bằng `ADMINCONTACT_SUBJECT_PREFIX`
  ("E2E support ticket", `data/test-data.ts`), chỉ làm việc trên yêu cầu đó, và `afterAll` xoá mọi yêu cầu mang
  tiền tố này (`deleteAdminContactRequests()` trong `utils/contacts.ts`). Tiền tố khác của SUPPORT ("E2E support
  request") nên hai module không xoá dòng của nhau.
- Các case hiển thị id stub danh sách và chi tiết bằng `page.route`.

## Dữ kiện server

- Kích thước trang 20; `limit` 1…100; `page` ≥ 1; `status` ∈ {new, processing, resolved}; `priority` ∈
  {low, medium, high} (yêu cầu mới là `medium`); `search` (≤ 200 ký tự) khớp subject hoặc email, không phân
  biệt hoa thường và đã escape regex; `email` khớp một phần, không phân biệt hoa thường; `fromDate` ≤ `toDate`;
  `sortBy` ∈ {createdAt, priority, status}.
- Mới nhất trước. Yêu cầu mới bắt đầu ở `new`.
- `PATCH /admin/contacts/:id/status` nhận bất kỳ trạng thái nào trong ba từ bất kỳ trạng thái nào — **không có
  guard chuyển trạng thái**, nên mở lại một yêu cầu đã resolved hay bỏ qua `processing` đều được chấp nhận; mọi
  giá trị khác là 400 `VALIDATION_ERROR` và giữ nguyên trạng thái.
- Id sai định dạng → 400, id không tồn tại → 404 `CONTACT_NOT_FOUND`.
- Bộ xử lý lỗi toàn cục của client hiện toast thông điệp của server ("Contact request not found",
  "Validation failed") và thẻ chi tiết không render gì.

## Ngoài phạm vi

- Form hỗ trợ công khai thuộc module support, không thuộc module này.
- Xoá / sửa nội dung yêu cầu, gán người xử lý, đổi `priority` ("admin CRUD" trong `docs/project-goals.md`): chưa có
  endpoint hay UI.
- Đính kèm: thẻ "No attachments" luôn hiện vì server không lưu file; tải lên thuộc module support.

## Tech debt liên quan

- Luồng `new → processing → resolved` của REQ-ADMINCONTACT-03 không được server hay UI ép buộc (xem Q1).
- Trường "IP Address" ở thẻ chi tiết từng luôn trống: không có `ipAddress` nào được lưu hay trả về (xem
  BUG-ADMINCONTACT-01) (đã sửa 2026-10-15, fix/open-bugs).
- Thông điệp của `/admin/contacts*` từng là key catalogue chưa khai (xem Q3, BUG-ADMINCONTACT-02) (đã sửa 2026-10-15, fix/open-bugs).
- Nhãn filter của `ListFilterPanel` không gắn `htmlFor` với control nên `getByLabel` không dùng được (ghi chú a11y
  trong `tests/e2e/admin-contact/display.e2e.ts`).
