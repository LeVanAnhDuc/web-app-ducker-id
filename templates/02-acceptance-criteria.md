# TÀI LIỆU 2: TEST CASE

> Tài liệu này map với từng User Story ở Tài liệu 1. Mỗi User Story được cover ĐẦY ĐỦ cả happy path lẫn unhappy path (edge case, error) tại cùng một chỗ.

---

## 2.1. Quy ước đọc

**Format test scenario:**

- **GIVEN:** Điều kiện ban đầu / trạng thái hệ thống
- **WHEN:** Hành động user thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại scenario:**

- 🟢 **Happy Path** — Luồng chính, input hợp lệ, hệ thống hoạt động bình thường
- 🟡 **Edge Case** — Input bất thường, trạng thái dữ liệu đặc biệt, hành vi user không mong đợi
- 🔴 **Error Case** — Lỗi hệ thống, service down, timeout, lỗi từ dependency

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

> **Hướng dẫn:** Với mỗi User Story, viết đầy đủ 3 loại scenario. Sắp xếp theo thứ tự: Happy → Edge → Error. Cách nghĩ:
>
> - **Happy:** "Nếu mọi thứ đúng, chuyện gì xảy ra?"
> - **Edge:** "Nếu user làm gì đó bất thường thì sao?" (input rỗng, quá dài, ký tự đặc biệt, spam click, 0 kết quả, dữ liệu trùng lặp...)
> - **Error:** "Nếu hệ thống gặp sự cố thì sao?" (API timeout, service down, mất mạng, DB lỗi...)

### US-01: _[Copy tên User Story từ Tài liệu 1]_

| ID      | Loại     | Scenario                                                                                                                                       | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** _[điều kiện]_ **WHEN** _[hành động]_ **THEN** _[kết quả mong đợi]_                                                                   | ⚪         |
| TC-01.2 | 🟢 Happy | **GIVEN** _[điều kiện]_ **WHEN** _[hành động]_ **THEN** _[kết quả mong đợi]_                                                                   | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** _[VD: ô tìm kiếm trống]_ **WHEN** _[user nhấn Search]_ **THEN** _[hiển thị thông báo "Vui lòng nhập từ khóa"]_                       | ⚪         |
| TC-01.4 | 🟡 Edge  | **GIVEN** _[VD: user nhập 500 ký tự]_ **WHEN** _[user nhấn Search]_ **THEN** _[chỉ giữ 200 ký tự đầu, hiển thị cảnh báo]_                      | ⚪         |
| TC-01.5 | 🟡 Edge  | **GIVEN** _[VD: user spam click nút Search]_ **WHEN** _[click liên tục 5 lần trong 1s]_ **THEN** _[chỉ gửi 1 request (debounce)]_              | ⚪         |
| TC-01.6 | 🔴 Error | **GIVEN** _[Search API timeout > 10s]_ **WHEN** _[user nhấn Search]_ **THEN** _[hiển thị "Đang tải lâu hơn bình thường", retry 1 lần tự động]_ | ⚪         |
| TC-01.7 | 🔴 Error | **GIVEN** _[Search service hoàn toàn không phản hồi]_ **WHEN** _[user nhấn Search]_ **THEN** _[hiển thị error message + nút "Thử lại"]_        | ⚪         |

### US-02: _[Copy tên User Story từ Tài liệu 1]_

| ID      | Loại     | Scenario                                                            | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** _[điều kiện]_ **WHEN** _[hành động]_ **THEN** _[kết quả]_ | ⚪         |
| TC-02.2 | 🟡 Edge  | **GIVEN** _[điều kiện]_ **WHEN** _[hành động]_ **THEN** _[kết quả]_ | ⚪         |
| TC-02.3 | 🔴 Error | **GIVEN** _[điều kiện]_ **WHEN** _[hành động]_ **THEN** _[kết quả]_ | ⚪         |

_[Lặp lại cho các User Story khác]_

---

## 2.3. Validation Rules

> **Hướng dẫn:** Tổng hợp tất cả validation cho input của feature. Đây là bảng tra cứu nhanh, chi tiết scenario đã có ở mục 2.2.

| Field                | Rule                                                 | Error Message hiển thị           | Validate tại    |
| -------------------- | ---------------------------------------------------- | -------------------------------- | --------------- |
| _[VD: search_query]_ | _[Max 200 ký tự, không chứa SQL injection patterns]_ | _["Từ khóa tìm kiếm quá dài"]_   | Client + Server |
| _[VD: price_min]_    | _[>= 0, phải là số, <= price_max]_                   | _["Giá tối thiểu không hợp lệ"]_ | Client + Server |

---

## 2.4. Concurrent & Race Conditions

> **Hướng dẫn:** Nghĩ về: nhiều user cùng thao tác, user mở nhiều tab, request chồng chéo. Nếu không áp dụng, ghi "Không áp dụng" và lý do.

| Tình huống                             | Rủi ro                              | Hành vi mong đợi                                |
| -------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| _[VD: 2 admin cùng sửa config filter]_ | _[Data bị ghi đè]_                  | _[Hiển thị cảnh báo "Có người đang chỉnh sửa"]_ |
| _[VD: User đổi filter liên tục nhanh]_ | _[Response cũ ghi đè response mới]_ | _[Chỉ hiển thị kết quả của request cuối cùng]_  |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

> **Hướng dẫn:** Xác định các giới hạn kỹ thuật và nghiệp vụ, cùng hành vi khi chạm ngưỡng.

| Mục                         | Giới hạn              | Hành vi khi vượt ngưỡng                         |
| --------------------------- | --------------------- | ----------------------------------------------- |
| _[VD: Số filter đồng thời]_ | _[Tối đa 10]_         | _[Disable nút "Thêm filter", hiển thị tooltip]_ |
| _[VD: Kích thước response]_ | _[Max 5MB]_           | _[Phân trang, tối đa 50 items/page]_            |
| _[VD: Rate limit API]_      | _[100 req/phút/user]_ | _[Hiển thị "Vui lòng thử lại sau X giây"]_      |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

> **Hướng dẫn:** Các yêu cầu về hiệu năng, bảo mật, khả năng truy cập... áp dụng cho TOÀN BỘ feature.

| NF-ID | Loại          | Tiêu chí                                                          |
| ----- | ------------- | ----------------------------------------------------------------- |
| NF-01 | Performance   | _[VD: Trang load hoàn tất trong < 2s với 3G]_                     |
| NF-02 | Accessibility | _[VD: Tất cả interactive element phải navigable bằng keyboard]_   |
| NF-03 | Security      | _[VD: Chỉ user có role Admin mới thấy nút cấu hình]_              |
| NF-04 | Compatibility | _[VD: Hoạt động trên Chrome, Safari, Firefox phiên bản mới nhất]_ |

---

## 2.7. Definition of Done (DoD)

> **Hướng dẫn:** Checklist chung để xác nhận feature sẵn sàng release.

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= _[90]_%
- [ ] Không có bug severity Critical hoặc High còn open
