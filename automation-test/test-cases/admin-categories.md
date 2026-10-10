# ADMCAT — admin categories

Test cases for `REQ-ADMCAT-01` … `REQ-ADMCAT-04` (`docs/requirements.md`),
plus the app ↔ category cases of `REQ-ADMAPPS-02` (1–5 ordered categories),
which the category specs own.

**Sources.** Client: `client/src/views/AdminCategories/**`,
`client/src/views/AdminApps/components/CategoryMultiSelect`, `CategoryChips`;
copy in `client/src/locales/{en,vi}/adminCategories.json`. Server:
`server/src/modules/category/**`, rules in `server/src/validators/schemas/category.ts`.
Converted from the E2E Scenario Matrix and the completeness-critic additions
in `docs/specs/category-management/design.md` §6 (no separate `e2e.md` was
written for this feature). "[row N]" in a spec title is the row of that matrix.

**Seed baseline:** Content (1 app: Blog), Internal Tools (2), Identity (1: IDMS
Portal), Productivity (2: Team Calendar — inactive — and Notes), in that order.
Specs borrow seeded apps (snapshot → change `categoryIds` → restore), create
only categories named `E2E …` and delete them afterwards (`helpers/categories.ts`).

**Matrix rows not given their own case.** Row 2 (AuthN) / row 3 (AuthZ) are
TC-AUTHZ-004 … -006. Row 6 "more than 6 orphans (scroll)" stays deferred: the
seed has 6 apps and borrowing all of them would break other specs. Row 10
"SSR fallback of the public categories" belongs to the APPS module. Back
button with the dialog open and session expiry mid-edit are N/A (design §6).

## List (REQ-ADMCAT-01)

### TC-ADMCAT-001 — The list shows each category's English and Vietnamese names

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (every seeded row) — row 1, 8
- **Preconditions:** seed order untouched
- **Steps:**
  1. Open `/admin/categories`.
- **Expected:** four rows in seed order, each with its en and vi names, its slug and its app count (1 / 2 / 1 / 2).
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMCAT-002 — The first row cannot move up and the last cannot move down

- **Requirement:** REQ-ADMCAT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (position first / last) — row 6
- **Preconditions:** seed order
- **Steps:**
  1. Read the arrow buttons of the first and last rows.
- **Expected:** first ↑ disabled, first ↓ enabled; last ↓ disabled, last ↑ enabled.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMCAT-003 — Every icon button is named after its category

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y) — row 12
- **Preconditions:** none
- **Steps:**
  1. Inspect the Identity row.
- **Expected:** "Move Identity up", "Move Identity down", "Edit Identity", "Delete Identity".
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMCAT-004 — In Vietnamese the vi name comes first

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (locale vi) — row 9
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/admin/categories`.
- **Expected:** heading "Danh mục"; in the Internal Tools row "Công cụ nội bộ" precedes "Internal Tools"; button "Chuyển Công cụ nội bộ lên".
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMCAT-005 — The admin sidebar links to the categories page

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP — row 1
- **Preconditions:** none
- **Steps:**
  1. From `/admin/apps` click "Categories" in the sidebar.
- **Expected:** `/admin/categories`.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

### TC-ADMCAT-006 — An empty list shows the empty state with a create action

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (0 categories, stubbed `GET`) — row 5
- **Preconditions:** list stubbed to `[]`
- **Steps:**
  1. Open `/admin/categories`.
- **Expected:** "No categories yet" and a "New category" button.
- **Automated:** `tests/e2e/admin-categories/categories-list.e2e.ts`

## Create and rename (REQ-ADMCAT-02)

### TC-ADMCAT-007 — A new category is added last with a slug from its English name

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid create) — row 1
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. "New category", fill both names, watch the slug preview, "Create".
- **Expected:** the preview shows the slug; the sheet closes and the last row carries the name and slug.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-008 — Both names empty: both fields report and nothing is sent

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (en empty × vi empty) — row 4
- **Preconditions:** none
- **Steps:**
  1. Press "Create" on an empty sheet.
- **Expected:** "Enter an English name." and "Enter a Vietnamese name."; no POST.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-009 — Whitespace-only and zero-width-only names count as empty

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (blank partitions) — row 4, DR-11
- **Preconditions:** none
- **Steps:**
  1. Fill en with spaces and vi with a zero-width space; "Create".
- **Expected:** both required messages.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-010 — An English name without a letter or digit is refused

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (no slug-able character) — DR-12
- **Preconditions:** none
- **Steps:**
  1. en `🚀 !!!`, vi valid; "Create".
- **Expected:** "The English name needs at least one letter or digit."
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-011 — 100 characters are accepted, 101 refused in the form

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (100 / 101) — row 4
- **Preconditions:** none; the 100-char category is deleted afterwards
- **Steps:**
  1. en of 101 chars → Create; then 100 chars → Create.
- **Expected:** "The English name must not exceed 100 characters."; the 100-char one saves.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-012 — A duplicate English name in another case is a 409 on the English field

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (en duplicate × vi valid) — row 4
- **Preconditions:** seed category Content
- **Steps:**
  1. en `  CONTENT  `, vi valid; "Create".
- **Expected:** "A category with this English name already exists."; the sheet stays open.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-013 — Duplicate English with empty Vietnamese fails on the client first

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (en duplicate × vi empty) — row 4
- **Preconditions:** none
- **Steps:**
  1. en `Content`, vi empty; "Create".
- **Expected:** "Enter a Vietnamese name." and no POST.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-014 — The Vietnamese page's slug preview folds đ and accents

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi, accented input) — row 4, 9
- **Preconditions:** none
- **Steps:**
  1. `/vi/admin/categories` → "Tạo danh mục"; "Tên (English)" = `Đa dạng Phân Tích`.
- **Expected:** preview `da-dang-phan-tich`.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-015 — A server error keeps the sheet open with the typed values

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (POST stubbed 500) — row 10
- **Preconditions:** stubbed POST
- **Steps:**
  1. Fill both names; "Create".
- **Expected:** the sheet stays open and the English value is kept.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-016 — Double-clicking Create makes one category

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (submit guard) — row 11
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. Double-click "Create".
- **Expected:** one POST and one category with that name.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-017 — Renaming the English name moves the slug; renaming only Vietnamese keeps it

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** Decision Table (en changed × vi changed) — row 1, 4
- **Preconditions:** an `E2E …` category; deleted afterwards
- **Steps:**
  1. Edit: change vi only (no `old → new` arrow), then en; save.
- **Expected:** the preview strikes the old slug; the stored slug is `<old>-two` and the vi name updated.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-018 — A rename onto a taken slug gets a suffix, and back again drops it

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (slug unique → suffixed → free again) — DR-13
- **Preconditions:** an `E2E …` category
- **Steps:**
  1. Rename it `Identity!`; then back to its own name.
- **Expected:** slug `identity-2` from the server; afterwards the original slug with no suffix.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-019 — Saving a category deleted in another tab closes the sheet and drops the row

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (invalid: edit after delete) — row 11
- **Preconditions:** an `E2E …` category deleted over the API while its sheet is open
- **Steps:**
  1. Change vi, save.
- **Expected:** 404 → the sheet closes and the row is gone.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

### TC-ADMCAT-020 — Creating and renaming never touches the seeded categories

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a rename that lands on the wrong row)
- **Preconditions:** the create / rename cases above have run
- **Steps:**
  1. List the categories.
- **Expected:** every seeded English name (Content, Internal Tools, Identity, Productivity) is still there.
- **Automated:** `tests/e2e/admin-categories/categories-crud.e2e.ts`

## Reorder (REQ-ADMCAT-03)

### TC-ADMCAT-021 — Moving the second row up makes it first, with focus kept

- **Requirement:** REQ-ADMCAT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (position 2 → 1 → 2), BVA, a11y — row 1, 6, 12
- **Preconditions:** order snapshotted and restored afterwards
- **Steps:**
  1. ↑ on the second row; press Enter on the focused ↓.
- **Expected:** it becomes first, its ↑ is disabled and focus moves to its ↓; Enter moves it back and focus stays.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMCAT-022 — A failed move leaves the order unchanged

- **Requirement:** REQ-ADMCAT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (move stubbed 500, no optimistic update) — row 10, DR-15
- **Preconditions:** stubbed move
- **Steps:**
  1. Press an ↑.
- **Expected:** the rows are exactly as before.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMCAT-023 — A tab with a stale order shows the server's order after a move

- **Requirement:** REQ-ADMCAT-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (stale client state) — row 11
- **Preconditions:** another "tab" (the API) moves the last category to the top first; restored afterwards
- **Steps:**
  1. In the stale page press ↑ on that category.
- **Expected:** the table shows it first, as the server has it.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

### TC-ADMCAT-024 — Two concurrent moves never fail and leave distinct sort orders

- **Requirement:** REQ-ADMCAT-03
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (race) — row 11
- **Preconditions:** order restored afterwards
- **Steps:**
  1. Move rows 2 and 3 up in parallel.
- **Expected:** both 200; every `sortOrder` is unique.
- **Automated:** `tests/e2e/admin-categories/categories-move.e2e.ts`

## Delete with reassignment (REQ-ADMCAT-04)

### TC-ADMCAT-025 — A category no app uses is deleted after a plain confirmation

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (orphans = 0, total = 0) — row 5, 6
- **Preconditions:** an empty `E2E …` category
- **Steps:**
  1. Delete it.
- **Expected:** "No app uses this category."; after "Delete category" the row is gone.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-026 — Apps that keep another category only lose this one

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (orphans 0, total > 0) — row 11
- **Preconditions:** Notes borrowed with `[Productivity, temp]`; restored afterwards
- **Steps:**
  1. Delete the temp category.
- **Expected:** "1 app uses this category." and "…only loses this one"; Notes ends with `[Productivity]`.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-027 — Orphans move to a shared target, an override survives a change of the shared target

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** Decision Table (orphans > 0, shared + 1 override), State Transition (override kept / reset to "(shared)") — row 11
- **Preconditions:** Team Calendar, Notes, Operations Console borrowed into a temp category; restored afterwards
- **Steps:**
  1. Override Notes → Identity; shared → Content, then Productivity; set Operations Console → Identity then back to "Productivity (shared)"; delete.
- **Expected:** counter 0/3 → 1/3 → 3/3, delete disabled until complete; Notes keeps Identity; Team Calendar and Operations Console end in Productivity.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-028 — Orphans set per app go to different targets

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (orphans > 0, per-app only; one missing → disabled) — row 11
- **Preconditions:** Team Calendar and Notes borrowed; restored afterwards
- **Steps:**
  1. Set Team Calendar → Content; observe; set Notes → Identity; delete.
- **Expected:** "1 app still needs a new category." with delete disabled; then each app ends in its own target.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-029 — An app orphaned after the dialog opened forces a reload, keeping choices

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (invalid: impact changed → 409) — row 11
- **Preconditions:** Team Calendar borrowed; Notes moved into the category over the API while the dialog is open
- **Steps:**
  1. Choose a target for Team Calendar; press delete; choose one for Notes; delete.
- **Expected:** 409 → the dialog reloads with Notes added, Team Calendar's choice kept and delete disabled until Notes has one; then both move.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-030 — A target deleted in another tab is dropped from the dialog

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (invalid target) — DR-18
- **Preconditions:** source and target `E2E …` categories; the target deleted over the API after being picked
- **Steps:**
  1. Press delete.
- **Expected:** delete disabled again, the target no longer offered, the dialog still open.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-031 — Dialog state does not leak to the next category's dialog

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (open A → cancel → open B)
- **Preconditions:** two `E2E …` categories with an orphan each
- **Steps:**
  1. In A pick a shared target, Cancel; open B.
- **Expected:** B's "Move all to" reads "Choose a category…" and delete is disabled.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-032 — Double-clicking delete sends one request

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (submit guard)
- **Preconditions:** an empty `E2E …` category
- **Steps:**
  1. Double-click "Delete category".
- **Expected:** exactly one DELETE.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-033 — Loading shows a skeleton; a failed impact offers retry and no delete

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (delete-impact delayed then 500) — row 10
- **Preconditions:** stubbed delete-impact
- **Steps:**
  1. Open the delete dialog; after the error press "Try again" with the stub lifted.
- **Expected:** `aria-busy` skeleton; "Couldn't load the apps in this category." with delete disabled; then "No app uses this category.".
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-034 — The last category that still has apps cannot be deleted

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (only one category left, orphans > 0; list + impact stubbed)
- **Preconditions:** stubs
- **Steps:**
  1. Open its delete dialog.
- **Expected:** `Can't delete "<name>"`, no delete button, "Got it" closes.
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

### TC-ADMCAT-035 — The delete dialog renders in Vietnamese

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi) — row 9
- **Preconditions:** a temp category holding Team Calendar; restored afterwards
- **Steps:**
  1. `/vi/admin/categories` → "Xoá <vi name>"; "Chuyển tất cả sang" → "Nội dung"; open the per-app select.
- **Expected:** "1/1 đã có đích"; option "Nội dung (chung)".
- **Automated:** `tests/e2e/admin-categories/categories-delete.e2e.ts`

## Categories on apps (REQ-ADMAPPS-02 with REQ-ADMCAT-01/02/04)

### TC-ADMCAT-036 — A second category keeps the first as primary, in order everywhere

- **Requirement:** REQ-ADMAPPS-02, REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (2 categories) — row 1, 8
- **Preconditions:** Blog borrowed; restored afterwards
- **Steps:**
  1. Edit Blog, add Identity, save; open `/apps`.
- **Expected:** chips "Content · Primary · Identity"; stored `[content, identity]`; Blog's card lists Content then Identity.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-037 — Removing the primary promotes the next one, and the order survives

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (primary removed) — row 11
- **Preconditions:** Blog with `[Content, Identity]`; restored afterwards
- **Steps:**
  1. Remove Content, save, reopen; edit another field and save.
- **Expected:** Identity is Primary after reopen; categories unchanged by the second save.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-038 — Unticking then re-ticking a category moves it to the end

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition — row 11
- **Preconditions:** Blog with `[Content, Identity]`
- **Steps:**
  1. Untick and re-tick Content.
- **Expected:** "Identity · Primary · Content".
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-039 — 0 categories is refused; 5 locks the rest and quick create

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** BVA (0 / 5) — row 4, 6
- **Preconditions:** ≥ 6 categories (two `E2E …` added)
- **Steps:**
  1. Remove Blog's only category and save; tick five options.
- **Expected:** "Select at least one category."; "At most 5 categories. Remove one to choose another.", the sixth option and "Create category" disabled.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-040 — Picker search is accent-insensitive and an exact match offers no create

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (folded vi / partial / exact) — row 7, DR-17
- **Preconditions:** none
- **Steps:**
  1. Search "nang suat", "prod", "content".
- **Expected:** Productivity with no create; Productivity plus `Create category "prod"`; Content with no create.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-041 — Quick create from the picker selects the new category; cancel keeps the form

- **Requirement:** REQ-ADMCAT-02, REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (picker → quick create → cancel / create) — row 1, 6
- **Preconditions:** Blog with `[Content]`; the new category is deleted afterwards
- **Steps:**
  1. Search a new name → `Create category "<name>"` → Cancel; again → fill vi → "Create and select"; save.
- **Expected:** the English field is prefilled; Cancel leaves the app form as it was; afterwards the chip appears and Blog stores `[content, new]`.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-042 — Filtering /apps matches a category in any position

- **Requirement:** REQ-ADMCAT-01, REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (primary / secondary / absent) — row 7
- **Preconditions:** Blog with `[Content, Identity]`
- **Steps:**
  1. Open `/apps?categoryId=<identity>`; reload.
- **Expected:** Blog (secondary) and IDMS Portal (primary) listed, Notes not; the filter stays after reload.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-043 — A filter on a deleted category is dropped, not an error

- **Requirement:** REQ-ADMCAT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (stale id in the URL) — row 7
- **Preconditions:** a category created and deleted
- **Steps:**
  1. Open `/apps?categoryId=<deleted>` and `/admin/apps?categoryId=<deleted>`.
- **Expected:** no error UI (no `role=alert` besides Next's route announcer); the stale filter is dropped and the unfiltered list shows. The design matrix (row 7) asked for an empty state; the shipped behaviour is the dropped filter, recorded as observed.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-044 — A Vietnamese name that is in no locale file shows on /vi/apps

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (locale vi, data-driven name) — row 9
- **Preconditions:** a new category on Blog; restored afterwards
- **Steps:**
  1. Open `/vi/apps`.
- **Expected:** "Thử nghiệm ngôn ngữ" shows; the English name does not.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-045 — A narrow card shows the primary plus "+N", and tapping it opens nothing

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (container width at 1024 px, touch) — row 8, DR-20
- **Preconditions:** Blog with three categories
- **Steps:**
  1. Tap "Show 2 more categories"; tap outside.
- **Expected:** a popover lists all three; no new page opens; it closes on the outside tap.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-046 — 100-character names do not cause horizontal scroll on a phone

- **Requirement:** REQ-ADMCAT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (name length 100 × viewport 375) — row 8
- **Preconditions:** a 100-char category on Blog
- **Steps:**
  1. Open `/apps` at 375 px.
- **Expected:** `scrollWidth` ≤ `innerWidth`.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

### TC-ADMCAT-047 — New categories reach other pages without a reload

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (cache invalidation) — "Cache" row
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. Create a category, navigate client-side to App Registry, open Blog's picker.
- **Expected:** the new category is an option.
- **Automated:** `tests/e2e/admin-categories/app-categories.e2e.ts`

## API contract (REQ-ADMCAT-01 … 04)

### TC-ADMCAT-048 — The public list exposes only id, slug and name

- **Requirement:** REQ-ADMCAT-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (field leakage) — row 3
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/apps/categories`.
- **Expected:** 200, `cache-control` with `max-age=60`, each item exactly `_id`, `name`, `slug`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-049 — App DTOs carry categories in the admin's order

- **Requirement:** REQ-ADMAPPS-02, REQ-ADMCAT-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (order Identity, Content) — row 3, 8
- **Preconditions:** Notes borrowed; restored afterwards
- **Steps:**
  1. Set Notes to `[identity, content]`; `GET /api/v1/apps?search=notes`.
- **Expected:** `categories` in that order, each only `_id`, `name`, `slug`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-050 — Slug and sortOrder in a create body are ignored

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (mass assignment)
- **Preconditions:** none
- **Steps:**
  1. `POST` with `slug: "hacked"`, `sortOrder: -5`.
- **Expected:** 201, slug derived from the name, `sortOrder` ≥ 0.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-051 — PATCH with an empty or blank body is refused

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (`{}` / `{ name: {} }` / whitespace vi)
- **Preconditions:** an `E2E …` category each
- **Steps:**
  1. `PATCH` with each body.
- **Expected:** 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-052 — A zero-width duplicate of an existing name is a conflict

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (normalisation) — DR-11
- **Preconditions:** seed Content
- **Steps:**
  1. `POST` en `Con​tent` (zero-width space inside).
- **Expected:** 409.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-053 — An emoji-only English name is refused

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** EP (no slug) — DR-12
- **Preconditions:** none
- **Steps:**
  1. `POST` en `🚀🚀`.
- **Expected:** 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-054 — Two 100-character names with the same slug both save, the second suffixed

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (slug at 100 chars + suffix) — DR-13
- **Preconditions:** none
- **Steps:**
  1. `POST` two names that differ only in punctuation.
- **Expected:** both 201; the second slug ends `-2` and is ≤ 100 chars.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-055 — Malformed id, unknown id and bad direction

- **Requirement:** REQ-ADMCAT-03, REQ-ADMCAT-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP
- **Preconditions:** none
- **Steps:**
  1. `GET /garbage/delete-impact`, `GET /<zero id>/delete-impact`, `POST /:id/move` with `sideways`.
- **Expected:** 400, 404, 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-056 — The admin list is complete, ordered and ignores pagination

- **Requirement:** REQ-ADMCAT-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (shape), Error Guessing (`?page=2&limit=1`) — row 6 (DR-10, no paging)
- **Preconditions:** none
- **Steps:**
  1. `GET /admin/categories` and `?page=2&limit=1`.
- **Expected:** each item `_id`, `slug`, `name {en, vi}`, `sortOrder`, `appCount`, sorted by `sortOrder`; the paged call returns all of them.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-057 — Reassigning an app that still has another category is refused untouched

- **Requirement:** REQ-ADMCAT-04
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (IDOR-style reassignment)
- **Preconditions:** Notes with `[Content, temp]`; restored afterwards
- **Steps:**
  1. `DELETE` temp with a reassignment of Notes to Identity.
- **Expected:** 409; Notes still `[Content, temp]`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-058 — Deleting with orphans and no body is refused

- **Requirement:** REQ-ADMCAT-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (missing reassignments)
- **Preconditions:** Team Calendar only in a temp category
- **Steps:**
  1. `DELETE` with no body.
- **Expected:** 400 `CATEGORY_REASSIGN_REQUIRED`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-059 — A target that is itself, malformed, or 501 entries is refused

- **Requirement:** REQ-ADMCAT-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (self target / garbage id), BVA (501 = max + 1)
- **Preconditions:** Team Calendar only in a temp category
- **Steps:**
  1. `DELETE` with each body.
- **Expected:** `CATEGORY_REASSIGN_INVALID`; 400; 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-060 — An app's categoryIds: 0, 6, duplicates and unknown ids refused; 5 accepted

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** BVA (0 / 5 / 6), EP (duplicate, unknown)
- **Preconditions:** Notes borrowed; three extra `E2E …` categories
- **Steps:**
  1. `PATCH /admin/apps/<notes>` with each `categoryIds`.
- **Expected:** 400, 400, 400, 400; 5 → 200.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-061 — Two concurrent creates with the same name: one 201, one 409

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (race) — DR-16
- **Preconditions:** none
- **Steps:**
  1. Two parallel `POST`s with one name.
- **Expected:** statuses `[201, 409]`, never 500.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-062 — Two concurrent creates with the same slug both save, one suffixed

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (race) — DR-16
- **Preconditions:** none
- **Steps:**
  1. Two parallel `POST`s whose names differ only in punctuation.
- **Expected:** both 201; one slug is the other plus `-2`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-063 — Names of 100 characters are accepted and 101 refused by the API

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (en and vi 100 / 101), EP (missing vi) — row 4 "API direct → 400"
- **Preconditions:** none
- **Steps:**
  1. `POST` en 100 + vi 100; en 101; vi 101; no vi.
- **Expected:** 201, 400, 400, 400.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-064 — The slug folds accents, symbols and emoji

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (`Phân Tích`, `R&D / Ops`, `Apps 🚀`, `Đa dạng`) — row 4
- **Preconditions:** none
- **Steps:**
  1. Create one category per name (prefixed `E2E`, suffixed with a run tag).
- **Expected:** slugs `…phan-tich…`, `…r-d-ops…`, `…apps…`, `…da-dang…`.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-065 — Renaming onto another category's English name is a conflict

- **Requirement:** REQ-ADMCAT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (case-folded duplicate on update)
- **Preconditions:** an `E2E …` category
- **Steps:**
  1. `PATCH` its en to `IDENTITY`.
- **Expected:** 409; its name and slug unchanged.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-066 — Reassigning an outside or unknown app is a conflict; a duplicated app is refused

- **Requirement:** REQ-ADMCAT-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (appId not in the category / unknown appId / repeated appId)
- **Preconditions:** Team Calendar only in a temp category
- **Steps:**
  1. `DELETE` with an extra reassignment of Blog; of an unknown id; with Team Calendar twice.
- **Expected:** 409, 409, 400; the category and both apps are unchanged.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-067 — Moving past either end changes nothing

- **Requirement:** REQ-ADMCAT-03
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (first ↑, last ↓)
- **Preconditions:** none
- **Steps:**
  1. Move the first category up and the last one down.
- **Expected:** both 200; the order is unchanged.
- **Automated:** `tests/api/admin-categories/categories.api.ts`

### TC-ADMCAT-068 — The sheet focuses the English field, closes on Escape and returns focus

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y) — row 12
- **Preconditions:** none
- **Steps:**
  1. Open "New category"; press Escape.
- **Expected:** "Name (English)" is focused on open; the sheet closes and "New category" has focus again. **Actual:** focus lands on `<body>` after Escape. Marked `test.fail()` until fixed.
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`

### TC-ADMCAT-069 — A rate-limited create shows the server's message and keeps the values

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (POST stubbed 429) — row 10
- **Preconditions:** stubbed POST
- **Steps:**
  1. Fill both names; "Create".
- **Expected:** the 429 body's message as a toast; the sheet stays open with the English value.
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`

### TC-ADMCAT-070 — Required and duplicate errors render in Vietnamese

- **Requirement:** REQ-ADMCAT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi), Decision Table (both empty; en duplicate × vi valid) — row 9
- **Preconditions:** seed Identity
- **Steps:**
  1. `/vi/admin/categories` → "Tạo danh mục" → "Tạo" empty; then en `identity`, vi valid → "Tạo".
- **Expected:** "Hãy nhập tên tiếng Anh.", "Hãy nhập tên tiếng Việt."; then "Đã có danh mục với tên tiếng Anh này.".
- **Automated:** `tests/e2e/admin-categories/categories-sheet.e2e.ts`
