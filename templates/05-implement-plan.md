# IMPLEMENTATION PLAN: [TÊN FEATURE]

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị        |
| ------------ | -------------- |
| Tổng số task | _[X]_          |
| Hoàn thành   | _[0/X]_        |
| Tiến độ      | _[0%]_         |
| Ngày bắt đầu | _[DD/MM/YYYY]_ |

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.
> Claude CLI sẽ cập nhật trạng thái sau mỗi lần /implement.

### Phase 1: Setup & Foundation

#### TASK-001: [Tên task]

- **Tham chiếu:** TL3 - Mục 3.3, TL2 - TC-xx
- **Ước lượng:** [Xh]
- **Trạng thái:** ⬜ Todo | 🔄 In Progress | ✅ Done
- **Depends on:** Không có (task đầu tiên)
- **Checklist:**
  - [ ] [Bước cụ thể 1 — VD: Tạo migration file cho bảng X]
  - [ ] [Bước cụ thể 2 — VD: Chạy migration trên local, verify schema]
  - [ ] [Bước cụ thể 3 — VD: Seed test data]
- **Files sẽ tạo/sửa:**
  - `src/database/migrations/xxxxx-create-table-x.ts` (tạo mới)
  - `src/database/seeds/test-data.ts` (sửa)
- **Test cần pass:** TC-xx.x, TC-xx.x (từ TL2)

#### TASK-002: [Tên task]

- **Tham chiếu:** TL3 - Mục 3.4
- **Ước lượng:** [Xh]
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] [Bước cụ thể 1]
  - [ ] [Bước cụ thể 2]
- **Files sẽ tạo/sửa:**
  - `src/modules/xxx/xxx.controller.ts` (sửa)
  - `src/modules/xxx/dto/xxx.dto.ts` (tạo mới)
- **Test cần pass:** TC-xx.x

[... lặp lại cho các task khác ...]

---

## Dependency Graph

> Biểu đồ phụ thuộc giữa các task (đọc từ trái sang phải)
