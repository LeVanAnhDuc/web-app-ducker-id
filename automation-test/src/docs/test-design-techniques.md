# Kỹ thuật thiết kế test

Test case được suy ra như thế nào. Hai lớp, cả hai bắt buộc với feature có hành vi người dùng quan sát được:

| Lớp         | Trả lời                                           | Công cụ                 |
| ----------- | ------------------------------------------------- | ----------------------- |
| **Độ rộng** | Case của một feature phải đi qua những vùng nào?  | rubric 12 dòng dưới đây |
| **Độ sâu**  | Trong mỗi vùng, những case và giá trị cụ thể nào? | năm kỹ thuật dưới đây   |

Cùng các quy tắc này điều khiển skill `e2e-scenario-coverage` dùng khi làm feature và skill `/write-tests <module>`
của suite; trang này là bản tham chiếu cho tester. Thứ tự áp dụng (6 lăng kính) nằm ở `CLAUDE.md`.

## 1. Rubric độ phủ (độ rộng)

Đi qua từng dòng cho feature. Mỗi dòng hoặc được ít nhất một test case phủ, hoặc ghi N/A kèm một dòng lý do ở đầu file
`src/test-cases/<module>.md` của module — không bao giờ bỏ trống.

| #   | Vùng              | Phủ gì                                                                       |
| --- | ----------------- | ---------------------------------------------------------------------------- |
| 1   | Happy path        | Thành công chính theo từng vai trò / biến thể                                |
| 2   | AuthN             | Chưa đăng nhập → chuyển về trang đăng nhập / 401                             |
| 3   | AuthZ             | Sai vai trò → 403; hiển thị riêng theo vai trò                               |
| 4   | Validation        | Input và query param sai hoặc bị sửa tay; lỗi phía client và phía server     |
| 5   | Rỗng / null       | Danh sách rỗng, tìm không khớp, trường null ("Never")                        |
| 6   | Biên / phân trang | Trang đầu, trang cuối, trang ngoài phạm vi, limit min/max, đảo chiều sắp xếp |
| 7   | Lọc / tìm kiếm    | Khớp, không khớp, kết hợp bộ lọc, tham số giữ trên URL                       |
| 8   | Hiển thị dữ liệu  | Nhãn dễ đọc thay cho enum/boolean thô, ngày đã định dạng                     |
| 9   | i18n              | Các trạng thái chính ở **cả** `en` lẫn `vi`                                  |
| 10  | Lỗi / đang tải    | API 5xx hoặc mất mạng → UI báo lỗi; trạng thái đang tải                      |
| 11  | An toàn khi ghi   | Idempotency, optimistic UI, trạng thái được trả lại sau đó                   |
| 12  | Accessibility     | Locator theo role/label, thứ tự bàn phím, quản lý focus                      |

## 2. Kỹ thuật (độ sâu)

Ghi kỹ thuật đã sinh ra mỗi test case ở dòng `**Kỹ thuật:**` và viết giá trị cụ thể, không chỉ tên lớp.

| Kỹ thuật                       | Dùng khi…                                       | Ví dụ trong app này                                                                             |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Phân vùng tương đương (EP)** | input chia được thành lớp hợp lệ / không hợp lệ | email: hợp lệ · rỗng · thiếu `@` · vượt độ dài tối đa → mỗi lớp một case                        |
| **Giá trị biên (BVA)**         | input có thứ tự, là số hoặc bị giới hạn độ dài  | độ dài OTP `5 / 6 / 7`; số category mỗi app `0 / 1 / 5 / 6`; `page = 0 / 1 / last / last+1`     |
| **Bảng quyết định (DT)**       | hai điều kiện trở lên cùng quyết định kết quả   | vai trò × quyền sở hữu; mật khẩu hiện tại sai **và** mật khẩu mới không hợp lệ → lỗi nào thắng  |
| **Chuyển trạng thái (ST)**     | feature có trạng thái hoặc các bước             | tài khoản active → locked → unlocked; **ít nhất một chuyển không hợp lệ** (dùng lại mã đã tiêu) |
| **Đoán lỗi (EG)**              | luôn luôn                                       | submit hai lần, khoảng trắng cuối, emoji, nút back giữa luồng, phiên hết hạn giữa thao tác      |

### Cái bẫy "mỗi lần một yếu tố"

Liệt kê từng lỗi validation riêng lẻ ("thiếu chữ số", "thiếu chữ hoa", "sai mật khẩu hiện tại") không bao giờ kiểm điều
gì xảy ra khi hai thứ cùng sai. Khi hai điều kiện trở lên quyết định kết quả, bắt buộc có một dòng Bảng quyết định cho
tổ hợp đó.

### Chọn tầng

Tổ hợp input, biên, bảo mật, rate limit và giao thức (OIDC, PKCE, refresh) kiểm ở tầng API (`src/tests/api/`). Tầng UI
(`src/tests/e2e/`) giữ cho luồng người dùng thật, message, điều hướng, trạng thái nút — mỗi luồng một case, không lặp
tổ hợp đã phủ ở API.

### Ưu tiên

**P0** = hỏng là chặn người dùng hoặc rò dữ liệu (đăng nhập, phân quyền, mất dữ liệu) — mọi case P0 gắn `@smoke`, và
chỉ case P0 (`pnpm coverage:check` kiểm cả hai chiều). **P1** = luồng phụ quan trọng. **P2** = biên hiếm, hiển thị.

## 3. Lượt rà soát độ đầy đủ

Với module mới hoặc thay đổi lớn, sau khi phác xong các case, nhờ một người rà soát độc lập (đồng đội, hoặc một
subagent) liệt kê những gì còn thiếu, gợi ý sẵn: submit hai lần · autofill · dán khoảng trắng hoặc unicode ẩn · emoji ·
phiên hết hạn giữa thao tác · back/forward giữa luồng · cùng một bản ghi sửa ở hai tab. Gộp các thiếu sót thật vào lại.
