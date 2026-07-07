# Header Search — Design

## 1. Mục tiêu & Scope

Wire ô `<SearchInput>` sẵn có trong `AppHeader` thành **combobox + popover** cho phép tìm app từ bất kỳ trang dashboard nào. **FE-only** — không đụng backend.

**In scope**: popover search trong header, gợi ý app (empty query), kết quả search (debounced), mở app, "View All", a11y combobox, i18n en+vi.
**Out of scope (YAGNI)**: không tracking "recently used" thật, không đụng trang RecentlyUsed, không endpoint BE mới, không đổi hành vi mobile search button (giữ nguyên).

## 2. Reuse (không tạo trùng)

| Cần | Tái dùng |
| --- | --- |
| Ô input + Search icon | `@/components/SearchInput` |
| Popover | `@/components/ui/popover` (pattern như `layouts/AppHeader/components/NotificationPanel`) |
| Fetch apps + search | `views/Apps/hooks/useApps` → `getApps({ search, limit })` (`/apps?search=`, đã có, paginated) |
| Debounce | `@/hooks` `useDebouncedValue` |
| Announce SR | `@/hooks` `useAnnounce` |
| Navigate (i18n) | `@/i18n/navigation` `useRouter` |
| Ảnh icon app | `@/components/CustomImage` |
| Route apps | `CONSTANTS.ROUTES.APPS` (`/apps`) |
| Icon | `icon-map`: Search, `ArrowUpRight` (open), `Sparkles`/`Search` (suggested), History N/A |

API contract: **không đổi**. `UserApp = { _id, displayName, description, iconUrl, homeUrl, category, isFavorite }`. Header search chỉ đọc.

## 3. Kiến trúc component

`layouts/AppHeader/components/HeaderSearch/` (chỉ dùng trong AppHeader → đặt local layout, không phải `components/` chung):

- `index.tsx` — orchestrator: state (query, open, activeIndex), debounce, gọi `useApps`, render `SearchInput` + `Popover`.
- `mains/ResultList/index.tsx` — render danh sách row (suggested | results | empty | loading skeleton), keyboard nav.
- `components/ResultRow/index.tsx` — 1 row: icon tile `bg-primary/10` + name + category + `ArrowUpRight`.

Thay thế `<SearchInput>` inline hiện tại trong `AppHeader/index.tsx` bằng `<HeaderSearch />` (bỏ local `searchValue` state cũ).

## 4. Data flow & States

```
focus/click input ─▶ open popover
  query rỗng/blank  ─▶ Suggested apps: useApps({ limit: 5 })            (no search)
  query có chữ      ─▶ debounce 300ms ─▶ useApps({ search: q, limit: 5 })
     ├ isLoading    ─▶ skeleton rows
     ├ data.items>0 ─▶ result rows (+ footer "View All" nếu total > hiển thị)
     └ data.items=0 ─▶ empty state "No apps found" + hint
select row (click/Enter) ─▶ window.open(homeUrl, "_blank", "noopener,noreferrer")
"View All"/Enter khi có query ─▶ router.push(`${ROUTES.APPS}?search=${q}`) (trang Apps đọc qua useListQuery)
Esc / click ngoài ─▶ close
```

- **Race guard**: React Query key `[APPS, {search,limit}]` tự dedupe/cancel-stale — response cũ không đè query mới (đã có cơ chế cache theo key).
- **Announce**: khi có kết quả → `announce(t("dashboard.header.announce.results", { count }))`; empty → announce no-results.

## 5. i18n (thêm vào namespace `dashboard.header`, en + vi)

`searchPlaceholder`, `searchLabel` (đã có) + mới: `suggestedLabel` ("Suggested apps"/"Ứng dụng gợi ý"), `resultsLabel`, `noResults` ("No apps found"/"Không tìm thấy ứng dụng"), `noResultsHint`, `viewAll` ("View All"/"Xem tất cả"), `openLabel` ("Open"/"Mở"), `announce.results`, `announce.noResults`, `announce.opened`.

## 6. Edge / an toàn

- Blank/whitespace query → coi như empty → suggested (trim trước khi quyết định search).
- Debounce 300ms; React Query `staleTime` 5min cache suggested.
- Popover width khớp input; z-index trên header (`z-20`).
- Không sửa `components/ui/*`; input qua `SearchInput`.
- Mobile: search button hiện tại giữ nguyên (không mở popover ở mobile trong scope này — flag follow-up).

## 7. Accessibility

Input `role="combobox"` `aria-expanded` `aria-controls` → listbox; row `role="option"` `aria-selected`. Keyboard: ↓/↑ di chuyển activeIndex, Enter mở app đang active (hoặc điều hướng search nếu không có active), Esc đóng. Focus ring giữ. Announce số kết quả.

## E2E Scenario Matrix

Feature **read-only** (search + mở app external). Không có mutation dữ liệu. Gate mặc định `A+B` (không có row `A only` vì không mutate).

| # | Category | Scenario / Expected | Gate |
| --- | --- | --- | --- |
| 1 | Happy path | Focus input (empty) → popover mở, hiện **Suggested apps** (≤5 row từ `/apps`). Gõ "a" → sau debounce hiện kết quả match. Click 1 row → gọi `window.open(homeUrl)`. | A+B |
| 2 | AuthN | Truy cập trang dashboard khi chưa đăng nhập → AuthGuard redirect `/login` (header + search không render). | A+B |
| 3 | AuthZ | User thường & admin đều thấy header search (không role-gate). Trên route `/admin/*` search vẫn hoạt động. **[DT]** (role × route) → cùng behavior. | A+B |
| 4 | Validation / input | **[EP]** query classes: `empty`→suggested · `"   "` (whitespace)→suggested (trim) · `"photo"` (match)→results · `"zzzz"` (no-match)→empty state · `"<script>"`/emoji `"📷"` (special/unicode)→gọi search an toàn, empty/results không crash. | A+B |
| 5 | Empty / null | `/apps` trả rỗng (suggested) → empty state. Search no-match → "No apps found". App có `category=null`/`iconUrl=null` → row hiện fallback initial, không "null". | A+B |
| 6 | Boundary / pagination | **[BVA]** kết quả cap ở `limit=5`: total `=5`→không footer "View All"; total `>5`→hiện "View All". Query 1 ký tự (min để search) vẫn chạy. Debounce: gõ nhanh 3 ký tự trong <300ms → chỉ 1 request cho chuỗi cuối **[BVA timing]**. | A+B |
| 7 | Filter / search | Match theo name **và** description (BE lo). "View All" → điều hướng `/apps?search=<q>` và trang Apps **persist** `search` trong URL + hiện đúng list. **[DT]** (query empty × non-empty) → suggested vs results. | A+B |
| 8 | Data rendering | Row hiện `displayName` (không phải `_id`), `category` label (không slug), icon từ `iconUrl` qua `CustomImage` hoặc initial. Không lộ raw JSON/null. | A+B |
| 9 | **i18n** | Render popover ở **en + vi**: placeholder, "Suggested apps"/"Ứng dụng gợi ý", "No apps found"/"Không tìm thấy ứng dụng", "View All"/"Xem tất cả", "Open"/"Mở". Không có missing-key. | A+B |
| 10 | Error / loading | `/apps` 5xx/network → popover hiện error/empty an toàn (không crash, không spinner vĩnh viễn). Trong lúc chờ → skeleton rows. | A+B |
| 11 | Mutation safety | **N/A** — feature không ghi dữ liệu (search read-only; mở app = external nav, không mutate). **[ST]** state popover: closed→open(focus)→typing(loading)→results→select(open+close) / Esc(close). Invalid transition: gõ rồi xoá hết → quay lại suggested (không kẹt ở empty); response cũ không đè query mới (race, dedupe theo query key). | A+B |
| 12 | Accessibility | Selector role/label: input `role=combobox` `aria-expanded`; rows `role=option`. ↓/↑ đổi active, Enter mở app active, Esc đóng + focus trả về input. Announce số kết quả (`aria-live`). | A+B |

**Error-guessing (fold-in)**: double Enter (mở 1 lần), paste query có trailing space (trim), emoji query không crash, click ngoài lúc đang loading → đóng gọn, chuyển locale khi popover mở → chuỗi đổi ngay.
