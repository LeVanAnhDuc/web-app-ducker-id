# E2E — Account Settings Cleanup

> Feature branch: `chore/account-settings-cleanup`
> Test file: `client/e2e/account-settings-cleanup/cleanup.e2e.ts`
> Scope: FE-only cleanup (remove `/security` route, trim `/account-settings` to Change Password only, relocate Danger Zone to `/profile`).

## 1. Scenario Matrix (copied from design.md §6)

| #   | Category              | Verdict | Scenario / lý do                                                                                                                                                              | Gate |
| --- | --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Happy path            | ✅      | `/account-settings` render đúng PageHeader + Change Password (không còn 2FA/Sessions/DangerZone). `/profile` vẫn render Danger Zone (đã move).                                | A+B  |
| 2   | AuthN                 | ✅      | Chưa đăng nhập vào `/account-settings`, `/profile` → redirect `/login` (regression AuthGuard).                                                                               | A+B  |
| 3   | AuthZ                 | N/A     | Trang user-level, không gating theo role.                                                                                                                                    | —    |
| 4   | Validation            | N/A     | Cleanup không thêm/đổi validation; form change-password không đổi (đã có suite riêng).                                                                                      | —    |
| 5   | Empty / null          | N/A     | Không còn list/fetch trong account-settings sau khi dọn.                                                                                                                     | —    |
| 6   | Boundary / pagination | N/A     | Không có pagination.                                                                                                                                                         | —    |
| 7   | Filter / search       | N/A     | Không có filter/search.                                                                                                                                                      | —    |
| 8   | Data rendering        | N/A     | Không đổi label/format dữ liệu (chỉ còn form).                                                                                                                               | —    |
| 9   | **i18n**              | ✅      | Render `/account-settings` + `/profile` Danger Zone + sidebar ở **cả en & vi**; verify không còn missing-message sau khi gỡ namespace `security` + `accountSettings.{twoFactor,sessions,dangerZone}`. | A+B  |
| 10  | Error / loading       | N/A     | Không thêm data fetch mới.                                                                                                                                                   | —    |
| 11  | Mutation safety       | N/A     | Cleanup gỡ các mock-mutation; change-password mutation có suite riêng.                                                                                                       | —    |
| 12  | Accessibility         | ✅      | account-settings/profile dùng role/label selector; link "Security" không còn trong tab order sidebar.                                                                       | A+B  |
| F1  | Route removal `[ST]`  | ✅      | Vào `/security` và `/vi/security` → `not-found`/404 (invalid transition: route từng hợp lệ nay không còn).                                                                  | A+B  |
| F2  | Nav integrity         | ✅      | Sidebar nhóm Settings liệt kê profile, account-settings, billing, team — **không** có security; các link còn lại điều hướng đúng.                                            | A+B  |
| F3  | Dead-reference guard  | ✅      | Không còn import/string tham chiếu `ROUTES.SECURITY`/`views/Security`/`mocks/Security`/locale `security`/các card đã xoá — chốt bằng `yarn build` (type-check) + grep, không cần E2E. | —    |

**Test-design techniques**: EP/BVA/DT không kích hoạt (không có input domain / boundary / điều kiện kết hợp mới). Chỉ ST cho F1 (route removal = invalid transition). Completeness-critic: chưa yêu cầu "thorough/≥90%" → không chạy.

## 2. Scenario → test mapping

All tests in `client/e2e/account-settings-cleanup/cleanup.e2e.ts`. They run under the default `chromium` project (logged-in `e2e/.auth/user.json`) except the AuthN test, which builds its own clean context.

| Matrix # | ✅ scenario                                                          | Test name (`describe` › `test`)                                                                                                            |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| F1       | `/security` → not-found                                              | `F1 route removal › renders not-found for /security (default locale)`                                                                       |
| F1       | `/vi/security` → not-found                                           | `F1 route removal › renders not-found for /vi/security (Vietnamese locale)`                                                                 |
| F2       | Settings nav lists Profile/Account Settings/Billing/Team, no Security | `F2 nav integrity › settings nav lists Profile/Account Settings/Billing/Team without Security`                                              |
| F2       | A remaining settings link navigates                                  | `F2 nav integrity › a remaining settings link navigates correctly (Profile)`                                                               |
| #1       | account-settings = Change Password only, removed cards gone          | `#1 happy path › account-settings renders Change Password and none of the removed cards`                                                    |
| #1       | profile still renders Danger Zone                                    | `#1 happy path › profile renders the relocated Danger Zone`                                                                                 |
| #9       | account-settings localized (en), no missing-message                  | `#9 i18n (en + vi) › account-settings is localized in English with no missing messages`                                                    |
| #9       | account-settings localized (vi), no missing-message                  | `#9 i18n (en + vi) › account-settings is localized in Vietnamese with no missing messages`                                                 |
| #9       | profile Danger Zone localized (vi)                                   | `#9 i18n (en + vi) › profile Danger Zone is localized in Vietnamese`                                                                        |
| #2       | unauthenticated → /login                                             | `#2 AuthN › unauthenticated user is redirected away from account settings`                                                                 |
| #12      | a11y: role/label selectors; no Security in sidebar tab order         | Covered transitively — F2 asserts links via `getByRole("link")` scoped to the `aria-label="Settings"` nav, and asserts the Security link has count 0 (removed from tab order). No dedicated test. |
| #3,4,5,6,7,8,10,11 | N/A (see matrix)                                           | No tests (justified N/A).                                                                                                                   |
| F3       | dead-reference guard                                                 | N/A for E2E — verified by `yarn build` + grep per design §6.                                                                                |

## 3. Assumptions / follow-up gaps (for the orchestrator running the dual-gate)

1. **Not-found copy (F1)** — the app has **no custom `not-found.tsx`** (none under `src/app/[locale]/` or globally at authoring time). So `/security` falls through to **Next.js's built-in 404**, whose default copy is "This page could not be found." The F1 tests assert `/(this page could not be found|404|not found)/i` to be resilient. **If the orchestrator finds the build emits different not-found copy** (e.g. a localized custom 404 was added since), update `NOT_FOUND_TEXT` in the spec. Gate B (MCP walk) should visually confirm the not-found page renders for both `/security` and `/vi/security`.
2. **Route → not-found resolution** — with `localePrefix: "as-needed"` and locales `[en, vi]`, `/security` is treated as a path under the default locale (en) and `/vi/security` as a path under vi; neither matches a route segment after the `(settings)/security` folder was deleted, so Next renders not-found **before** the `(settings)` layout / AuthGuard. The F1 tests therefore run under the logged-in project and still expect not-found (not a login redirect). Confirm this if the suite shows a redirect instead.
3. **Settings-group scoping (F2)** — the sidebar renders each group as a `SidebarMenu` with `aria-label` = the localized group label ("Settings"). The tests address it via `getByRole("navigation", { name: "Settings" }).or([aria-label="Settings"])`. If `SidebarMenu` does not expose `role="navigation"` in the built DOM, the `.or([aria-label=...])` fallback covers it; verify the locator resolves to exactly one element (scoped `.first()`).
4. **`#12` accessibility has no dedicated test** — it is satisfied by F2's role/label-scoped assertions (links found by role+name; Security link count 0 = absent from tab order). Flagged as an intentional consolidation, not a silent gap. A dedicated keyboard tab-order walk is **deferred** to Gate B (MCP) if deeper a11y coverage is wanted.
5. **Read-only** — no test mutates data; no `afterAll` revert needed. Safe to run in parallel with Gate B reads.
6. **No app source modified** — no a11y/DOM fixes were applied to make tests pass. No DOM issues were encountered that required `data-testid` fallbacks; all selectors use role/label.
