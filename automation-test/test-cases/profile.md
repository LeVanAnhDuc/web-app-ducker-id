# PROFILE — profile

Test cases for `REQ-PROFILE-01` … `REQ-PROFILE-02` (`docs/requirements.md`).

**Sources.** Client: `client/src/views/Profile/**` (ProfileCard,
PersonalInfoForm and its field components, ProfileFormSyncEffect),
`client/src/components/CustomDateInput`, zod rules in
`client/src/forms/UpdatePersonalInfo/validations.ts`,
`mapProfileToFormValues` / `getDateOfBirthBounds` in `client/src/utils`, copy
in `client/src/locales/{en,vi}/{account,common,dashboard}.json`. Server:
`server/src/modules/user/**` (`GET/PATCH /users/me`, `MyProfileDto`), Joi
rules in `server/src/validators/schemas/user.ts` (`updateProfileSchema`) and
`base.ts` (sign-up date-of-birth bounds).
Converted from `docs/specs/profile-account-merge/e2e.md` (rows 1, 2, 8, 9, F1,
F2 → TC-PROFILE-001 … -006) and `docs/specs/account-settings-cleanup/e2e.md`
(#1, #2, #9, F1, F2 → folded into TC-PROFILE-001 / -003 / -004 and
TC-PROFILE-007). `docs/specs/profile-trim/` only changed which sections must
be absent — that is part of TC-PROFILE-001.

**Rules under test.**

| Field             | Client (zod)                                             | Server (Joi)                            |
| ----------------- | -------------------------------------------------------- | --------------------------------------- |
| First / last name | 1–50 each, joined as `fullName`                          | `fullName` 2–100, letters, space, `-'.` |
| Phone             | ≤ 20, `[\d\s()+-]`, may be empty                         | 1–20, same characters                   |
| Address           | ≤ 500, letters/digits/space `,.-'/#`                     | same                                    |
| Date of birth     | picker 13–120 years ago; zod ≤ today and ≥ 100 years ago | ISO, ≤ today, ≥ 100 years ago           |
| Gender            | male · female · other · prefer_not_to_say                | same                                    |

**Data.** Every edit runs on a throwaway (`createAccount()`, profile put in a
known state with `PATCH /users/me` first); reads of the seeded user are
read-only. The profile PATCH limit is 10 / 15 min per IP; counters are
cleared before each test and no test sends more than eight.

**Old-matrix rows not given their own case.** profile-account-merge rows 4 /
10 / 11 were delegated to the password module (TC-PWD-001 … -018); rows 3
(AuthZ), 5, 6, 7 were N/A (one user-level page, no lists). The old DEFER on
the sidebar `aria-label` is moot — the group label is exposed and every nav
case locates by it. account-settings-cleanup F3 (dead-reference guard) is a
build/grep check, not a test.

## The Account page (REQ-PROFILE-01)

### TC-PROFILE-001 — /profile shows the remaining sections in one page

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** —
- **Preconditions:** seeded user
- **Steps:**
  1. Open `/profile`.
- **Expected:** heading "Account" and sections "Personal Information", "Change
  Password", "Danger Zone"; the trimmed "Connected Accounts" and "Notification
  Preferences" are absent.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-002 — The page is titled "Account", not the old "Profile"

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** —
- **Preconditions:** seeded user
- **Steps:**
  1. Open `/profile`.
- **Expected:** a heading "Account"; no heading exactly "Profile".
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-003 — Signed-out visitors are sent to /login

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing
- **Preconditions:** no cookies
- **Steps:**
  1. Open `/profile`.
- **Expected:** `/login`.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-004 — The page is fully translated in English and Vietnamese

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (locale en / vi), Error Guessing (missing messages)
- **Preconditions:** seeded user
- **Steps:**
  1. Open `/profile` and `/vi/profile`, collecting console errors.
- **Expected:** en "Account" / "Change Password"; vi "Tài khoản", "Đổi mật
  khẩu", "Vùng nguy hiểm"; no raw `account.*` / `profile.*` keys; no
  `MISSING_MESSAGE` / `IntlError`.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-005 — The old /account-settings route is gone

- **Requirement:** REQ-PROFILE-01, REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (invalid: a once-valid route)
- **Preconditions:** seeded user
- **Steps:**
  1. Open `/account-settings` and `/vi/account-settings`.
- **Expected:** the not-found page; no "Change Password" heading.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-006 — The Settings nav links to Account and Billing only

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** —
- **Preconditions:** seeded user
- **Steps:**
  1. Read the Settings group in the sidebar; click "Account".
- **Expected:** "Account" and "Billing" present, "Account Settings" absent; the link opens `/profile`.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-007 — The removed /security page leaves no route or link

- **Requirement:** REQ-PROFILE-01, REQ-SETTINGS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (invalid: removed route)
- **Preconditions:** seeded user
- **Steps:**
  1. Open `/security` and `/vi/security`; read the Settings nav on `/profile`.
- **Expected:** not-found for both; no Security link; Danger Zone is on `/profile`.
- **Automated:** `tests/e2e/profile/account-merge.e2e.ts`

### TC-PROFILE-010 — Personal Information shows the stored profile

- **Requirement:** REQ-PROFILE-01
- **Layer:** e2e · **Priority:** P1 · **Role:** throwaway
- **Technique:** —
- **Preconditions:** profile set to "Linh Tran Thi", `+84 90 123 4567`,
  "12 Ly Thai To, Hoan Kiem", 1990-03-15, female
- **Steps:**
  1. Open `/profile`.
- **Expected:** header shows the full name and email; First Name "Linh", Last
  Name "Tran Thi" (split on the first space); Phone, Address as stored; Date
  of Birth "15/03/1990"; Gender "Female".
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-030 — GET /users/me returns the profile and nothing sensitive

- **Requirement:** REQ-PROFILE-01
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** —
- **Preconditions:** seeded user
- **Steps:**
  1. `GET /users/me`.
- **Expected:** exactly `_id, fullName, email, phone, address, dateOfBirth,
gender, avatar, createdAt`; no password, authId or tokenVersion.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-031 — The profile endpoints need a session

- **Requirement:** REQ-PROFILE-01, REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing
- **Preconditions:** none
- **Steps:**
  1. `GET` and `PATCH /users/me` without a token.
- **Expected:** both 401 (`AUTH_MISSING_TOKEN`).
- **Automated:** `tests/api/profile/profile.api.ts`

## Editing the profile (REQ-PROFILE-02)

### TC-PROFILE-011 — Editing every field saves and survives a reload

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P1 · **Role:** throwaway
- **Technique:** State Transition (stored → edited → stored)
- **Preconditions:** TC-PROFILE-010 profile
- **Steps:**
  1. Change first/last name, phone, address, type date 20/07/1988, pick "Male"; "Save Changes".
  2. Reload.
- **Expected:** "Profile updated successfully"; after reload every field shows
  the new value; `GET /users/me` has `fullName` "Minh Nguyen Van", gender male, DOB 1988-07-20.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-012 — Save and Cancel follow the dirty state; Cancel restores

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway
- **Technique:** State Transition (pristine → dirty → pristine)
- **Preconditions:** stored profile
- **Steps:**
  1. Check the buttons; edit the first name; click Cancel.
- **Expected:** both disabled when pristine; Save enabled when dirty; Cancel puts "Linh" back and disables Save.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-013 — Phone accepts its characters up to 20

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway
- **Technique:** EP (letters / formatted number), BVA (20 · 21)
- **Preconditions:** stored profile
- **Steps:**
  1. Save `abc-123`, 21 digits, 20 digits, `+84 (90) 123-4567`.
- **Expected:** "Invalid phone number format"; "Phone number is too long"; the last two save and are stored as typed.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-014 — Address refuses markup and more than 500 characters

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway
- **Technique:** EP (markup), BVA (500 · 501)
- **Preconditions:** stored profile
- **Steps:**
  1. Save `<script>alert(1)</script>`, 501 and 500 characters.
- **Expected:** "Address contains invalid characters"; "Address must not exceed 500 characters"; 500 saves.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-015 — An empty first name shows a translated message

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway
- **Technique:** EP (empty), Error Guessing (raw key)
- **Preconditions:** stored profile
- **Steps:**
  1. Clear First Name; Save.
- **Expected:** the field is invalid with a readable message. **Known bug** —
  `common.validation` has no `firstName`/`lastName` entries, so the raw zod
  key "required" is shown; spec marked `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-016 — The date of birth is only taken inside 13–120 years

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (13 years minus a day · exactly 13 years)
- **Preconditions:** stored profile
- **Steps:**
  1. Type the date 13 years ago + 1 day; then exactly 13 years ago; Save.
- **Expected:** the first is ignored (form not dirty, Save disabled); the second is taken and stored.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-017 — A user born 101–120 years ago can still edit the profile

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway signed up with DOB 110 years ago
- **Technique:** BVA (age between the 100-year profile cap and the 120-year sign-up cap)
- **Preconditions:** `createAccountWithDob(110 years ago)` — sign-up accepts it
- **Steps:**
  1. Change the first name; Save.
- **Expected:** "Profile updated successfully". **Known bug** — the form
  always resends dateOfBirth and both zod and Joi cap it at 100 years, so the
  save is refused with "Date must be in the past and within 100 years"; spec marked `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-018 — Editing in Vietnamese

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway
- **Technique:** EP (locale vi)
- **Preconditions:** stored profile
- **Steps:**
  1. Open `/vi/profile`; change the address; "Lưu thay đổi".
- **Expected:** "Thông tin cá nhân", fields "Họ" / "Tên" / "Số điện thoại" /
  "Địa chỉ" / "Giới tính" ("Nữ"), DOB "15/03/1990"; toast "Cập nhật hồ sơ thành công".
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-019 — Clearing the phone removes it

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway
- **Technique:** Error Guessing (clearing an optional field)
- **Preconditions:** stored profile with a phone
- **Steps:**
  1. Empty Phone; Save.
- **Expected:** success and `phone: null`. **Known bug** — empty optional
  fields are dropped from the PATCH body, the old phone is kept and refilled,
  yet the success toast shows; spec marked `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-020 — The header shows the new name right after saving

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway
- **Technique:** Error Guessing (stale derived data)
- **Preconditions:** stored profile
- **Steps:**
  1. Change First Name to "Hoa"; Save.
- **Expected:** the profile header reads "Hoa Tran Thi". **Known bug** — the
  header reads the name from the idToken, which is not re-issued; it keeps
  "Linh Tran Thi" until the next refresh; spec marked `test.fail`.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-021 — A server failure keeps the edits

- **Requirement:** REQ-PROFILE-02
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway
- **Technique:** Error Guessing (500)
- **Preconditions:** PATCH mocked to 500
- **Steps:**
  1. Edit; Save.
- **Expected:** "Server error. Please try again later."; the edited value stays in the field.
- **Automated:** `tests/e2e/profile/personal-info.e2e.ts`

### TC-PROFILE-032 — PATCH saves every editable field

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway
- **Technique:** —
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH all five fields; GET.
- **Expected:** 200 with the new values (email unchanged); GET agrees.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-033 — fullName rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (1 · 2 · 100 · 101), EP (digits, empty, Vietnamese diacritics)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH each value.
- **Expected:** 2, 100 and "Nguyễn Thị Ánh" → 200; 1, 101, "John 2", "" → 400 on `fullName`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-034 — phone rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (0 · 1 · 20 · 21 chars), EP (letters, formatted)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH each value.
- **Expected:** "" and 21 chars and letters → 400 on `phone`; 1, 20 and "+84 (90) 123-4567" → 200.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-035 — address rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (500 · 501), EP (markup, street punctuation)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH each value.
- **Expected:** 500 and "12/3B, Le Loi St. #4" → 200; 501 and `<script>` → 400 on `address`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-036 — dateOfBirth rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (tomorrow, 99 / 101 years ago), EP (non-ISO)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH each value.
- **Expected:** tomorrow, 101 years, "15/03/1990" → 400 on `dateOfBirth`; 99 and 30 years → 200.
  (Observation from the schema, not asserted: unlike sign-up's 13-year
  minimum, PATCH accepts any past date.)
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-037 — gender rules

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** EP (four valid values, one invalid)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH each value.
- **Expected:** the four values → 200; "unknown" → 400 on `gender`.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-038 — Non-profile fields in the body are ignored

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway
- **Technique:** Error Guessing (mass assignment)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH `fullName` plus `email`, `roles`, `password`.
- **Expected:** 200; email unchanged; the old password still signs in and the injected one does not.
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-039 — Validation messages follow Accept-Language

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P3 · **Role:** throwaway
- **Technique:** EP (en / vi)
- **Preconditions:** a throwaway session
- **Steps:**
  1. PATCH an invalid phone with `Accept-Language: en`, then `vi`.
- **Expected:** both 400 `VALIDATION_ERROR` with different, translated messages (no `validation.*` keys).
- **Automated:** `tests/api/profile/profile.api.ts`

### TC-PROFILE-040 — A date of birth accepted at sign-up is accepted again

- **Requirement:** REQ-PROFILE-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway signed up with DOB 110 years ago
- **Technique:** BVA (between the two caps)
- **Preconditions:** `createAccountWithDob(110 years ago)`
- **Steps:**
  1. PATCH the name only; PATCH the name with the stored dateOfBirth.
- **Expected:** both 200. **Known bug** — the second is 400 `date.tooOld`
  (sign-up allows 120 years, profile 100); spec marked `test.fail`. Root
  cause of TC-PROFILE-017.
- **Automated:** `tests/api/profile/profile.api.ts`
