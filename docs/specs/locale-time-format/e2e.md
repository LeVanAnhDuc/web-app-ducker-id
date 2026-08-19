# E2E Scenario Matrix — locale-time-format

Feature: `<FormatTime value variant="dateLong"|"datetime"|"relative" />` — a unified locale-aware time component that renders all displayed timestamps as `<time datetime="<ISO>">` elements, formatted per the active app locale (en/vi) and the user's local timezone, returning "—" for null/invalid inputs. It replaced legacy formatters across admin tables, the user Login History table, notification panels, and detail cards.

**Suite scope:** The committed test file (`e2e/locale-time-format/datetime-format.e2e.ts`) runs under the **`chromium` project** (regular logged-in user auth, `storageState = e2e/.auth/user.json`). User-accessible pages used:

| Surface | Route (en) | Route (vi) | Component / hook |
|---|---|---|---|
| Login History table | `/login-history` | `/vi/login-history` | `<FormatTime variant="datetime">` → `<time datetime="ISO">` |
| Notifications page | `/notifications` | `/vi/notifications` | `useFormatTime` hook → plain `<span>` text (no `<time>` element) |

Admin-side call-sites (app catalog table, users list, admin-login-history list, entitlements, contact pages) share the same `FormatTime` component. They are **not in the committed user-auth suite** because they require admin auth (excluded by `playwright.config.ts` `testIgnore`). They are verified by the **gate-B MCP walk under admin auth** (see "Gate B" rows below).

---

## Scenario Matrix

### 1. Happy path / data-render (en)

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 1a | `<time datetime>` element present and visible in Login History table | `/login-history` (en) | EP: valid ISO createdAt | **A** | `time[datetime]` locator visible; `datetime` attr matches `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/` |
| 1b | datetime text is NOT a raw ISO string | `/login-history` (en) | EP: formatted vs raw | **A** | `innerText` does NOT match `/^\d{4}-\d{2}-\d{2}T/` |
| 1c | datetime text is NOT "Invalid Date" or "—" | `/login-history` (en) | Error Guessing: invalid fallback | **A** | `getByText("Invalid Date")` count = 0; text ≠ "—" |
| 1d | Admin tables (apps, users, admin-login-history, entitlements, contact) render `<time datetime>` | `/admin/*` (en) | EP: admin surfaces | **B** (MCP walk, admin auth) | Each timestamp cell is a `<time datetime="ISO">` element; text is human-readable |

### 2. AuthN — N/A

Auth is enforced globally by `AuthGuardLayout`; this feature adds no new auth gates. The global `auth.setup.ts` already covers unauthenticated redirect. Marking N/A — no new scenario needed.

### 3. AuthZ — N/A

`FormatTime` is a pure rendering component; it has no server-side ownership check or role guard of its own. AuthZ for the pages that use it (login-history, notifications, admin surfaces) is covered by their own suites. Marking N/A here.

### 4. Validation / empty-null [EP]

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 4a | AdminUsers `lastLoginAt` null → renders localized **"Never"** (en) / **"Chưa từng"** (vi) label (intentional conditional, NOT FormatTime's "—"), no "Invalid Date", no crash | `/admin/users` (en + vi) | EP: null partition | **B** (MCP walk, admin auth) | Cell shows "Never"/"Chưa từng"; FormatTime's "—" fallback applies only to a null passed directly to the component (see 4b/4c); no JS error. **Gate B: PASS.** |
| 4b | Invalid/unparseable date string → renders "—", no "Invalid Date" text | `/login-history` (en) via intercept with `createdAt: "not-a-date"` | EP: invalid-string partition | **B** (MCP walk, can also be verified via unit test of `toValidDate`) | Text = "—"; `getByText("Invalid Date")` count = 0 |
| 4c | `undefined` value → renders "—" | Requires component-level unit test | EP | (unit test) | — |

### 5. Boundary / timezone [BVA]

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 5a | Date near midnight UTC: en vs vi texts differ and both non-ISO | `/login-history` (en + vi) with a midnight-UTC ISO (e.g. `2026-01-01T00:00:00.000Z`) | BVA: timezone-boundary date | **B** (MCP walk — timezone difference is environment-dependent; hard to assert deterministically in committed suite) | Both locales render formatted text; neither shows raw ISO; `datetime` attr is the original ISO |
| 5b | Hydration no console warning: `suppressHydrationWarning` prevents React mismatch error for timezone-dependent text | `/login-history` (en) on first render | Error Guessing: SSR/CSR timezone mismatch | **B** (MCP walk — check browser console for React warning text) | No `"Warning: Text content did not match"` in console |

### 6. Filter / search — N/A

`FormatTime` is a rendering primitive; it is not a filter input. The Login History page has date-range filters but those are tested in the login-history feature suite. Marking N/A.

### 7. Data-render [EP + Error Guessing]

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 7a | `<time datetime>` count ≥ rows rendered | `/login-history` (en) with 3-row intercept | EP: n-row dataset | **A** | `time[datetime]` count ≥ 3 |
| 7b | `getByText("Invalid Date")` count = 0 across the whole page | `/login-history` (en) | Error Guessing: invalid fallback leak | **A** | 0 matches |
| 7c | No raw ISO text visible anywhere (`/\dT\d{2}:\d{2}/`) | `/notifications` (en) | Error Guessing: ISO leak | **A** | 0 matches |
| 7d | Notifications relative text is human-readable (no ISO) | `/notifications` (en) | EP: relative variant | **A** | At least one match for `/\b(ago|now|hour|minute|day|second)\b/i` |
| 7e | Admin card detail (e.g. user detail modal, app detail) renders formatted date, not ISO | `/admin/users` or `/admin/apps` | EP | **B** (MCP walk, admin auth) | Formatted text visible; no raw ISO |

### 8. i18n en + vi [EP + Decision Table]

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 8a | vi login-history: visible text contains "thg" (Vietnamese month abbreviation) | `/vi/login-history` (vi) | EP: vi locale partition | **A** | `innerText` contains `"thg"` |
| 8b | `datetime` attribute is ISO string regardless of locale | `/vi/login-history` (vi) | EP: locale-agnostic attribute | **A** | `datetime` attr matches ISO regex |
| 8c | en and vi texts differ for the same `createdAt` ISO | `/login-history` (en) vs `/vi/login-history` (vi), same item | Decision Table: locale × format | **A** | `enText !== viText` |
| 8d | vi notifications: relative text contains "trước" (Vietnamese suffix) | `/vi/notifications` (vi) | EP: vi relative variant | **A** | At least one element matching `/trước/` visible |
| 8e | vi notifications: "ago" (English suffix) absent | `/vi/notifications` (vi) | Error Guessing: locale leak | **A** | `getByText(/\bago\b/i)` count = 0 |
| 8f | Admin tables (apps, users, admin-login-history) display vi-formatted dates under `/vi/*` | `/vi/admin/*` | EP | **B** (MCP walk, admin auth) | Cells contain "thg"; `datetime` is still ISO |

### 9. Error / loading — N/A

`FormatTime` has no network calls; it is a pure rendering component that accepts a value prop. Loading states and API errors are covered by the parent page suites (login-history, notifications). Marking N/A — no new scenario attributable to this feature.

### 10. Mutation — N/A

`FormatTime` is read-only. It has no mutation path. Marking N/A.

### 11. Accessibility / semantic [EP]

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 11a | All `<time>` elements in the login-history table have a non-empty `datetime` attribute | `/login-history` (en) | EP: semantic HTML contract | **A** | Every `time[datetime]` locator has `getAttribute("datetime")` truthy |
| 11b | `datetime` attribute value is an ISO string (machine-readable for AT) | `/vi/login-history` (vi) | EP: locale-agnostic ISO | **A** | `datetime` matches ISO regex |
| 11c | Notifications timestamp rendered in a `<span>` (not a `<time>`) — a11y gap flagged | `/notifications` (en) | Error Guessing: missing semantic element | **B** (MCP walk — flag as follow-up; app code must NOT be modified to fit the test per CLAUDE.md §4.3) | `time` element count = 0 in notification article timestamps; follow-up: wrap `useFormatTime` output in `<time datetime>` in `NotificationItem` |

### 12. Hydration (Error Guessing)

| # | Scenario | Page / locale | Technique | Gate | Expected outcome |
|---|---|---|---|---|---|
| 12a | No "Warning: Text content did not match" console error on first load | `/login-history` (en) | Error Guessing: SSR/CSR timezone diff with `suppressHydrationWarning` | **B** (MCP walk — listen to `browser_console_messages` on fresh navigation) | Zero console errors matching `"Text content did not match"` |
| 12b | Page renders correct locale-formatted text after hydration completes (UTC SSR → local-tz CSR) | `/login-history` (en) | State Transition: SSR → mounted | **B** (MCP walk — observe `browser_snapshot` before and after hydration) | Text changes from UTC-formatted SSR output to local-timezone text without visible flash of "Invalid Date" or "—" |

---

## Explicit scope exclusions (gate-B or N/A)

The following scenarios are **not in the committed user-auth suite** and are verified by the gate-B MCP walk under appropriate auth:

1. **Admin tables** (`/admin/apps`, `/admin/users`, `/admin/login-history`, entitlements, contacts): require admin auth excluded by `playwright.config.ts` `testIgnore`. Gate-B MCP walk covers these under `e2e/.auth/admin.json`.
2. **`null` lastLoginAt** (AdminUsers table): renders the localized **"Never"/"Chưa từng"** label via an intentional conditional (NOT FormatTime's "—"). Gate-B MCP walk (admin auth) confirmed PASS in both locales — no "Invalid Date", no crash.
3. **Invalid date string → "—"** (4b): most reliably verified via unit test of `toValidDate`; gate-B MCP walk can supplement by inspecting a synthetic intercept on an admin surface.
4. **Timezone date-boundary** (5a) and **hydration no-warning** (5b, 12a, 12b): environment-dependent; deterministic only in MCP walk with console observation.
5. **Notifications `<time>` semantic gap** (11c): app code NOT modified to fit the test (CLAUDE.md §4.3). Flag as a11y follow-up: `NotificationItem` should wrap the `timestamp` prop in `<time datetime={iso}>`.

## Gate B run results (dual-gate §4.3)

Gate A (`yarn e2e e2e/locale-time-format`): **PASS 9/9**. Gate B (Playwright MCP walk, en + vi, user + admin auth): **PASS** — hydration console **clean** (zero mismatch warnings on all pages, `suppressHydrationWarning` working), all datetime/relative scenarios render localized non-ISO text, admin tables render `<time datetime>` correctly, null lastLoginAt → "Never"/"Chưa từng".

**Follow-ups flagged during gate B (unrelated to this feature — pre-existing, NOT caused by the time-format migration):**
- **`AdminContactTable` i18n bug**: `/admin/contact` logs ~22 `IntlError: MISSING_MESSAGE: Cannot read properties of undefined (reading 'split')` (one per row, in the category/status label path — NOT the `FormatTime` date cell on line 161). Page renders and timestamps are correct, but the missing translation key should be fixed in a separate task (en + vi).
- **Notifications a11y** (11c above): wrap relative timestamp in `<time datetime>`.
