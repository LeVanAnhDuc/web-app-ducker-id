# SUPPORT — quyết định

## Nguồn

Đọc ngày 2026-10-10; đọc lại 2026-10-14 (lượt chuẩn hóa `/write-tests support`).

- `client/src/components/SupportDialog/**`
- `client/src/components/UserMenu`
- `client/src/views/Logins/LoginAlternative/mains/LoginOptionContactAdmin`
- `client/src/views/{MyContacts,MyContactDetail}/**`
- `client/src/components/ShortId`
- `client/src/locales/{en,vi}/{support,contactAdmin,common}.json`
- `server/src/modules/contact-admin/**`
- `server/src/validators/schemas/contact-admin.ts`
- 2026-10-14: `README.md` (`## Features` → Support requests), `docs/specs/my-contacts/design.md`,
  `docs/specs/contact-ticket-id-display/design.md`, `client/src/components/SupportDialog/**` (EmailField, SubjectField,
  MessageField, useSupportSubmit), `client/src/forms/Support/**`, `client/src/hooks/useFieldProps.ts`,
  `client/src/components/UserMenu/mains/UtilityMenuItems`, `server/src/modules/contact-admin/services/**`,
  `server/src/modules/contact-admin/{helpers,constants,dtos}/**`, `server/src/common/pagination`,
  `server/src/models/contact.ts`, `server/src/i18n/locales/en/contactAdmin.json`

Chuyển đổi từ `docs/specs/my-contacts/e2e.md` (dòng 1–12 của ma trận) và phía user của
`docs/specs/contact-ticket-id-display/e2e.md` (dòng 11 bị hoãn của nó — mã ticket trên màn hình thành công — nay là
TC-SUPPORT-030).

## Quyết định chốt

_(chưa có quyết định qua hỏi đáp — kỳ vọng lấy từ code và README tại thời điểm viết)_

Các phân định rút ra từ header cũ của file test case:

- **Q1** Phạm vi module: gửi yêu cầu hỗ trợ từ support dialog (guest và đã đăng nhập), danh sách của chính user ở
  `/contacts/me` kèm ticket id và trạng thái, và trang chi tiết chỉ đọc (REQ-SUPPORT-01…03).
- **Q2** Dòng 11 bị hoãn của `docs/specs/contact-ticket-id-display/e2e.md` (mã ticket trên màn hình thành công) được
  chứng minh bởi TC-SUPPORT-030.
- **Q3** (tự quyết 2026-10-14, cần user duyệt): server tính `sanitizeText(subject/message)` (bỏ thẻ HTML, trim) chỉ để
  kiểm độ dài rồi lưu **giá trị thô** (`submit-contact.ts`). Design `my-contacts` ghi "giữ sanitize + validate hiện có";
  không rõ ý là lưu bản đã làm sạch hay chỉ kiểm độ dài → theo tài liệu: nội dung lưu xuống phải đã bỏ thẻ HTML; code hiện
  tại lệch → BUG-SUPPORT-02 (TC-SUPPORT-049) (đã sửa 2026-10-15, fix/open-bugs) → REQ-SUPPORT-04.
- **Q4** (tự quyết 2026-10-14, cần user duyệt): độ dài tối thiểu tính sau khi bỏ thẻ và khoảng trắng (code làm vậy, dữ kiện
  server trong file này cũng ghi "sau khi sanitise") — coi là hành vi mong muốn → REQ-SUPPORT-04 (TC-SUPPORT-048).
- **Q5** (tự quyết 2026-10-14, cần user duyệt): body gửi kèm `status` / `priority` / `userId` bị Joi `stripUnknown` bỏ;
  yêu cầu mới luôn `new` + `medium`, chủ sở hữu lấy từ token (comment trong code: "MUST come from RequestContext, never
  from client body") — coi là hành vi mong muốn → REQ-SUPPORT-04 (TC-SUPPORT-050).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): `EmailField` dựng input giống `SubjectField` (`useFieldProps`, không bọc
  `FormField`) nên lỗi zod của email cũng không bao giờ hiện. Docs (design `my-contacts`, matrix dòng 4) muốn lỗi field
  hiện ra → kỳ vọng hiện "Invalid email format"; code lệch → BUG-SUPPORT-03 (TC-SUPPORT-055) (đã sửa 2026-10-15, fix/open-bugs) → REQ-SUPPORT-06.
- **Q7** (tự quyết 2026-10-14, cần user duyệt): double-submit trong dialog phải chỉ tạo một request (design `my-contacts`
  dòng 11, `contact-ticket-id-display` dòng 11 "nút disable khi isPending"). Đọc code không chắc nút kịp disable trước cú
  bấm thứ hai (validate zod chạy async) → viết kỳ vọng đúng, không đánh dấu bug; lượt chạy sẽ phân loại → REQ-SUPPORT-06
  (TC-SUPPORT-056). Chạy thật 2026-10-14: double-click gửi hai POST → BUG-SUPPORT-04 (đã sửa 2026-10-15, fix/open-bugs).
- **Q8** (tự quyết 2026-10-14, cần user duyệt): user menu có mục "Support" cho cả guest (`UtilityMenuItems`); guest mở từ
  đây thấy email trống, sửa được, không bắt buộc (`labelEmailHint`) — README "support dialog anywhere in the app — as a
  signed-in user or as a guest" → REQ-SUPPORT-06 (TC-SUPPORT-054).
- **Q9** (tự quyết 2026-10-14, cần user duyệt): danh sách mặc định mới nhất trước, sort được theo `createdAt` / `priority` /
  `status` (design `my-contacts` §3 "pagination/sort như getContactList", dòng 6 "sort theo createdAt toggle"). UI không có
  cột sort được nên chỉ kiểm ở API → REQ-SUPPORT-02 (TC-SUPPORT-051).
- **Q10** (tự quyết 2026-10-14, cần user duyệt): tách ba REQ mới từ hành vi đã ship mà REQ-01…03 chưa nói rõ (luật input
  phía server, rate limit + xử lý lỗi gửi, hành vi dialog); các TC cũ liên quan được gắn thêm REQ mới, không đổi kỳ vọng.
- **Q11** (tự quyết 2026-10-14, cần user duyệt): tên test cũ lệch tiêu đề TC → đổi tên test theo tiêu đề TC; TC nhiều test
  thì bọc `test.describe("<tiêu đề TC>")`. Riêng TC-SUPPORT-034 (chỉ kiểm 429) đổi tên test từ "a failed or rate-limited…"
  về đúng tiêu đề TC; trường hợp lỗi 5xx tách thành TC-SUPPORT-057.

## Tài khoản test

- Case danh sách và chi tiết đọc ba yêu cầu mẫu mà seeder gắn vào `user@test.com` (mỗi trạng thái một cái).
- Mọi yêu cầu một spec gửi đều có tiêu đề bắt đầu bằng `E2E support request` (`SUPPORT_SUBJECT_PREFIX`, hoặc bản cũ hơn
  `E2E MyContacts submit` của các lượt trước) và bị xoá trong `afterAll` (`utils/contacts.ts` → `deleteSupportRequests`);
  yêu cầu guest không nằm trong phạm vi dọn dẹp tài khoản throwaway. Body quá ngắn để mang prefix → xoá theo id
  (`deleteContactsById`).
- Các lần submit khi đã đăng nhập, trừ một case danh sách cũ, dùng tài khoản throwaway đăng nhập trên trình duyệt.

## Dữ kiện server

`POST /contact/submit` là public (`optionalAuthGuard`: token hợp lệ thì gắn `userId`, token hỏng thì bị từ chối), bị rate
limit 5 lần mỗi IP mỗi 15 phút; subject 5…200 và message 20…5000 ký tự sau khi sanitise; email không bắt buộc.
`GET /contacts` và `/contacts/:id` giới hạn theo chủ sở hữu — yêu cầu của user khác hoặc của guest trả 404, không bao giờ 403. Client: zod phản chiếu các luật độ dài; email của user đã đăng nhập là chỉ đọc, của guest thì được điền sẵn từ màn
hình login; màn hình thành công hiện id dạng ShortId (`first 6 hex + "..."`).

## Ngoài phạm vi

- User sửa / xoá / đổi trạng thái yêu cầu của mình, reply/threading, đính kèm — design `my-contacts` §1 "Ngoài scope".
- Gộp yêu cầu guest cũ theo email vào tài khoản — design `my-contacts` §1.
- Không có mục điều hướng nào tới `/contacts/me` (chỉ breadcrumb của trang chi tiết) — README không hứa, không test.
- Phân trang nhiều trang trên UI (cần > 20 yêu cầu của chính user) — biên trang đã phủ ở API (TC-SUPPORT-044).

## Tech debt liên quan

- `SubjectField` và `EmailField` từng không phải `FormField`, nên lỗi zod của chúng không được render (TC-SUPPORT-036,
  BUG-SUPPORT-01; TC-SUPPORT-055, BUG-SUPPORT-03) (đã sửa 2026-10-15, fix/open-bugs). Cũng vì `useFieldProps` đặt `id = name`, `<label>` của Subject và
  Email không gắn với input — page object tìm field theo `name`.
