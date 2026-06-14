# Design — E2E Coverage Backfill (6 features)

> Master design cho đợt bổ sung E2E coverage cho 6 feature đã có test nhưng chưa đủ
> theo rubric `e2e-scenario-coverage` (12 nhóm). Mỗi feature reconcile đủ 3 artifact
> (`design.md` matrix ↔ `e2e.md` ↔ test file) theo CLAUDE.md §4.3.

## 1. Mục tiêu & phạm vi

**Mục tiêu**: nâng coverage E2E của 6 feature hiện có lên đạt chuẩn project — mỗi nhóm rubric
áp dụng được đều có `✅` scenario hoặc `N/A` có lý do (no silent gaps), với technique tag
([EP]/[BVA]/[DT]/[ST]) + giá trị cụ thể cho row áp dụng được.

**6 feature trong scope**:

| Feature | Spec folder | Test file | View |
| --- | --- | --- | --- |
| change-password | `docs/specs/change-password/` | `client/e2e/change-password/change-password.e2e.ts` | `views/AccountSettings/**` |
| admin-users-list | `docs/specs/admin-users-list/` | `client/e2e/admin-users-list/admin-users-list.e2e.ts` | `views/AdminUsers/**` |
| edit-apps | `docs/specs/edit-apps/` | `client/e2e/admin-apps/edit-apps.e2e.ts` | `views/AdminApps/**` |
| notifications | `docs/specs/notifications-api/` | `client/e2e/notifications/notifications.e2e.ts` | `views/Notifications/**` + `layouts/AppHeader/**` |
| web-app-user-list | `docs/specs/web-app-user-list/` | `client/e2e/web-app-user-list/apps-list.e2e.ts` | `views/Apps/**` |
| admin-login-history-detail | `docs/specs/admin-login-history-detail/` | `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts` | `views/AdminLoginHistory(/Detail)/**` |

**Ngoài scope**: tạo E2E mới cho view chưa từng có test (Billing, Profile, Favorites,
MyContacts, Team, AdminDashboard, AdminEntitlements, ForgotPasswords, Logins, …) — đợt sau.

## 2. Cách tổ chức artifact

- **Master design** (file này) + master `plan.md`: ở `docs/specs/e2e-coverage-backfill/`.
- **Per-feature reconcile**: với MỖI feature, cập nhật ngay trong spec folder của nó:
  - thêm/sửa `## E2E Scenario Matrix` trong `design.md` (nhiều feature hiện thiếu hẳn);
  - cập nhật `e2e.md` (scenario thực thi + follow-up);
  - mở rộng test file tương ứng.
- Reconcile = ADD case mới + UPDATE case expected đổi + REMOVE case không còn (ở đây chủ yếu ADD).

## 3. Code fixes (làm TRƯỚC, vì test phụ thuộc)

Audit phát hiện 5 vấn đề code/cấu hình (không chỉ test). User duyệt sửa cả 5.

### CF-1 — Playwright project routing (admin suites)

`client/playwright.config.ts`: project `chromium` (`storageState: user.json`) chỉ `testIgnore`
`admin-apps/`, nên `admin-users-list/` + `admin-login-history/` chạy nhầm dưới user thường →
chỉ pass nhờ hack `E2E_USER_EMAIL=admin` lúc `auth.setup`.

**Fix**: gom mọi admin-only suite vào project `admin` (admin.json). Thêm project chạy AuthZ
(user thường → admin route → expect 403/redirect). Tách `testMatch`/`testIgnore` theo nhóm
auth: `admin` project = `admin-apps/ | admin-users-list/ | admin-login-history/`; `chromium`
= phần còn lại (user-auth). Thêm helper/fixture để 1 vài test AuthZ chạy với user-storageState
trên admin route.

### CF-2 — AdminUsers error state

`views/AdminUsers/**` (`AdminUsersTable`) chỉ xử lý `isLoading`; API 5xx → `data=undefined` →
`items=[]` → render nhầm empty state. **Fix**: thêm nhánh `isError` → error UI riêng (alert),
theo pattern các view khác (vd Apps `apps.error`). Thêm locale key error en+vi.

### CF-3 — edit-apps redirectUris max(20) drift

FE zod (`AdminApps` validations) thiếu `.max(20)` cho `redirectUris` (BE enforce `MAX_REDIRECT_URIS=20`).
**Fix**: thêm `.max(20)` + locale key `redirectUris.maxItems` (en+vi) để 21 URIs báo lỗi field
ở FE thay vì rớt BE 400 generic.

### CF-4 — useAnnounce (a11y) còn thiếu

`rules/accessibility.md` yêu cầu `useAnnounce` cho pagination/filter/search/loading + route/load.
Thiếu ở `AdminUsers` table và `AdminLoginHistoryDetail` (design login-history-detail ghi
"announce on load" nhưng code không có). **Fix**: wire `useAnnounce` vào 2 chỗ này.

### CF-5 — Doc drift

- `notifications-api/design.md`: bỏ mô tả "optimistic UI" + "afterAll tự reseed" → đúng thực tế
  (invalidate-on-success + manual reseed). Sửa test-count "14/14" → 11.
- `change-password/plan.md`: sửa path stale `views/Security/...` → `views/AccountSettings/...`,
  namespace `security.changePassword` → `accountSettings.changePassword`.

## 4. Per-feature scenario summary (chi tiết matrix nằm trong design.md từng feature)

### change-password
Tạo mới `e2e.md` + matrix (hiện thiếu hẳn). Thêm: AuthN (unauth→login, API 401); **[EP]**
new-pw classes (empty/no-upper/no-lower/no-digit/no-special/=current/reused); **[DT]** precedence
(currentWrong+newValid→400; currentOK+newInvalid→client chặn; currentWrong+newInvalid→client thắng);
**[BVA]** length 7/8/129; empty/pristine (Save disabled); i18n vi; error 5xx + loading; **[ST]**
session sống sau đổi (valid) + token thiết bị khác bị revoke→401 (invalid, **Gate A only**);
double-submit; rate-limit 6th→429 (Gate A only). a11y keyboard + `#announcer`.

### admin-users-list
Thêm matrix. AuthN; **AuthZ user→403** (CF-1); **[EP]** tampered params (`page=abc`,`limit=-1/101`,
`role=superadmin`); empty/no-match + null `lastLoginAt`→"Never"; **[BVA]** pagination/limit (seed-gated);
**[DT]** combined filter + URL persist; badge human-label + date format render; i18n vi; error UI
(sau CF-2); a11y announce (sau CF-4) + role/label selectors.

### edit-apps
Thêm matrix. AuthN/AuthZ; **[EP]+[DT]** validation (empty/too-long/format/combined — chống OFAT);
409 name conflict→field error; **Select-reset regression** (Save không touch Category → giữ giá trị);
**[BVA]** name 1/2/64/65, displayName 2/80/81, redirectUris 20/21 (sau CF-3); null-optional prefill;
full-prefill render (Select label); i18n vi; error 5xx + loading; double-submit; navigate-away;
a11y focus-first-error.

### notifications
Reconcile design (CF-5). Thêm: header bell badge + panel; per-tab empty + null `readAt`; mark-read
failure→toast + item ở lại unread; mark-all khi đã empty (no-op); **double-click idempotent**;
persistence sau reload; read-tab content (`SEED_READ_TITLE`); i18n vi "trước"; a11y `#announcer` +
keyboard activation; **[BVA]** single-page no "Load more".

### web-app-user-list
Reconcile e2e.md (đang stale vs apps-api-integration). AuthN (redirect + API 401); **[EP]** tampered
params (API); empty/no-match + null icon/desc fallback; **[BVA]** pagination (seed-gated);
**[DT]** combined search+category + reset-on-reload (in-memory by design); i18n **en** depth
(placeholder/empty/pagination summary); error 5xx + categories-error + loading skeleton; a11y
keyboard + `#announcer`.

### admin-login-history-detail
Reconcile matrix (downgrade các cell ✅ quá lời). AuthZ non-admin (cần fixture); empty/null fields
(via `page.route` mock: userId/timezoneOffset null, failReason present, anomaly "None"); data-render
enum→label + isAnomaly Yes/No + date không ISO; loading skeleton + network abort; i18n vi depth
(not-found/error); a11y keyboard activation + back-preserves-filter; announce on load (sau CF-4).

## 5. Quy ước test (giữ nguyên convention hiện có)

- Test ở `client/e2e/<feature>/*.e2e.ts`; helper chung `client/e2e/helpers/`; auth qua
  `auth.setup.ts`/`admin.setup.ts` → storageState.
- AuthN fresh context: `clearCookies()` + `storageState: undefined` (cookie localhost không scope port).
- Mutation-heavy (token revoke, rate-limit, mark-all) → matrix cột `Gate = A only`, gate B chỉ verify
  read/render (tránh session contamination — xem `reference_e2e_suite_session_contamination`).
- Test mutate phải tự revert (afterAll idempotent). KHÔNG sửa app code trong test (lỗi a11y/DOM → flag).
- Error/loading dùng `page.route` interception (nhớ React Query retry 5xx tối đa 2 lần).

## 6. Dual-gate (§4.3) — bước verification cuối

Sau khi viết xong code fixes + test + docs:
1. Agent tự check port (BE :5000, FE :3000, Mongo, Redis). Chưa chạy → agent tự dựng background
   (Mongo/Redis → BE từ main `server/` (không đổi) → FE worktree dev port riêng qua
   `node .claude/scripts/worktree.mjs up e2e-coverage-backfill`) + seed.
2. Dispatch **2 gate song song** (1 message, 2 Agent): Gate A `yarn e2e` (scope 6 feature);
   Gate B MCP browser walk (auth context riêng) theo từng `e2e.md`.
3. Fail (≥1 gate) → `systematic-debugging` root cause → `e2e-bugs.md` (append/round) → fix → re-run
   cả 2. Max 3 vòng; quá → dừng + báo user.
4. Teardown: `worktree.mjs down e2e-coverage-backfill` + tắt đúng process agent đã bật (không tắt
   service dev/user chạy sẵn).

## 7. Isolation & commit

- Worktree chung nhánh `test/e2e-coverage-backfill` ở `client/` + `docs/` (đã tách `origin/main`).
- Commit gate (§7): viết xong toàn bộ → trình diff tổng thể → user duyệt → mới commit (per-repo).
```

## 8. Out of scope / follow-up

- E2E mới cho view chưa có test (đợt sau).
- Sort UI control cho admin-users-list (BE hỗ trợ `sortBy/sortOrder` nhưng chưa có UI) — chỉ flag.
- Seed >20 users / >12 user-apps để test pagination click-through thật — nếu seed không đủ, ghi
  follow-up trong `e2e.md` (no silent cap).
