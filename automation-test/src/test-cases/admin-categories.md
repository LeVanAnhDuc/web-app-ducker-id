# ADMINCATEGORIES — test case

Quản lý category trong admin (danh sách, tạo / đổi tên, sắp xếp, xoá kèm chuyển app, rate limit) và các case app ↔ category của REQ-ADMINAPPS-02.
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/admin-categories.md

## Danh sách (REQ-ADMINCATEGORIES-01)

### TC-ADMINCATEGORIES-001 — The list shows each category's English and Vietnamese names

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (mọi dòng seed) — dòng 1, 8
- **Tiền điều kiện:** thứ tự seed còn nguyên
- **Bước:**
  1. Mở `/admin/categories`.
- **Mong đợi:** bốn dòng theo thứ tự seed, mỗi dòng có tên en và vi, slug và số app (1 / 2 / 1 / 2).
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMINCATEGORIES-002 — The first row cannot move up and the last cannot move down

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (vị trí đầu / cuối) — dòng 6
- **Tiền điều kiện:** thứ tự seed
- **Bước:**
  1. Đọc các nút mũi tên của dòng đầu và dòng cuối.
- **Mong đợi:** ↑ của dòng đầu bị disable, ↓ của dòng đầu bật; ↓ của dòng cuối bị disable, ↑ của dòng cuối bật.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMINCATEGORIES-003 — Every icon button is named after its category

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (a11y) — dòng 12
- **Tiền điều kiện:** không có
- **Bước:**
  1. Kiểm tra dòng Identity.
- **Mong đợi:** "Move Identity up", "Move Identity down", "Edit Identity", "Delete Identity".
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMINCATEGORIES-004 — In Vietnamese the vi name comes first

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi) — dòng 9
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở `/vi/admin/categories`.
- **Mong đợi:** heading "Danh mục"; ở dòng Internal Tools, "Công cụ nội bộ" đứng trước "Internal Tools"; nút "Chuyển Công cụ nội bộ lên".
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMINCATEGORIES-005 — The admin sidebar links to the categories page

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) — dòng 1
- **Tiền điều kiện:** không có
- **Bước:**
  1. Từ `/admin/apps` bấm "Categories" ở sidebar.
- **Mong đợi:** `/admin/categories`.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMINCATEGORIES-006 — An empty list shows the empty state with a create action

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (0 category, `GET` bị stub) — dòng 5
- **Tiền điều kiện:** danh sách bị stub thành `[]`
- **Bước:**
  1. Mở `/admin/categories`.
- **Mong đợi:** "No categories yet" và nút "New category".
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

## Tạo và đổi tên (REQ-ADMINCATEGORIES-02)

### TC-ADMINCATEGORIES-007 — A new category is added last with a slug from its English name

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (tạo hợp lệ) — dòng 1
- **Tiền điều kiện:** không có; xoá sau khi chạy
- **Bước:**
  1. "New category", điền cả hai tên, theo dõi phần xem trước slug, "Create".
- **Mong đợi:** phần xem trước hiện slug; sheet đóng và dòng cuối mang tên và slug đó.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-008 — Both names empty: both fields report and nothing is sent

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (en rỗng × vi rỗng) — dòng 4
- **Tiền điều kiện:** không có
- **Bước:**
  1. Bấm "Create" trên sheet trống.
- **Mong đợi:** "Enter an English name." và "Enter a Vietnamese name."; không có POST.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-009 — Whitespace-only and zero-width-only names count as empty

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (các vùng rỗng) — dòng 4, DR-11
- **Tiền điều kiện:** không có
- **Bước:**
  1. Điền en bằng dấu cách và vi bằng một zero-width space; "Create".
- **Mong đợi:** cả hai thông báo bắt buộc.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-010 — An English name without a letter or digit is refused

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (không có ký tự tạo được slug) — DR-12
- **Tiền điều kiện:** không có
- **Bước:**
  1. en `🚀 !!!`, vi hợp lệ; "Create".
- **Mong đợi:** "The English name needs at least one letter or digit."
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-011 — 100 characters are accepted, 101 refused in the form

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (100 / 101) — dòng 4
- **Tiền điều kiện:** không có; category 100 ký tự bị xoá sau khi chạy
- **Bước:**
  1. en dài 101 ký tự → Create; rồi 100 ký tự → Create.
- **Mong đợi:** "The English name must not exceed 100 characters."; cái 100 ký tự lưu được.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-012 — A duplicate English name in another case is a 409 on the English field

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (en trùng × vi hợp lệ) — dòng 4
- **Tiền điều kiện:** category seed Content
- **Bước:**
  1. en `  CONTENT  `, vi hợp lệ; "Create".
- **Mong đợi:** "A category with this English name already exists."; sheet vẫn mở.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-013 — Duplicate English with empty Vietnamese fails on the client first

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (en trùng × vi rỗng) — dòng 4
- **Tiền điều kiện:** không có
- **Bước:**
  1. en `Content`, vi rỗng; "Create".
- **Mong đợi:** "Enter a Vietnamese name." và không có POST.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-014 — The Vietnamese page's slug preview folds đ and accents

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi, input có dấu) — dòng 4, 9
- **Tiền điều kiện:** không có
- **Bước:**
  1. `/vi/admin/categories` → "Tạo danh mục"; "Tên (English)" = `Đa dạng Phân Tích`.
- **Mong đợi:** xem trước `da-dang-phan-tich`.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-015 — A server error keeps the sheet open with the typed values

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (POST bị stub trả 500) — dòng 10
- **Tiền điều kiện:** POST bị stub
- **Bước:**
  1. Điền cả hai tên; "Create".
- **Mong đợi:** sheet vẫn mở và giữ giá trị tiếng Anh đã nhập.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-016 — Double-clicking Create makes one category

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chặn submit lặp) — dòng 11
- **Tiền điều kiện:** không có; xoá sau khi chạy
- **Bước:**
  1. Double-click "Create".
- **Mong đợi:** một POST và một category mang tên đó.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-017 — Renaming the English name moves the slug; renaming only Vietnamese keeps it

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (en đổi × vi đổi) — dòng 1, 4
- **Tiền điều kiện:** một category `E2E …`; xoá sau khi chạy
- **Bước:**
  1. Edit: chỉ đổi vi (không có mũi tên `old → new`), rồi đổi en; lưu.
- **Mong đợi:** phần xem trước gạch slug cũ; slug được lưu là `<old>-two` và tên vi đã cập nhật.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-018 — A rename onto a taken slug gets a suffix, and back again drops it

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (slug duy nhất → có hậu tố → lại trống) — DR-13
- **Tiền điều kiện:** một category `E2E …`
- **Bước:**
  1. Đổi tên thành `Identity!`; rồi đổi lại tên cũ của nó.
- **Mong đợi:** server trả slug `identity-2`; sau đó là slug gốc không có hậu tố.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-019 — Saving a category deleted in another tab closes the sheet and drops the row

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: sửa sau khi đã xoá) — dòng 11
- **Tiền điều kiện:** một category `E2E …` bị xoá qua API trong lúc sheet của nó đang mở
- **Bước:**
  1. Đổi vi, lưu.
- **Mong đợi:** 404 → sheet đóng và dòng biến mất.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-020 — Creating and renaming never touches the seeded categories

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (đổi tên rơi nhầm dòng)
- **Tiền điều kiện:** các case tạo / đổi tên ở trên đã chạy
- **Bước:**
  1. List các category.
- **Mong đợi:** mọi tên tiếng Anh của seed (Content, Internal Tools, Identity, Productivity) vẫn còn.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

## Sắp xếp (REQ-ADMINCATEGORIES-03)

### TC-ADMINCATEGORIES-021 — Moving the second row up makes it first, with focus kept

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (vị trí 2 → 1 → 2), giá trị biên (BVA), a11y — dòng 1, 6, 12
- **Tiền điều kiện:** chụp lại thứ tự và khôi phục sau khi chạy
- **Bước:**
  1. ↑ ở dòng thứ hai; nhấn Enter trên nút ↓ đang có focus.
- **Mong đợi:** nó lên đầu, nút ↑ của nó bị disable và focus chuyển sang nút ↓ của nó; Enter đưa nó về chỗ cũ và focus vẫn giữ.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMINCATEGORIES-022 — A failed move leaves the order unchanged

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (move bị stub trả 500, không cập nhật optimistic) — dòng 10, DR-15
- **Tiền điều kiện:** move bị stub
- **Bước:**
  1. Bấm một nút ↑.
- **Mong đợi:** các dòng giữ nguyên như trước.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMINCATEGORIES-023 — A tab with a stale order shows the server's order after a move

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (state client đã cũ) — dòng 11
- **Tiền điều kiện:** một "tab" khác (API) đưa category cuối lên đầu trước; khôi phục sau khi chạy
- **Bước:**
  1. Trên trang đã cũ, bấm ↑ ở category đó.
- **Mong đợi:** bảng hiện nó ở đầu, đúng như trên server.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMINCATEGORIES-024 — Two concurrent moves never fail and leave distinct sort orders

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (race) — dòng 11
- **Tiền điều kiện:** khôi phục thứ tự sau khi chạy
- **Bước:**
  1. Đưa dòng 2 và dòng 3 lên song song.
- **Mong đợi:** cả hai 200; mọi `sortOrder` đều khác nhau.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

## Xoá kèm chuyển app (REQ-ADMINCATEGORIES-04)

### TC-ADMINCATEGORIES-025 — A category no app uses is deleted after a plain confirmation

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (orphan = 0, tổng = 0) — dòng 5, 6
- **Tiền điều kiện:** một category `E2E …` rỗng
- **Bước:**
  1. Xoá nó.
- **Mong đợi:** "No app uses this category."; sau "Delete category" dòng biến mất.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-026 — Apps that keep another category only lose this one

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (orphan 0, tổng > 0) — dòng 11
- **Tiền điều kiện:** mượn Notes với `[Productivity, temp]`; khôi phục sau khi chạy
- **Bước:**
  1. Xoá category tạm.
- **Mong đợi:** "1 app uses this category." và "…only loses this one"; Notes còn lại `[Productivity]`.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-027 — Orphans move to a shared target, an override survives a change of the shared target

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (orphan > 0, đích chung + 1 override), chuyển trạng thái (giữ override / đặt lại về "(shared)") — dòng 11
- **Tiền điều kiện:** mượn Team Calendar, Notes, Operations Console vào một category tạm; khôi phục sau khi chạy
- **Bước:**
  1. Override Notes → Identity; đích chung → Content, rồi Productivity; đặt Operations Console → Identity rồi về lại "Productivity (shared)"; xoá.
- **Mong đợi:** bộ đếm 0/3 → 1/3 → 3/3, nút xoá bị disable cho tới khi đủ; Notes giữ Identity; Team Calendar và Operations Console kết thúc ở Productivity.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-028 — Orphans set per app go to different targets

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (orphan > 0, chỉ đặt theo từng app; thiếu một → disable) — dòng 11
- **Tiền điều kiện:** mượn Team Calendar và Notes; khôi phục sau khi chạy
- **Bước:**
  1. Đặt Team Calendar → Content; quan sát; đặt Notes → Identity; xoá.
- **Mong đợi:** "1 app still needs a new category." với nút xoá bị disable; sau đó mỗi app kết thúc ở đích riêng của nó.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-029 — An app orphaned after the dialog opened forces a reload, keeping choices

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: impact đã đổi → 409) — dòng 11
- **Tiền điều kiện:** mượn Team Calendar; Notes được chuyển vào category qua API trong lúc dialog đang mở
- **Bước:**
  1. Chọn đích cho Team Calendar; bấm xoá; chọn đích cho Notes; xoá.
- **Mong đợi:** 409 → dialog tải lại có thêm Notes, giữ lựa chọn của Team Calendar và disable nút xoá cho tới khi Notes có đích; sau đó cả hai được chuyển.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-030 — A target deleted in another tab is dropped from the dialog

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (đích không hợp lệ) — DR-18
- **Tiền điều kiện:** category nguồn và đích `E2E …`; đích bị xoá qua API sau khi đã được chọn
- **Bước:**
  1. Bấm xoá.
- **Mong đợi:** nút xoá lại bị disable, đích không còn trong danh sách chọn, dialog vẫn mở.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-031 — Dialog state does not leak to the next category's dialog

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (mở A → huỷ → mở B)
- **Tiền điều kiện:** hai category `E2E …`, mỗi cái có một orphan
- **Bước:**
  1. Ở A chọn một đích chung, Cancel; mở B.
- **Mong đợi:** "Move all to" của B hiện "Choose a category…" và nút xoá bị disable.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-032 — Double-clicking delete sends one request

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chặn submit lặp)
- **Tiền điều kiện:** một category `E2E …` rỗng
- **Bước:**
  1. Double-click "Delete category".
- **Mong đợi:** đúng một DELETE.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-033 — Loading shows a skeleton; a failed impact offers retry and no delete

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (delete-impact bị trễ rồi trả 500) — dòng 10
- **Tiền điều kiện:** delete-impact bị stub
- **Bước:**
  1. Mở dialog xoá; sau khi lỗi, gỡ stub rồi bấm "Try again".
- **Mong đợi:** skeleton `aria-busy`; "Couldn't load the apps in this category." với nút xoá bị disable; sau đó "No app uses this category.".
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-034 — The last category that still has apps cannot be deleted

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (chỉ còn một category, orphan > 0; list + impact bị stub)
- **Tiền điều kiện:** các stub
- **Bước:**
  1. Mở dialog xoá của nó.
- **Mong đợi:** `Can't delete "<name>"`, không có nút xoá, "Got it" đóng dialog.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMINCATEGORIES-035 — The delete dialog renders in Vietnamese

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi) — dòng 9
- **Tiền điều kiện:** một category tạm chứa Team Calendar; khôi phục sau khi chạy
- **Bước:**
  1. `/vi/admin/categories` → "Xoá <vi name>"; "Chuyển tất cả sang" → "Nội dung"; mở select theo từng app.
- **Mong đợi:** "1/1 đã có đích"; lựa chọn "Nội dung (chung)".
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

## Category trên app (REQ-ADMINAPPS-02 cùng REQ-ADMINCATEGORIES-01/02/04)

### TC-ADMINCATEGORIES-036 — A second category keeps the first as primary, in order everywhere

- **Requirement:** REQ-ADMINAPPS-02, REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (2 category) — dòng 1, 8
- **Tiền điều kiện:** mượn Blog; khôi phục sau khi chạy
- **Bước:**
  1. Sửa Blog, thêm Identity, lưu; mở `/apps`.
- **Mong đợi:** chip "Content · Primary · Identity"; lưu `[content, identity]`; card của Blog liệt kê Content rồi Identity.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-037 — Removing the primary promotes the next one, and the order survives

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (bỏ primary) — dòng 11
- **Tiền điều kiện:** Blog với `[Content, Identity]`; khôi phục sau khi chạy
- **Bước:**
  1. Bỏ Content, lưu, mở lại; sửa một field khác và lưu.
- **Mong đợi:** Identity là Primary sau khi mở lại; lần lưu thứ hai không đổi category.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-038 — Unticking then re-ticking a category moves it to the end

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái — dòng 11
- **Tiền điều kiện:** Blog với `[Content, Identity]`
- **Bước:**
  1. Bỏ tick rồi tick lại Content.
- **Mong đợi:** "Identity · Primary · Content".
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-039 — 0 categories is refused; 5 locks the rest and quick create

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (0 / 5) — dòng 4, 6
- **Tiền điều kiện:** ≥ 6 category (thêm hai cái `E2E …`)
- **Bước:**
  1. Bỏ category duy nhất của Blog và lưu; tick năm lựa chọn.
- **Mong đợi:** "Select at least one category."; "At most 5 categories. Remove one to choose another.", lựa chọn thứ sáu và "Create category" bị disable.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-040 — Picker search is accent-insensitive and an exact match offers no create

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (vi bỏ dấu / khớp một phần / khớp chính xác) — dòng 7, DR-17
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tìm "nang suat", "prod", "content".
- **Mong đợi:** Productivity và không có create; Productivity kèm `Create category "prod"`; Content và không có create.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-041 — Quick create from the picker selects the new category; cancel keeps the form

- **Requirement:** REQ-ADMINCATEGORIES-02, REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (picker → quick create → huỷ / tạo) — dòng 1, 6
- **Tiền điều kiện:** Blog với `[Content]`; category mới bị xoá sau khi chạy
- **Bước:**
  1. Tìm một tên mới → `Create category "<name>"` → Cancel; lặp lại → điền vi → "Create and select"; lưu.
- **Mong đợi:** field tiếng Anh được điền sẵn; Cancel để form app y như cũ; sau đó chip xuất hiện và Blog lưu `[content, new]`.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-042 — Filtering /apps matches a category in any position

- **Requirement:** REQ-ADMINCATEGORIES-01, REQ-ADMINAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (primary / secondary / không có) — dòng 7
- **Tiền điều kiện:** Blog với `[Content, Identity]`
- **Bước:**
  1. Mở `/apps?categoryId=<identity>`; reload.
- **Mong đợi:** có Blog (secondary) và IDMS Portal (primary), không có Notes; bộ lọc vẫn còn sau reload.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-043 — A filter on a deleted category is dropped, not an error

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (id cũ trên URL) — dòng 7
- **Tiền điều kiện:** một category được tạo rồi xoá
- **Bước:**
  1. Mở `/apps?categoryId=<deleted>` và `/admin/apps?categoryId=<deleted>`.
- **Mong đợi:** không có UI lỗi (không có `role=alert` ngoài route announcer của Next); bộ lọc cũ bị bỏ và danh sách không lọc hiện ra. Ma trận thiết kế (dòng 7) yêu cầu empty state; hành vi đã ship là bỏ bộ lọc, được ghi nhận như quan sát được.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-044 — A Vietnamese name that is in no locale file shows on /vi/apps

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi, tên đến từ dữ liệu) — dòng 9
- **Tiền điều kiện:** một category mới trên Blog; khôi phục sau khi chạy
- **Bước:**
  1. Mở `/vi/apps`.
- **Mong đợi:** hiện "Thử nghiệm ngôn ngữ"; tên tiếng Anh không hiện.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-045 — A narrow card shows the primary plus "+N", and tapping it opens nothing

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (độ rộng container ở 1024 px, cảm ứng) — dòng 8, DR-20
- **Tiền điều kiện:** Blog với ba category
- **Bước:**
  1. Chạm "Show 2 more categories"; chạm ra ngoài.
- **Mong đợi:** một popover liệt kê đủ ba; không mở trang mới; popover đóng khi chạm ra ngoài.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-046 — 100-character names do not cause horizontal scroll on a phone

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (độ dài tên 100 × viewport 375) — dòng 8
- **Tiền điều kiện:** một category 100 ký tự trên Blog
- **Bước:**
  1. Mở `/apps` ở 375 px.
- **Mong đợi:** `scrollWidth` ≤ `innerWidth`.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMINCATEGORIES-047 — New categories reach other pages without a reload

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (invalidate cache) — dòng "Cache"
- **Tiền điều kiện:** không có; xoá sau khi chạy
- **Bước:**
  1. Tạo một category, điều hướng phía client sang App Registry, mở picker của Blog.
- **Mong đợi:** category mới có trong danh sách chọn.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

## Hợp đồng API (REQ-ADMINCATEGORIES-01 … 04)

### TC-ADMINCATEGORIES-048 — The public list exposes only id, slug and name

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (lộ field) — dòng 3
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /api/v1/apps/categories`.
- **Mong đợi:** 200, `cache-control` có `max-age=60`, mỗi item đúng `_id`, `name`, `slug`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-049 — App DTOs carry categories in the admin's order

- **Requirement:** REQ-ADMINAPPS-02, REQ-ADMINCATEGORIES-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (thứ tự Identity, Content) — dòng 3, 8
- **Tiền điều kiện:** mượn Notes; khôi phục sau khi chạy
- **Bước:**
  1. Đặt Notes thành `[identity, content]`; `GET /api/v1/apps?search=notes`.
- **Mong đợi:** `categories` theo đúng thứ tự đó, mỗi phần tử chỉ có `_id`, `name`, `slug`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-050 — Slug and sortOrder in a create body are ignored

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (mass assignment)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST` với `slug: "hacked"`, `sortOrder: -5`.
- **Mong đợi:** 201, slug sinh từ tên, `sortOrder` ≥ 0.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-051 — PATCH with an empty or blank body is refused

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (`{}` / `{ name: {} }` / vi chỉ có khoảng trắng)
- **Tiền điều kiện:** mỗi body một category `E2E …`
- **Bước:**
  1. `PATCH` với từng body.
- **Mong đợi:** 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-052 — A zero-width duplicate of an existing name is a conflict

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (chuẩn hoá) — DR-11
- **Tiền điều kiện:** seed Content
- **Bước:**
  1. `POST` en `Con​tent` (có zero-width space ở giữa).
- **Mong đợi:** 409.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-053 — An emoji-only English name is refused

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (không có slug) — DR-12
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST` en `🚀🚀`.
- **Mong đợi:** 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-054 — Two 100-character names with the same slug both save, the second suffixed

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (slug 100 ký tự + hậu tố) — DR-13
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST` hai tên chỉ khác nhau ở dấu câu.
- **Mong đợi:** cả hai 201; slug thứ hai kết thúc bằng `-2` và ≤ 100 ký tự.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-055 — Malformed id, unknown id and bad direction

- **Requirement:** REQ-ADMINCATEGORIES-03, REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /garbage/delete-impact`, `GET /<zero id>/delete-impact`, `POST /:id/move` với `sideways`.
- **Mong đợi:** 400, 404, 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-056 — The admin list is complete, ordered and ignores pagination

- **Requirement:** REQ-ADMINCATEGORIES-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (shape), đoán lỗi (error guessing) (`?page=2&limit=1`) — dòng 6 (DR-10, không phân trang)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /admin/categories` và `?page=2&limit=1`.
- **Mong đợi:** mỗi item có `_id`, `slug`, `name {en, vi}`, `sortOrder`, `appCount`, sắp theo `sortOrder`; lời gọi có phân trang vẫn trả về tất cả.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-057 — Reassigning an app that still has another category is refused untouched

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (chuyển app kiểu IDOR)
- **Tiền điều kiện:** Notes với `[Content, temp]`; khôi phục sau khi chạy
- **Bước:**
  1. `DELETE` temp kèm chuyển Notes sang Identity.
- **Mong đợi:** 409; Notes vẫn là `[Content, temp]`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-058 — Deleting with orphans and no body is refused

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (thiếu reassignments)
- **Tiền điều kiện:** Team Calendar chỉ nằm trong một category tạm
- **Bước:**
  1. `DELETE` không có body.
- **Mong đợi:** 400 `CATEGORY_REASSIGN_REQUIRED`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-059 — A target that is itself, malformed, or 501 entries is refused

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (đích là chính nó / id rác), giá trị biên (BVA) (501 = max + 1)
- **Tiền điều kiện:** Team Calendar chỉ nằm trong một category tạm
- **Bước:**
  1. `DELETE` với từng body.
- **Mong đợi:** `CATEGORY_REASSIGN_INVALID`; 400; 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-060 — An app's categoryIds: 0, 6, duplicates and unknown ids refused; 5 accepted

- **Requirement:** REQ-ADMINAPPS-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (0 / 5 / 6), phân vùng tương đương (EP) (trùng, không tồn tại)
- **Tiền điều kiện:** mượn Notes; thêm ba category `E2E …`
- **Bước:**
  1. `PATCH /admin/apps/<notes>` với từng `categoryIds`.
- **Mong đợi:** 400, 400, 400, 400; 5 → 200.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-061 — Two concurrent creates with the same name: one 201, one 409

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (race) — DR-16
- **Tiền điều kiện:** không có
- **Bước:**
  1. Hai `POST` song song cùng một tên.
- **Mong đợi:** status `[201, 409]`, không bao giờ 500.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-062 — Two concurrent creates with the same slug both save, one suffixed

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (race) — DR-16
- **Tiền điều kiện:** không có
- **Bước:**
  1. Hai `POST` song song với tên chỉ khác nhau ở dấu câu.
- **Mong đợi:** cả hai 201; một slug bằng slug kia cộng `-2`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-063 — Names of 100 characters are accepted and 101 refused by the API

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (en và vi 100 / 101), phân vùng tương đương (EP) (thiếu vi) — dòng 4 "API direct → 400"
- **Tiền điều kiện:** không có
- **Bước:**
  1. `POST` en 100 + vi 100; en 101; vi 101; không có vi.
- **Mong đợi:** 201, 400, 400, 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-064 — The slug folds accents, symbols and emoji

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (`Phân Tích`, `R&D / Ops`, `Apps 🚀`, `Đa dạng`) — dòng 4
- **Tiền điều kiện:** không có
- **Bước:**
  1. Tạo mỗi tên một category (tiền tố `E2E`, hậu tố là run tag).
- **Mong đợi:** slug `…phan-tich…`, `…r-d-ops…`, `…apps…`, `…da-dang…`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-065 — Renaming onto another category's English name is a conflict

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (trùng không phân biệt hoa thường khi update)
- **Tiền điều kiện:** một category `E2E …`
- **Bước:**
  1. `PATCH` en của nó thành `IDENTITY`.
- **Mong đợi:** 409; tên và slug của nó không đổi.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-066 — Reassigning an outside or unknown app is a conflict; a duplicated app is refused

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (appId không thuộc category / appId không tồn tại / appId lặp)
- **Tiền điều kiện:** Team Calendar chỉ nằm trong một category tạm
- **Bước:**
  1. `DELETE` kèm thêm một reassignment cho Blog; cho một id không tồn tại; với Team Calendar hai lần.
- **Mong đợi:** 409, 409, 400; category và cả hai app không đổi.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-067 — Moving past either end changes nothing

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** giá trị biên (BVA) (↑ ở đầu, ↓ ở cuối)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Đưa category đầu tiên lên và category cuối cùng xuống.
- **Mong đợi:** cả hai 200; thứ tự không đổi.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-068 — The sheet focuses the English field, closes on Escape and returns focus

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (a11y) — dòng 12
- **Tiền điều kiện:** không có
- **Bước:**
  1. Mở "New category"; nhấn Escape.
- **Mong đợi:** "Name (English)" có focus khi mở; sheet đóng và "New category" nhận lại focus. (Từng là BUG-ADMINCATEGORIES-01, đã sửa 2026-10-15.)
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`

### TC-ADMINCATEGORIES-069 — A rate-limited create shows the server's message and keeps the values

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (POST bị stub trả 429) — dòng 10
- **Tiền điều kiện:** POST bị stub
- **Bước:**
  1. Điền cả hai tên; "Create".
- **Mong đợi:** message trong body 429 hiện thành toast; sheet vẫn mở và giữ giá trị tiếng Anh.
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`

### TC-ADMINCATEGORIES-070 — Required and duplicate errors render in Vietnamese

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi), bảng quyết định (cả hai rỗng; en trùng × vi hợp lệ) — dòng 9
- **Tiền điều kiện:** seed Identity
- **Bước:**
  1. `/vi/admin/categories` → "Tạo danh mục" → "Tạo" khi trống; rồi en `identity`, vi hợp lệ → "Tạo".
- **Mong đợi:** "Hãy nhập tên tiếng Anh.", "Hãy nhập tên tiếng Việt."; sau đó "Đã có danh mục với tên tiếng Anh này.".
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`

## Phản hồi sau thao tác (REQ-ADMINCATEGORIES-02 … 04)

### TC-ADMINCATEGORIES-071 — Create, save and delete each confirm with a toast and an announcement

- **Requirement:** REQ-ADMINCATEGORIES-02, REQ-ADMINCATEGORIES-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (chưa có → đã tạo → đã sửa → đã xoá), a11y — quyết định Q6
- **Tiền điều kiện:** không có; category tạo ra bị xoá ngay trong test
- **Bước:**
  1. Ghi lại vùng `#announcer`; tạo một category `E2E …`, đổi tên vi rồi lưu, rồi xoá nó.
- **Mong đợi:** lần lượt toast "Category created.", "Category saved.", "Category deleted."; vùng announce đã nói
  "Category <name> created.", "Category <name> saved.", "Category <name> deleted.".
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMINCATEGORIES-072 — A move is announced with the category's new position

- **Requirement:** REQ-ADMINCATEGORIES-03
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (a11y), giá trị biên (BVA) (lên vị trí 1) — quyết định Q6
- **Tiền điều kiện:** chụp lại thứ tự và khôi phục sau khi chạy
- **Bước:**
  1. Ghi lại vùng `#announcer`; ↑ ở dòng thứ hai.
- **Mong đợi:** dòng đó lên đầu và vùng announce nói "<name> moved to position 1.".
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMINCATEGORIES-073 — The edit sheet is prefilled and says how many apps use the category

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** chuyển trạng thái (mở sửa → huỷ), phân vùng tương đương (EP) (category có 1 app)
- **Tiền điều kiện:** seed Identity (1 app)
- **Bước:**
  1. "Edit Identity"; đọc hai ô tên, mô tả và slug; "Cancel".
- **Mong đợi:** hai ô mang tên en / vi hiện tại, mô tả "1 app uses this category.", slug `identity`; Cancel đóng sheet
  mà không đổi gì.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

## Hợp đồng API bổ sung (REQ-ADMINCATEGORIES-02 … 05)

### TC-ADMINCATEGORIES-074 — Unknown ids are 404 CATEGORY_NOT_FOUND on update, move and delete

- **Requirement:** REQ-ADMINCATEGORIES-02, REQ-ADMINCATEGORIES-03, REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (id đúng định dạng nhưng không tồn tại)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `PATCH`, `POST …/move`, `DELETE` với id `000…0` (`Accept-Language: en`).
- **Mong đợi:** cả ba 404, `code` `CATEGORY_NOT_FOUND`, message "Category not found.".
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-075 — A refused create carries its error code and the message in the caller's language

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (locale en / vi)
- **Tiền điều kiện:** seed Content
- **Bước:**
  1. `POST` en `content` với `Accept-Language: en`, rồi `vi`.
- **Mong đợi:** cả hai 409 `CATEGORY_NAME_TAKEN`; message lần lượt là bản en và bản vi của `category:errors.nameTaken`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-076 — A delete answers 204, lists the impact first and moves every orphan

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin
- **Kỹ thuật:** bảng quyết định (1 orphan + 1 app còn category khác), chuyển trạng thái (tồn tại → đã xoá)
- **Tiền điều kiện:** category tạm chứa Team Calendar (chỉ nó) và Notes (`[Productivity, temp]`); khôi phục sau khi chạy
- **Bước:**
  1. `GET …/delete-impact`; `DELETE` kèm chuyển Team Calendar sang Content; `GET …/delete-impact` lần nữa.
- **Mong đợi:** impact `total: 2`, `orphaned` đúng `[{ _id, displayName: "Team Calendar" }]`; DELETE 204; category biến
  mất khỏi danh sách; Team Calendar là `[content]`, Notes là `[productivity]`; impact sau đó 404.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-077 — Category changes are rate limited per admin

- **Requirement:** REQ-ADMINCATEGORIES-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin (throwaway)
- **Kỹ thuật:** giá trị biên (BVA) (120 / 121 request), bảo mật (spam) — quyết định Q5
- **Tiền điều kiện:** một admin throwaway; counter `rate-limit:category-mutation:*` đã xoá; `keepRateLimits`
- **Bước:**
  1. Gửi 120 lần `PATCH` / `move` / `DELETE` xen kẽ tới một id không tồn tại; rồi lần thứ 121; rồi `GET` danh sách;
     rồi một `move` bằng `admin@test.com`.
- **Mong đợi:** 120 lần đầu 404; lần 121 là 429 `TOO_MANY_REQUESTS` với message "Too many requests. Please try again
  later"; `GET` vẫn 200; admin khác vẫn 404 (không bị chặn).
- **Automated:** `tests/api/admin-categories/rate-limit.api.ts`

### TC-ADMINCATEGORIES-078 — Delete refusals carry the documented error codes

- **Requirement:** REQ-ADMINCATEGORIES-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** phân vùng tương đương (EP) (đích không tồn tại / app lặp / app không phải orphan) — design §3.4, quyết định Q7
- **Tiền điều kiện:** Team Calendar chỉ nằm trong một category tạm
- **Bước:**
  1. `DELETE` với đích `000…0`; với Team Calendar hai lần; với thêm Blog (không thuộc category).
- **Mong đợi:** 400 `CATEGORY_REASSIGN_INVALID`; 400 `CATEGORY_REASSIGN_INVALID`; 409 `CATEGORY_IMPACT_CHANGED` — kèm
  message đã dịch. (Từng là BUG-ADMINCATEGORIES-02, đã sửa 2026-10-15: kiểm app lặp chuyển vào service.)
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMINCATEGORIES-079 — Changing only the letter case of the English name keeps the slug

- **Requirement:** REQ-ADMINCATEGORIES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** admin
- **Kỹ thuật:** đoán lỗi (error guessing) (viết HOA), giá trị biên (BVA) (trùng với chính nó) — design §3.4
- **Tiền điều kiện:** một category `E2E …`
- **Bước:**
  1. `PATCH` en của nó thành bản viết HOA.
- **Mong đợi:** 200; tên mới được lưu; slug không đổi và không có hậu tố.
- **Automated:** `tests/api/admin-categories/categories.api.ts`
