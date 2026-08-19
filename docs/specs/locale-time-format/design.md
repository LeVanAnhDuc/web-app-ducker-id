# Design — Thống nhất format thời gian theo locale (locale-time-format)

## Mục tiêu

Mọi thời gian hiển thị trong UI (`client/`) phải format theo **locale của app** (next-intl: `en` | `vi`), **không** theo locale của trình duyệt. Sửa các nơi đang sai hoặc chưa dùng formatter, và gom về **một nguồn duy nhất** để tái sử dụng.

Hướng chốt: **A** — tôn trọng locale app + hiển thị theo **múi giờ local của máy user**.

## Vấn đề hiện tại (inconsistent — 5 cách)

| Cách | Vị trí | Vấn đề |
|------|--------|--------|
| `toLocaleString(undefined, …)` (Intl) | `utils/index.ts`: `formatDateShort`, `formatDateTimeShort`, `formatDateTimeMedium`, `formatDateLong` → dùng ở hầu hết bảng Admin | **Dùng locale trình duyệt, KHÔNG phải locale app** → vi user + trình duyệt en vẫn thấy ngày kiểu en |
| `date-fns format()` + locale | `DateOfBirthField`, `BirthdayInput` | Đúng locale ✅ (nhưng là input form → ngoài scope) |
| `date-fns formatDistanceToNow()` | `utils/notifications.ts`: `relativeTime()` → `NotificationPanel` | Đúng locale ✅ |
| Tự tính tay | `formatLastUsed`, `Footer.getFullYear()` | Rải rác, không qua locale |
| Parse thủ công | `parseLocalDate`, `formatYmdLocal` | Phục vụ form/query → ngoài scope |

## Kiến trúc & engine

Một nguồn duy nhất: `client/src/utils/datetime.ts` (module mới), expose:

- **Pure core (không phụ thuộc React, dễ test):** `formatDateTime(value, variant, locale)`
  - `variant: 'dateLong' | 'datetime' | 'relative'`
  - `locale: 'en' | 'vi'` (BCP-47 hợp lệ → đưa thẳng vào `Intl`)
  - `dateLong`, `datetime` → **`Intl.DateTimeFormat(locale, …)`** (built-in, 0 bundle, tự lấy **local timezone** của máy user)
  - `relative` → **`date-fns/formatDistanceToNow`** với locale object (`vi` / `enUS`)
  - Input bất thường (`null` / `undefined` / `""` / malformed) → trả fallback an toàn (`"—"`), KHÔNG "Invalid Date", không throw.

**Engine lai:** `Intl` cho thời gian tuyệt đối (quy ước locale chuẩn + 0 cost), `date-fns` cho tương đối (đã làm tốt sẵn).

### Bộ 3 kiểu format

| Kiểu | en | vi |
|------|----|----|
| `dateLong` | `June 29, 2026` | `29 tháng 6, 2026` |
| `datetime` | `Jun 29, 2026, 3:04 PM` | `29 thg 6, 2026, 15:04` |
| `relative` | `2 hours ago` | `2 giờ trước` |

> Bỏ kiểu `date` (short) — mọi chỗ dùng short date chuyển sang `dateLong`.

## API tiêu thụ (2 lớp, dùng chung pure core)

Tất cả 7 component tiêu thụ đều là Client Component (`'use client'`) → hook `useLocale()` dùng được mọi nơi.

**1. Component `<FormatTime>` — primary (hiển thị JSX, ~90% ca):**

```tsx
<FormatTime value={app.updatedAt} variant="datetime" />
// → <time dateTime={app.updatedAt} suppressHydrationWarning>29 thg 6, 2026, 15:04</time>
```

- Tự lấy locale qua `useLocale()` → caller không truyền.
- Render thẻ `<time dateTime={iso}>` chuẩn HTML (a11y/SEO; attr ISO ổn định, machine-readable).
- Xử lý hydration nội bộ (xem dưới).

**2. Hook `useFormatTime()` — cho trường hợp cần CHUỖI** (aria-label, tooltip, ghép chuỗi):

```tsx
const ft = useFormatTime();        // bound vào locale hiện tại
const label = ft('datetime', iso); // → string
```

Không thêm gì khác (YAGNI).

## Hydration & timezone

Hướng A (giờ local user) gây rủi ro: server (Next.js, thường UTC) format khác client (GMT+7) → hydration mismatch. **Lưu ý:** `'use client'` KHÔNG tránh được — Client Component vẫn render 1 lượt ở server để tạo HTML ban đầu rồi mới hydrate; chỉ code chạy **sau mount** (`useEffect`) mới thực sự client-only.

Cách xử lý trong `<FormatTime>`:

- Thẻ `<time dateTime={iso} suppressHydrationWarning>`.
- Hook `useHasMounted()` (set flag trong `useEffect`): **trước mount** render fallback ổn định (giống nhau 2 phía — ISO hoặc format theo UTC cố định); **sau mount** format lại theo **local tz** + locale.
- `suppressHydrationWarning` nuốt cảnh báo ở riêng node text này.

→ Không hydration mismatch; giờ đúng local tz; `<time>` vẫn machine-readable cho bot/screen-reader.

## Di trú call-sites

**Thay sang dùng mới (hiển thị):**

| Call-site | Hàm cũ | → Mới |
|-----------|--------|-------|
| `AdminContactTable` | `formatDateShort` | `<FormatTime variant="dateLong">` |
| `AdminAppsTable`, `AdminUsersTable`, `AdminLoginHistoryTable`, `LoginHistoryTableRow`, `AdminEntitlementsTable` | `formatDateTimeShort` | `<FormatTime variant="datetime">` |
| `ContactDetailCard`, `LoginHistoryDetailCard` | `formatDateTimeMedium` | `<FormatTime variant="datetime">` |
| `NotificationPanel` | `relativeTime(iso, locale)` | core `relative` (hook hoặc `<FormatTime variant="relative">`) |

**Xoá (sau khi hết tham chiếu):** `formatDateShort`, `formatDateTimeShort`, `formatDateTimeMedium`, `formatDateLong`, `formatLastUsed`; chuyển logic `relativeTime` (`utils/notifications.ts`) vào core mới (giữ re-export mỏng nếu còn import khác).

**GIỮ NGUYÊN — ngoài scope (parse/format-để-gửi-BE, không phải hiển thị):** `parseLocalDate`, `formatYmdLocal`, `getDateOfBirthBounds`, `computeDateRange`, `CustomDateInput`, `DateOfBirthField`/`BirthdayInput`, `Footer.getFullYear()` (chỉ là năm copyright).

> Nguyên tắc: chỉ chuẩn hoá phần **HIỂN THỊ** thời gian cho user.

## Đơn vị (units) & isolation

- `formatDateTime(value, variant, locale)` — pure, test độc lập (mock locale + value, không cần DOM).
- `useHasMounted()` — hook nhỏ, tách riêng, tái dùng được.
- `useFormatTime()` — wrap core + `useLocale()`.
- `<FormatTime>` — wrap core + `useHasMounted()` + `useLocale()`, render `<time>`.

## E2E Scenario Matrix

Thay đổi **chỉ hiển thị** (read-only, không mutation, không form mới) → nhiều dòng N/A có lý do.

| # | Nhóm | Trạng thái | Scenario / lý do | Gate |
|---|------|-----------|------------------|------|
| 1 | Happy path | ✅ | Admin tables (Apps/Users/LoginHistory/Contact/Entitlements) + detail cards render `datetime`; NotificationPanel render `relative`. Locale `en` → đúng format en. | A+B |
| 2 | AuthN | N/A | Không đổi auth; trang đã sau guard sẵn. | — |
| 3 | AuthZ | N/A | Không đổi role-visibility. | — |
| 4 | Validation | N/A | Không có input/form trong scope. | — |
| 5 | Empty / null | ✅ | **[EP]** giá trị: `valid ISO` → format · `null`/`undefined` → fallback "—"/"Never" (KHÔNG "Invalid Date") · `""`/malformed → fallback an toàn, không crash. (vd `lastLoginAt` null.) | A+B |
| 6 | Boundary | ✅ | **[BVA]** timezone date-boundary: `2026-06-29T18:00:00Z` @GMT+7 → `dateLong` phải sang **30/6** (đúng local). Relative thresholds: `<1 phút` → "just now"/"vài giây trước" · `~59` vs `~61` phút. | A+B |
| 7 | Filter / search | N/A | Không đổi filter/search. | — |
| 8 | Data rendering | ✅ | **Cốt lõi**: hiển thị đã format, KHÔNG lộ ISO thô / `null` / raw; `datetime` có ngày+giờ; thẻ `<time dateTime>` mang ISO chuẩn. | A+B |
| 9 | **i18n** | ✅ **bắt buộc** | **[EP]** locale: `en` → `Jun 29, 2026, 3:04 PM` · `vi` → `29 thg 6, 2026, 15:04`; relative `en` "2 hours ago" / `vi` "2 giờ trước". Render key states ở **cả 2 locale**. | A+B |
| 10 | Error / loading | N/A | Không thêm API call/fetch mới; bad input cover ở #5. | — |
| 11 | Mutation safety | N/A | Pure display, không write. | — |
| 12 | Accessibility | ✅ | `<time dateTime={iso}>` semantic; selector qua role/text; máy đọc được ISO. | A+B |
| 13 | Hydration (đặc thù) | ✅ | **[Error Guessing]** Sau load + hydrate: **KHÔNG hydration mismatch warning** trong console (gate B check `browser_console_messages`); text đúng local tz sau mount. | A+B |

Không có dòng `A only` (không mutation) → gate A & B chạy full như nhau.

## Files dự kiến đụng (chi tiết hoá ở plan.md)

- **Mới:** `client/src/utils/datetime.ts` (core + `useFormatTime` + `useHasMounted`), `client/src/components/FormatTime/index.tsx`.
- **Sửa:** 7 component tiêu thụ (bảng + detail card + NotificationPanel), `client/src/utils/index.ts` (xoá hàm cũ), `client/src/utils/notifications.ts`.
- **E2E:** `client/e2e/locale-time-format/*.e2e.ts` + `docs/specs/locale-time-format/e2e.md` (expand ở writing-plans).

## Out of scope

- Form date input / parse-để-gửi-BE (`CustomDateInput`, `DateOfBirthField`, `BirthdayInput`).
- Date-range filter logic (`computeDateRange`, `formatYmdLocal`).
- Footer copyright year.
- BE: không đụng `server/`.
