# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                                     |
| ---------------------------- | ------------------------------------------- |
| **Tổng thời gian ước lượng** | ~2.5 giờ (chỉ phần tích hợp client)        |
| **Số developer**             | 1 người                                     |
| **Ngày bắt đầu dự kiến**     | 05/03/2026                                  |
| **Ngày hoàn thành dự kiến**  | 05/03/2026                                  |
| **Hệ số buffer**             | 1.2x — thêm 20% cho rủi ro tích hợp        |

> **Lưu ý:** Server đã implement hoàn chỉnh (POST /api/v1/auth/token/refresh). Axios interceptor trong `libs/axios.ts` đã xử lý refresh tự động khi nhận 401. Tài liệu này chỉ ước lượng phần **chuẩn hoá và kiểm tra lại client**.

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

> Không có setup riêng — interceptor đã có sẵn trong `libs/axios.ts`.

### Phase 2: Backend Development

> ✅ **Đã hoàn thành** — Server implement đầy đủ. Xem TL3 - Mục 3.4 để biết chi tiết API spec.

### Phase 3: Frontend Development

| Task                                                                        | Tham chiếu      | Ước lượng | Assignee | Ghi chú                                                     |
| --------------------------------------------------------------------------- | --------------- | --------- | -------- | ----------------------------------------------------------- |
| Tạo `dataSources/Token/index.ts` — hàm `refreshAuthTokens()`               | TL3 - Mục 3.4  | 30m       |          | POST `/api/v1/auth/token/refresh`, không cần Authorization header (dùng cookie) |
| Cập nhật `libs/axios.ts` — dùng hàm từ dataSources thay vì inline          | TL3 - Mục 3.5  | 45m       |          | Xác minh endpoint đúng, cập nhật store với 3 tokens mới     |
| Thêm action `setTokens` vào auth store (nếu chưa có)                       | TL3 - Mục 3.5  | 15m       |          | `stores/slices/auth.ts` — dùng sau khi refresh thành công   |

### Phase 4: Testing & QA

| Task                                                                     | Tham chiếu       | Ước lượng | Assignee | Ghi chú |
| ------------------------------------------------------------------------ | ---------------- | --------- | -------- | ------- |
| Unit test `refreshAuthTokens()` — mock axios, verify request/response    | TL2 - TC-01.1    | 30m       |          |         |
| Integration test interceptor — mock 401 response → verify retry với token mới | TL2 - TC-01.2 | 30m    |          |         |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.2x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | —                        | —                          |
| 2. Backend Development  | ✅ Hoàn thành            | —                          |
| 3. Frontend Development | 1h 30m                   | 1h 48m                     |
| 4. Testing & QA         | 1h                       | 1h 12m                     |
| **TỔNG**                | **2h 30m**               | **~3h**                    |
