# Design — AdminEntitlements: picker UX refinement + role filter

> Feature (slice tinh chỉnh): sửa trang `/admin/entitlements` theo feedback review commit `f51e240`. Chuẩn hoá layout + search input theo pattern list chung, thêm **filter role (admin/user)** vào UI, và làm rõ hành vi hiển thị user của picker. **FE-only + docs** — BE `GET /admin/users` đã hỗ trợ đầy đủ `role` filter (schema + repo + DTO), không đổi. Entitlement matrix **vẫn mock** (đúng scope slice hiện tại).

## 1. Bối cảnh & feedback

Trang `client/src/views/AdminEntitlements/` đã ship (PR #55): multi-select user picker (server-side search API thật) + bulk app-access matrix (mock). Review để lại 6 feedback:

| # | Feedback | Chẩn đoán | Xử lý |
| - | -------- | --------- | ----- |
| 1 | Input search chưa đồng nhất style với các input search khác | Picker dùng `<CustomInput>` bọc trong div viền tự chế, không dùng `SearchInput` chung | Dùng `SearchInput` chung |
| 2 | Chưa search cũng hiện ra ~5 user ngẫu nhiên | Hành vi mong muốn: **focus → 6 user mặc định**; search/role → filtered (user đã xác nhận) | Enable query khi focus, `limit:6` mặc định |
| 3 | Content phải dài bằng màn hình khác kể cả padding + heading/description | Page dùng `<main className="mx-auto max-w-3xl p-8">` + h1/p custom, khác các trang admin | Dùng `PageShell fullHeight` + `PageHeader` |
| 4 | Tích hợp API get user thật | Picker **đã** gọi `getAdminUsers` thật (không mock user) | Giữ nguyên; entitlement matrix vẫn mock |
| 5 | API hỗ trợ filter user thường với admin | BE **đã** hỗ trợ `role` (`adminUsersQuerySchema` L142 + repo L165 + DTO có `role`) | Không đổi BE |
| 6 | Giao diện có filter admin với user thường | Chưa có filter UI | Thêm Filters popover (role) + truyền `role` cho API |

## 2. Scope

**Trong scope (FE + docs)**
- Chuẩn hoá layout `AdminEntitlementsBoard` sang `PageShell fullHeight` + `PageHeader(title, description)`.
- Toolbar kiểu `PageToolbar`: `SearchInput` chung (trái) + nút `Filters` → Popover chứa role filter (Tất cả / Admin / Người dùng), badge `activeFilterCount`.
- Hành vi picker: focus search → fetch **6 user mặc định**; gõ text HOẶC chọn role → fetch filtered (`limit:20`), truyền `{ search, role }`.
- Selected users = **chips row** dưới toolbar (tách khỏi ô input để `SearchInput` giữ style chuẩn).
- i18n role labels + tái dùng namespace `list` cho nút Filters (en + vi).

**Ngoài scope**
- BE (role filter đã có end-to-end).
- Endpoint entitlement thật (bulk grant/revoke persist) — vẫn mock, để slice sau.
- Pagination cho kết quả picker (dropdown top-N, không phân trang).

## 3. Quyết định thiết kế (DR)

- **DR-1 — Layout PageShell chuẩn**: bỏ `max-w-3xl p-8` + h1/p custom, dùng `PageShell fullHeight` + `PageHeader` giống AdminUsers/AdminApps. Padding do `#main-content` (layout admin) lo → hết double-padding, full-width/height nhất quán. (feedback #3)
- **DR-2 — SearchInput chung + chips tách hàng**: ô search dùng component `SearchInput` (icon inset, `h-10`) để đồng nhất style. Selected users hiển thị thành chips row riêng dưới toolbar (không nhét trong input). (feedback #1)
- **DR-3 — Role filter trong Filters popover (PageToolbar-style)**: nút `Filters` mở popover chứa radio Tất cả/Admin/Người dùng, badge số filter active khi role ≠ Tất cả. Dùng đúng pattern list các trang khác. `role` là local state (không URL — picker state ephemeral, thống nhất DR-3 slice gốc: selected users cũng local). (feedback #6)
- **DR-4 — Hành vi hiển thị user**: query `useAdminUsersSearch` enable khi search field **đang focus** (không cần có text). Không text + role=Tất cả → `limit:6` (6 user mặc định). Có text HOẶC role ≠ Tất cả → `limit:20` filtered. Query key = `[ADMIN_USERS, search, role]`. (feedback #2 — theo xác nhận user)
- **DR-5 — Reuse `getAdminUsers` role param**: `getAdminUsers` (FE request) đã nhận `AdminUsersQueryParams` gồm `role`; chỉ cần hook truyền xuống. Role values từ `CONSTANTS.AUTHENTICATION_ROLES` (USER/ADMIN) — khớp BE. (feedback #5)
- **DR-6 — Entitlement matrix giữ mock**: feedback không đụng grant/revoke; matrix + status vẫn client-side mock như slice gốc. Persist thật để slice sau.

## 4. API (tái dùng, KHÔNG đổi)

```
GET /api/v1/admin/users?search=<q>&role=<user|admin>&limit=<6|20>   (authGuard + adminGuard, đã có)
  → { items: AdminUser[], meta }   // AdminUser gồm role
```

- `role` filter: Joi `adminUsersQuerySchema` valid `Object.values(AUTHENTICATION_ROLES)`; repo match `auth.roles`. Đã ship + dùng thật ở AdminUsers table.

## 5. Thay đổi FE (theo file)

- `mains/AdminEntitlementsBoard/index.tsx` — thay `<main max-w-3xl p-8>` + h1/p bằng `PageShell fullHeight` + `PageHeader(title, description)`; thêm toolbar (SearchInput + Filters popover) + chips row + matrix. Giữ ≤200 lines (tách toolbar/chips sang `components/` nếu vượt).
- `components/UserMultiSelect/` — refactor: dùng `SearchInput`, tách chips ra ngoài, thêm role filter popover; hoặc tách thành `components/UserPickerToolbar` + `components/SelectedUserChips`. Quyết định chi tiết ở `writing-plans`.
- `hooks/useAdminUsersSearch.ts` — nhận thêm `role`, đổi `limit` động (6 mặc định / 20 khi active), query key gồm role.
- `components/UserResultsList` + `UserResultsLoading` + `UserResultsEmpty` — giữ; kiểm tra copy empty khi role-filter no-match.
- `ghosts/PickerResultsAnnouncer` — announce count theo cả search + role.
- i18n `locales/{en,vi}/adminEntitlements.json` — thêm key filter role labels; nút Filters tái dùng `list` namespace.
- Dùng `CONSTANTS.AUTHENTICATION_ROLES` cho role values; không hard-code.

## 6. Security

**N/A (skip)** — không thêm bề mặt tấn công BE: `/admin/users` (+ role filter) đã review + ship (authGuard + adminGuard, Joi validate role, regex escape search). Không endpoint mới, không input mới tới BE (role từ enum cố định). Entitlement vẫn mock client-side. Khi wire endpoint entitlement thật (slice sau) → security review lúc đó.

## 7. E2E Scenario Matrix

> Slice gốc hoãn E2E (chưa có `e2e.md`/test). Slice này thêm behavior picker THẬT (search/role/default-6/layout) → §4.3 áp dụng. Entitlement grant/revoke vẫn **mock** (in-memory, mỗi browser context tách biệt → không contamination) nên toàn bộ chạy được cả 2 gate. Bulk mutation là mock → không persist BE → không cần `afterAll` revert phía server. Test author + dual-gate ở §4.3 sau implement.

| #  | Nhóm | Scenario / kỹ thuật | Expected | Gate |
| -- | ---- | ------------------- | -------- | ---- |
| 1  | Happy path | Admin mở `/admin/entitlements` → thấy `PageHeader` (title+description), toolbar (search + Filters), empty prompt "chưa chọn user". Focus search (chưa gõ, role=Tất cả) → dropdown hiện **6 user**. Chọn 2 user → 2 chips + matrix render status tổng hợp per-app | Layout chuẩn + 6 user default + chips + matrix | A+B |
| 2  | AuthN | Chưa đăng nhập vào `/admin/entitlements` → redirect `/login` (AuthGuard). Gọi `/admin/users` không token → 401 | Redirect login / 401 | A+B |
| 3  | AuthZ | Role `user` truy cập `/admin/entitlements` → picker gọi `/admin/users` → BE **403** (admin routes không có FE role guard — xem [[reference_e2e_auth_ratelimit_gotchas]]) → error state | 403 → error UI, không lộ data | A+B |
| 4  | Validation / expected-error | **[EP]** search classes: `empty`(→6 default) · `normal`(→match) · `no-match`(→empty) · `>SEARCH_MAX_LENGTH`(→BE 400 `validation:search.invalid`). **[BVA]** search length `MAX`(accept) · `MAX+1`(reject). Role query chỉ từ enum cố định (Tất cả/Admin/User) → tamper không reachable qua UI → N/A tại FE (BE Joi vẫn chặn `any.only`) | Class hợp lệ render đúng; quá dài → error surface; không crash | A+B |
| 5  | Empty / null | search no-match → dropdown empty "không có user" · role=Admin nhưng 0 admin match text → empty · user `avatar=null` → fallback initials · chưa chọn user → `UserNotSelectedEmpty` | Mọi empty/null render an toàn (không "null"/vỡ layout) | A+B |
| 6  | Boundary / pagination | **[BVA]** default: ≥6 user → hiện đúng 6; <6 user tồn tại → hiện tất cả (<6). Search khớp >20 → chỉ 20 (top-N). **Pagination N/A** — dropdown picker là top-N, không phân trang (ghi rõ, không silent) | 6 mặc định / ≤20 filtered, không pager | A+B |
| 7  | Filter / search | **[EP]** search match `fullName` · match `email` · `no-match`. **[DT]** search × role: `role=Admin + text`→chỉ admin khớp text · `role=User + no text`→user thường (default list lọc role) · `role=Tất cả + text`→tất cả khớp · `role=Admin + no text`→admin (default 6 lọc role). **[ST]** focus(no query)→6 default → gõ text→filtered → xoá text→về 6 → đổi role→filtered. **URL-persist N/A** — picker state local (DR-3), không URL-driven (ghi rõ) | Kết quả đúng theo tổ hợp search×role; state chuyển đúng | A+B |
| 8  | Data rendering | Row user hiện `fullName` + `email` + avatar (không raw). Matrix status label người-đọc (All granted / M/N granted / Not granted / Role required) — không raw enum `GRANTED`/`INSUFFICIENT_ROLE` | Nhãn human, không raw enum/null | A+B |
| 9  | **i18n** | Render **EN + VI**: PageHeader title/description, search placeholder, nút Filters, role options (Tất cả/Admin/Người dùng), empty states, matrix labels, announce | Không thiếu message key ở cả 2 locale | A+B |
| 10 | Error / loading | `/admin/users` 5xx / network error → error state trong dropdown. Đang fetch → `UserResultsLoading` skeleton | Error UI hiện, không crash; skeleton khi loading | A+B |
| 11 | Mutation safety (mock) | **[ST]** chọn user → Grant all 1 app → status flip `granted` (valid transition) · Revoke → confirm dialog → flip `not granted` · **invalid transition**: user thiếu role (INSUFFICIENT_ROLE) → nút grant disabled, không flip. **[Error Guessing]** double-click Grant → idempotent (mock reuse existing, không nhân đôi). Mock in-memory → reset khi reload, không revert BE | Status flip đúng; disabled khi role thiếu; double-submit no-op | A+B |
| 12 | Accessibility | search combobox `role=combobox`+`aria-expanded`+`aria-autocomplete`; results listbox; `useAnnounce` khi đổi count kết quả / select/deselect / đổi filter; Filters popover keyboard-navigable; focus không nhảy loạn khi mở dropdown | Selector role/label ổn; announce đầy đủ; keyboard OK | A+B |

**Completeness critic**: user chưa yêu cầu "thorough/≥90%" → chưa chạy critic subagent. Nếu user yêu cầu → dispatch 1 subagent tìm case thiếu trước khi chốt.

## 8. Artifact & flow còn lại

- **Step 1.5 SuperDesign**: sửa lớn UI (layout + toolbar + filter) → reconcile mock `docs/ui-designs/admin-entitlements-user-options/` (hoặc tạo folder slice mới) qua `iterate-design-draft`, xuất light+dark, **user review gate** trước `writing-plans`.
- **writing-plans**: chia task FE (layout, toolbar+filter, hook, i18n) + task E2E (expand matrix §7 thành test); task defer ghi lý do.
- **Isolation**: worktree `client/` + `docs/` branch `feat/admin-entitlements-picker-refinement` (đã tạo từ `origin/main`).
