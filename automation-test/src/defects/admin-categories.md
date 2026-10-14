# ADMINCATEGORIES — Bug log

## Đang mở

| Bug                                               | Mức  | TC                     | Tóm tắt                                                                          |
| ------------------------------------------------- | ---- | ---------------------- | -------------------------------------------------------------------------------- |
| [BUG-ADMINCATEGORIES-01](#bug-admincategories-01) | Thấp | TC-ADMINCATEGORIES-068 | Đóng sheet category bằng Escape thì focus nằm lại ở `<body>`                     |
| [BUG-ADMINCATEGORIES-02](#bug-admincategories-02) | Thấp | TC-ADMINCATEGORIES-078 | `appId` trùng khi xoá trả `VALIDATION_ERROR` thay vì `CATEGORY_REASSIGN_INVALID` |

### BUG-ADMINCATEGORIES-01

- **TC:** TC-ADMINCATEGORIES-068 · **Requirement:** REQ-ADMINCATEGORIES-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-028
- **Bước tái hiện:** chạy test của TC-ADMINCATEGORIES-068 — `tests/e2e/admin-categories/categories-sheet.e2e.ts`
- **Mong đợi:** focus quay về "New category"
- **Thực tế:** đóng sheet category bằng Escape thì focus nằm lại ở `<body>`

### BUG-ADMINCATEGORIES-02

- **TC:** TC-ADMINCATEGORIES-078 · **Requirement:** REQ-ADMINCATEGORIES-04
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** `DELETE /admin/categories/:id` với `reassignments` chứa cùng một `appId` hai lần — test "the same
  app twice is CATEGORY_REASSIGN_INVALID" trong `tests/api/admin-categories/categories.api.ts`
- **Mong đợi:** 400 `CATEGORY_REASSIGN_INVALID` (design `docs/specs/category-management/design.md` §3.4)
- **Thực tế:** 400 `VALIDATION_ERROR` — `deleteCategoryBodySchema` chặn bằng `unique("appId")` trước khi tới service

## Đã sửa

_(chưa có)_
