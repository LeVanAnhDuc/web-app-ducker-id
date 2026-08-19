# Security Review — `apps-category-ssr`

**Scope**: BE `GET /apps/categories` made public + FE Server Component SSR fetch.
**Diffs reviewed**:
- BE: `server/.worktrees/apps-category-ssr` `git diff origin/main..HEAD`
- FE: `client/.worktrees/apps-category-ssr` `git diff d915e5d..HEAD`

---

## 1. AuthN / AuthZ — Info (no issue found)

- `WebAppService.listUserCategories()` (`server/src/modules/web-app/web-app.service.ts:113-116`) calls only `this.categoryRepo.findAll()` — no `RequestContext.requireAuthId()` / user lookup. Confirmed **no per-user data** is read or could leak through this endpoint.
- Route wiring (`server/src/modules/web-app/web-app.routes.ts`):
  - `GET /apps/categories` → `rateLimiter.categoriesByIp` → `optionalAuthGuard` → controller. No `authGuard`/`adminGuard` — intentionally public.
  - `GET /apps` (list apps) → **`authGuard` is still present**, added directly on this route (previously via `apps.use(authGuard)` router-level middleware, now moved to a route-level guard). Confirmed apps list still requires authentication — no accidental exposure of role-scoped apps/favorites.
  - Admin routes (`/admin/apps/categories`, `/admin/apps`) untouched — still behind `adminApps.use(authGuard, adminGuard)`.
- **Finding (Low)** — `optionalAuthGuard` (`server/src/middlewares/guards/optional-auth.guard.ts:6-9`) only treats auth as "optional" when the `Authorization` header is **absent**. If a header is present but the token is invalid/expired, it delegates to `authGuard`, which `throw`s `UnauthorizedError` (propagated via `next(error)`) — this will 401 the whole request instead of degrading to anonymous. This is a UX/robustness nit, not a vulnerability (no data exposure), but worth confirming is intended: a client that blindly attaches a stale token to this "public" endpoint will get a hard failure rather than the expected public categories. Recommend either documenting this as intended behavior or catching invalid-token errors in `optionalAuthGuard` and falling through to anonymous.
- No other route's guard ordering was touched. Verdict: **no authZ regression**.

## 2. Data exposure — Info (no issue found)

- Public DTO (`server/src/modules/web-app/dtos/user-category.dto.ts:4-16`):
  ```ts
  export interface UserCategoryDto { _id: string; slug: string; displayName: string; }
  ```
  Only `_id`, `slug` (category name), `displayName` are exposed — no `clientId`/`secret`/`redirectUris`/`requiredRoles`/`status`/counts. This is category **metadata**, not app records — it does not enumerate individual apps, their status, or role-gating, so it cannot be used to enumerate protected/hidden apps. The admin category DTO (`admin-category.dto.ts`) is a separate type used only on the admin route, unaffected.
- No relation/count field (e.g., "apps in this category") is present that could indirectly leak the existence/size of a hidden app set.

## 3. Input validation — Info (no issue found)

- Route takes no path/query/body params (`apps.get("/categories", rateLimiter.categoriesByIp, optionalAuthGuard, asyncHandler(controller.listUserCategories))`). Confirmed no user input is parsed, so no injection surface (NoSQL injection, param pollution) is introduced by this change. `categoryRepo.findAll()` takes no arguments.

## 4. Rate-limit / DoS — Low

- New limiter `categoriesByIp` (`server/src/constants/redis/rate-limit/index.ts:117-123`): 100 req / 300s per IP, Redis-store-backed (shared across instances, survives restarts) — reasonable for a public, cacheable, low-cost read endpoint.
- `keyGenerator: (req) => req.ip ?? "unknown"` (`rate-limiter.middleware.ts:268`) — same pattern already used by other IP-based limiters in this file (e.g. login, forgot-password), so this is consistent with existing convention, not a new weakness introduced by this diff.
- **Finding (Low)** — No `app.set("trust proxy", ...)` was found anywhere in the repo (checked `src/**`, `app.ts`, `server.ts`). This means:
  - If the app sits behind a reverse proxy/load balancer (typical in production) without `trust proxy` configured, Express's `req.ip` will report the proxy's IP for **every** request, collapsing the per-IP limiter into a single global bucket (100 req/5min for *all* users combined) — an availability/DoS-adjacent bug, not a bypass.
  - Conversely, if `trust proxy` **is** configured elsewhere in infra/deployment config not visible in this repo, and it trusts an `X-Forwarded-For`-style header without restricting to a known proxy count/CIDR, a client could spoof the header to get a fresh IP bucket each request (rate-limit bypass).
  - This is a **pre-existing condition** shared by all other IP-based limiters (login, forgot-password, contact, update-profile) — not introduced by this diff — but since this is the first **fully public, unauthenticated** endpoint gated only by IP rate-limit (others are pre-auth but typically lower-frequency/higher-value targets), it's worth flagging now: recommend confirming `trust proxy` is correctly set for the deployment topology (single trusted hop) as a **condition**, not a blocker for this PR specifically.

## 5. Caching — Info (no issue found, one forward-looking note)

- `web-app.controller.ts:50` sets `res.set("Cache-Control", "public, max-age=300")` only in `listUserCategories` (the now-public route) — `listCategories` (admin) is untouched.
- Payload is identity-independent (confirmed in §1/§2 — no per-user data, no auth-derived filtering), so `public` caching by a shared/CDN cache is safe today: every caller gets the same category list regardless of identity.
- **Forward-looking note (Info)** — because `optionalAuthGuard` allows a Bearer token to attach a user identity to the request (`RequestContext.setUser` inside `authGuard`), if `listUserCategories`/its service is ever extended to branch on `req`/`RequestContext` (e.g. per-role category visibility), the `public, max-age=300` header would then cause a shared/CDN cache to serve one user's personalized response to another. Flag this as a **must-revisit condition**: any future change that makes this handler read `RequestContext` must simultaneously change `Cache-Control` to `private` (or remove/vary it appropriately). Not actionable now since no such branching exists, but noting it in the PR/design doc is good practice.

## 6. SSR fetch (FE) — Info (no issue found)

`client/src/requests/server/apps.ts:11-25`:
```ts
export const getServerAppCategories = async (): Promise<UserCategory[] | null> => {
  try {
    const res = await fetch(
      `${process.env.API_SERVER_URL}${process.env.NEXT_PUBLIC_API_PREFIX}${END_POINTS.APP_CATEGORIES}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ResponsePattern<UserCategory[]>;
    return json.data;
  } catch {
    return null;
  }
};
```
- No `Authorization` header or cookie is attached — consistent with the endpoint being public; no token/secret is sent server-to-server.
- No `console.log`/logger call anywhere in this function — failures (network error, non-OK status, JSON parse error) are all swallowed and mapped to `return null`, with no stack trace or internal error detail surfaced to the render tree or the client. The consuming page (`apps/page.tsx`) and `AppsBoard` treat `null` as "no server data" and fall back to the existing client-side `useAppCategories` React Query hook (`enabled: serverCategories == null`), so a BE outage degrades gracefully rather than crashing SSR or leaking an error page with internal details.
- `API_SERVER_URL` and `NEXT_PUBLIC_API_PREFIX` are both build/deploy-time env vars (`.env.example:6,9`), not derived from any user input (headers, query params, cookies) — **no SSRF risk**: the URL is fully static per-deployment, matching the existing pattern already used by `next.config.ts`'s rewrite rule.
- Minor observation (Info, not a finding): `next: { revalidate: 300 }` (FE ISR cache) duplicates the BE's `Cache-Control: public, max-age=300` — both are fine together (defense-in-depth caching), no security implication.

## 7. IdP context — Info

- This is a discovery/catalog-metadata endpoint (category taxonomy for filtering an app catalog), not user data, credentials, or app-secret material. Comparable in sensitivity to public OAuth/OIDC discovery documents (`/.well-known/openid-configuration`) which are conventionally unauthenticated. Making it public is consistent with standard IdP practice, provided (as confirmed in §1/§2) it carries no per-user or secret-bearing fields — which holds true here.

---

## Verdict: **CONDITIONAL PASS**

No Critical or High severity findings. All findings are Low/Info. Conditions (non-blocking, recommended before/alongside merge):

1. **(Low, §4)** Confirm `trust proxy` is correctly configured for the actual deployment topology (single trusted reverse-proxy hop) so `req.ip` in `categoriesByIp` (and other existing IP limiters) reflects real client IPs rather than collapsing to the proxy IP or being spoofable via forged `X-Forwarded-For`. This is pre-existing across the codebase, not introduced by this diff, but the newly-added fully-public endpoint makes it more consequential — recommend a follow-up ticket if not already tracked, not a blocker for this PR.
2. **(Low, §1)** Decide/document whether `optionalAuthGuard` should degrade to anonymous on an *invalid* (vs. absent) token for this route, or whether hard-failing with 401 is intended. Currently a stale token 401s the "public" endpoint.
3. **(Info, §5)** If `listUserCategories` is ever made identity-aware in the future, `Cache-Control` must change from `public` to `private` at the same time — flag this coupling in `design.md` or a code comment so it isn't missed later.

None of the above block merge; recommend proceeding to §4.6 CLAUDE.md drift audit / green-checks gate.
