# E2E — Edit Apps

Playwright FE end-to-end cho feature **edit + hide/unhide** app trong Admin App Registry.
Backfill coverage theo skill `e2e-scenario-coverage` — expand toàn bộ `## E2E Scenario Matrix` (design.md, 12 nhóm) thành test cụ thể. Reconcile 3 artifact: matrix (design.md) ↔ e2e.md (file này) ↔ `edit-apps.e2e.ts`.

- **Test file**: `client/e2e/admin-apps/edit-apps.e2e.ts` (EXTEND — không tạo file mới)
- **Helper**: `client/e2e/helpers/adminApps.ts` (`restoreApp` — revert idempotent)
- **Admin auth**: `client/e2e/admin.setup.ts` → storageState `e2e/.auth/admin.json`
- **User auth (cho AuthZ)**: `client/e2e/auth.setup.ts` → storageState `e2e/.auth/user.json`

## Tiền đề (app-running — phải thỏa trước khi chạy)

Theo CLAUDE.md §4.3, agent tự check app-running trước khi `yarn e2e`. Feature này đụng cả BE (endpoint `PATCH /admin/apps/:id`) lẫn FE, nên app đang chạy phải là **bản worktree `feat/edit-apps`**, không phải `main`:

1. **Redis** (:6379) + **Mongo** (:27017) up.
2. **BE worktree** chạy code `feat/edit-apps` (có endpoint PATCH). Nếu BE `main` ở :5000 chạy mà không có endpoint → edit/hide trả 404. Chạy BE từ `server/.worktrees/edit-apps`.
3. **FE worktree** chạy code `feat/edit-apps`. Vì :3000 thường serve `main` ([[reference_e2e_worktree_devserver]]), chạy FE worktree ở port riêng (vd `--port 3100`, copy `.env.local`) và set `E2E_BASE_URL=http://localhost:3100`.
4. **DB seed**: cần
   - **Tài khoản ADMIN** (mặc định `admin@test.com` / `Admin@123`, override qua `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`).
   - **Tài khoản USER thường** (non-admin) cho `auth.setup.ts` → `user.json` (dùng ở test AuthZ).
   - **App active tên `blog`** (displayName `Blog`, category `Content`, `status=active`, có ≥1 redirect URI) — TARGET edit/boundary.
   - **App khác tên `dashboard`** (bất kỳ) — dùng làm name conflict (409).
   - (Optional) **App `minimal`** có `description=null` + `iconUrl=null` — cho null-prefill (xem Defer).
   Chỉnh `TARGET_APP` / `CONFLICT_NAME` / `NULL_APP` trong test nếu seed khác.

## Playwright projects

`playwright.config.ts` tách auth theo project:

- `setup` (`auth.setup.ts`) → tạo `user.json` (non-admin).
- `admin-setup` (`admin.setup.ts`) → tạo `admin.json`.
- `chromium` (storageState `user.json`) — `testIgnore` các suite admin → không chạy admin test bằng session user.
- `admin` (storageState `admin.json`, `dependencies: ["admin-setup"]`) — `testMatch: /admin-apps\/.../`.

**Lệnh chạy** (lưu ý: test AuthZ cần `user.json` do `setup` tạo, mà project `admin` chỉ depend `admin-setup` → phải thêm `--project=setup`):

```
cd client && E2E_BASE_URL=http://localhost:3100 \
  yarn e2e --project=setup --project=admin-setup --project=admin
```

## Coverage — 12 nhóm rubric (matrix ↔ test ↔ gate)

| # | Nhóm | Test (title) | Gate | Technique | Trạng thái |
| - | ---- | ------------ | ---- | --------- | ---------- |
| 1 | Happy path | `edits an app's display name` | A+B | happy | ✅ (kept) |
| 2 | (Hide/unhide toggle) | `hides then unhides an app (status toggle)` | A+B | happy | ✅ (kept) |
| 2 | AuthN | `blocks unauthenticated access (UI redirect + API 401)` | A+B | Error Guessing | ✅ NEW |
| 3 | AuthZ | `forbids non-admin from updating apps (API 403 + UI unreachable)` | A+B | Error Guessing | ✅ NEW |
| 4 | Validation [EP] | `shows inline validation errors per field` | A+B | EP | ✅ NEW |
| 4 | Validation [DT] anti-OFAT | `surfaces multiple field errors simultaneously` | A+B | DT | ✅ NEW |
| 4 | 409 conflict → field | `maps 409 name conflict to the name field` | A only | Error Guessing | ✅ NEW |
| 4 | Select-reset regression | `preserves Category when only Display Name changes` | A only | ST | ✅ NEW (guards shadcn-Select RHF reset bug) |
| 5 | Empty/null prefill | `renders empty inputs for null fields…` | A only | Error Guessing | ⏸ DEFER (`test.fixme`) — cần seed null app |
| 6 | [BVA] Name length | `enforces Name length boundaries` (1/2/64/65) | A+B | BVA | ✅ NEW |
| 6 | [BVA] Display Name length | `enforces Display Name length boundaries` (2/80/81) | A+B | BVA | ✅ NEW |
| 6 | [BVA] redirectUris count | `rejects more than 20 redirect URIs (CF-3)` (21>max) | A only | BVA | ✅ NEW (CF-3 đã implement) |
| 7 | Filter/search | — | — | — | N/A (xem dưới) |
| 8 | Data rendering | `prefills every field from the selected app` | A+B | Decision Table | ✅ NEW (full prefill + Category human label) |
| 9 | i18n (en+vi) | `renders the edit flow in Vietnamese` + `renders the status badge label in Vietnamese` | A+B | EP locale | ✅ NEW — MANDATORY |
| 10 | Error/loading | `shows a generic toast on server 5xx` (a) + `disables form controls while the update is in flight` (b) | A+B (a lean A, b lean B) | Error Guessing / ST | ✅ NEW (route-mocked) |
| 11 | Mutation safety | `fires exactly one PATCH on rapid double-submit` + `discards unsaved edits…` + `trims a trailing space in Name on the server` | A only | ST / Error Guessing | ✅ NEW |
| 12 | Accessibility | `manages focus on validation and announces success` | A+B | Error Guessing | ✅ NEW (focus + `#announcer`) |

**No silent gaps**: 11/12 nhóm có ≥1 test áp dụng; nhóm 7 N/A có lý do.

## N/A — nhóm 7 Filter/search

Toolbar filter (search / status / category dropdown) thuộc component `AdminAppsToolbar` của feature **list-apps**, KHÔNG phải edit sheet. Edit-apps chỉ cover hành vi sửa/hide trong sheet + row action → ngoài scope. Cố ý loại trừ (không viết test).

## Deferred cases (không silently drop — CLAUDE.md §4.3)

1. **E2E-5 null prefill** (`test.fixme`): phụ thuộc app seed có `description=null` + `iconUrl=null` (mặc định `minimal`). Nếu seed không có → giữ skipped. Lý do: test chống data có thể không tồn tại sẽ flaky. Enable sau khi xác nhận/ tạo seed null. FormResetEffect đã map `?? ""` nên kỳ vọng input rỗng (không leak literal `"null"`).
2. **E2E-12a focus-on-first-invalid** (nằm trong test a11y): dựa vào RHF `shouldFocusError` (default `true`). Nếu app KHÔNG tự focus field invalid đầu tiên → tách/skip phần `toBeFocused()` với reason "cần xác nhận focus management config", KHÔNG sửa app code để pass — flag follow-up.

## Revert strategy (mutation safety)

- `restoreApp(name, displayName, status)` login admin qua API, tìm app theo `name`, PATCH lại `displayName` gốc + `status`. **CHỈ revert displayName + status — KHÔNG revert `name`.**
- Test đổi `name` (vd trailing-space E2E-11c) phải **tự revert `name`** qua `page.request.patch` trong test (đã làm). 409-conflict không persist (BE reject) nên name vẫn `blog`.
- Mỗi describe mutate có `afterAll` gọi `restoreApp("blog", "Blog", "active")` (idempotent).
- Test route-mock (5xx, loading) KHÔNG ghi DB thật → không cần revert.
- `mode: "serial"` (set file-scope) — test trong cùng describe chạy tuần tự.

## Follow-up (a11y / DOM — KHÔNG sửa trong test)

- **StatusSwitch** không có accessible name liên kết với label "Active" (FormLabel chưa `htmlFor` → Switch `id`). Test dùng `getByRole("switch")` (sheet chỉ có 1 switch). Follow-up: liên kết label ↔ switch để selector by-name robust.
- Selector ưu tiên `getByRole`/`getByLabel`; redirect URIs dùng draft input `aria-label = placeholder` + nút "Add URI", pill xoá qua `aria-label="Remove URI: <uri>"`.
