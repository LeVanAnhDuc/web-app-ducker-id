# TÀI LIỆU 2: TEST CASE

> Map với từng User Story ở Tài liệu 1.

---

## 2.1. Quy ước đọc

**Format test scenario:**

- **GIVEN:** Điều kiện ban đầu / trạng thái hệ thống
- **WHEN:** Hành động user thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại scenario:**

- 🟢 **Happy Path** — Luồng chính, hệ thống hoạt động bình thường
- 🟡 **Edge Case** — Trạng thái bất thường
- 🔴 **Error Case** — Lỗi hệ thống, authentication lỗi

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Đăng xuất

| ID      | Loại     | Scenario                                                                                                                                                                                                           | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** user đã đăng nhập với valid access token **WHEN** gọi POST /auth/logout với Bearer token **THEN** refresh token cookie bị xóa (clearCookie), trả về `{ success: true }` với message thành công          | ⚪         |
| TC-01.2 | 🟡 Edge  | **GIVEN** user đã logout rồi (cookie đã bị xóa) **WHEN** gọi logout lần nữa với access token còn hiệu lực **THEN** vẫn trả về success (clearCookie trên cookie không tồn tại là no-op)                          | ⚪         |
| TC-01.3 | 🔴 Error | **GIVEN** request không có Bearer token **WHEN** gọi POST /auth/logout **THEN** trả về lỗi 401 Unauthorized                                                                                                     | ⚪         |
| TC-01.4 | 🔴 Error | **GIVEN** access token đã hết hạn **WHEN** gọi POST /auth/logout **THEN** trả về lỗi 401 Unauthorized                                                                                                           | ⚪         |
| TC-01.5 | 🔴 Error | **GIVEN** access token bị giả mạo (invalid signature) **WHEN** gọi POST /auth/logout **THEN** trả về lỗi 401 Unauthorized                                                                                      | ⚪         |

---

## 2.3. Validation Rules

Không có input validation — endpoint không nhận request body.

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                       | Rủi ro             | Hành vi mong đợi                               |
| ------------------------------------------------ | ------------------ | ---------------------------------------------- |
| User gọi logout từ 2 tab đồng thời              | Không có rủi ro    | Cả 2 đều thành công (clearCookie là idempotent) |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

Không áp dụng — endpoint đơn giản, không cần rate limiting.

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại     | Tiêu chí                                                                 |
| ----- | -------- | ------------------------------------------------------------------------ |
| NF-01 | Security | Refresh token cookie phải được xóa với đúng options (httpOnly, secure, sameSite, path) |
| NF-02 | Security | Endpoint yêu cầu valid access token — không cho phép unauthenticated logout            |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
