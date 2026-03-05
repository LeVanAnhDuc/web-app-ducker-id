# IMPLEMENTATION PLAN: TOKEN REFRESH (Client Integration)

> Tạo từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement client.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 4          |
| Hoàn thành   | 0/4        |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 05/03/2026 |

> **Bối cảnh:** Axios interceptor trong `libs/axios.ts` đã xử lý refresh token tự động khi nhận 401. Tuy nhiên cần chuẩn hoá bằng cách tách API call vào `dataSources/Token/` và đảm bảo endpoint đúng.

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

### Phase 3: Frontend Development

#### TASK-001: Tạo `dataSources/Token/index.ts` — hàm `refreshAuthTokens()`

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - TC-01.1
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo folder `src/dataSources/Token/`
  - [ ] Tạo file `src/dataSources/Token/index.ts`
  - [ ] Implement hàm `refreshAuthTokens()`:
    - Gọi `POST /api/v1/auth/token/refresh`
    - **Không** gắn `Authorization` header (refresh token được gửi tự động qua HTTP-only cookie)
    - Dùng axios instance có `withCredentials: true` để browser gửi cookie
    - Return `ResponsePattern<{ accessToken, refreshToken, idToken, expiresIn }>`
  - [ ] Export hàm từ file
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Token/index.ts` (tạo mới)
- **Test cần pass:** TC-01.1

#### TASK-002: Thêm action `setTokens` vào auth store

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có (độc lập)
- **Checklist:**
  - [ ] Mở `src/types/stores/auth.ts`
  - [ ] Kiểm tra xem đã có `setTokens` chưa — nếu có thì bỏ qua task này
  - [ ] Nếu chưa: thêm `setTokens: (tokens: Pick<AuthState, 'accessToken' | 'idToken' | 'refreshToken'>) => void` vào `AuthActions`
  - [ ] Mở `src/stores/slices/auth.ts`, implement action `setTokens` để update state
- **Files sẽ tạo/sửa:**
  - `src/types/stores/auth.ts` (sửa nếu cần)
  - `src/stores/slices/auth.ts` (sửa nếu cần)
- **Test cần pass:** N/A (internal store action)

#### TASK-003: Cập nhật `libs/axios.ts` — dùng `refreshAuthTokens()` từ dataSources

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-01.1~01.7
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001, TASK-002
- **Checklist:**
  - [ ] Mở `src/libs/axios.ts`
  - [ ] Xác minh URL endpoint hiện tại — đổi thành `/api/v1/auth/token/refresh` nếu khác
  - [ ] Thay thế inline axios call trong interceptor bằng `refreshAuthTokens()` từ dataSources
  - [ ] Sau khi refresh thành công: gọi `useAuthStore.getState().setTokens(newTokens)` để cập nhật store
  - [ ] Sau khi refresh thất bại (403/401): gọi `useAuthStore.getState().logout()` và redirect về `/login`
  - [ ] Đảm bảo request gốc được retry với accessToken mới sau khi refresh thành công
  - [ ] Kiểm tra không có infinite loop (refresh request không bị intercept lại)
- **Files sẽ tạo/sửa:**
  - `src/libs/axios.ts` (sửa)
- **Test cần pass:** TC-01.1 (happy), TC-01.2 (expired access → valid refresh), TC-01.4~01.7 (error cases)

---

### Phase 4: Testing & QA

#### TASK-004: Unit & Integration tests

- **Tham chiếu:** TL2 - TC-01.1~01.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003
- **Checklist:**
  - [ ] Unit test `refreshAuthTokens()`:
    - Mock axios, kiểm tra gọi đúng `POST /api/v1/auth/token/refresh`
    - TC-01.4: không có cookie → server trả 401 → function throw error
    - TC-01.5~01.7: expired/invalid → server trả 403 → function throw error
  - [ ] Integration test interceptor:
    - TC-01.1: mock 401 → interceptor gọi refresh → retry request gốc với token mới
    - TC-01.2: request với expired access token, valid refresh cookie → vẫn hoạt động
    - TC-01.3: 2 concurrent 401 → chỉ gọi refresh 1 lần (nếu có queue mechanism)
    - Verify: sau khi refresh thành công → store được update với tokens mới
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Token/__tests__/index.test.ts` (tạo mới)
  - `src/libs/__tests__/axios.interceptor.test.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.4, TC-01.5, TC-01.6, TC-01.7

---

## Dependency Graph

```
TASK-001 (dataSources/Token)    TASK-002 (setTokens action)
         |                               |
         └───────────────┬───────────────┘
                         ↓
                  TASK-003 (axios.ts update)
                         |
                         ↓
                  TASK-004 (Tests)
```
