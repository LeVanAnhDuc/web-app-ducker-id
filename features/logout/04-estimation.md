# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                                     |
| ---------------------------- | ------------------------------------------- |
| **Tổng thời gian ước lượng** | ~3.5 giờ (chỉ phần tích hợp client)        |
| **Số developer**             | 1 người                                     |
| **Ngày bắt đầu dự kiến**     | 05/03/2026                                  |
| **Ngày hoàn thành dự kiến**  | 05/03/2026                                  |
| **Hệ số buffer**             | 1.2x — thêm 20% cho rủi ro tích hợp        |

> **Lưu ý:** Server đã implement hoàn chỉnh (POST /api/v1/auth/logout). Tài liệu này chỉ ước lượng phần **tích hợp client**.

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task                                           | Tham chiếu      | Ước lượng | Assignee | Ghi chú                    |
| ---------------------------------------------- | --------------- | --------- | -------- | -------------------------- |
| Thêm route constant cho logout vào routes.ts   | TL3 - Mục 3.4  | 15m       |          | Dùng khi redirect sau logout |

### Phase 2: Backend Development

> ✅ **Đã hoàn thành** — Server implement đầy đủ. Xem TL3 - Mục 3.4 để biết chi tiết API spec.

### Phase 3: Frontend Development

| Task                                                              | Tham chiếu      | Ước lượng | Assignee | Ghi chú                                             |
| ----------------------------------------------------------------- | --------------- | --------- | -------- | --------------------------------------------------- |
| `dataSources/Logout/index.ts` — hàm `logoutUser()`               | TL3 - Mục 3.4  | 30m       |          | POST `/api/v1/auth/logout`, Bearer idToken          |
| Thêm action `logout` vào auth store — xoá tokens, clear persist  | TL3 - Mục 3.5  | 30m       |          | `stores/slices/auth.ts`, gọi API → clear state      |
| Component `LogoutButton` — gọi logout, hiển thị loading, redirect | TL1 - US-01    | 1h        |          | Redirect về `/login` sau khi logout (dù API fail)   |

### Phase 4: Testing & QA

| Task                                                | Tham chiếu      | Ước lượng | Assignee | Ghi chú |
| --------------------------------------------------- | --------------- | --------- | -------- | ------- |
| Unit test `logoutUser()` — mock axios, verify endpoint | TL2 - TC-01.1  | 30m       |          |         |
| Unit test auth store `logout` action                | TL2 - TC-01.2  | 15m       |          | Kiểm tra tokens bị clear (kể cả khi API fail) |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.2x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | 15m                      | 18m                        |
| 2. Backend Development  | ✅ Hoàn thành            | —                          |
| 3. Frontend Development | 2h                       | 2h 24m                     |
| 4. Testing & QA         | 45m                      | 54m                        |
| **TỔNG**                | **3h**                   | **~3.5h**                  |
