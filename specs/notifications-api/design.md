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

- Mark single on a notification not owned by caller / nonexistent id → **404** (`NOTIFICATION_NOT_FOUND`); FE shows error toast, list unchanged.
- Invalid query params (`page=abc`, oversized `limit`) → `queryPipe` validation; `limit` clamped to `MAX_LIMIT` server-side.
- Empty states per tab (no unread / no read / no notifications at all).
- Boundary: last page → `getNextPageParam` returns `undefined` → Load more hidden.
- Unread count is a **separate query**, independent of the page currently loaded, so the badge is accurate regardless of pagination.
- Mark-all when nothing unread → `updated: 0`, no-op UI.

---

## 5. Testing

- **BE**: integration/unit for service + repository — pagination math, `isRead` filter, ownership-scoped `markRead` (404 on foreign id), `markAllRead` touches only unread, `countUnread`.
- **FE E2E (Playwright)**: see the matrix below — feature changes user-observable behavior, so E2E is mandatory (en + vi). Tests live in `client/e2e/notifications/`; scenarios documented in `docs/specs/notifications-api/e2e.md` at the §4.3 step.

---

## 6. E2E Scenario Matrix

Built with skill `e2e-scenario-coverage` — every rubric row gets ✅ (scenario + expected) or **N/A** (reason). No silent gaps. Expanded into one test per ✅ scenario in `plan.md`.

| # | Category | Decision | Scenarios / reason |
| --- | --- | --- | --- |
| 1 | Happy path | ✅ | (a) Logged-in user opens `/notifications` → unread tab shows list grouped today/yesterday/earlier with relative timestamps. (b) Header bell shows unread badge count; opening panel shows recent notifications. |
| 2 | AuthN | ✅ | Unauthenticated visit to `/notifications` → redirected to login by `AuthGuardLayout`; API returns 401 without session. |
| 3 | AuthZ | ✅ (BE) / N/A (FE UI) | Ownership enforced: `PATCH /notifications/:id/read` for another user's id → **404**, covered in BE integration. FE UI N/A — no UI path to target another user's notification id. No role variants (all notifications user-scoped). |
| 4 | Validation / expected-error | ✅ (BE) / N/A (FE form) | `page=abc` / oversized `limit` → server validation/clamp (BE test). FE N/A — no manual page/limit input (load-more only), so no client form to validate. |
| 5 | Empty / null states | ✅ | (a) Read tab with no read items → empty state. (b) User with zero notifications → empty state both tabs. (c) Unread item with `readAt=null` renders without crashing. |
| 6 | Boundary / pagination | ✅ | Seed > `limit` rows → page 1 renders, **Load more** appends page 2, and **disappears on last page** (no next page). |
| 7 | Filter / search | ✅ (tabs) / N/A (search, URL) | Unread vs Read tab filters via `isRead` param and shows the correct subset. No search box → N/A. Tab state is local (not URL-persisted) by design → URL-persistence N/A. |
| 8 | Data rendering | ✅ | Literal `title`/`message` rendered (not raw enum/keys); timestamp shown as relative ("2 hours ago"), not ISO; `type`-derived icon/color; group headers translated. |
| 9 | **i18n (en + vi)** | ✅ | Render chrome in **both** locales: tabs (`unread`/`read`), buttons (mark all, load more, mark read), group headers, empty/error states, announcements. (Body text intentionally literal — assert chrome only.) |
| 10 | Error / loading | ✅ | (a) List API 5xx / network error → error UI. (b) Loading skeleton while fetching. (c) Mark-read mutation failure → error toast, item stays unread. |
| 11 | Mutation safety | ✅ | (a) Mark single → item moves to read, badge + unread-tab count decrement. (b) Mark all → all unread become read, badge → 0. **Revert in `afterAll`**: tests mutate seeded read-state; since there is no mark-**unread** API, `afterAll` re-runs the notification seed (clear + reseed) to restore state — idempotent. Flagged in `e2e.md` as a teardown requirement. |
| 12 | Accessibility | ✅ | Mark-read button has an accessible label; live-region announcements on mark/load/tab; keyboard focus reaches the mark-read button and Load more; selectors prefer role/label. |

**Feature-specific row** — relative-time rendering (date-fns) must read correct locale (en vs vi) for "X ago" wording; asserted within row 9.

> Completeness critic (extra adversarial subagent) not run — the request was a standard build, not "thorough/comprehensive/≥90%". Every applicable row above is covered or has a written N/A reason.

---

## 7. Isolation & workflow

- Worktrees created per-repo from `origin/main`, branch `feat/notifications-api`: `docs/.worktrees/notifications-api`, `server/.worktrees/notifications-api`, `client/.worktrees/notifications-api`.
- Next: `superpowers:writing-plans` → split tasks BE / FE / E2E (one test per ✅ scenario; any deferral stated with reason).
