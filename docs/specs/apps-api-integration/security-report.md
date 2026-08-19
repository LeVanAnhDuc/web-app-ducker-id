# Security Report — apps-api-integration

**Verdict: PASS**
**Side audited:** BE + FE
**Overall risk:** Low
**Vulnerabilities:** 0 Critical, 0 High, 0 Medium, 1 Low

---

## Summary

The feature adds `GET /apps/categories` and a `categoryId` filter to `GET /apps` on the BE, plus category pills and real-API wiring on the FE (Home + Apps pages). All new attack paths are correctly guarded. No exploitable vulnerability found. One low-severity finding is noted for defence-in-depth.

---

## Vulnerabilities

### VULN-BE-1 — [Low] Missing explicit type coercion guard on `categoryId` before Mongoose filter assignment

**OWASP:** A03 Injection (NoSQL)
**File:** `src/modules/web-app/helpers/index.ts` line 26; `src/modules/web-app/web-app.service.ts` line 66-68
**Severity justification:** Practically unexploitable because Joi's `queryPipe` sits upstream and both strips unknowns (`stripUnknown: true`) and enforces the `OBJECTID_PATTERN` regex before the value ever reaches `buildWebAppFilter`. However, `buildWebAppFilter` accepts `AdminAppsQuery` which types `categoryId` as `string | undefined` — if the helper is ever called from a new code path that bypasses the pipe, a MongoDB operator object (`{ "$gt": "" }`) could reach the query as-is.

**Attack path (theoretical):** New service method calls `buildWebAppFilter({ categoryId: req.body.categoryId })` without a `queryPipe` — the string type hint does not prevent an object at runtime in JavaScript; `filter.categoryId = query.categoryId` passes the object directly into a `FilterQuery`, enabling NoSQL query manipulation.

**Current blast radius:** Zero — today every caller goes through `queryPipe(listAppsQuerySchema)` which rejects non-string values and validates the 24-hex pattern.

**Remediation:** In `buildWebAppFilter`, add a runtime assertion before assignment:

```ts
if (query.categoryId) {
  if (typeof query.categoryId !== "string") {
    throw new Error("categoryId must be a string");  // or BadRequestError
  }
  filter.categoryId = query.categoryId;
}
```

Alternatively, accept `categoryId: string` (not the broader `AdminAppsQuery`) so TypeScript enforces it at compile time on all callers.

**Fix owner:** Developer (low-priority defence-in-depth, not a blocker)

---

## Passed Checks

**BE Input Validation**
- `categoryId` is validated by `Joi.string().pattern(OBJECTID_PATTERN)` (24-char hex) inside `listAppsQuerySchema` via `queryPipe` before reaching the service. `stripUnknown: true` prevents extra keys from bleeding through. The `OBJECTID_PATTERN` regex (`/^[a-fA-F0-9]{24}$/`) is strict — no partial match, no object injection possible through this path.
- `search` field uses `escapeRegex()` before constructing the `$regex` filter — regex injection is mitigated.

**BE AuthN**
- Both new endpoints (`GET /apps/categories` and `GET /apps` with `categoryId`) are mounted under `apps.use(authGuard)` in `createUserWebAppRoutes`. `authGuard` verifies the Bearer JWT (`verifyAccessToken`), checks `payload.sub` and `payload.authId`, and rejects with 401 if missing. No unauthenticated path to either endpoint.

**BE AuthZ / role-scoped visibility**
- `categoryId` filter is applied _before_ the role-scope override (`filter.requiredRoles = AUTHENTICATION_ROLES.USER`) in `listUserApps`. The requiredRoles constraint is unconditionally appended for non-admin callers regardless of which categories are filtered — a user cannot use `categoryId` to see admin-only apps. The order of operations in `web-app.service.ts` lines 64-76 is correct.
- `GET /apps/categories` returns only `{ _id, displayName }` via `UserCategoryDto` — no internal fields (name slug, sortOrder, timestamps) are exposed.

**BE Data Exposure**
- `UserAppDto` exposes: `_id`, `displayName`, `description`, `iconUrl`, `homeUrl`, `category.displayName`. No `clientId`, `clientSecretHash`, `redirectUris`, `scopes`, or `requiredRoles` fields are included. The mapper `toUserAppDto` is explicit (allow-list) rather than a spread, so future schema additions are not auto-exposed.
- `UserCategoryDto` exposes only `_id` and `displayName`. No internal `name` slug or `sortOrder`.

**BE Error Handling**
- Validation failure returns a structured 400/422 response via the global error handler. Joi error messages are i18n keys (`"validation:categoryId.invalid"`), not stack traces or schema internals.
- `asyncDatabaseHandler` wraps all repo calls — DB errors are caught and do not surface raw Mongoose error text to the client.

**FE XSS**
- No `dangerouslySetInnerHTML` in any new or modified component (`CategoryFilter`, `QuickAccessCard`, `RecommendedAppCard`, `AppsBoard`, `QuickAccessSection`, `RecommendedSection`).
- All server-supplied strings (`displayName`, `category`, `description`) are rendered as React text nodes — React escapes them automatically.
- `category.displayName` rendered as pill label text inside `{category.displayName}` — no DOM injection vector.

**FE Reverse Tabnabbing**
- All three `window.open` call sites (`AppCard`, `QuickAccessCard`, `RecommendedAppCard`) use `"_blank", "noopener,noreferrer"`. This neutralises both reverse tabnabbing (`noopener`) and referrer leakage (`noreferrer`).
- `homeUrl` originates from the server, validated on create/update with `Joi.string().pattern(URL_PATTERN)` (`/^https?:\/\/.+/i`) — `javascript:` scheme URLs are rejected at the API layer before they can be stored. The FE passes `homeUrl` directly to `window.open` (not `href`) — no DOM-based `href=javascript:` vector exists.

**FE Token / Sensitive Data**
- `useAppCategories` and `useHomeApps` use React Query with the shared `axiosInstance` (Bearer token injected via interceptor). No token is stored in component state or logged.
- No `NEXT_PUBLIC_` env vars carrying secrets introduced in this diff.

**FE CSRF**
- Both new API calls are GET requests — not state-mutating, no CSRF surface.

---

## Recommendations

1. **`homeUrl` scheme allowlist (defence-in-depth):** The BE validator accepts any `https?://` URL. Consider restricting to `https://` only (drop plain HTTP) for stored app URLs, since the launcher opens them in a new tab on behalf of users.
2. **Category endpoint caching:** `GET /apps/categories` returns the full category list on every page load. A short server-side cache (Redis, 60 s TTL) would reduce DB reads; no security impact, but reduces the DoS amplification surface for an authenticated user hammering the endpoint.
3. **`listUserCategories` has no pagination:** Currently fine (category count is small and admin-controlled), but worth noting if the dataset grows — unbounded `findAll()` could be a resource exhaustion vector for a future attacker with a valid token.
