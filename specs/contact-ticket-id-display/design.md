# Design — Contact: hiển thị Mã ticket bằng `_id` rút gọn + gỡ Danh mục

## Bối cảnh & vấn đề

Feature Contact/Support (gửi phản hồi + admin xem) có 2 lỗi hiển thị, cùng một nguyên nhân gốc:

1. **Mã ticket trống** — FE render `item.ticketNumber` / `contact.ticketNumber` nhưng BE **không có** field `ticketNumber` (model `contacts` chỉ có `email, subject, priority, message, status, timestamps`). DTO trả `_id` (list/detail) và `id` (submit), không có `ticketNumber` → FE nhận `undefined` → ô trống.
2. **Danh mục trả về key** — FE render `tCategory(contact.category)` nhưng BE **không có** field `category`. `tCategory(undefined)` khiến next-intl trả về đường dẫn key (`contactAdmin.form.category...`) thay vì nhãn.

Đây là **contract drift**: FE được build quanh 2 field mà BE chưa từng implement.

## Quyết định (chốt với user)

- **Gỡ hẳn "Danh mục"** khỏi FE — không còn đúng thực tế.
- **Mã ticket = `_id` rút gọn** (6 ký tự đầu + `...`), render qua **1 component dùng chung** `ShortId` để tái sử dụng.
- **Gỡ luôn filter "Mã ticket"** — BE không xử lý (search chỉ theo subject+email) và lọc tay theo `_id` rút gọn là vô nghĩa.
- **BE không đổi** — đã trả sẵn `_id`/`id`.
- Isolation: **git worktree** cho `client/` + `docs/` (branch `fix/contact-ticket-id-display`).

## Phạm vi (FE-only)

### 1. Component dùng chung mới — `ShortId`
- Vị trí: `client/src/components/ShortId/index.tsx` (dùng chung nhiều view → `views.md` quy tắc #1).
- API: `<ShortId value={string} className?={string} />`.
- Render: `<span>` `font-mono`, nội dung `value.slice(0, 6) + "..."`, `title={value}` (hover thấy full `_id`; hỗ trợ a11y/copy).
- Edge: `value` ngắn hơn 6 ký tự → `slice` tự xử lý êm; `value` rỗng → render `"..."` (thực tế `_id` luôn có).

### 2. Nối Mã ticket vào `_id`
| Chỗ | Trước | Sau |
|---|---|---|
| `views/AdminContact/mains/AdminContactTable` | `{item.ticketNumber}` | `<ShortId value={item._id} />` |
| `views/AdminContactDetail/mains/ContactDetailCard` | `{contact.ticketNumber}` | `<ShortId value={contact._id} />` |
| `components/SupportDialog/mains/SupportSuccess` | prop `ticketNumber` (undefined) | `<ShortId value={id} />` (id từ response) |

Kéo theo (đổi tên/kiểu theo `id`):
- `types/Support`: `SubmitSupportResponse` đổi `{ ticketNumber }` → `{ id }`.
- `requests/support.ts`: không đổi logic (đã trả `response.data.data` chứa `id`), chỉ theo type mới.
- `components/SupportDialog/hooks/useSupportSubmit.ts`: `onSuccess(response.id)`; announce dùng `id` rút gọn.
- `components/SupportDialog/index.tsx` + `mains/SupportForm`: đổi callback `onSubmitted(ticketNumber)` → `onSubmitted(id)`, state `ticketNumber` → `id`.
- `mains/SupportSuccess`: prop `ticketNumber` → `id`, render `<ShortId value={id} />`.

### 3. Gỡ "Danh mục" khỏi FE (toàn bộ)
- `views/AdminContact/mains/AdminContactTable`: bỏ cột Category (header + cell), bỏ `tCategory`, bỏ category khỏi `params`, bỏ import `isContactCategory`.
- `views/AdminContactDetail/mains/ContactDetailCard`: bỏ block `<dt>/<dd>` Danh mục + `tCategory`.
- `dataSources/ContactAdmin`: bỏ `CONTACT_CATEGORY_VALUES`, bỏ param `tCategory` + category filter def **và** ticketNumber filter def; gọn `labels`.
- `utils/index.ts`: bỏ `isContactCategory` + import `CONTACT_CATEGORY_VALUES` + type `ContactCategory`.
- `types/ContactAdmin`: bỏ `ContactCategory`; bỏ `category` + `ticketNumber` khỏi `ContactListItem`/`ContactDetailItem`/`UserContactItem`/`AdminContactQuery`; bỏ `"category"` khỏi `sortBy` union.
- i18n `en/vi contactAdmin.json`: bỏ `form.category`, `admin.list.table.category`, `admin.list.filters.category`, `admin.list.filters.ticketNumber`, `admin.detail.fields.category`, `admin.detail.updateCategory`, `myContacts.table.category`; cập nhật `filters.searchPlaceholder` (bỏ "mã ticket"). Giữ label `table.ticketNumber` / `detail.fields.ticketNumber` (vẫn hiển thị ShortId).

### 4. BE — không đổi.

## Ngoài scope
BE cũng không trả `userId`, `ipAddress`, `attachmentCount`/`attachments`; UI degrade êm (ẩn/hiện "—"), user không báo → giữ nguyên.

## Đơn vị & ranh giới
- `ShortId` là unit độc lập: input `value`, output span rút gọn; không phụ thuộc feature contact → tái dùng nơi khác.
- Contact list/detail/success chỉ đổi cách render 1 giá trị + bỏ 1 cột/field → không đổi luồng dữ liệu, không đổi API.

## E2E Scenario Matrix

Trigger: thay đổi **behavior user thấy được** (cột ticket giờ có giá trị, cột Danh mục biến mất, màn success đổi hiển thị) → matrix áp dụng. Đây là **reconcile fix** trên feature đã có (chưa từng có matrix/e2e) → build matrix cho **phạm vi thay đổi**.

Cột `Gate`: `A+B` = cả 2 gate chạy; `A only` = mutation-heavy, gate B chỉ verify read/render.

| #   | Category            | Áp dụng | Scenario + expected | Gate |
| --- | ------------------- | ------- | ------------------- | ---- |
| 1   | Happy path          | ✅ | (a) Admin mở `/admin/contact` → mỗi row cột "Mã ticket" hiện ShortId = 6 ký tự đầu `_id` + `...` (không rỗng). (b) Admin mở detail → header hiện ShortId. (c) Guest/user gửi form support → màn success hiện ShortId của `id` trả về. **[EP]** `_id` chuẩn 24-hex → render `abcdef...` | A+B |
| 2   | AuthN               | ✅ | Chưa đăng nhập vào `/admin/contact` → redirect login (guard sẵn có, không đổi). Form support là public → gửi không cần login (giữ nguyên). | A+B |
| 3   | AuthZ               | ✅ | User thường (non-admin) gọi list/detail contact → BE 403 (FE không có role guard riêng — CLAUDE.md admin suites). Verify hành vi không đổi sau thay đổi. | A only |
| 4   | Validation / param  | ✅ | **[EP]** URL cũ còn `?category=technical` (filter đã gỡ) → param bị bỏ qua, list không bị lọc, không lỗi. `?ticketNumber=abc` tương tự bị bỏ qua. Form support validation không đụng → **N/A** phần form. | A+B |
| 5   | Empty / null        | ✅ | (a) List rỗng → empty state (không đổi). (b) **[BVA]** `ShortId` với `value` dài `<6` → render toàn bộ + `...`; `value=""` → `...` (đơn vị test riêng, `_id` thực luôn có). | A+B |
| 6   | Boundary/pagination | N/A | Logic phân trang/sort không đổi trong thay đổi này (chỉ gỡ filter category/ticket + đổi render 1 ô). | — |
| 7   | Filter / search     | ✅ | (a) Toolbar **không còn** filter "Danh mục" và "Mã ticket". (b) Filter còn lại (status, email, dateRange) + search vẫn chạy và **persist URL**. **[DT]** status × email kết hợp vẫn lọc đúng. | A+B |
| 8   | Data rendering      | ✅ | Cột ticket hiện ShortId (không rỗng, không full 24 ký tự). **Không còn** bất kỳ chuỗi key i18n rò rỉ (`contactAdmin.form.category...`) ở list lẫn detail — chính là bug gốc. | A+B |
| 9   | **i18n**            | ✅ | Render list + detail + success ở **en VÀ vi**: header "Ticket"/"Mã ticket" hiện đúng; ShortId giống nhau (không phụ thuộc locale); **không** còn cột/label "Category/Danh mục"; **không** có chuỗi missing-message. Bắt bug key-leak ở cả 2 locale. | A+B |
| 10  | Error / loading     | N/A | Skeleton + error UI của list/detail không đổi trong thay đổi này. | — |
| 11  | Mutation safety     | ✅ | **[ST]** Gửi support (mutation tạo contact) → chuyển mode success hiện ShortId → "Gửi yêu cầu khác" reset về form. Double-submit → nút disable khi `isPending`. Status update mutation không đụng → phần đó **N/A**. Gate B **không** tạo contact song song. | A only |
| 12  | Accessibility       | ✅ | `ShortId` có `title` = full `_id` (hover/screen-reader thấy đủ); span semantic; header cột giữ `scope="col"`. Điều hướng bàn phím bảng không đổi. | A+B |
| —   | ShortId reuse (đặc thù) | ✅ | Cùng 1 component `ShortId` render nhất quán ở 3 nơi (list, detail, success) — cùng độ rút gọn + `title`. | A+B |

Completeness critic: chạy khi user yêu cầu "kỹ/đủ/≥90%" trước khi chốt.
