# SUPPORT — Bug log

## Đang mở

| Bug                               | Mức        | TC             | Tóm tắt                                                                                                          |
| --------------------------------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| [BUG-SUPPORT-01](#bug-support-01) | Thấp       | TC-SUPPORT-036 | Support dialog: tiêu đề không hợp lệ chặn submit trong im lặng — không có thông báo, `aria-invalid` vẫn là false |
| [BUG-SUPPORT-02](#bug-support-02) | Trung bình | TC-SUPPORT-049 | Server làm sạch tiêu đề / nội dung chỉ để kiểm độ dài rồi lưu bản thô kèm thẻ HTML                               |
| [BUG-SUPPORT-03](#bug-support-03) | Thấp       | TC-SUPPORT-055 | Support dialog: email không hợp lệ chặn submit trong im lặng — không có thông báo                                |
| [BUG-SUPPORT-04](#bug-support-04) | Trung bình | TC-SUPPORT-056 | Support dialog: double-click "Send request" gửi hai POST — tạo hai yêu cầu trùng                                 |

### BUG-SUPPORT-01

- **TC:** TC-SUPPORT-036 · **Requirement:** REQ-SUPPORT-01
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-019
- **Bước tái hiện:** chạy test của TC-SUPPORT-036 — `tests/e2e/support/support-dialog.e2e.ts` (describe "Subject length errors are shown")
- **Mong đợi:** hiện lỗi của field
- **Thực tế:** Support dialog: tiêu đề không hợp lệ chặn submit trong im lặng — không có thông báo, `aria-invalid` vẫn là false

### BUG-SUPPORT-02

- **TC:** TC-SUPPORT-049 · **Requirement:** REQ-SUPPORT-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** `POST /contact/submit` với tiêu đề / nội dung chứa `<img src="x" onerror="alert(1)">`, rồi đọc
  document trong `contacts`.
- **Mong đợi:** nội dung lưu xuống đã bỏ thẻ HTML (quyết định Q3).
- **Thực tế:** `server/src/modules/contact-admin/services/submit-contact.ts` tính `sanitizedSubject` /
  `sanitizedMessage` chỉ để gọi `validateStringLength`, rồi `contactRepo.create({ subject, message })` với giá trị thô —
  thẻ HTML nằm nguyên trong DB, trong response và trong mọi màn hình / email đọc lại nó.

### BUG-SUPPORT-03

- **TC:** TC-SUPPORT-055 · **Requirement:** REQ-SUPPORT-06
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** guest mở support dialog, sửa email thành `not-an-email`, điền tiêu đề và nội dung hợp lệ, bấm "Send
  request".
- **Mong đợi:** không gửi gì và hiện "Invalid email format" dưới field email.
- **Thực tế:** submit bị chặn trong im lặng. `EmailField` dựng input bằng `useFieldProps` và không bọc `FormField`, nên
  `FormFieldMessage` không đọc được lỗi của field (cùng gốc với BUG-SUPPORT-01).

### BUG-SUPPORT-04

- **TC:** TC-SUPPORT-056 · **Requirement:** REQ-SUPPORT-06
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (chạy thật)
- **Bước tái hiện:** chạy test của TC-SUPPORT-056 — `tests/e2e/support/support-dialog.e2e.ts` ("Double-clicking Send
  request files one request"): guest điền form hợp lệ, double-click "Send request" trong khi POST còn đang chờ.
- **Mong đợi:** đúng một `POST /contact/submit` (design `my-contacts` dòng 11; quyết định Q7).
- **Thực tế:** trình duyệt gửi **hai** `POST /contact/submit` (trace xác nhận cả hai là POST thật). `SupportForm` chỉ
  disable nút qua `isPending` của `useMutation`, nhưng `methods.handleSubmit` validate zod bất đồng bộ nên cú bấm thứ hai
  lọt vào trước khi `isPending` kịp render; không có chốt nào khác (không kiểm `formState.isSubmitting`, không bỏ qua khi
  đang pending). Hậu quả: hai ticket trùng, và tốn 2 trong 5 lượt rate limit mỗi 15 phút.

## Đã sửa

_(chưa có)_
