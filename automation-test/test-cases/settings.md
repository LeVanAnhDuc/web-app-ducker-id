# SETTINGS — language, appearance, formatting

Test cases for `REQ-SETTINGS-01` … `REQ-SETTINGS-04` (`docs/requirements.md`).

**Sources.** Client: `client/src/components/UserMenu/**` (LanguageSubmenu,
ThemeSubmenu), `client/src/contexts/ThemeProvider` (next-themes, class
attribute, default `system`), `client/src/i18n/{config,routing}.ts`
(`en` default, `vi`, `localePrefix: "as-needed"`), the `FormatTime`
component and `useFormatTime` hook, the sidebar config, copy in
`client/src/locales/{en,vi}/{common,dashboard}.json`.
Converted from `docs/specs/locale-time-format/e2e.md` (TC-SETTINGS-001 … -016)
and `docs/specs/remove-team-feature/e2e.md` (TC-SETTINGS-010 … -013).

**Data.** Read-only: language and theme live in the URL, a cookie and
localStorage of a throwaway browser context; nothing is written to an
account. Login-history rows are served by a `page.route` intercept so the
rendering contract is checked on known instants.

**Old-matrix rows not given their own case.** locale-time-format §2 / §3 / §9 /
§10 (AuthN, AuthZ, loading, mutation) were N/A — FormatTime is a pure
renderer; §4c (`undefined` value) is a unit-test concern; §12b (SSR→CSR text
swap) is covered by TC-SETTINGS-009's no-mismatch check plus TC-SETTINGS-015's
local-zone rendering. remove-team-feature rows were all negative assertions;
the old suite opened `/account-settings`, which was itself removed later — the
cases now open `/profile`, the surviving Settings page.

## Language (REQ-SETTINGS-01)

### TC-SETTINGS-020 — Switching to Tiếng Việt moves to /vi and translates the page

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (en → vi)
- **Preconditions:** `/apps?search=idms`
- **Steps:**
  1. User menu → Language → "Tiếng Việt".
- **Expected:** URL `/vi/apps?search=idms` (query kept); nav "Trang chủ"; `<html lang="vi">`.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-021 — Switching back to English drops the prefix

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (vi → en)
- **Preconditions:** `/vi/apps`
- **Steps:**
  1. "Mở menu người dùng" → "Ngôn ngữ" → "English".
- **Expected:** path `/apps` (no prefix); nav "Home"; `<html lang="en">`.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-022 — The active language is marked; picking it again is a no-op

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (invalid: en → en)
- **Preconditions:** `/apps`
- **Steps:**
  1. Open the Language submenu; pick "English".
- **Expected:** English `aria-checked="true"`, Tiếng Việt `false`; URL unchanged.
- **Automated:** `tests/e2e/settings/language.e2e.ts`

### TC-SETTINGS-023 — The switch is announced

- **Requirement:** REQ-SETTINGS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Accessibility
- **Preconditions:** `/apps`
- **Steps:**
  1. Switch to Tiếng Việt.
- **Expected:** the live region announced "Language changed to Tiếng Việt.".
- **Automated:** `tests/e2e/settings/language.e2e.ts`

## Theme (REQ-SETTINGS-02)

### TC-SETTINGS-030 — Dark is applied and persists

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (system → dark → reload / new tab)
- **Preconditions:** OS scheme emulated light
- **Steps:**
  1. User menu → Theme → Dark; reload; open `/apps` in a second tab.
- **Expected:** `<html class="… dark">` each time.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-031 — Light overrides a dark OS preference

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (choice light × OS dark)
- **Preconditions:** OS scheme emulated dark
- **Steps:**
  1. Theme → Light; reload.
- **Expected:** `light` class, never `dark`.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-032 — System follows the OS

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (choice system × OS dark / light)
- **Preconditions:** OS scheme emulated dark, then light
- **Steps:**
  1. Theme → Dark, then → System; reload.
- **Expected:** the class equals the OS scheme, before and after the reload.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

### TC-SETTINGS-033 — The theme submenu in Vietnamese

- **Requirement:** REQ-SETTINGS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (locale vi)
- **Preconditions:** `/vi`
- **Steps:**
  1. "Giao diện" → "Tối"; reopen the submenu.
- **Expected:** dark class; "Tối" checked; "Sáng" and "Theo hệ thống" listed.
- **Automated:** `tests/e2e/settings/theme.e2e.ts`

## Date and time format (REQ-SETTINGS-03)

### TC-SETTINGS-001 — A timestamp is a <time> element with ISO datetime and readable text

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (valid ISO)
- **Preconditions:** one intercepted login-history row
- **Steps:**
  1. Open `/login-history`.
- **Expected:** `time[datetime]` with an ISO value; text not ISO, not "Invalid Date", not "—".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-002 — Vietnamese dates use the Vietnamese month form

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (locale vi)
- **Preconditions:** one intercepted row
- **Steps:**
  1. Open `/vi/login-history`.
- **Expected:** text contains "thg"; datetime still ISO.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-003 — The same instant renders differently per locale

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (locale × format)
- **Preconditions:** one fixed intercepted row
- **Steps:**
  1. Read it on `/login-history` and `/vi/login-history`.
- **Expected:** the two texts differ.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-004 — Notifications show relative English times

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (relative variant)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`.
- **Expected:** relative text ("ago" / "minute" / …); no ISO strings.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-005 — Notifications show relative Vietnamese times

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (locale vi), Error Guessing (locale leak)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** "trước" present; no English "ago".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-006 — Invalid values never show "Invalid Date"

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (valid rows; unparseable `createdAt`), Error Guessing
- **Preconditions:** intercepted rows, one with `createdAt: "not-a-date"`
- **Steps:**
  1. Open `/login-history`.
- **Expected:** no "Invalid Date" anywhere; the unparseable value renders "—".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-007 — Every timestamp cell carries a machine-readable datetime

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Accessibility
- **Preconditions:** three intercepted rows
- **Steps:**
  1. Open `/login-history` and `/vi/login-history`.
- **Expected:** ≥ 3 `time` elements, each with a non-empty ISO `datetime`, in both locales.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-008 — Admin tables use the same format

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin (`adminPage`)
- **Technique:** EP (admin surface × en / vi)
- **Preconditions:** seeded users
- **Steps:**
  1. Open `/admin/users` and `/vi/admin/users`.
- **Expected:** `table time[datetime]` with ISO values, readable text; vi contains "thg".
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-009 — First load hydrates without a mismatch warning

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (server UTC vs. browser zone)
- **Preconditions:** one intercepted row
- **Steps:**
  1. Open `/login-history`, collecting console errors and warnings.
- **Expected:** none mentions a hydration / text mismatch.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-015 — Midnight UTC lands on the viewer's calendar day

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (day boundary across time zones)
- **Preconditions:** a row at `2026-01-01T00:00:00.000Z`; browser zone Asia/Ho_Chi_Minh, then America/New_York
- **Steps:**
  1. Open `/login-history` in each zone.
- **Expected:** "Jan 1, 2026…" in Ho Chi Minh, "Dec 31, 2025…" in New York; `datetime` is the original ISO in both.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

### TC-SETTINGS-016 — Notification times are <time> elements

- **Requirement:** REQ-SETTINGS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Accessibility
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`; inspect the first article.
- **Expected:** one `time[datetime]`. **Known bug** — the relative time is a
  plain `<span>` (follow-up flagged by the locale-time-format feature, never
  done); spec marked `test.fail`.
- **Automated:** `tests/e2e/settings/datetime-format.e2e.ts`

## Removed features (REQ-SETTINGS-04)

### TC-SETTINGS-010 — The Settings nav has no Team link

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (locale en / vi)
- **Preconditions:** `/profile`, `/vi/profile`
- **Steps:**
  1. Read the Settings group.
- **Expected:** "Account" (vi "Tài khoản") and "Billing" present; "Team" / "Nhóm" absent.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-011 — /team is not found

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (invalid: removed route)
- **Preconditions:** none
- **Steps:**
  1. Open `/team` and `/vi/team`.
- **Expected:** the not-found page, no crash.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-012 — No missing message or leaked team key after the removal

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (dangling i18n key)
- **Preconditions:** `/profile`, `/vi/profile`
- **Steps:**
  1. Load each, collecting console errors.
- **Expected:** no `MISSING_MESSAGE` / `IntlError`; no `team.*` text.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`

### TC-SETTINGS-013 — The surviving Settings links stay keyboard-reachable

- **Requirement:** REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Accessibility
- **Preconditions:** `/profile`
- **Steps:**
  1. Focus the "Account" link.
- **Expected:** it takes focus.
- **Automated:** `tests/e2e/settings/team-removal.e2e.ts`
