# Security Report — favorite-apps

> Source: agent-run security review (§4.5), 2026-06-15, on branch `feat/favorite-apps` diff. Method: security-audit subagent (equivalent to `/security-review`) — built-in slash not agent-triggerable in this environment.

## Verdict: ✅ PASS

No Critical/High findings. Feature is safe to ship.

## Surface

`POST/DELETE /users/me/favorites/:appId`, `GET /users/me/favorites` (all `authGuard`); `GET /apps` per-user `isFavorite` annotation; collection `user_favorites` unique `(userId, webAppId)`. `userId` always from JWT `sub` (`RequestContext.requireUserId()` / `getUserId()`), never client-supplied.

## Findings by axis

| # | Axis | Result | Notes |
|---|---|---|---|
| 1 | AuthN | ✅ | `favorites.use(authGuard)` before all routes → 401 unauth |
| 2 | AuthZ / IDOR | ✅ | userId from token; only `:appId` (web-app id) from client; all repo queries scope by token userId; `/apps` annotation matches caller's own favorites only |
| 3 | Input validation | ✅ | `:appId` Joi ObjectId; query `search` trim+max (regex-escaped, no ReDoS), `categoryId` ObjectId, `sort` strict enum; `stripUnknown` |
| 4 | NoSQL injection | ✅ | all values ObjectId-cast or escaped regex; `$in` arrays from DB values; malformed ObjectId → 400 (CastError → INVALID_OBJECT_ID), not 500 |
| 4b | Favoritable guard | ✅ | POST asserts app exists + ACTIVE + role-visible → 404 (not an existence oracle); DELETE idempotent no-op (safe) |
| 5 | Data exposure | ✅ | returns only UserAppDto (no clientSecret/clientId/requiredRoles/status); filtered to ACTIVE + role |
| 6 | Rate limiting | ⚠️ Low | favorite mutations not per-endpoint rate-limited; risk low (idempotent upsert + unique index bound rows to 1/app/user). Optional follow-up. |
| 7 | Mass assignment | ✅ | no body; only `{userId, webAppId}` + `$setOnInsert: createdAt` persisted |
| 8 | Error handling | ✅ | domain exceptions; filter emits only code/message/timestamp/path/errors (no stack/cause/PII) |
| 9 | Frontend | ✅ | no token handling in favorites code; React auto-escapes (no dangerouslySetInnerHTML); `window.open(..., "noopener,noreferrer")` (anti-tabnabbing); optimistic update sends only appId |

## Non-blocking notes
- **Low**: consider a modest write-rate limit on favorite POST if abuse observed (global limiter currently relied upon).
- **Info**: `/apps` annotation uses optional `getUserId()` (unauth → `isFavorite:false`), correct regardless of that route's guard audience.

No code changes required.
