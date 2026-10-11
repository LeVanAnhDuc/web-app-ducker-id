# AUTHZ — access control

Test cases for `REQ-AUTHZ-01` … `REQ-AUTHZ-03` (`docs/requirements.md`).

**Sources.** Guards: `server/src/middlewares/guards/` (`authGuard` → 401
`AUTH_MISSING_TOKEN` / `JWT_INVALID`, `adminGuard` → 403 `AUTH_ADMIN_ONLY`).
Admin routers: `server/src/modules/{user,login-history,contact-admin,web-app,category}/*.routes.ts`,
every one mounted behind `authGuard, adminGuard`. Client: `AuthGuardLayout` /
`SessionGate` (authentication only — there is no client-side role guard),
`client/src/views/AdminDashboard`, copy in `client/src/locales/{en,vi}/adminDashboard.json`.
Converted from the denial blocks of the old `client/e2e/admin-authz/` suite and
the AuthN / AuthZ rows of `docs/specs/category-management/design.md` §6.

**Techniques.** Decision Table role (guest / user / admin) × endpoint; EP on
the token (none / garbage / wrong scheme / unsigned); Error Guessing on the
missing client-side guard; i18n `vi` on the landing page and on the API
denial message.

### TC-AUTHZ-001 — A non-admin opening an admin page never sees admin data

- **Requirement:** REQ-AUTHZ-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role user × route users / apps / login-history / categories / contact / entitlements)
- **Preconditions:** seeded `user@test.com` session
- **Steps:**
  1. Open each admin list page.
  2. Call the endpoint the page reads with the user's Bearer token.
- **Expected:** the URL stays on the admin route (no client guard), the page
  settles into its empty state ("No users match", "No apps registered yet.",
  "No login history found", "No categories yet", "No contact requests found";
  the entitlement picker answers "No users found"), `admin@test.com` is never
  rendered, and the endpoint answers 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-002 — A non-admin cannot lock, unlock or reset an account

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role user × mutation lock / unlock / reset-password)
- **Preconditions:** a placeholder ObjectId as target — `adminGuard` runs before any lookup
- **Steps:**
  1. `PATCH /admin/users/:id/lock`, `PATCH …/unlock`, `POST …/reset-password` with the user's token.
- **Expected:** each answers 403 `AUTH_ADMIN_ONLY` — never `ADMIN_CANNOT_LOCK_SELF` or 404.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-003 — Token-less admin mutations are refused with 401

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (no `Authorization` header)
- **Preconditions:** none
- **Steps:**
  1. `PATCH /admin/users/:id/lock` and `POST /admin/users/:id/reset-password` with no token.
- **Expected:** 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-004 — Every admin category endpoint: user 403, guest 401

- **Requirement:** REQ-AUTHZ-01, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** user, guest
- **Technique:** Decision Table (role × GET list / POST / PATCH / POST move / GET delete-impact / DELETE)
- **Preconditions:** none
- **Steps:**
  1. Call each `/api/v1/admin/categories*` endpoint as the user, then without a token.
- **Expected:** every cell is 403 `AUTH_ADMIN_ONLY` for the user and 401 for the guest.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-005 — The public category list stays open

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P2 · **Role:** user, guest
- **Technique:** Decision Table (public endpoint control row)
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/apps/categories` as the user and as a guest.
- **Expected:** 200 for both — only `/admin/*` is guarded.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-006 — A guest opening /admin/categories is sent to login

- **Requirement:** REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (no session → login)
- **Preconditions:** a context with no cookies
- **Steps:**
  1. Open `/admin/categories`.
- **Expected:** the browser ends on `/login`.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`

### TC-AUTHZ-007 — Every admin endpoint answers a guest with 401

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Decision Table (role guest × all 18 admin endpoints)
- **Preconditions:** none
- **Steps:**
  1. Send each `/api/v1/admin/*` method + path (users, login-history, contacts, apps, categories) with no token, a placeholder id and an empty body.
- **Expected:** every call is 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-008 — Every admin endpoint answers a regular user with 403

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role user × all 18 admin endpoints)
- **Preconditions:** the user's Bearer token
- **Steps:**
  1. Send the same 18 calls as TC-AUTHZ-007 with the user's token.
- **Expected:** every call is 403 `AUTH_ADMIN_ONLY` — none reaches validation (no 400) or the service (no 404).
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-009 — A forged or malformed token is refused

- **Requirement:** REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (garbage JWT / empty Bearer / Basic scheme / unsigned `alg: none` JWT claiming `admin`), Error Guessing
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/admin/users` with each header.
- **Expected:** no usable Bearer (empty, Basic) → 401 `AUTH_MISSING_TOKEN`; a Bearer that fails verification (garbage, unsigned) → 403 `JWT_INVALID` (`verifyToken` throws `ForbiddenError`); the unsigned admin claim is never trusted.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-010 — An admin gets past both guards on every admin endpoint

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (control row — proves the 401/403 above come from the role, not the request)
- **Preconditions:** the admin's Bearer token
- **Steps:**
  1. Send the same 18 calls as TC-AUTHZ-007 as admin.
- **Expected:** no call is 401 / 403 or 5xx (lists 200; placeholder id / empty body 400 or 404). Nothing changes.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-011 — The denial uses the error envelope and is translated

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P3 · **Role:** user
- **Technique:** EP on `Accept-Language` (en / vi)
- **Preconditions:** the user's Bearer token
- **Steps:**
  1. `GET /api/v1/admin/apps` with `Accept-Language: en`, then `vi`.
- **Expected:** body has `code`, `message`, `timestamp`, `path` (`/api/v1/admin/apps`); message is "Forbidden access" in en and "Truy cập bị từ chối" in vi.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts`

### TC-AUTHZ-012 — The Bull Board queue dashboard requires an admin

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (admin surface outside `/api/v1`)
- **Preconditions:** API running with Redis (queues enabled)
- **Steps:**
  1. Without any session, `GET /admin/queues` on the **API origin** (`:5000`).
- **Expected:** 401 / redirect to login. **Actual (2026-10-10): 200 — the
  dashboard is mounted in `server/src/loaders/queue.loader.ts` with no guard,
  so anyone who can reach the API can read and retry email jobs.** Open bug,
  evidence `curl http://localhost:5000/admin/queues` → 200.
- **Automated:** `tests/api/authz/admin-endpoints.api.ts` (addresses the API origin through `API_URL`; marked `test.fail()` until fixed)

### TC-AUTHZ-013 — A guest opening any admin page lands on login

- **Requirement:** REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP over the 7 admin pages, i18n (`/vi/admin/apps` → `/vi/login`)
- **Preconditions:** a context with no cookies
- **Steps:**
  1. Open `/admin`, `/admin/apps`, `/admin/categories`, `/admin/entitlements`, `/admin/users`, `/admin/login-history`, `/admin/contact`.
  2. Open `/vi/admin/apps`.
- **Expected:** each ends on the login screen (the Vietnamese one for `/vi`); the admin sidebar never renders.
- **Automated:** `tests/e2e/authz/guest-redirect.e2e.ts`

### TC-AUTHZ-014 — /admin shows the Admin Console with a card per area

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (every card)
- **Preconditions:** admin session
- **Steps:**
  1. Open `/admin`.
- **Expected:** heading "Admin Console"; cards App Registry, Entitlements,
  Users, Contact Inbox, Login History, each with an "Open" link to
  `/admin/apps`, `/admin/entitlements`, `/admin/users`, `/admin/contact`,
  `/admin/login-history`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-015 — Each landing card opens its area, and the sidebar leads back

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (landing → area → landing)
- **Preconditions:** admin session
- **Steps:**
  1. From `/admin`, click each card's "Open".
  2. From `/admin/users`, click the sidebar's "Dashboard".
- **Expected:** each click lands on the card's route; "Dashboard" returns to `/admin`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-016 — The landing page links to the categories area

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (area added later than the landing page)
- **Preconditions:** admin session
- **Steps:**
  1. Open `/admin` and look for a link to `/admin/categories`.
- **Expected:** a Categories card like the other areas. **Actual: missing** —
  `client/src/dataSources/AdminDashboard` lists 5 of the 6 areas (the sidebar
  has all 6). Marked `test.fail()` until fixed.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-017 — The landing page renders in Vietnamese

- **Requirement:** REQ-AUTHZ-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi)
- **Preconditions:** admin session
- **Steps:**
  1. Open `/vi/admin`.
- **Expected:** heading "Bảng quản trị", card "Đăng ký ứng dụng", five "Mở" links, the first pointing at `/vi/admin/apps`.
- **Automated:** `tests/e2e/authz/admin-landing.e2e.ts`

### TC-AUTHZ-018 — A non-admin is kept out of the admin console shell

- **Requirement:** REQ-AUTHZ-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (authorization enforced only by the API)
- **Preconditions:** seeded `user@test.com` session
- **Steps:**
  1. Open `/admin`.
- **Expected:** the user is redirected or shown a forbidden page; "Admin Mode"
  never renders. **Actual:** the full admin shell, sidebar and landing cards
  render — there is no client-side role guard (data stays protected, see
  TC-AUTHZ-001). Marked `test.fail()` until fixed.
- **Automated:** `tests/e2e/authz/admin-routes-denied.e2e.ts`
