# TÀI LIỆU 1: YÊU CẦU & PHẠM VI — Feature Flag

---

## 1.1. Thông tin chung

| Mục               | Nội dung                      |
| ----------------- | ----------------------------- |
| **Tên feature**   | Feature Flag                  |
| **Người yêu cầu** | Internal (Dev Team)           |
| **Ngày tạo**      | 15/03/2026                    |
| **Phiên bản**     | v1.0                          |

---

## 1.2. Bối cảnh & Vấn đề

**Tình trạng hiện tại:**
Các tính năng chưa sẵn sàng (beta, đang phát triển, hoặc chờ business approval) vẫn hiển thị trên giao diện người dùng. Để ẩn tạm thời, dev phải comment code hoặc deploy lại build mới.

**Vấn đề:**
- Người dùng cuối có thể truy cập vào tính năng chưa hoàn thiện, gây trải nghiệm xấu.
- Mỗi lần bật/tắt một tính năng đều yêu cầu deploy lại — tốn thời gian và rủi ro cao.
- Không có cơ chế thống nhất để quản lý trạng thái "sẵn sàng" của từng tính năng.

---

## 1.3. Mục tiêu

- Cho phép bật/tắt tính năng trên UI **mà không cần deploy lại**.
- Cung cấp một giao diện quản lý flag tập trung cho cả Dev lẫn Admin.
- Ghi lại log mỗi khi flag bị hit để theo dõi traffic vào tính năng ẩn.
- Xây dựng một hệ thống flag **tự build**, không phụ thuộc third-party service.

---

## 1.4. Đối tượng người dùng

| Role           | Mô tả                                        | Nhu cầu chính                                         |
| -------------- | -------------------------------------------- | ----------------------------------------------------- |
| **End User**   | Mọi người dùng truy cập ứng dụng             | Không thấy tính năng bị tắt (phần tử biến mất hoàn toàn) |
| **Developer**  | Thành viên kỹ thuật                          | Tạo/sửa/xoá flag qua API hoặc admin UI                |
| **Admin**      | Quản trị viên hệ thống                       | Bật/tắt flag qua admin dashboard mà không cần code   |

---

## 1.5. User Stories

| ID    | User Story                                                                                              | Ghi chú                                  |
| ----- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| US-01 | Là một **end user**, tôi muốn không thấy tính năng chưa sẵn sàng để không bị confused bởi UI dở dang  | Phần tử biến mất hoàn toàn, không có placeholder |
| US-02 | Là một **admin**, tôi muốn bật/tắt một flag từ dashboard để kiểm soát tính năng mà không cần deploy    | Runtime toggle, hiệu lực sau khi reload trang |
| US-03 | Là một **developer**, tôi muốn tạo flag mới và gắn vào component/page/nav item để ẩn tính năng beta   | Flag key là string định danh duy nhất    |
| US-04 | Là một **admin**, tôi muốn xem danh sách tất cả flag cùng trạng thái để có cái nhìn tổng quan         |                                          |
| US-05 | Là một **developer/admin**, tôi muốn hệ thống ghi log khi user hit một flag bị tắt để phân tích sau   | Log lưu vào MongoDB collection riêng     |

---

## 1.6. Phạm vi

### Trong phạm vi (In Scope)

- **Server:**
  - CRUD API cho flag (`GET`, `POST`, `PATCH`, `DELETE`)
  - Endpoint công khai `GET /api/v1/feature-flags` — trả về danh sách flag và trạng thái
  - Lưu flag vào MongoDB (collection `feature_flags`)
  - Ghi log access vào MongoDB (collection `feature_flag_logs`) mỗi khi client hit flag bị tắt

- **Client:**
  - Fetch danh sách flag từ server khi app load
  - Lưu flags vào Zustand store
  - Hook `useFeatureFlag(key)` → trả về `boolean`
  - Wrapper component `<FeatureFlag name="...">` → ẩn children nếu flag off
  - Áp dụng cho: **page** (redirect/không render), **component** trong trang, **nav/menu item**

### Ngoài phạm vi (Out of Scope)

- Flag theo từng **role user** (tất cả user đều thấy/không thấy giống nhau)
- **Realtime update** khi flag thay đổi (reload trang là đủ)
- **A/B testing** phân chia traffic theo %
- Block API endpoint phía server khi flag off (client-only enforcement)
- Scheduling (tự bật/tắt theo thời gian)
- Flag theo môi trường (dev/staging/prod — không tách biệt)

### Cân nhắc cho tương lai (Future Considerations)

- Role-based flags (admin thấy beta features, user thường không)
- Realtime flag update qua SSE/WebSocket
- Scheduling: tự bật flag theo thời gian định sẵn
- Server-side enforcement (block API khi flag off)
- Flag rollout theo % user

---

## 1.7. Ràng buộc & Giả định

**Ràng buộc:**

- Phải tự build, không dùng thư viện feature flag bên thứ ba (GrowthBook, LaunchDarkly, Flagsmith...)
- Flag storage: **MongoDB** (collection `feature_flags`)
- Log storage: **MongoDB** (collection `feature_flag_logs`)
- Client fetch flags qua **dedicated endpoint** `GET /api/v1/feature-flags`
- Client API: cả **hook** (`useFeatureFlag`) lẫn **wrapper component** (`<FeatureFlag>`)
- Reload trang là đủ để áp dụng thay đổi flag — không cần realtime

**Giả định:**

- Danh sách flag không lớn (< 100 flags) nên không cần pagination ở endpoint public
- Flag key là string định danh duy nhất, không đổi sau khi tạo (rename = tạo mới)
- Chưa xác định được danh sách flag cụ thể cần tạo trong sprint này — sẽ bổ sung khi có
