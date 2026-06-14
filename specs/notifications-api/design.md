# Design — `notifications-api`: notifications list API + seed + UI integration

> **Feature**: `notifications-api`
> **Status**: Design (brainstorming) — input for `superpowers:writing-plans`
> **Date**: 2026-06-09
> **Type**: Cross-stack (BE + FE + docs spec)
> **Branch**: `feat/notifications-api` (worktree per-repo: docs / server / client)

---

## 1. Scope & Goal

End-to-end slice for the in-app notification center. The `notification` Mongoose model + types + constants already exist; the UI (`views/Notifications` + header `NotificationPanel` + badge) already renders from **mock** data. This feature wires it to a real API.

- **BE**: complete the `notification` module (controller / routes / service / repository / dtos / helpers / validators) using `login-history` as the sibling template. User-scoped endpoints for **list (paginated)**, **unread-count**, **mark single read**, **mark all read**. Add a notification **seeder** + data.
- **FE**: replace mock data in `views/Notifications` and the header (`AppHeader` + `NotificationPanel`) with the real API via React Query. Add **load-more** pagination, **mark single** (button per unread item), **mark all read**, and a live **unread badge**.
- **docs**: this spec folder (`design.md` / `plan.md` / `e2e.md`).

### Decisions locked (brainstorming)

- **Content i18n**: store `title` / `message` as **literal strings** in DB; FE renders them verbatim. Only page chrome (tabs, buttons, group headers, empty/error states, announcements) is i18n (en/vi). Notification body text is **not** translated.
- **Pagination**: **page/offset** (`page` + `limit`), mirroring `login-history`. Load-more accumulates pages client-side via `useInfiniteQuery`.
- **Scope**: both the `/notifications` page **and** the header `NotificationPanel` + unread badge.
- **Mark single**: a dedicated **"mark read" button** on each unread item (mutation fired in the click handler — never in an effect, per [[feedback_no_mutation_in_effect]]).

### Out of scope

- Notification **producers** (emitting on login-anomaly, entitlement change, etc.) — seed data only this round.
- Real-time push (websocket/SSE) — refetch/invalidate only.
- Mark-as-**unread**, delete, notification preferences wiring (the Profile `NotificationPreferencesCard` stays as-is).
- The panel "mentions" tab semantics (no `mentions` type exists) — the panel tab stays a client filter over `all`/`unread`; `mentions` left inert / flagged follow-up.

---

## 2. Components

### 2.1 BE — complete `server/src/modules/notification/`

Current: `model` (in `src/models/notification.ts`), `types/index.ts`, `constants/index.ts`. Add (per `module-struct` + rules):

```
modules/notification/
  notification.module.ts        # factory: repo → service → controller → user routes; register in modules.loader.ts
  notification.controller.ts    # handlers only, OkSuccess / NoContentSuccess
  notification.routes.ts        # createNotificationUserRoutes(controller): router.use("/notifications", ...) authGuard
  notification.service.ts       # pagination math, isRead filter, ownership-scoped mutations
  notification.repository.ts    # MongoNotificationRepository: findByUser, countDocuments, countUnread, markRead, markAllRead
  dtos/
    notification-item.dto.ts    # interface NotificationItemDto + toNotificationItemDto()
    index.ts                    # barrel
  helpers/
    index.ts                    # buildNotificationFilter(query, userId)
  types/index.ts                # + NotificationListQuery, typed requests, PaginatedResult reuse
  constants/index.ts            # + DEFAULT_PAGE / DEFAULT_LIMIT / MAX_LIMIT
```

Plus: `validators/schemas/notification.ts` (list query + id param), `ERROR_CODES.NOTIFICATION_NOT_FOUND` in `src/constants/error-code.ts`, success i18n keys under `notification:` namespace.

**Endpoints** — all `authGuard`, user-scoped to `RequestContext.requireAuthId()`:

| Method | Path | Purpose | Response |
| --- | --- | --- | --- |
| GET | `/notifications` | Paginated list. Query `page`, `limit`, `isRead?` (omit = all; `true`/`false` = read/unread tab), `sortOrder?` (default desc by `createdAt`) | `{ items: NotificationItemDto[], meta: { total, page, limit, totalPages } }` |
| GET | `/notifications/unread-count` | Badge + unread tab count | `{ count: number }` |
| PATCH | `/notifications/:id/read` | Mark one read. Filter `{ _id, userId }` → 404 if not owned/found. Idempotent | updated `NotificationItemDto` (OkSuccess) |
| PATCH | `/notifications/read-all` | Mark all of caller's unread → set `isRead:true, readAt:now` | `{ updated: number }` (OkSuccess) |

**Repository contract** (`asyncDatabaseHandler`, `.lean()`, `Types.ObjectId` for `userId`):
- `findByUser(filter, { skip, limit, sort })` → `{ data, total }` (parallel `find` + `countDocuments`).
- `countUnread(userId)` → number.
- `markRead(id, userId)` → updated doc | null (null ⇒ 404).
- `markAllRead(userId)` → modified count.

**DTO**: `toNotificationItemDto(doc)` → `{ id, type, title, message, meta, isRead, readAt, createdAt }` (ObjectId/Date → string/ISO).

**Authorization invariant**: every mutation filters by `userId` so a user can never read/mutate another user's notification (ownership enforced in the query, not a post-fetch check).

### 2.2 BE — seeder `server/src/database/seeders/`

```
seeders/notification.seeder.ts   # seedNotifications() + clearNotifications(); wire into seeders/index.ts
seeders/data/notifications.ts    # ~25–30 notifications for a known test user
```

Seed shape: spans all 7 `NOTIFICATION_TYPES`, mix of `isRead` true/false, `createdAt` spread across **today / yesterday / earlier** and across **> `limit`** rows so pagination, grouping, load-more, and both tabs are demonstrable. `clearNotifications` removes them for `yarn seed:clear`. Seed targets the user used by the E2E `auth.setup.ts` storageState.

### 2.3 FE — `client/src/`

**Types** (`types/Notification/index.ts`): add `ApiNotificationType` (= BE enum union), `ApiNotification` (matches DTO), `NotificationListResponse` (`{ items, meta: { total, page, limit, totalPages } }`), `NotificationListParams` (`page`, `limit`, `isRead?`). Keep only UI unions still used; drop mock-coupled types.

**Request** (`requests/notification.ts`, all via `axiosInstance` + `CONSTANTS.END_POINTS.*`): `getNotifications(params)`, `getUnreadCount()`, `markNotificationRead(id)`, `markAllNotificationsRead()`.

**Constants**: add endpoints (`NOTIFICATIONS`, `NOTIFICATIONS_UNREAD_COUNT`, `NOTIFICATION_READ(id)`, `NOTIFICATIONS_READ_ALL`) + query keys (`NOTIFICATIONS`, `NOTIFICATIONS_UNREAD_COUNT`).

**dataSource** (`dataSources/Notifications/index.ts`): map `type → { icon, iconBg, iconColor }` so `NotificationItem` derives visuals from the real `type` (replaces the mock `itemKey → icon`).

**View `views/Notifications`** (view-local hooks per `views.md`):
- `hooks/useNotifications.ts` — `useInfiniteQuery`, `initialPageParam: 1`, `getNextPageParam: (last) => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined`. Param `isRead` derives from active tab → query key includes tab. Export `NOTIFICATIONS_QUERY_KEY`.
- `hooks/useUnreadCount.ts` — `useQuery`, export `UNREAD_COUNT_QUERY_KEY`.
- `hooks/useMarkNotificationRead.ts` / `hooks/useMarkAllRead.ts` — mutations; on success invalidate notifications list + unread-count, toast.
- `mains/PageHeader` — mark-all-read wired to `useMarkAllRead`.
- `mains/NotificationList` — tabs unread/read drive `isRead`; **group today/yesterday/earlier derived client-side** from `createdAt`; **timestamp via `date-fns/formatDistanceToNow`** (locale-aware); flatten infinite pages; **Load more → `fetchNextPage`** (hidden when `!hasNextPage`); loading skeleton + empty state per tab.
- `components/NotificationItem` — accepts `type` (→ dataSource visuals) + literal `title`/`message`; renders a **"mark read" button** for unread items (calls mutation via parent handler).
- a11y: `useAnnounce` for tab change, load-more, mark single, mark all, loading/loaded (keys in en + vi `notifications.announce.*`).

**Header** (`layouts/AppHeader` + `components/NotificationPanel`): badge count from `useUnreadCount`; panel list from first page of `useNotifications` (or a small dedicated query); mark-all-read button wired; remove `NOTIFICATIONS_MOCK` usage (and the `mocks/Dashboard` notifications slice if now unused).

---

## 3. Data flow

`app/[locale]/(private)/(dashboard)/notifications/page.tsx` (server) → `Notifications` (client) → view hooks (React Query) → `requests/notification` → `axiosInstance` → `/api/v1/notifications*` (Next rewrite → BE) → controller → service → repository → Mongo.

Mutations (mark read / mark all) → invalidate `[NOTIFICATIONS_QUERY_KEY]` + `[UNREAD_COUNT_QUERY_KEY]` → list re-renders, header badge + unread-tab count update.

---

## 4. Error handling & edge cases

- Mark single on a notification not owned by caller / nonexistent id → **404** (`NOTIFICATION_NOT_FOUND`); FE shows error toast, list unchanged. Mutations use **invalidate-on-success** (no optimistic UI / `onMutate`), so a failed mark-read leaves the item unread with no rollback needed.
- Invalid query params (`page=abc`, oversized `limit`) → `queryPipe` validation; `limit` clamped to `MAX_LIMIT` server-side.
- Empty states per tab (no unread / no read / no notifications at all).
- Boundary: last page → `getNextPageParam` returns `undefined` → Load more hidden.
- Unread count is a **separate query**, independent of the page currently loaded, so the badge is accurate regardless of pagination.
- Mark-all when nothing unread → `updated: 0`, no-op UI.

---

## 5. Testing

- **BE**: integration/unit for service + repository — pagination math, `isRead` filter, ownership-scoped `markRead` (404 on foreign id), `markAllRead` touches only unread, `countUnread`.
- **FE E2E (Playwright)**: see the matrix below — feature changes user-observable behavior, so E2E is mandatory (en + vi). Tests live in `client/e2e/notifications/` (current suite: 13 `test(...)` blocks); scenarios documented in `docs/specs/notifications-api/e2e.md` at the §4.3 step.
- **State restoration after mutation tests**: the real mark-single test changes seeded read-state and there is **no mark-unread API**; the test `afterAll` is a documented **no-op** (does not reseed). Restore the seed manually with `cd server && yarn seed --clear && yarn seed`.

---

## 6. E2E Scenario Matrix

Built with skill `e2e-scenario-coverage` — every rubric row gets ✅ (scenario + expected) or **N/A** (reason). No silent gaps. Expanded into one test per ✅ scenario in `plan.md`. **Gate** column: `A+B` = covered by both the committed `yarn e2e` suite (gate A) and the MCP browser-walk (gate B); `A only` = mutation-heavy / state-changing → MCP gate verifies read/render only, never mutates in parallel (see §4.3 contamination rule). `[technique]` tags mark applied test-design techniques (EP / BVA / Decision Table / State Transition / Error Guessing).

> **Implementation note (no drift)** — the actual FE uses **invalidate-on-success**, NOT optimistic UI: `useMarkNotificationRead` / `useMarkAllRead` only `invalidateQueries([NOTIFICATIONS])` + `invalidateQueries([NOTIFICATIONS_UNREAD_COUNT])` inside `onSuccess` (no `onMutate`, no rollback). On a mutation **failure** the cache is untouched → the item stays unread and a toast (`notifications.toast.markReadError` / `markAllError`) fires from `onError`. Mark-read buttons are `disabled` while `isPending`, so a double-click cannot fire two PATCHes.

| # | Category | Decision | Gate | Scenarios / reason |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ | A+B (read); mark-all-from-panel **A only** | (a) Logged-in user opens `/notifications` → unread tab shows list grouped today/yesterday/earlier with relative timestamps. **(b) NEW** — header bell shows an unread **badge** (only when `count > 0`); opening the panel shows recent notifications (first page) **and** a "Mark all as read" affordance. Badge is **hidden** when `unreadCount === 0` (`AppHeader` renders `<Badge>` only on `unreadCount > 0`). Mark-all-from-panel mutates → **A only** under MCP. |
| 2 | AuthN | ✅ | A+B | Unauthenticated visit to `/notifications` → login screen shown by `AuthGuardLayout` (fresh context: `storageState: undefined` + `clearCookies()`); protected chrome (unread tab) absent. API returns 401 without session. |
| 3 | AuthZ | ✅ (BE) / N/A (FE UI) | A (BE) | Ownership enforced in the BE filter (`{ _id, userId }`): `PATCH /notifications/:id/read` for another user's id → **404**, covered in BE integration. FE UI N/A — no UI path to target another user's notification id; no role variants (all notifications user-scoped). |
| 4 | Validation / expected-error | ✅ (BE) / N/A (FE form) | A (BE) | `page=abc` / oversized `limit` → server validation/clamp (BE test, `limit` clamped to `MAX_LIMIT`). FE N/A — no manual page/limit input (load-more only), so no client form to validate. |
| 5 | Empty / null states | ✅ | A+B | **(a) NEW** — **per-tab** empty: intercept list with `isRead=true` → `items: []` on the **Read** tab → `notifications.states.empty` renders (not just "no notifications at all"). **(b)** user with zero notifications → empty state both tabs. **(c) NEW** — unread item with `readAt: null` renders without crashing (null-date path through `relativeTime`). **[EP]** empty-set vs non-empty-set partitions. |
| 6 | Boundary / pagination | ✅ | A+B | **[BVA]** page-boundary cases: (a) seed `> limit` rows → page 1 renders, **Load more** appends page 2, then **disappears on last page** (`totalPages` reached → `getNextPageParam` → `undefined`). **(b) NEW [BVA]** — single full page `totalPages: 1` (exactly **20** items, `limit` boundary) → "Load more" is **ABSENT from the start** (`hasNextPage === false`, no next-page button ever rendered). |
| 7 | Filter / search | ✅ (tabs) / N/A (search, URL) | A+B | **NEW content assertion** — Unread vs Read tab filters via `isRead` param: exported `SEED_READ_TITLE = "Password changed"` is **visible on the Read tab** and **absent on the Unread tab**; `SEED_UNREAD_TITLE` is the inverse. **[Decision Table]** tab × isRead → expected subset. No search box → N/A. Tab state is local (not URL-persisted) by design → URL-persistence N/A. |
| 8 | Data rendering | ✅ | A+B | Literal `title`/`message` rendered (not raw enum/keys); timestamp shown as relative ("2 hours ago"), **not ISO** (assert no `\dT\d\d:\d\d` leaks); `type`-derived icon container (`aria-hidden` visual wrapper); group headers translated. |
| 9 | **i18n (en + vi)** | ✅ | A+B | Render chrome in **both** locales: tabs (`unread`/`read`), buttons (mark all, load more, mark read), group headers, empty/error states, announcements. **NEW vi relative-time** — on `/vi/notifications` a rendered timestamp matches **`/trước/`** specifically (proves `date-fns` **vi** locale is wired, not the looser `/ago|trước/` regex). (Body text intentionally literal — assert chrome only.) **[Error Guessing]** locale-leak: an English "ago" must NOT appear on the vi page. |
| 10 | Error / loading | ✅ | (a)(b) A+B; **(c) NEW** A+B | (a) List API 5xx / network error → error UI (`notifications.states.error`). (b) Loading skeleton/text while fetching. **(c) NEW** — **mark-read mutation failure**: intercept `PATCH /notifications/:id/read` → **500** → toast `notifications.toast.markReadError` fires **and** the item **stays unread** (invalidate-on-success means a failed mutation leaves the cache untouched — no optimistic flip to revert). **[Error Guessing]** server-error on the mutate path, not just the list path. |
| 11 | Mutation safety | ✅ | mark-single/all **A+B-read**; idempotency & no-op & persistence **A only** | (a) Mark single → item moves to read, badge + unread-tab count **decrement by exactly 1** (delta assertion via `fetchUnreadCount`). (b) Mark all → all unread become read, header bell badge → hidden. **(c) NEW [BVA] no-op** — mark-all when **already empty** → BE returns `updated: 0`, UI is a no-op, **no negative badge** (count never goes below 0). **(d) NEW idempotency** — **double-click mark-read** on the same item: count decrements **−1, not −2** (button is `disabled` while `markRead.isPending`, so the second click is swallowed). **(e) NEW persistence** — after a real mark-single, **reload** the page → the item stays in Read / out of Unread (invalidate refetches authoritative server state). **Restoration (drift fix)** — there is **no mark-unread API**, and `afterAll` does **NOT** reseed (the block is a documented no-op). The seed read-state mutated by the real mark-single test is restored **manually** by running `cd server && yarn seed --clear && yarn seed`; flagged in `e2e.md` + the test header as a teardown requirement. Idempotency / no-op / persistence are **A only** (real mutations → MCP gate must not run them concurrently). |
| 12 | Accessibility | ✅ | announcer/labels **A+B**; keyboard-activation **A only** | Mark-read button has an accessible label (`aria-label`); Load more reachable by role and keyboard-focusable; selectors prefer role/label. **NEW announcer** — `#announcer` `aria-live="polite"` region receives content on **tab change** (`announce.tabChanged`), **mark-read** (`announce.markedRead`), **mark-all** (`announce.markedAllRead`), **load-more** (`announce.loadingMore`) — assert the live-region text updates per `announce.*` key. **NEW keyboard activation** — focus the mark-read button, press **Enter/Space** → invokes mark-read (same handler as click). Keyboard activation fires a real mutation → **A only**. |

**Feature-specific row** — relative-time rendering (`date-fns`) must read the correct locale (en `ago` vs vi `trước`) — asserted with the locale-specific `/trước/` matcher in row 9 (not the loose `/ago|trước/` union).

> Completeness critic (extra adversarial subagent) not run — the request was a standard build, not "thorough/comprehensive/≥90%". Every applicable row above is covered or has a written N/A reason. Test count of record: the committed suite `client/e2e/notifications/notifications.e2e.ts` has **13** `test(...)` blocks (no "14/14" claim is made anywhere in this spec).

---

## 7. Isolation & workflow

- Worktrees created per-repo from `origin/main`, branch `feat/notifications-api`: `docs/.worktrees/notifications-api`, `server/.worktrees/notifications-api`, `client/.worktrees/notifications-api`.
- Next: `superpowers:writing-plans` → split tasks BE / FE / E2E (one test per ✅ scenario; any deferral stated with reason).
