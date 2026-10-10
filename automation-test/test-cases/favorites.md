# FAV — test cases

Starring apps from their tile, the `/favorites` page, persistence and privacy
(REQ-FAV-01…03).

Source of truth: `client/src/views/Favorites/**`, `client/src/components/FavoriteButton`,
`client/src/hooks/useToggleFavorite.ts`, `client/src/locales/{en,vi}/favorites.json`,
`server/src/modules/favorite/**`, `server/src/validators/schemas/favorite.ts`.
Converted from `docs/specs/favorite-apps/e2e.md` (scenarios 1–16 and its
deferred API rows, now automated at the api layer).

**Test data.** Browser cases run as `user@test.com`: each file snapshots the
user's favourites in `beforeAll` and restores them in `afterAll`
(`helpers/favorites.ts → setFavorites`, idempotent). Apps are the first
catalogue apps by name ("A", "B", "C"), read at run time. API cases run on
throwaway accounts; the admin-only / inactive apps a user must not be able to
star are registered per spec (`helpers/catalog.ts → createFixtureApps`) and
deleted in `afterAll`.

**Server facts the cases rely on.** POST returns 201 and is idempotent (unique
index); DELETE returns 204 and is idempotent. A favourite on an app the caller
cannot see (inactive, or admin-only for a user) is 404
`FAVORITE_APP_NOT_FOUND`. The list is not paginated; `sort` is `recent`
(default, newest favourited first) or `name`; `search` ≤ 200 characters;
`categoryId` must be a 24-hex id.

### TC-FAV-001 — Zero favourites shows the empty state

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (count 0)
- **Preconditions:** favourites cleared through the API
- **Steps:**
  1. Open `/favorites`.
- **Expected:** "You haven't favorited any apps yet."
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-002 — Exactly one favourite renders one card

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (count 1)
- **Preconditions:** favourites = [A]
- **Steps:**
  1. Open `/favorites`.
- **Expected:** A's card is shown and it is the only card.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-003 — Several favourites render as a grid

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** BVA (count many), happy path
- **Preconditions:** favourites = [A, B, C]
- **Steps:**
  1. Open `/favorites`.
- **Expected:** exactly the three cards A, B, C.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-004 — Search narrows the favourites and clears

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (match / no-match / cleared)
- **Preconditions:** favourites = [A, B, C]
- **Steps:**
  1. Search B; 2. search "zzz-no-such-app"; 3. clear.
- **Expected:** only B; then the empty state; then all cards again.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-005 — The category filter narrows the favourites and clears

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (one category), State Transition (filtered → cleared)
- **Preconditions:** favourites = [A, B, C]
- **Steps:**
  1. Open Filters, pick the first category; 2. "Clear all".
- **Expected:** `categoryId` in the URL, every returned favourite carries it,
  the badge shows "1"; Clear all removes it from the URL.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-006 — The search term survives a reload

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (URL state across reload)
- **Preconditions:** favourites = [A, B]
- **Steps:**
  1. Open `/favorites?search=<B>`; reload.
- **Expected:** only B before and after the reload; `search` keeps B's name.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-007 — Sort by Recent vs by Name

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (sort recent / name), EP
- **Preconditions:** A, then B, then C favourited in that order
- **Steps:**
  1. Open `/favorites`; switch the sort to "Name".
- **Expected:** Recent = C, B, A (newest first); Name = A, B, C.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-008 — Unstarring on `/favorites` removes the card at once

- **Requirement:** REQ-FAV-01, REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (favourite → not), optimistic UI
- **Preconditions:** favourites = [A, B]
- **Steps:**
  1. Click A's heart on `/favorites`.
- **Expected:** A's card disappears immediately; B stays.
- **Automated:** `tests/e2e/favorites/favorites-page.e2e.ts`

### TC-FAV-009 — A guest cannot reach `/favorites`

- **Requirement:** REQ-FAV-03, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** clean context
- **Steps:**
  1. Open `/favorites`.
- **Expected:** the login affordance "Continue with email"; no list toolbar.
- **Automated:** `tests/e2e/favorites/guest-redirect.e2e.ts`

### TC-FAV-010 — The heart's label is localised on `/apps`

- **Requirement:** REQ-FAV-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en + vi), Error Guessing (raw keys)
- **Preconditions:** A not favourited
- **Steps:**
  1. Open `/apps`, then `/vi/apps`.
- **Expected:** "Add to favorites: A" / "Thêm vào yêu thích: A"; no raw
  `favorites.*` / `apps.card.*` key in the page.
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAV-011 — `/favorites` chrome is localised

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (en + vi)
- **Preconditions:** favourites = [A]
- **Steps:**
  1. Open `/favorites` and `/vi/favorites`; open the sort menu.
- **Expected:** placeholder "Search favorites..." / "Tìm trong yêu thích...",
  sort "Sort: …" / "Sắp xếp: …" with Recent/Name and Gần đây/Tên.
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAV-012 — The empty state is localised

- **Requirement:** REQ-FAV-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en + vi)
- **Preconditions:** no favourites
- **Steps:**
  1. Open `/favorites` and `/vi/favorites`.
- **Expected:** "You haven't favorited any apps yet." / "Bạn chưa yêu thích ứng dụng nào."
- **Automated:** `tests/e2e/favorites/i18n.e2e.ts`

### TC-FAV-013 — Starring from a tile persists across reloads

- **Requirement:** REQ-FAV-01, REQ-FAV-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (off → on → reload → off → reload)
- **Preconditions:** A not favourited
- **Steps:**
  1. Click A's heart on `/apps`; reload; click again; reload.
- **Expected:** POST, `aria-pressed="true"` that survives the reload; DELETE,
  `false` that survives the reload.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAV-014 — A rapid double click settles without error

- **Requirement:** REQ-FAV-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (double submit)
- **Preconditions:** A not favourited
- **Steps:**
  1. Click A's heart twice quickly; reload.
- **Expected:** no error; after reload the heart shows a definite state.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAV-015 — `/apps` and `/favorites` stay consistent

- **Requirement:** REQ-FAV-01, REQ-FAV-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition across pages
- **Preconditions:** A not favourited
- **Steps:**
  1. Star A on `/apps`; open `/favorites`; unstar there; back to `/apps`.
- **Expected:** A is on `/favorites` with a pressed heart; after unstarring it
  leaves the list and the `/apps` heart is outline again.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAV-016 — A failed toggle rolls back and is announced

- **Requirement:** REQ-FAV-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (5xx on the mutation)
- **Preconditions:** `POST /users/me/favorites/:id` stubbed with 500
- **Steps:**
  1. Click A's heart on `/apps`.
- **Expected:** the heart returns to `aria-pressed="false"`, `#announcer`
  reads "Failed to update favorites.", and the API still has no favourite.
- **Automated:** `tests/e2e/favorites/toggle.e2e.ts`

### TC-FAV-020 — Add → list → remove round-trip

- **Requirement:** REQ-FAV-01, REQ-FAV-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** State Transition (none → starred → none)
- **Preconditions:** fresh account
- **Steps:**
  1. List; POST; list; DELETE; list.
- **Expected:** `[]`; 201; `[app]`; 204; `[]`.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-021 — Add and remove are idempotent

- **Requirement:** REQ-FAV-01
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** Error Guessing (repeat)
- **Preconditions:** fresh account
- **Steps:**
  1. POST twice; DELETE twice.
- **Expected:** 201, 201 with a single row; 204, 204 with none.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-022 — Input validation

- **Requirement:** REQ-FAV-01, REQ-FAV-02
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** EP (malformed / unknown id, bad sort, bad categoryId), BVA (search 201)
- **Preconditions:** none
- **Steps:**
  1. POST/DELETE `not-an-id`; POST `ffff…`; GET with `sort=popular`,
     `categoryId=nope`, a 201-character search.
- **Expected:** 400, 400; 404 with an error `code`; 400, 400, 400.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-023 — Only visible apps can be favourited

- **Requirement:** REQ-FAV-01
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user, admin
- **Technique:** Decision Table (role × admin-only / inactive)
- **Preconditions:** fixture apps
- **Steps:**
  1. As a user POST the admin-only and the inactive app; 2. as admin POST
     the admin-only (then DELETE) and the inactive app.
- **Expected:** user: 404, 404, nothing stored; admin: 201 then 204, inactive 404.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-024 — Favourites are private to each user

- **Requirement:** REQ-FAV-03
- **Layer:** api · **Priority:** P1 · **Role:** two throwaway users
- **Technique:** Error Guessing (IDOR across accounts)
- **Preconditions:** two fresh accounts
- **Steps:**
  1. Alice stars A, Bob stars B; 2. Bob DELETEs A; 3. compare `isFavorite` on `/apps`.
- **Expected:** each list holds only its own app; Bob's DELETE leaves Alice's
  favourite intact; `isFavorite` for A is true for Alice and false for Bob.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-025 — Sort orders

- **Requirement:** REQ-FAV-02
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** EP (default / recent / name)
- **Preconditions:** three apps starred in name order
- **Steps:**
  1. GET with no sort, `sort=recent`, `sort=name`.
- **Expected:** newest first for default and recent; alphabetical for name.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-026 — The endpoints require a session

- **Requirement:** REQ-FAV-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. GET, POST, DELETE without a token.
- **Expected:** 401 each.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-027 — Favourites persist across sessions

- **Requirement:** REQ-FAV-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** State Transition (session 1 → session 2)
- **Preconditions:** fresh account
- **Steps:**
  1. Star an app; sign in again in a new context; list and read `/apps`.
- **Expected:** the favourite is listed and `isFavorite` is true.
- **Automated:** `tests/api/favorites/favorites.api.ts`

### TC-FAV-028 — Search and category narrow the list

- **Requirement:** REQ-FAV-02
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** EP (match / no-match / category)
- **Preconditions:** three apps starred
- **Steps:**
  1. `search=<name>`, `search=zzz…`, `categoryId=<id>`.
- **Expected:** the named app; `[]`; only favourites carrying the category.
- **Automated:** `tests/api/favorites/favorites.api.ts`
