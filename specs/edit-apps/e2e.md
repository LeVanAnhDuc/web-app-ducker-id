# E2E — Edit Apps

Playwright FE end-to-end cho feature **edit + hide/unhide** app trong Admin App Registry.

- **Test file**: `client/e2e/admin-apps/edit-apps.e2e.ts`
- **Helper**: `client/e2e/helpers/adminApps.ts` (`restoreApp` — revert idempotent)
- **Admin auth**: `client/e2e/admin.setup.ts` → storageState `e2e/.auth/admin.json`

## Tiền đề (app-running — phải thỏa trước khi chạy)

Theo CLAUDE.md §4.3, agent tự check app-running trước khi `yarn e2e`. Feature này đụng cả BE (endpoint `PATCH /admin/apps/:id` mới) lẫn FE, nên app đang chạy phải là **bản worktree `feat/edit-apps`**, không phải `main`:

1. **Redis** (:6379) + **Mongo** (:27017) up.
2. **BE worktree** chạy với code `feat/edit-apps` (có endpoint PATCH). Nếu BE `main` ở :5000 đang chạy mà không có endpoint → edit/hide sẽ 404. Chạy BE từ `server/.worktrees/edit-apps` (vd `yarn dev`).
3. **FE worktree** chạy với code `feat/edit-apps`. Vì :3000 thường serve `main` (xem [[reference_e2e_worktree_devserver]]), chạy FE worktree ở port riêng (vd `--port 3100`, copy `.env.local`) và set `E2E_BASE_URL=http://localhost:3100`.
4. **DB seed**: có sẵn **tài khoản ADMIN** (mặc định `admin@test.com` / `Admin@123`, override qua `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`) và **app active tên `blog`** (displayName `Blog`). Chỉnh `TARGET_APP` trong test nếu seed khác.

## Playwright projects

`playwright.config.ts` tách 2 nhánh auth:

- `chromium` (user storageState `user.json`) — `testIgnore: /admin-apps\//` để không chạy test admin bằng session user thường.
- `admin` (admin storageState `admin.json`, depends `admin-setup`) — `testMatch: /admin-apps\/.*\.e2e\.ts/`.

Lệnh chạy: `cd client && E2E_BASE_URL=http://localhost:3100 yarn e2e --project=admin-setup --project=admin`

## Kịch bản

| # | Test | Hành vi |
| - | ---- | ------- |
| 1 | edit display name | Mở row menu app `Blog` → Edit → đổi Display Name → Save Changes → toast "App updated." + tên mới hiện trong bảng. |
| 2 | hide → unhide | Row menu → **Hide** → confirm "Hide App" → toast "App hidden." + badge **Paused** (INACTIVE = tạm dừng). Sau đó Row menu → **Unhide** → toast "App reactivated." + badge **Active**. |

## Revert (afterAll — idempotent)

`restoreApp(name, displayName, status)` login admin qua API, tìm app theo `name`, PATCH lại `displayName` gốc + `status: "active"`. Test mutate data thật nên bắt buộc revert để không để lại side-effect lên seed.

## Lưu ý

- Selector ưu tiên `getByRole`/`getByLabel`. Display Name input chọn bằng label (form field đã liên kết label-input).
- KHÔNG sửa app code trong test — gặp a11y/DOM issue thì flag follow-up.
- Test chạy `mode: "serial"` (test 2 phụ thuộc tên đã đổi ở test 1).
