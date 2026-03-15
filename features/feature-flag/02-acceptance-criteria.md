# TÀI LIỆU 2: TEST CASES & ACCEPTANCE CRITERIA — Feature Flag

---

## 2.1. Quy ước đọc

**Format test scenario:**

- **GIVEN:** Điều kiện ban đầu / trạng thái hệ thống
- **WHEN:** Hành động user thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại scenario:**

- 🟢 **Happy Path** — Luồng chính, input hợp lệ, hệ thống hoạt động bình thường
- 🟡 **Edge Case** — Input bất thường, trạng thái dữ liệu đặc biệt, hành vi không mong đợi
- 🔴 **Error Case** — Lỗi hệ thống, service down, timeout, lỗi từ dependency

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

---

### US-01: End user không thấy tính năng bị tắt

| ID      | Loại     | Scenario | Trạng thái |
| ------- | -------- | -------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** flag `blog` đang OFF **WHEN** user truy cập trang chứa component Blog **THEN** component Blog không render, không để lại khoảng trống hay placeholder | ⚪ |
| TC-01.2 | 🟢 Happy | **GIVEN** flag `blog` đang ON **WHEN** user truy cập trang chứa component Blog **THEN** component Blog render bình thường | ⚪ |
| TC-01.3 | 🟢 Happy | **GIVEN** flag `blog` đang OFF **WHEN** user truy cập trực tiếp route `/blog` bằng URL **THEN** page không render (redirect về `/` hoặc trả về 404 tùy thiết kế) | ⚪ |
| TC-01.4 | 🟢 Happy | **GIVEN** flag `blog` đang OFF **WHEN** user nhìn vào sidebar/navbar **THEN** menu item "Blog" không xuất hiện | ⚪ |
| TC-01.5 | 🟡 Edge  | **GIVEN** flag `blog` vừa được admin bật ON **WHEN** user reload trang **THEN** component Blog xuất hiện (không cần thao tác thêm) | ⚪ |
| TC-01.6 | 🟡 Edge  | **GIVEN** flag `blog` vừa được admin tắt OFF **WHEN** user đang ở trang Blog và reload **THEN** page biến mất, user bị redirect hoặc thấy trang trống tùy thiết kế | ⚪ |
| TC-01.7 | 🔴 Error | **GIVEN** server trả về lỗi khi fetch `/api/v1/feature-flags` **WHEN** app load **THEN** tất cả flags mặc định là OFF (fail-safe), không crash app | ⚪ |

---

### US-02: Admin bật/tắt flag từ dashboard

| ID      | Loại     | Scenario | Trạng thái |
| ------- | -------- | -------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** admin đang ở trang quản lý flags **WHEN** admin toggle flag `blog` từ OFF → ON **THEN** API `PATCH /api/v1/feature-flags/:key` được gọi, flag được cập nhật trong DB, UI hiển thị trạng thái mới | ⚪ |
| TC-02.2 | 🟢 Happy | **GIVEN** admin đang ở trang quản lý flags **WHEN** admin toggle flag `blog` từ ON → OFF **THEN** flag được tắt trong DB, hiệu lực với user sau khi reload trang | ⚪ |
| TC-02.3 | 🟡 Edge  | **GIVEN** hai admin cùng mở trang quản lý flag **WHEN** cả hai cùng toggle cùng một flag gần như đồng thời **THEN** trạng thái cuối cùng phản ánh request đến sau (last-write-wins), không bị lỗi crash | ⚪ |
| TC-02.4 | 🟡 Edge  | **GIVEN** admin toggle một flag **WHEN** network request đang pending **THEN** nút toggle bị disabled (loading state) để tránh double-submit | ⚪ |
| TC-02.5 | 🔴 Error | **GIVEN** admin toggle một flag **WHEN** server trả về lỗi 500 **THEN** UI rollback về trạng thái cũ, hiển thị thông báo lỗi | ⚪ |
| TC-02.6 | 🔴 Error | **GIVEN** admin không có quyền (unauthorized) **WHEN** gọi `PATCH /api/v1/feature-flags/:key` **THEN** server trả về 401/403, UI hiển thị thông báo lỗi phù hợp | ⚪ |

---

### US-03: Developer tạo flag mới và gắn vào UI

| ID      | Loại     | Scenario | Trạng thái |
| ------- | -------- | -------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** developer tạo flag mới với key `new-feature` và `enabled: false` qua `POST /api/v1/feature-flags` **WHEN** request hợp lệ **THEN** flag được lưu vào MongoDB, response trả về object flag mới | ⚪ |
| TC-03.2 | 🟢 Happy | **GIVEN** flag `new-feature` đã tồn tại trong DB **WHEN** developer dùng `useFeatureFlag('new-feature')` trong component **THEN** hook trả về `false`, component không render | ⚪ |
| TC-03.3 | 🟢 Happy | **GIVEN** flag `new-feature` đã tồn tại trong DB **WHEN** developer dùng `<FeatureFlag name="new-feature"><Component /></FeatureFlag>` **THEN** `<Component />` không render nếu flag OFF | ⚪ |
| TC-03.4 | 🟡 Edge  | **GIVEN** developer tạo flag với key trùng với flag đã tồn tại **WHEN** gọi `POST /api/v1/feature-flags` **THEN** server trả về 409 Conflict, không tạo bản ghi mới | ⚪ |
| TC-03.5 | 🟡 Edge  | **GIVEN** developer dùng `useFeatureFlag('non-existent-key')` với key không tồn tại trong store **WHEN** component render **THEN** hook trả về `false` (mặc định OFF) | ⚪ |
| TC-03.6 | 🔴 Error | **GIVEN** developer tạo flag với payload thiếu field bắt buộc (key hoặc enabled) **WHEN** gọi `POST /api/v1/feature-flags` **THEN** server trả về 422 Unprocessable Entity kèm message mô tả field lỗi | ⚪ |

---

### US-04: Admin xem danh sách tất cả flag

| ID      | Loại     | Scenario | Trạng thái |
| ------- | -------- | -------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** có 5 flag trong DB **WHEN** admin vào trang quản lý flags **THEN** hiển thị đủ 5 flag với key, mô tả, và trạng thái ON/OFF | ⚪ |
| TC-04.2 | 🟡 Edge  | **GIVEN** không có flag nào trong DB **WHEN** admin vào trang quản lý flags **THEN** hiển thị trạng thái empty (không có lỗi) | ⚪ |
| TC-04.3 | 🔴 Error | **GIVEN** server không phản hồi **WHEN** admin vào trang quản lý flags **THEN** hiển thị thông báo lỗi, không crash trang | ⚪ |

---

### US-05: Ghi log khi user hit flag bị tắt

| ID      | Loại     | Scenario | Trạng thái |
| ------- | -------- | -------- | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** flag `blog` đang OFF **WHEN** client fetch `GET /api/v1/feature-flags` và nhận flag OFF **THEN** server ghi một bản ghi vào `feature_flag_logs` với flagKey, timestamp, và thông tin request | ⚪ |
| TC-05.2 | 🟡 Edge  | **GIVEN** flag `blog` đang ON **WHEN** client fetch danh sách flags **THEN** server KHÔNG ghi log cho flag này (chỉ log flag bị tắt) | ⚪ |
| TC-05.3 | 🟡 Edge  | **GIVEN** cùng user reload trang 10 lần trong 1 phút **WHEN** mỗi lần đều fetch flags **THEN** server ghi đủ 10 bản ghi log (không deduplicate) | ⚪ |
| TC-05.4 | 🔴 Error | **GIVEN** MongoDB gặp lỗi khi ghi log **WHEN** server cố ghi vào `feature_flag_logs` **THEN** lỗi được bắt và ghi ra server logger, KHÔNG làm fail response trả về client | ⚪ |

---

## 2.3. Validation Rules

| Field         | Rule                                                             | Error Message                            | Validate tại    |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------- | --------------- |
| `key`         | Bắt buộc, string, chỉ chứa `a-z`, `0-9`, `-`, `_`, max 100 ký tự | `"Flag key không hợp lệ"`               | Client + Server |
| `key`         | Duy nhất trong collection `feature_flags`                        | `"Flag key đã tồn tại"`                 | Server          |
| `enabled`     | Bắt buộc, kiểu boolean                                           | `"enabled phải là true hoặc false"`     | Client + Server |
| `description` | Tuỳ chọn, string, max 500 ký tự                                  | `"Mô tả quá dài"`                       | Client + Server |

---

## 2.4. Concurrent & Race Conditions

| Tình huống | Rủi ro | Hành vi mong đợi |
| ---------- | ------ | ---------------- |
| 2 admin cùng toggle cùng 1 flag gần như đồng thời | Trạng thái cuối không xác định | Last-write-wins — request đến sau ghi đè, MongoDB atomic update đảm bảo không corrupt |
| Admin toggle flag trong khi client đang fetch danh sách flags | Client nhận trạng thái cũ | Chấp nhận được — hiệu lực sau lần reload tiếp theo |

---

## 2.5. Giới hạn & Ngưỡng

| Mục | Giới hạn | Hành vi khi vượt ngưỡng |
| --- | -------- | ----------------------- |
| Số flag trong hệ thống | Không giới hạn cứng (giả định < 100) | Nếu > 100, xem xét pagination cho admin API |
| Độ dài flag key | Max 100 ký tự | Server trả về 422 |
| Độ dài description | Max 500 ký tự | Server trả về 422 |
| Log retention | Không giới hạn trong v1 | Cân nhắc TTL index ở phase sau |

---

## 2.6. Tiêu chí phi chức năng

| NF-ID | Loại        | Tiêu chí |
| ----- | ----------- | -------- |
| NF-01 | Performance | `GET /api/v1/feature-flags` phải response < 200ms (< 100 flags, không có Redis cache) |
| NF-02 | Performance | Client fetch flags không block render của app (non-blocking hoặc Suspense) |
| NF-03 | Security    | Các endpoint CRUD flag (POST/PATCH/DELETE) chỉ cho phép Admin (auth guard) |
| NF-04 | Security    | `GET /api/v1/feature-flags` có thể public (không cần auth) vì chỉ trả về key + enabled |
| NF-05 | Reliability | Nếu fetch flags thất bại, app vẫn hoạt động bình thường (tất cả flags mặc định OFF) |
| NF-06 | Reliability | Lỗi ghi log KHÔNG được làm fail API response |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
