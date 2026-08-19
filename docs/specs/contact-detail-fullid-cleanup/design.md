# Design — Contact detail: full ticket id + breadcrumb id + remove Files column

## Bối cảnh

Tiếp theo feature `contact-ticket-id-display` (đã merge): admin Contact hiển thị ticket = `_id` rút gọn (`ShortId`) và đã gỡ Danh mục. Yêu cầu tinh chỉnh tiếp:

1. **Detail card**: hiện **full `_id`** ticket (thay vì rút gọn) — để admin đọc/copy trọn mã.
2. **Breadcrumb**: item cuối ("current") hiện **full `_id`** ticket thay cho chữ "Chi tiết"/"Detail".
3. **Table list**: bỏ cột **"Tệp"** (attachments) — cột này hiển thị `attachmentCount` mà BE không trả (luôn "—").

FE-only, BE không đổi (BE trả `_id`/route param `id` sẵn có).

## Phạm vi

| # | Thay đổi | File |
|---|---|---|
| 1 | `ContactDetailCard`: header ticket `<ShortId value={contact._id}/>` → `{contact._id}` (giữ `font-mono`); bỏ import `ShortId` (không còn dùng trong file này) | `views/AdminContactDetail/mains/ContactDetailCard/index.tsx` |
| 2 | `CustomBreadcrumbItem` thêm `label?: string`; `CustomBreadcrumb` render `item.label ?? t(item.key)` (backward-compat: item cũ không có `label` vẫn dịch qua `key`; `t(key)` chỉ gọi khi không có `label`) | `types/CustomBreadcrumb`, `components/CustomBreadcrumb/index.tsx` |
| 3 | Breadcrumb dataSource: đổi const → builder `buildAdminContactDetailBreadcrumb(id: string)` trả `[{ key: "list", href: ADMIN_CONTACT }, { key: "current", label: id }]` | `dataSources/AdminContactDetail/index.ts` |
| 4 | `AdminContactDetailHeader` nhận prop `{ id: string }`, dùng builder; `AdminContactDetail` truyền `id` xuống header | `views/AdminContactDetail/mains/AdminContactDetailHeader/index.tsx`, `views/AdminContactDetail/index.tsx` |
| 5 | Gỡ key i18n dead `admin.detail.breadcrumb.current` (en + vi) | `locales/en|vi/contactAdmin.json` |
| 6 | Bỏ cột "Tệp": header `{tTable("attachments")}` + cell `attachmentCount`; gỡ `attachmentCount` khỏi `ContactListItem`; gỡ key i18n `admin.list.table.attachments` (en + vi) | `views/AdminContact/mains/AdminContactTable/index.tsx`, `types/ContactAdmin/index.ts`, `locales/en|vi/contactAdmin.json` |

**Giữ nguyên:** `ShortId` ở table list (cột mã ticket vẫn rút gọn) + màn support success. PageTitle "Contact Detail" giữ nguyên. Attachments ở **detail** (`ContactAttachments` main) không đụng — chỉ bỏ CỘT trong table list.

## Đơn vị & ranh giới
- `CustomBreadcrumb` được mở rộng generic (`label?` override) — backward-compatible, mọi breadcrumb hiện tại chạy nguyên; dùng lại được cho breadcrumb động khác (vd login-history detail sau này).
- Header detail thành client-independent về data: nhận `id` từ route param (luôn có, không cần chờ fetch contact).

## E2E Scenario Matrix (delta — reconcile suite `e2e/contact/`)

Đây là **sửa feature đã có** (`e2e/contact/contact-display.e2e.ts` + `contact-ticket-id-display/e2e.md`) → **reconcile**: ADD case mới, UPDATE case đổi expected, không rebuild.

Cột `Gate`: `A+B` (gate B = MCP walk, chạy khi môi trường có Playwright MCP — hiện có thể thiếu, flag skip).

| #   | Category            | Áp dụng | Scenario + expected (delta) | Gate |
| --- | ------------------- | ------- | --------------------------- | ---- |
| 1   | Happy / data-render | ✅ (UPDATE + ADD) | **UPDATE**: detail card header giờ hiện **full `_id`** (24-hex), KHÔNG phải `...` rút gọn. **ADD**: breadcrumb item cuối hiện full `_id` (khớp route param), không phải chữ "Detail/Chi tiết". **[EP]** id 24-hex hợp lệ. | A+B |
| 4   | Validation          | N/A | Không thêm input/param mới; route param id đã có. | — |
| 5   | Empty / null        | N/A | Không đổi empty-state; detail luôn có `_id`. | — |
| 7   | Filter / search     | ✅ (verify không hồi quy) | Bỏ cột "Tệp" không đụng filter; filter status/email/dateRange vẫn chạy. | A+B |
| 8   | Data rendering      | ✅ (UPDATE) | **UPDATE**: table list KHÔNG còn cột "Tệp"/"Files" (header + cell attachmentCount biến mất). List ticket vẫn ShortId (`...`). | A+B |
| 9   | **i18n**            | ✅ (UPDATE) | Ở **en + vi**: breadcrumb hiện id (giống nhau, không phụ thuộc locale); KHÔNG còn chuỗi "Detail"/"Chi tiết" ở breadcrumb; KHÔNG còn header cột "Files"/"Tệp"; không missing-key. | A+B |
| 12  | Accessibility       | ✅ | Breadcrumb id nằm trong `BreadcrumbPage` (current, non-link) — đúng semantic; detail full id là text `font-mono` đọc được trọn. | A+B |
| —   | Không hồi quy (giữ) | ✅ | Các case cũ vẫn xanh: list ShortId ticket, category đã gỡ (column/filter/leak key). | A+B |

Rows 2/3 (authN/authZ), 6 (pagination), 10 (error/loading), 11 (mutation): **N/A** — không đổi trong delta này (kế thừa từ feature gốc).
