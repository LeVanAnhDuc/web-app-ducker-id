# E2E Bug Log — admin-reset-password

Append-only. 1 entry per dual-gate fail round (§4.3, max 3 rounds).

## Round 1 — 2026-07-24

- **Gate fail**: A (`yarn e2e --project=admin e2e/admin-users-reset/`).
- **Scenario**: Data rendering — "dialog and toast render the target's name/email, never a raw i18n key" (`reset-action.e2e.ts:227`).
- **Triệu chứng**: `getByText('user2@test.com')` strict-mode violation — matched 2 elements: the user-row `<span>` AND the dialog description `<p>` ("A password reset email will be sent to user2@test.com"). Expected: 1 visible element.
- **Root cause** (systematic-debugging): **test-authoring bug, not app defect**. The app correctly renders the email inside the dialog description; the assertion's locator was page-scoped (ambiguous) instead of dialog-scoped. No application code involved.
- **Fix đã làm**: `reset-action.e2e.ts:235` — scope the locator to the dialog: `page.getByRole("dialog").getByText(UI_TARGET_EMAIL)`. No app code changed.
- **Kết quả re-verify**: target test PASS (2/2 incl. admin-setup). Full reset suite re-run: all green (39 passed, 3 `test.fixme` skipped).
