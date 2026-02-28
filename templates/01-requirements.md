# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                                                |
| ----------------- | ------------------------------------------------------- |
| **Tên feature**   | _[Tên ngắn gọn, dễ nhớ. VD: "Product Filter & Search"]_ |
| **Người yêu cầu** | _[PM/Stakeholder nào yêu cầu]_                          |
| **Ngày tạo**      | _[DD/MM/YYYY]_                                          |
| **Phiên bản**     | _[v1.0]_                                                |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

> **Hướng dẫn:** Mô tả ngắn gọn tình trạng hiện tại (as-is) và vấn đề mà user đang gặp phải. Viết dưới góc nhìn người dùng, tránh dùng thuật ngữ kỹ thuật.

**Tình trạng hiện tại:**
_[Hiện tại user đang phải... / Hệ thống hiện chưa có...]_

**Vấn đề:**
_[Điều này dẫn đến... / User gặp khó khăn vì...]_

---

## 1.3. Mục tiêu (Objectives)

> **Hướng dẫn:** Liệt kê 2-5 mục tiêu cụ thể, đo lường được nếu có thể. Mỗi mục tiêu bắt đầu bằng một động từ.

- _[VD: Giảm thời gian tìm kiếm sản phẩm từ 30s xuống dưới 5s]_
- _[VD: Tăng tỷ lệ chuyển đổi trang listing lên 15%]_

---

## 1.4. Đối tượng người dùng (Target Users)

> **Hướng dẫn:** Xác định rõ ai sẽ dùng feature này. Nếu có nhiều role, mô tả từng role.

| Role          | Mô tả                            | Nhu cầu chính                        |
| ------------- | -------------------------------- | ------------------------------------ |
| _[VD: Buyer]_ | _[Người mua hàng trên platform]_ | _[Tìm sản phẩm nhanh theo tiêu chí]_ |
| _[VD: Admin]_ | _[Quản trị viên hệ thống]_       | _[Cấu hình bộ lọc hiển thị]_         |

---

## 1.5. User Stories

> **Hướng dẫn:** Viết theo format chuẩn. Đánh ID để các tài liệu sau tham chiếu lại (VD: Acceptance Criteria sẽ map theo US-ID). Chỉ mô tả WHAT, không mô tả HOW.

| ID    | User Story                                              | Ghi chú            |
| ----- | ------------------------------------------------------- | ------------------ |
| US-01 | Là một _[role]_, tôi muốn _[hành động]_ để _[mục đích]_ | _[Ghi chú nếu có]_ |
| US-02 | Là một _[role]_, tôi muốn _[hành động]_ để _[mục đích]_ |                    |

---

## 1.6. Phạm vi (Scope)

> **Hướng dẫn:** Phần quan trọng nhất để tránh scope creep. Phải rõ ràng cái gì IN và cái gì OUT.

### ✅ Trong phạm vi (In Scope)

- _[Liệt kê cụ thể những gì sẽ làm]_
- _[...]_

### ❌ Ngoài phạm vi (Out of Scope)

- _[Liệt kê cụ thể những gì KHÔNG làm trong lần này]_
- _[...]_

### 🔮 Cân nhắc cho tương lai (Future Considerations)

- _[Những thứ out-of-scope nhưng có thể làm ở phase sau]_

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

> **Hướng dẫn:** Ràng buộc = điều bắt buộc phải tuân theo. Giả định = điều team tin là đúng nhưng chưa xác nhận 100%.

**Ràng buộc:**

- _[VD: Phải tương thích với mobile app hiện tại]_
- _[VD: Không được thay đổi database schema của module X]_

**Giả định:**

- _[VD: API bên thứ 3 sẽ có uptime >= 99.9%]_
- _[VD: User đã đăng nhập trước khi sử dụng feature]_
