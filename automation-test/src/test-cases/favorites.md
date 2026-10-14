# FAVORITES — test case

Gắn sao app từ tile, trang `/favorites`, việc lưu bền và tính riêng tư của danh sách yêu thích (REQ-FAVORITES-01…08).
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/favorites.md

### TC-FAVORITES-001 — Zero favourites shows the empty state

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (số lượng 0)
- **Tiền điều kiện:** đã xoá hết yêu thích qua API
- **Bước:**
  1. Mở `/favorites`.
- **Mong đợi:** "You haven't favorited any apps yet."
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-002 — Exactly one favourite renders one card

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (số lượng 1)
- **Tiền điều kiện:** yêu thích = [A]
- **Bước:**
  1. Mở `/favorites`.
- **Mong đợi:** hiện card của A và đó là card duy nhất.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-003 — Several favourites render as a grid

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (số lượng nhiều), happy path
- **Tiền điều kiện:** yêu thích = [A, B, C]
- **Bước:**
  1. Mở `/favorites`.
- **Mong đợi:** đúng ba card A, B, C.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-004 — Search narrows the favourites and clears

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (khớp / không khớp / đã xoá)
- **Tiền điều kiện:** yêu thích = [A, B, C]
- **Bước:**
  1. Tìm B; 2. tìm "zzz-no-such-app"; 3. xoá ô tìm kiếm.
- **Mong đợi:** chỉ còn B; sau đó là empty state; rồi lại hiện đủ các card.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-005 — The category filter narrows the favourites and clears

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (một category), chuyển trạng thái (đã lọc → đã xoá lọc)
- **Tiền điều kiện:** yêu thích = [A, B, C]
- **Bước:**
  1. Mở Filters, chọn category đầu tiên; 2. "Clear all".
- **Mong đợi:** URL có `categoryId`, mọi yêu thích trả về đều mang category đó,
  badge hiện "1"; Clear all gỡ nó khỏi URL.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-006 — The search term survives a reload

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (state trên URL qua reload)
- **Tiền điều kiện:** yêu thích = [A, B]
- **Bước:**
  1. Mở `/favorites?search=<B>`; reload.
- **Mong đợi:** chỉ có B cả trước và sau reload; `search` vẫn giữ tên của B.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-007 — Sort by Recent vs by Name

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** bảng quyết định (sort recent / name), phân vùng tương đương (EP)
- **Tiền điều kiện:** đã yêu thích A, rồi B, rồi C theo đúng thứ tự đó
- **Bước:**
  1. Mở `/favorites`; đổi sort sang "Name".
- **Mong đợi:** Recent = C, B, A (mới nhất trước); Name = A, B, C.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-008 — Unstarring on `/favorites` removes the card at once

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (yêu thích → không), optimistic UI
- **Tiền điều kiện:** yêu thích = [A, B]
- **Bước:**
  1. Bấm trái tim của A trên `/favorites`.
- **Mong đợi:** card của A biến mất ngay; B vẫn còn.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-009 — A guest cannot reach `/favorites`

- **Requirement:** REQ-FAVORITES-03, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (không có session)
- **Tiền điều kiện:** context sạch
- **Bước:**
  1. Mở `/favorites`.
- **Mong đợi:** hiện lối đăng nhập "Continue with email"; không có toolbar danh sách.
- **Automated:** `tests/e2e/favorites/guest-redirect.e2e.ts`

### TC-FAVORITES-010 — The heart's label is localised on `/apps`

- **Requirement:** REQ-FAVORITES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi), đoán lỗi (error guessing) (key thô)
- **Tiền điều kiện:** A chưa được yêu thích
- **Bước:**
  1. Mở `/apps`, rồi `/vi/apps`.
- **Mong đợi:** "Add to favorites: A" / "Thêm vào yêu thích: A"; trang không có
  key thô `favorites.*` / `apps.card.*` nào.
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAVORITES-011 — `/favorites` chrome is localised

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi)
- **Tiền điều kiện:** yêu thích = [A]
- **Bước:**
  1. Mở `/favorites` và `/vi/favorites`; mở menu sort.
- **Mong đợi:** placeholder "Search favorites..." / "Tìm trong yêu thích...",
  sort "Sort: …" / "Sắp xếp: …" với Recent/Name và Gần đây/Tên.
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAVORITES-012 — The empty state is localised

- **Requirement:** REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** i18n (en + vi)
- **Tiền điều kiện:** không có yêu thích nào
- **Bước:**
  1. Mở `/favorites` và `/vi/favorites`.
- **Mong đợi:** "You haven't favorited any apps yet." / "Bạn chưa yêu thích ứng dụng nào."
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAVORITES-013 — Starring from a tile persists across reloads

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-03
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái (tắt → bật → reload → tắt → reload)
- **Tiền điều kiện:** A chưa được yêu thích
- **Bước:**
  1. Bấm trái tim của A trên `/apps`; reload; bấm lần nữa; reload.
- **Mong đợi:** POST, `aria-pressed="true"` còn nguyên sau reload; DELETE,
  `false` còn nguyên sau reload.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-014 — A rapid double click settles without error

- **Requirement:** REQ-FAVORITES-01
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (error guessing) (submit hai lần)
- **Tiền điều kiện:** A chưa được yêu thích
- **Bước:**
  1. Bấm nhanh trái tim của A hai lần; reload.
- **Mong đợi:** không lỗi; sau reload trái tim ở một trạng thái xác định.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-015 — `/apps` and `/favorites` stay consistent

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-02
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái giữa các trang
- **Tiền điều kiện:** A chưa được yêu thích
- **Bước:**
  1. Gắn sao A trên `/apps`; mở `/favorites`; bỏ sao ở đó; quay lại `/apps`.
- **Mong đợi:** A có trên `/favorites` với trái tim đang bấm; sau khi bỏ sao, A
  rời danh sách và trái tim trên `/apps` lại là dạng viền.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-016 — A failed toggle rolls back and is announced

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-07
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (error guessing) (5xx khi mutation)
- **Tiền điều kiện:** `POST /users/me/favorites/:id` bị stub trả 500
- **Bước:**
  1. Bấm trái tim của A trên `/apps`.
- **Mong đợi:** trái tim quay về `aria-pressed="false"`, `#announcer`
  đọc "Failed to update favorites.", và API vẫn chưa có yêu thích nào.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-020 — Add → list → remove round-trip

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần
- **Kỹ thuật:** chuyển trạng thái (không có → gắn sao → không có)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. List; POST; list; DELETE; list.
- **Mong đợi:** `[]`; 201; `[app]`; 204; `[]`.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-021 — Add and remove are idempotent

- **Requirement:** REQ-FAVORITES-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** đoán lỗi (error guessing) (lặp lại)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. POST hai lần; DELETE hai lần.
- **Mong đợi:** 201, 201 với đúng một bản ghi; 204, 204 với không bản ghi nào.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-022 — Input validation

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-02, REQ-FAVORITES-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (id sai định dạng / không tồn tại, sort sai, categoryId sai), giá trị biên (BVA) (search 201)
- **Tiền điều kiện:** không có
- **Bước:**
  1. POST/DELETE `not-an-id`; POST `ffff…`; GET với `sort=popular`,
     `categoryId=nope`, một search dài 201 ký tự.
- **Mong đợi:** 400, 400; 404 kèm error `code`; 400, 400, 400.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-023 — Only visible apps can be favourited

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user dùng một lần, admin
- **Kỹ thuật:** bảng quyết định (vai trò × admin-only / inactive)
- **Tiền điều kiện:** các app fixture
- **Bước:**
  1. Với vai trò user, POST app admin-only và app inactive; 2. với vai trò admin, POST
     app admin-only (rồi DELETE) và app inactive.
- **Mong đợi:** user: 404, 404, không lưu gì; admin: 201 rồi 204, inactive 404.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-024 — Favourites are private to each user

- **Requirement:** REQ-FAVORITES-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** hai user dùng một lần
- **Kỹ thuật:** đoán lỗi (error guessing) (IDOR giữa các tài khoản)
- **Tiền điều kiện:** hai tài khoản mới
- **Bước:**
  1. Alice gắn sao A, Bob gắn sao B; 2. Bob DELETE A; 3. so sánh `isFavorite` trên `/apps`.
- **Mong đợi:** mỗi danh sách chỉ chứa app của chính mình; DELETE của Bob không đụng
  đến yêu thích của Alice; `isFavorite` của A là true với Alice và false với Bob.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-025 — Sort orders

- **Requirement:** REQ-FAVORITES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** phân vùng tương đương (EP) (mặc định / recent / name)
- **Tiền điều kiện:** ba app được gắn sao theo thứ tự tên
- **Bước:**
  1. GET không có sort, `sort=recent`, `sort=name`.
- **Mong đợi:** mới nhất trước với mặc định và recent; theo bảng chữ cái với name.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-026 — The endpoints require a session

- **Requirement:** REQ-FAVORITES-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (không có token)
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET, POST, DELETE không kèm token.
- **Mong đợi:** mỗi request 401.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-027 — Favourites persist across sessions

- **Requirement:** REQ-FAVORITES-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** chuyển trạng thái (session 1 → session 2)
- **Tiền điều kiện:** tài khoản mới
- **Bước:**
  1. Gắn sao một app; đăng nhập lại trong context mới; list và đọc `/apps`.
- **Mong đợi:** yêu thích có trong danh sách và `isFavorite` là true.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-028 — Search and category narrow the list

- **Requirement:** REQ-FAVORITES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** phân vùng tương đương (EP) (khớp / không khớp / category)
- **Tiền điều kiện:** ba app đã được gắn sao
- **Bước:**
  1. `search=<name>`, `search=zzz…`, `categoryId=<id>`.
- **Mong đợi:** app có tên đó; `[]`; chỉ những yêu thích mang category đó.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-029 — A revoked favourite is hidden, not deleted, and returns on re-grant

- **Requirement:** REQ-FAVORITES-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** chuyển trạng thái (gắn sao → bị thu hồi → khôi phục)
- **Tiền điều kiện:** tài khoản dùng một lần đã gắn sao Notes
- **Bước:**
  1. Thu hồi Notes; mở `/favorites`; gỡ override; reload.
- **Mong đợi:** không có card Notes và `GET /users/me/favorites` rỗng trong lúc
  bị thu hồi; sau đó card quay lại và yêu thích vẫn giữ Notes.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-FAVORITES-030 — Access, not role, decides what can be starred

- **Requirement:** REQ-FAVORITES-01, REQ-FAVORITES-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** bảng quyết định (role mặc định × override allow / deny)
- **Tiền điều kiện:** app admin-only fixture; một app user thấy theo role
- **Bước:**
  1. POST app admin-only; 2. admin cấp `allow` cho app đó, POST lại, list; 3. admin `deny` app theo role, POST app đó.
- **Mong đợi:** 404; 201 và danh sách = [app admin-only]; 404 và danh sách không đổi.
- **Automated:** `tests/api/favorites/visibility.api.ts`

### TC-FAVORITES-031 — A deactivated favourite is hidden, kept, and returns when reactivated

- **Requirement:** REQ-FAVORITES-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần (+ admin API)
- **Kỹ thuật:** chuyển trạng thái (active → inactive → active)
- **Tiền điều kiện:** app fixture user được mở (override `allow`), đã gắn sao
- **Bước:**
  1. Admin chuyển app sang inactive; list yêu thích và `GET /apps`; 2. admin chuyển lại active; list và `GET /apps`.
- **Mong đợi:** lúc inactive app vắng ở cả hai; active lại thì yêu thích có app đó và `isFavorite` là true (bản ghi không
  bị xoá).
- **Automated:** `tests/api/favorites/visibility.api.ts`

### TC-FAVORITES-032 — Unknown, inactive and forbidden apps get the same 404

- **Requirement:** REQ-FAVORITES-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** bảo mật (không lộ app tồn tại), phân vùng tương đương (EP) (không tồn tại / inactive / admin-only)
- **Tiền điều kiện:** các app fixture
- **Bước:**
  1. POST `ffff…`, app inactive, app admin-only.
- **Mong đợi:** cả ba 404 `FAVORITE_APP_NOT_FOUND`, cùng message, không có `errors`; không lưu gì.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-033 — Search length boundary: 200 accepted, 201 rejected

- **Requirement:** REQ-FAVORITES-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** giá trị biên (BVA) (200 / 201 ký tự), đoán lỗi (error guessing) (khoảng trắng hai đầu)
- **Tiền điều kiện:** không có
- **Bước:**
  1. GET với `search` 200 ký tự; 201 ký tự; 200 ký tự kèm một dấu cách mỗi đầu.
- **Mong đợi:** 200; 400 `VALIDATION_ERROR` với đúng một lỗi `search` / `string.max`; 200 (trim trước khi đếm).
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-034 — Search ignores case and surrounding spaces and combines with the category

- **Requirement:** REQ-FAVORITES-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** user dùng một lần
- **Kỹ thuật:** đoán lỗi (error guessing) (viết HOA, khoảng trắng), bảng quyết định (search × category)
- **Tiền điều kiện:** ba app đã được gắn sao
- **Bước:**
  1. `search=  <TÊN VIẾT HOA>  `; 2. `search=<tên>&categoryId=<category của app>`; 3. `search=<tên>&categoryId=<category
khác>`.
- **Mong đợi:** app có trong 1 và 2; không có trong 3.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAVORITES-035 — A failed load shows the error message, not the empty state

- **Requirement:** REQ-FAVORITES-07
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (error guessing) (5xx khi tải danh sách)
- **Tiền điều kiện:** yêu thích = [A]; mọi `GET /users/me/favorites` bị stub trả 500
- **Bước:**
  1. Mở `/favorites`, chờ React Query thử lại xong.
- **Mong đợi:** hiện "Could not load favorites. Please try again."; không hiện "You haven't favorited any apps yet.".
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-036 — A failed toggle also raises an error toast

- **Requirement:** REQ-FAVORITES-07
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** đoán lỗi (error guessing) (5xx khi mutation)
- **Tiền điều kiện:** `POST /users/me/favorites/:id` bị stub trả 500
- **Bước:**
  1. Bấm trái tim của A trên `/apps`.
- **Mong đợi:** toast "Server error. Please try again later." (toast lỗi toàn cục, Q2); trái tim vẫn `aria-pressed="false"`.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-037 — The heart works from the keyboard and announces the result

- **Requirement:** REQ-FAVORITES-08
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng truy cập (bàn phím, live region)
- **Tiền điều kiện:** A chưa được yêu thích
- **Bước:**
  1. Focus trái tim của A trên `/apps`, nhấn Space; 2. nhấn Enter.
- **Mong đợi:** POST 201, `aria-pressed="true"`, announce "Added to favorites."; DELETE 204, `aria-pressed="false"`,
  announce "Removed from favorites."; API không còn yêu thích nào.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAVORITES-038 — Unstarring from the keyboard keeps focus on the page

- **Requirement:** REQ-FAVORITES-08
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** user
- **Kỹ thuật:** khả năng truy cập (quản lý focus), chuyển trạng thái (card bị gỡ)
- **Tiền điều kiện:** yêu thích = [A, B]
- **Bước:**
  1. Trên `/favorites` focus trái tim của A, nhấn Enter.
- **Mong đợi:** card A biến mất; focus nằm trên một phần tử của trang (trái tim kế tiếp / lưới), không rơi về `<body>`.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAVORITES-039 — Starring from a Home tile shows up on `/favorites`

- **Requirement:** REQ-FAVORITES-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user
- **Kỹ thuật:** chuyển trạng thái giữa các trang
- **Tiền điều kiện:** không có yêu thích nào
- **Bước:**
  1. Mở Home (`/`), bấm trái tim đầu tiên (app X); 2. mở `/favorites`.
- **Mong đợi:** POST 201 và API có đúng [X]; `/favorites` hiện card X với trái tim đang bấm.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`
