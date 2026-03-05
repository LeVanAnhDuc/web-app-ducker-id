# IMPLEMENTATION PLAN: LOGOUT (Client Integration)

> Tạo từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement client.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 5          |
| Hoàn thành   | 0/5        |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 05/03/2026 |

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

### Phase 1: Setup & Foundation

#### TASK-001: Thêm route constant LOGOUT

- **Tham chiếu:** TL3 - Mục 3.4
- **Ước lượng:** 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Mở `src/constants/routes.ts`
  - [ ] Kiểm tra xem đã có route `/login` chưa (để dùng khi redirect sau logout)
  - [ ] Export constant từ `src/constants/index.ts` nếu cần
- **Files sẽ tạo/sửa:**
  - `src/constants/routes.ts` (sửa — nếu cần thêm LOGIN route cho redirect)
- **Test cần pass:** N/A

---

### Phase 3: Frontend Development

#### TASK-002: dataSources/Logout — API function `logoutUser()`

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - TC-01.1
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có (độc lập với TASK-001)
- **Checklist:**
  - [ ] Tạo folder `src/dataSources/Logout/`
  - [ ] Tạo file `src/dataSources/Logout/index.ts`
  - [ ] Implement hàm `logoutUser()`:
    - Gọi `POST /api/v1/auth/logout`
    - Axios tự động gắn `Authorization: Bearer {idToken}` qua interceptor
    - Return `ResponsePattern<{ success: boolean }>`
  - [ ] Export hàm từ file
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Logout/index.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2

#### TASK-003: Cập nhật auth store — action `logout`

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-01.2
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Mở `src/types/stores/auth.ts`, thêm `logout: () => Promise<void>` vào `AuthActions`
  - [ ] Mở `src/stores/slices/auth.ts`, implement action `logout`:
    - Gọi `logoutUser()` từ dataSources
    - Dù API thành công hay lỗi đều clear state: `accessToken`, `idToken`, `refreshToken` → `null`
    - localStorage persistence sẽ tự clear nhờ Zustand persist middleware
  - [ ] Verify rằng sau khi clear, `useAuthStore.getState().accessToken === null`
- **Files sẽ tạo/sửa:**
  - `src/types/stores/auth.ts` (sửa — thêm `logout` vào `AuthActions`)
  - `src/stores/slices/auth.ts` (sửa — thêm implementation)
- **Test cần pass:** TC-01.2 (logout idempotent — vẫn clear dù đã logout trước đó)

#### TASK-004: Component `LogoutButton`

- **Tham chiếu:** TL1 - US-01, TL2 - TC-01.1, TC-01.3~01.5
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003
- **Checklist:**
  - [ ] Tạo `src/components/LogoutButton/index.tsx`
  - [ ] Dùng `useAuthStore` để lấy action `logout`
  - [ ] Hiển thị loading state (`isPending`) trong khi đang gọi API
  - [ ] Sau khi `logout()` hoàn thành (dù thành công hay lỗi): gọi `router.push('/login')` (hoặc route tương ứng)
  - [ ] Component nhận prop `className` để linh hoạt styling
  - [ ] Tích hợp vào layout/header (nơi cần hiển thị nút logout)
- **Files sẽ tạo/sửa:**
  - `src/components/LogoutButton/index.tsx` (tạo mới)
- **Test cần pass:** TC-01.1 (happy path), TC-01.2 (idempotent)

---

### Phase 4: Testing & QA

#### TASK-005: Unit tests

- **Tham chiếu:** TL2 - TC-01.1, TC-01.2, TC-01.3~01.5
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004
- **Checklist:**
  - [ ] Test `logoutUser()`:
    - Mock axios, kiểm tra gọi đúng `POST /api/v1/auth/logout`
    - TC-01.3: không có token → axios interceptor gắn empty bearer → server trả 401 (xử lý gracefully)
  - [ ] Test auth store `logout` action:
    - Trước: state có tokens, Sau: state không có tokens
    - TC-01.2: gọi logout 2 lần → không lỗi, vẫn clear
  - [ ] Test `LogoutButton`:
    - Click → `logout` được gọi
    - Loading state hiển thị đúng
    - Router redirect được gọi sau khi hoàn thành
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Logout/__tests__/index.test.ts` (tạo mới)
  - `src/stores/__tests__/auth.logout.test.ts` (tạo mới)
  - `src/components/LogoutButton/__tests__/index.test.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2

---

## Dependency Graph

```
TASK-001 (Routes)           TASK-002 (dataSources/Logout)
     |                               |
     └──────────────┬────────────────┘
                    ↓
             TASK-003 (Store action logout)
                    |
                    ↓
             TASK-004 (LogoutButton)
                    |
                    ↓
             TASK-005 (Tests)
```
