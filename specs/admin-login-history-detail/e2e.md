# Admin Login History — Detail Page & Detail API — E2E

Test file: `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts`

## How to run

Runs under the Playwright **chromium** project (the config ignores only `admin-apps/`), using `e2e/.auth/user.json` and depending on the `setup` project. Per the `admin-users-list` precedent, run with the admin user so the session has admin rights:

```bash
# from client/ (or the client worktree), app + Mongo/Redis up and seeded:
E2E_USER_EMAIL=admin@test.com yarn e2e admin-login-history
```

`auth.setup.ts` performs an admin login via the API, which records ≥1 `login_histories` row — so the list is non-empty and the first **View** button is clickable.

> When verifying worktree changes specifically, run the worktree dev server on a separate port (e.g. `--port 3100`, copy `.env.local`) and point Playwright at it via `E2E_BASE_URL=http://localhost:3100`, because the app on `:3000` serves `main`, not the worktree.

## Scenario → test mapping (matrix in `design.md`)

| Matrix row | Scenario | Test |
| --- | --- | --- |
| 1 Happy / 8 Data render | List → click View → detail renders with field labels | `admin opens the list, clicks View, and the detail page renders` |
| 1 (deep-link) | Direct navigation to a detail URL renders | `deep-linking directly to a detail URL renders the record` |
| 12 a11y | View action is a button with an accessible name | `the View action is a button with an accessible name` |
| 4 Validation | Non-ObjectID id → not-found UI | `an invalid id shows the not-found UI` |
| 10 Error/loading | Valid-but-missing id → not-found UI | `a valid-but-missing id shows the not-found UI` |
| 10 Error/loading | Detail API 5xx → error UI (distinct `error` message) | `a detail API failure shows the error UI` |
| 9 i18n | `vi` locale: translated action + detail labels | `vi locale renders the translated action label and detail labels` |
| 2 AuthN | Unauthenticated → redirect to login | `unauthenticated visit to a detail URL redirects to login` |

## Deferred scenarios (recorded — not silently dropped)

| Matrix row | Why deferred | Mitigation |
| --- | --- | --- |
| 3 AuthZ (non-admin → 403/blocked) | The Playwright harness provides a single admin `storageState`; exercising a non-admin session needs a separate fixture/storageState. | Server-side `adminGuard` on the admin routes covers this; add a non-admin fixture as a follow-up to assert the FE redirect/403. |
| 5 Empty/null (null `userId` / failed-login record render) | The current seed does not guarantee a failed-login row (null `userId`, non-null `failReason`), so a deterministic assertion isn't possible. | The detail card's conditional rendering (`userId`/`failReason`/`timezoneOffset` guards) is covered by the FE code review; add a seeded failed-login fixture as a follow-up to assert the empty/null UI. |

## N/A rows (per matrix)

- Row 6 Boundary/pagination — detail page isn't paginated; list pagination unchanged by the column trim.
- Row 7 Filter/search — detail has no filters; list filters unchanged.
- Row 11 Mutation safety — read-only feature, no writes.
