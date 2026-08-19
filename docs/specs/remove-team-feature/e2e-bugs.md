# E2E Dual-Gate Bug Log — Remove Team

> Append-only. One entry per fail round (§4.3, max 3 rounds).

## Round 1 — 2026-06-29

- **Gate fail**: A only (gate B PASSED all 7 scenarios).
- **Scenario**: `team-removal` suite, VI-locale rows — `settings sidebar has no Team link (vi)` and `no console error on Settings (vi)`.
- **Triệu chứng**: locator `getByRole("navigation", { name: "Settings" }).or([aria-label="Settings"]).first().getByRole("link", { name: "Cài đặt tài khoản" })` → "element(s) not found" / not visible (5s timeout). EN equivalents passed (16 passed, 2 failed).
- **Root cause** (systematic-debugging): the `settingsNav` helper hardcoded the **English** group aria-label `"Settings"` for the nav scope. On `/vi/*` pages the sidebar group renders its localized `aria-label="Cài đặt"` (`tGroups("settings")` → vi = "Cài đặt"). So the VI nav container never matched → the inner link lookup found nothing. This is a **test-locator defect, not an app defect** — gate B confirmed (via accessibility snapshot) the VI group "Cài đặt" lists Hồ sơ / Cài đặt tài khoản / Thanh toán with no "Nhóm", and `/team` + `/vi/team` both 404.
- **Fix đã làm**: `client/e2e/team-removal/team-removal.e2e.ts` — parameterized `settingsNav(page, groupLabel)` and added `VI.settingsGroup = "Cài đặt"`; the two VI tests now pass `VI.settingsGroup` to scope the nav. No app code changed.
- **Kết quả re-verify**: gate A re-run → **18 passed (0 failed)**. Dual-gate now green (gate A 18/18, gate B 7/7). Round closed.
