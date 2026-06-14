# Admin Login History — Detail Page & Detail API — E2E

Test file: `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts`

## How to run

Runs under the Playwright **`admin`** project (CF-1 closed): `playwright.config.ts`
maps `admin-login-history/*.e2e.ts` → the `admin` project with storageState
`e2e/.auth/admin.json` and dependency `admin-setup`. It is excluded from the
`chromium` project's `testIgnore`, so no `E2E_USER_EMAIL` override is needed.

```bash
# from client/ (or the client worktree), app + Mongo/Redis up and seeded:
yarn e2e admin-login-history
```

`admin.setup.ts` performs an admin login via the API, which records ≥1
`login_histories` row — so the list is non-empty and the first **View** button is
clickable.

> When verifying worktree changes specifically, run the worktree dev server on a
> separate port (e.g. `--port 3100`, copy `.env.local`) and point Playwright at it
> via `E2E_BASE_URL=http://localhost:3100`, because the app on `:3000` serves
> `main`, not the worktree.

### Prerequisites / code-fix notes

- **CF-1 (project scope) — CLOSED.** `admin-login-history/` runs under the `admin`
  project (admin storageState), not the old `chromium` + `E2E_USER_EMAIL` path.
- **CF-4 (announce-on-load) — CLOSED.** `LoginHistoryDetailCard` now calls
  `useAnnounce` on load (`announce.loading` / `announce.loaded` / `announce.error`,
  en + vi). The row-12 announce-on-load test asserts the `#announcer` live region.
- **Row 3 AuthZ (non-admin) fixture.** The AuthZ block re-authenticates as the
  regular user via `e2e/.auth/user.json` (produced by `auth.setup.ts` / the
  `setup` project). This suite runs under the `admin` project (dependency
  `admin-setup`), so `user.json` must exist on disk — guaranteed when running the
  full `yarn e2e` (the `setup` project runs) or after `admin-authz` has run.

### Selectors / assertion facts (read from code, not guessed)

- **View action:** `<CustomButton>` → `<button>` with text `tTable("viewDetail")`
  (en "View" / vi "Xem") → `getByRole("button", { name: /view|xem/i })`.
- **Detail page title:** `getByRole("heading", { name: /Login Attempt Detail/i })`
  (the `<h1>` in `AdminLoginHistoryDetailHeader`; the card `<h2>` is the username).
- **Field labels:** `<dt>` text nodes keep i18n casing (CSS `uppercase` only) →
  `getByText("IP Address", { exact: true })` / vi `"Địa chỉ IP"`. The timezone
  field label is **"Timezone"** (`fields.timezoneOffset`), not "Timezone Offset".
- **Status badge:** localized `tStatus(status)` ("Success" / "Failed"), never raw
  `"success"`/`"failed"`. **Method:** `tMethod(method)` ("Password"), never raw
  `"PASSWORD"`. **isAnomaly:** `t("anomalyYes")`/`t("anomalyNo")` ("Yes"/"No").
  **anomalyReasons** empty → `t("anomalyNone")` ("None"). **createdAt** via
  `formatDateTimeMedium` (no ISO `T…Z`).
- **404/400 mapping:** the card maps `status === 404 || status === 400` → `notFound`;
  other failures (e.g. 500, abort) → `error`.
- **Skeleton:** `LoginHistoryDetailSkeleton` has no testid → assert
  `.animate-pulse` shadcn `<Skeleton>`s before the heading arrives.
- **Announcer:** `#announcer` (`aria-live="polite"`) in the root layout.

## Scenario → test mapping (matrix in `design.md`)

| Matrix row | Scenario | Test |
| --- | --- | --- |
| 1 Happy | List → click View → detail renders (heading + "IP Address") | `admin opens the list, clicks View, and the detail page renders` |
| 1 (deep-link) | Direct navigation to a detail URL renders | `deep-linking directly to a detail URL renders the record` |
| 8 Data rendering [DT] | Localized/formatted values, never raw enums/bools/ISO | `detail renders localized/formatted values, not raw enums` |
| 5 Empty/null [DT] | null userId/timezoneOffset hidden; failReason shown; anomaly "None"; warning badge (stubbed via `page.route`) | `null userId/timezoneOffset are hidden; failReason shown; anomaly None; warning badge` |
| 4 Validation [BVA] | Non-ObjectID id → 400 → not-found UI | `an invalid id shows the not-found UI` |
| 10 Error/loading | Valid-but-missing id → 404 → not-found UI | `a valid-but-missing id shows the not-found UI` |
| 10 Error [Error Guessing] | Detail API 5xx → **error** UI (distinct `error` message, not `notFound`) | `a detail API failure shows the error UI` |
| 10 loading [Error Guessing] | Delayed route → skeleton visible before data, then heading | `loading skeleton shows before detail data arrives` |
| 10 abort [Error Guessing] | `route.abort()` → error UI (not the 5xx retry path) | `network abort shows the error UI (distinct from 5xx retry path)` |
| 9 i18n | vi locale: translated action + field labels | `vi locale renders the translated action label and detail labels` |
| 9 i18n depth | vi not-found + error strings render in Vietnamese (no raw keys) | `vi locale renders translated not-found and error strings` |
| 12 a11y [State Transition] | View focus + Enter → navigates to detail | `View action is keyboard-activatable (focus + Enter navigates)` |
| 12 a11y [State Transition] | List `?status=failed&page=2` → View → back → query retained | `navigating back from detail preserves the list query string` |
| 12 a11y (CF-4) | Detail load → `#announcer` populated ("Login attempt detail loaded") | `detail load announces to the #announcer live region` |
| 2 AuthN | Unauthenticated → redirect to login | `unauthenticated visit to a detail URL redirects to login` |
| 3 AuthZ [Decision Table] | Non-admin (`user.json`) → no redirect, permission toast, detail card absent | `non-admin cannot view a login-history detail record` |

## Deferred scenarios (recorded — not silently dropped)

_None currently deferred._ Row 5 (Empty/null) was moved from deferred → covered by
stubbing the detail API with `page.route` (no seed dependency). Row 3 (AuthZ) and
row 12 (announce-on-load) are now covered (CF-4 closed; `user.json` fixture used).

> Cross-ref: `e2e/admin-authz/admin-authz.e2e.ts` covers the non-admin denial for
> the `/admin/login-history` **list** route (same BE 403 + permission toast + no
> admin data); the row-3 test here adds the **detail** route. There is no FE role
> guard for `/admin/*` (confirmed in that suite) — a non-admin is NOT redirected;
> the deny signal is the BE 403 permission toast plus the detail card never
> rendering.

## A11y follow-up (flagged, NOT fixed in tests)

- The **View** action is a `<CustomButton>` (`<button>` + `router.push`), not a
  next-intl `<Link href>`. It is keyboard-activatable and back-preserves the list
  query (history stack), but lacks native link affordances
  (middle-click / open-in-new-tab / right-click). Consider switching to
  `<Link href>` as a follow-up. App code was not modified in the tests.

## N/A rows (per matrix)

- Row 6 Boundary/pagination — detail page isn't paginated; list pagination is
  covered by the separate `admin-login-history` list suite and is unchanged by the
  column trim.
- Row 7 Filter/search — detail has no filters; list filters unchanged.
- Row 11 Mutation safety — read-only feature, no writes (all `page.route` calls
  only stub responses; nothing mutates the DB).
