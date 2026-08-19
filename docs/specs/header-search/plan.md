# Header Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Wire the existing header `<SearchInput>` into a combobox+popover that searches apps via the existing `/apps?search=` API, with suggested apps on empty query.

**Architecture:** New `layouts/AppHeader/components/HeaderSearch/` (orchestrator + `mains/ResultList` + `components/ResultRow`). Reuses `SearchInput`, shadcn `Popover`, `useApps`, `useDebouncedValue`, `useAnnounce`, i18n `useRouter`. FE-only, no BE change.

**Tech Stack:** Next.js 15, React 19, TS, Tailwind 4, shadcn, next-intl, React Query.

## Global Constraints (verbatim từ design.md + client CLAUDE.md)

- FE-only. KHÔNG đụng `server/`, không endpoint mới. Search dùng `/apps?search=` + `limit`.
- Type props **inline** tại destructuring; shared type ở `src/types/`. Reuse `UserApp` từ `@/types/Apps`.
- UI có behavior → dùng `SearchInput`/`CustomButton`/shadcn, KHÔNG raw `<input>`/`<button>`/`<a>`. Ảnh qua `CustomImage`.
- Navigation qua `@/i18n/navigation`. Paths/keys qua `CONSTANTS`. Icon tra `icon-map` (`Search`, `ArrowUpRight`, `Sparkles`).
- Mọi string qua i18n `dashboard.header` (en + vi), không hardcode. Announce qua `useAnnounce` (key i18n).
- Vertical rhythm `flex flex-col gap-*`. Token màu (`bg-primary/10`, `text-muted-foreground`, `border-border`, `bg-popover`), radius `rounded-md` rows / `rounded-lg` popover / `rounded-xl` tile, `shadow-md` popover.
- Sau mỗi task: `cd client && yarn lint && npx tsc --noEmit` phải xanh.

---

### Task 1: Foundation — i18n keys + result limit constant

**Files:**
- Modify: `client/src/locales/en/dashboard.json` (object `header`)
- Modify: `client/src/locales/vi/dashboard.json` (object `header`)
- Modify/Create: `client/src/constants/` — thêm `HEADER_SEARCH_RESULT_LIMIT = 5` (đặt cùng nhóm common constants; đọc `constants/index.ts` để chọn file đúng)

**Interfaces — Produces:** i18n keys dưới `dashboard.header`: `suggestedLabel`, `resultsLabel`, `noResults`, `noResultsHint`, `viewAll`, `openLabel`, `announce.results`, `announce.noResults`, `announce.opened`. Constant `CONSTANTS.<...>.HEADER_SEARCH_RESULT_LIMIT`.

- [ ] **Step 1:** Đọc `en/dashboard.json` + `vi/dashboard.json`, xác định `header` object hiện có (`appName`, `searchPlaceholder`, `searchLabel`, `notificationsLabel`, `menuToggleLabel`, …).
- [ ] **Step 2:** Thêm keys mới vào `header` (giữ nguyên keys cũ). EN: `suggestedLabel:"Suggested apps"`, `resultsLabel:"Apps"`, `noResults:"No apps found"`, `noResultsHint:"Try a different keyword"`, `viewAll:"View All"`, `openLabel:"Open"`, `announce:{ results:"{count} apps found", noResults:"No apps found", opened:"Opening {name}" }`. VI tương ứng: `"Ứng dụng gợi ý"`, `"Ứng dụng"`, `"Không tìm thấy ứng dụng"`, `"Thử từ khoá khác"`, `"Xem tất cả"`, `"Mở"`, announce `"{count} ứng dụng"`, `"Không tìm thấy ứng dụng"`, `"Đang mở {name}"`.
- [ ] **Step 3:** Thêm constant `HEADER_SEARCH_RESULT_LIMIT = 5` vào nhóm constants phù hợp + export qua `CONSTANTS`.
- [ ] **Step 4:** `cd client && yarn lint && npx tsc --noEmit` → xanh.
- [ ] **Step 5:** Commit `feat(header-search): i18n keys + result limit constant`.

---

### Task 2: ResultRow component

**Files:**
- Create: `client/src/layouts/AppHeader/components/HeaderSearch/components/ResultRow/index.tsx`

**Interfaces — Consumes:** `UserApp` (`@/types/Apps`), `CustomImage`, `ArrowUpRight` (lucide). **Produces:** default export `ResultRow`.

- [ ] **Step 1:** Viết component. Props inline:
```tsx
// libs
import { ArrowUpRight } from "lucide-react";
// types
import type { UserApp } from "@/types/Apps";
// components
import CustomImage from "@/components/CustomImage";
// others
import { cn } from "@/libs/utils";

const ResultRow = ({
  app,
  openLabel,
  isActive,
  onSelect
}: {
  app: UserApp;
  openLabel: string;
  isActive: boolean;
  onSelect: (app: UserApp) => void;
}) => {
  const initial = app.displayName.charAt(0).toUpperCase();
  return (
    <div
      role="option"
      aria-selected={isActive}
      aria-label={`${openLabel} ${app.displayName}`}
      tabIndex={-1}
      onClick={() => onSelect(app)}
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-3 rounded-md p-2.5 transition-colors hover:bg-accent",
        isActive && "bg-accent"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-semibold" aria-hidden="true">
          {app.iconUrl ? (
            <CustomImage src={app.iconUrl} alt="" width={40} height={40} className="size-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-semibold">{app.displayName}</span>
          {app.category && <span className="text-muted-foreground truncate text-xs">{app.category}</span>}
        </div>
      </div>
      <ArrowUpRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </div>
  );
};

export default ResultRow;
```
> Row là `div role=option` (không `<a>`/`<button>`) vì hành vi mở external qua `window.open` do orchestrator lo; giữ ARIA combobox pattern.
- [ ] **Step 2:** `yarn lint && npx tsc --noEmit` → xanh.
- [ ] **Step 3:** Commit `feat(header-search): ResultRow`.

---

### Task 3: ResultList (states + skeleton)

**Files:**
- Create: `client/src/layouts/AppHeader/components/HeaderSearch/mains/ResultList/index.tsx`

**Interfaces — Consumes:** `ResultRow`, `UserApp`, `Skeleton` (`@/components/ui/skeleton`), `Search` (lucide). **Produces:** default export `ResultList`.

- [ ] **Step 1:** Viết component. Props inline:
```tsx
items: UserApp[]; isLoading: boolean; isError: boolean; hasQuery: boolean;
activeIndex: number; labels: { suggested: string; results: string; noResults: string; noResultsHint: string; open: string };
listId: string; onSelectApp: (app: UserApp) => void;
```
Render (wrapper `role="listbox" id={listId}` `flex flex-col gap-0.5`):
- `isLoading` → 3 skeleton row (`<div className="flex items-center gap-3 p-2.5"><Skeleton className="size-10 rounded-xl" /><div className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div>`).
- `!isLoading && items.length === 0` (isError coi như empty) → empty state: `flex flex-col items-center gap-1.5 px-3 py-8 text-center` + `Search` icon `size-6 text-muted-foreground` + `labels.noResults` (`text-sm font-medium text-foreground`) + `labels.noResultsHint` (`text-xs text-muted-foreground`).
- có items → section label row (`px-3 py-2 text-xs font-medium text-muted-foreground`) = `hasQuery ? labels.results : labels.suggested`, rồi map `ResultRow` (`isActive={i === activeIndex}`).
- [ ] **Step 2:** `yarn lint && npx tsc --noEmit` → xanh.
- [ ] **Step 3:** Commit `feat(header-search): ResultList states`.

---

### Task 4: HeaderSearch orchestrator

**Files:**
- Create: `client/src/layouts/AppHeader/components/HeaderSearch/index.tsx`

**Interfaces — Consumes:** `SearchInput`, `Popover`/`PopoverTrigger`/`PopoverContent`, `useApps`, `useDebouncedValue`, `useAnnounce`, `useRouter` (`@/i18n/navigation`), `CONSTANTS`, `useTranslations`. **Produces:** default export `HeaderSearch` (no props).

- [ ] **Step 1:** Viết orchestrator:
  - state: `query` (string), `open` (bool), `activeIndex` (number, default -1).
  - `const debounced = useDebouncedValue(query.trim(), 300)`.
  - `const { data, isLoading, isError } = useApps({ search: debounced || undefined, limit: HEADER_SEARCH_RESULT_LIMIT })` — luôn enabled; empty search = suggested.
  - `items = data?.items ?? []`; `total = data?.pagination?.total ?? items.length` (đọc shape `Paginated` để lấy đúng field total).
  - `hasQuery = debounced.length > 0`.
  - open popover khi focus input (`onFocus`) hoặc khi gõ; đóng khi Esc/outside (Popover lo outside; controlled `open`).
  - keyboard trên input: ↓ `setActiveIndex(i => Math.min(i+1, items.length-1))`, ↑ giảm, Enter → nếu `activeIndex>=0` mở `items[activeIndex]` else nếu `hasQuery` → `router.push(\`${ROUTES.APPS}?search=${encodeURIComponent(debounced)}\`)`, Esc → `setOpen(false)`.
  - `handleSelect(app)` → `announce(t("announce.opened",{name:app.displayName}))` → `window.open(app.homeUrl, "_blank", "noopener,noreferrer")` → `setOpen(false)`.
  - `handleViewAll` → `router.push(...)` + `setOpen(false)`.
  - announce khi `!isLoading` và data đổi: results count hoặc noResults (dùng `useEffect` trên `[isLoading, items.length, hasQuery]`).
  - render `SearchInput` bọc `PopoverTrigger asChild` (hoặc anchor) + `PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-2"` chứa `ResultList` + footer "View All" (`CustomButton variant="ghost" size="sm" fullWidth`) chỉ khi `hasQuery && total > items.length`.
  - input aria: `role="combobox"` `aria-expanded={open}` `aria-controls={listId}` (truyền qua props SearchInput nếu hỗ trợ; nếu SearchInput chưa forward → dùng wrapper `div` mang aria hoặc mở rộng SearchInput props tối thiểu — KHÔNG sửa `ui/input.tsx`).
- [ ] **Step 2:** Nếu `SearchInput` không nhận `onFocus`/`onKeyDown`/aria → mở rộng props của `SearchInput` (component `src/components/SearchInput`, KHÔNG phải `ui/`) để forward các prop này. Giữ backward-compat (optional props).
- [ ] **Step 3:** `yarn lint && npx tsc --noEmit` → xanh.
- [ ] **Step 4:** Commit `feat(header-search): orchestrator (search + popover + keyboard)`.

---

### Task 5: Wire vào AppHeader

**Files:**
- Modify: `client/src/layouts/AppHeader/index.tsx`

- [ ] **Step 1:** Thay block `<SearchInput ... className="mx-4 hidden max-w-md flex-1 md:block" />` bằng `<HeaderSearch />` (component tự bọc responsive class `mx-4 hidden max-w-md flex-1 md:block`). Xoá `searchValue`/`setSearchValue` state không còn dùng. Giữ nguyên mobile search button (no-op như cũ) + notification popover + UserMenu.
- [ ] **Step 2:** `yarn lint && npx tsc --noEmit` → xanh.
- [ ] **Step 3:** Commit `feat(header-search): wire HeaderSearch into AppHeader`.

---

### Task 6: E2E — expand Scenario Matrix

**Files:**
- Create: `client/e2e/header-search/header-search.e2e.ts`
- Create: `docs/specs/header-search/e2e.md` (copy scenarios từ design matrix + follow-up)

**Interfaces:** dùng helper `client/e2e/helpers/` + `auth.setup.ts` (storageState). Selector ưu tiên role/label (`getByRole("combobox")`, `getByRole("option")`, `getByRole("listbox")`).

- [ ] **Step 1:** Viết `e2e.md` liệt kê scenario theo matrix (1–12), đánh dấu case defer (nếu có) + lý do.
- [ ] **Step 2:** Viết test file — 1 test/scenario applicable:
  - open popover on focus → suggested apps visible (`listbox` có `option`).
  - type "a" (hoặc seed term) → debounce → results; assert ≥1 option.
  - no-match term → empty state text `noResults` visible.
  - i18n: chạy en + vi (helper set locale) → assert label "Suggested apps"/"Ứng dụng gợi ý".
  - keyboard: focus → ArrowDown → option active (`aria-selected`) → Escape → listbox ẩn.
  - "View All": type term → click View All → URL `**/apps?search=<term>`.
  - select row: mock/expect `window.open` (Playwright: đăng ký `page.on('popup')` hoặc stub) — nếu khó assert popup, assert row click không điều hướng SPA sai + flag follow-up.
  - Mutation-heavy: N/A.
- [ ] **Step 3:** Commit `test(header-search): e2e scenarios + e2e.md`.

> Chạy thật (dual-gate §4.3) do main loop điều phối sau khi các task code xong: gate A `yarn e2e` (scope header-search) + gate B Playwright MCP walk. App phải chạy (BE:5000/FE:3000/Mongo/Redis) — main loop tự check trước.

## Self-Review

- Spec coverage: design §2 reuse → Task 2–5; §4 states → Task 3–4; §5 i18n → Task 1; §7 a11y → Task 2–4; E2E matrix → Task 6. ✅ đủ.
- Placeholder: không có TBD/TODO; code chính đã cho.
- Type consistency: `UserApp` xuyên suốt; `HEADER_SEARCH_RESULT_LIMIT` định nghĩa Task 1 dùng Task 4; labels object khớp i18n keys Task 1.
- Lưu ý implementer: đọc shape `Paginated<T>` (`@/types`) để lấy đúng field `items` + `total`/pagination; đọc `SearchInput` props hiện có trước khi mở rộng.
