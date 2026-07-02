# Apps Category SSR (Hybrid) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Context-routing (CLAUDE.md §2): BE tasks → read `server/.claude/CLAUDE.md`; FE tasks → read `client/.claude/CLAUDE.md`.

**Goal:** Chuyển `GET /apps/categories` thành public (optionalAuthGuard) + fetch trong Server Component và truyền prop xuống, giữ apps list client-fetched; không đổi auth cốt lõi.

**Architecture:** Hybrid SSR. `apps/page.tsx` (Server Component) gọi `getServerAppCategories()` (native fetch, no token) → truyền `categories` prop qua `Apps` → `AppsBoard` (Client Component). Prop null (server fetch fail) → fallback `useAppCategories()` (client, enabled khi prop null). BE: tách route, `optionalAuthGuard` + IP rate-limit + Cache-Control cho `/categories`; Swagger cập nhật.

**Tech Stack:** BE Express + `express-rate-limit`/Redis + Joi + Swagger. FE Next.js 15 App Router (RSC + Client Component), React Query, next-intl.

## Global Constraints

- Access token in-memory (Zustand), refresh token httpOnly cookie — **KHÔNG đổi**. Không migrate cookie.
- `optionalAuthGuard` cho `/apps/categories` (KHÔNG xoá hẳn auth). `authGuard` giữ trên `/apps` list.
- FE server fetch dùng `process.env.API_SERVER_URL` + `NEXT_PUBLIC_API_PREFIX`, **native `fetch`** (KHÔNG `axiosInstance`), gửi **no Authorization header**. Fail → trả `null` (không throw).
- Fallback client dùng lại `useAppCategories()` qua same-origin `/api/v1` rewrite; `enabled` chỉ khi server prop null (tránh double-fetch).
- Category DTO chỉ `{ _id, slug, displayName }`. Category name localize client-side qua `resolveCategoryLabel(tCat, slug, displayName)`.
- Convention: BE theo `module-struct` + `standard-restful-api` + `standard-doc-api`; FE theo `standard-nextjs`/`standard-react`, endpoint qua `CONSTANTS.END_POINTS`, type dùng chung trong `src/types/`.
- Commit review gate: user đã opt-out → subagent commit per-task tự động (review OFF mode).

---

### Task 1 (BE): Route restructure — public categories via optionalAuthGuard

**Files:**
- Modify: `server/src/modules/web-app/web-app.routes.ts` (`createUserWebAppRoutes`)
- Verify/Modify: `server/src/middlewares/index.ts` (barrel — ensure `optionalAuthGuard` exported)
- Modify: `server/src/modules/web-app/web-app.controller.ts:49-55` (`listUserCategories` — add Cache-Control header)

**Interfaces:**
- Consumes: `optionalAuthGuard` (`server/src/middlewares/guards/optional-auth.guard.ts`), `authGuard`, `asyncHandler`, `queryPipe`.
- Produces: `createUserWebAppRoutes(controller, rateLimiter)` — factory now takes a 2nd param `rateLimiter: RateLimiterMiddleware` (used in Task 2). For Task 1, add the param but only wire guards; rate-limit middleware added in Task 2.

- [ ] **Step 1: Ensure `optionalAuthGuard` is exported from the middlewares barrel**

Read `server/src/middlewares/index.ts`. If `optionalAuthGuard` is not re-exported, add it next to `authGuard`:
```ts
export { authGuard } from "./guards/auth.guard";
export { optionalAuthGuard } from "./guards/optional-auth.guard";
```

- [ ] **Step 2: Swap the guard on `/categories`, keep `authGuard` on the list route**

In `web-app.routes.ts`, replace `createUserWebAppRoutes` body. Remove the router-level `apps.use(authGuard)`; apply guards per-route:
```ts
import {
  adminGuard,
  authGuard,
  optionalAuthGuard,
  queryPipe,
  bodyPipe,
  paramsPipe
} from "@/middlewares";

export const createUserWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const apps = Router();

  // Public catalog metadata: optionalAuthGuard attaches user IF a token is
  // present, else passes through anonymous (Server Component fetch sends none).
  apps.get(
    "/categories",
    optionalAuthGuard,
    asyncHandler(controller.listUserCategories)
  );

  // App list stays protected — role-scoped visibility + per-user favorites.
  apps.get(
    "/",
    authGuard,
    queryPipe(listAppsQuerySchema),
    asyncHandler(controller.listUserApps)
  );

  router.use("/apps", apps);
  return router;
};
```
(Rate-limit param + middleware added in Task 2 — do not add here yet.)

- [ ] **Step 3: Add Cache-Control header to `listUserCategories`**

In `web-app.controller.ts`, update ONLY `listUserCategories` (NOT admin `listCategories`):
```ts
listUserCategories = async (req: Request, res: Response): Promise<void> => {
  const data = await this.service.listUserCategories();
  res.set("Cache-Control", "public, max-age=300");
  new OkSuccess({
    data,
    message: "webApp:success.listCategories"
  }).send(req, res);
};
```

- [ ] **Step 4: Verify anonymous access manually (evidence)**

With BE running (`cd server && yarn dev`), run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/v1/apps/categories
```
Expected: `200`. Then with a garbage token (M1 cliff):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer garbage" http://localhost:5000/api/v1/apps/categories
```
Expected: `401`.

- [ ] **Step 5: Quality gate + commit**

```bash
cd server && yarn format && yarn lint && yarn type-check
git add src/modules/web-app/web-app.routes.ts src/modules/web-app/web-app.controller.ts src/middlewares/index.ts
git commit -m "feat(web-app): make GET /apps/categories public via optionalAuthGuard"
```

---

### Task 2 (BE): IP rate-limit for public categories endpoint

**Files:**
- Modify: `server/src/constants/redis/rate-limit.ts` (add `CATEGORIES.PER_IP` config)
- Modify: `server/src/middlewares/common/rate-limiter.middleware.ts` (add `categoriesByIp` limiter)
- Modify: `server/src/modules/web-app/web-app.routes.ts` (accept `rateLimiter` param, apply to `/categories`)
- Modify: `server/src/modules/web-app/web-app.module.ts` (thread `rateLimiter` into `createUserWebAppRoutes`)
- Modify: `server/src/loaders/modules.loader.ts` (pass the `RateLimiterMiddleware` instance into `createWebAppModule`)

**Interfaces:**
- Consumes: `RateLimiterMiddleware` (Redis-backed, instantiated in loaders before modules — see how another module e.g. contact/login receives it in `modules.loader.ts`).
- Produces: `createWebAppModule(rateLimiter: RateLimiterMiddleware)`, `createUserWebAppRoutes(controller, rateLimiter)`.

- [ ] **Step 1: Add rate-limit config**

In `server/src/constants/redis/rate-limit.ts`, add under `RATE_LIMIT_CONFIG` (mirror existing IP entries like `LOGIN.PASSWORD.PER_IP`):
```ts
CATEGORIES: {
  PER_IP: {
    KEY: "rate-limit:categories:ip:",
    MAX_REQUESTS: 100,
    WINDOW_SECONDS: 300
  }
},
```

- [ ] **Step 2: Add the `categoriesByIp` limiter (IP-only key)**

In `rate-limiter.middleware.ts`: declare `public readonly categoriesByIp: RateLimitRequestHandler;` alongside the others, and initialize in the constructor (IP-only key — NO `RequestContext`, since anonymous):
```ts
this.categoriesByIp = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.WINDOW_SECONDS * 1000,
  max: RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.MAX_REQUESTS,
  store: this.createRedisStore(RATE_LIMIT_CONFIG.CATEGORIES.PER_IP.KEY),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: this.createRateLimitExceededHandler("webApp:errors.rateLimitExceeded")
});
```
Add i18n key `webApp:errors.rateLimitExceeded` to `server/src/i18n/locales/en/webApp.json` and `vi/webApp.json` (follow existing error key shape in that namespace).

- [ ] **Step 3: Thread rateLimiter into the route factory**

`web-app.routes.ts`:
```ts
import type { RateLimiterMiddleware } from "@/middlewares/common/rate-limiter.middleware";

export const createUserWebAppRoutes = (
  controller: WebAppController,
  rateLimiter: RateLimiterMiddleware
): Router => {
  const router = Router();
  const apps = Router();

  apps.get(
    "/categories",
    rateLimiter.categoriesByIp,
    optionalAuthGuard,
    asyncHandler(controller.listUserCategories)
  );

  apps.get(
    "/",
    authGuard,
    queryPipe(listAppsQuerySchema),
    asyncHandler(controller.listUserApps)
  );

  router.use("/apps", apps);
  return router;
};
```

- [ ] **Step 4: Wire the module + loader**

`web-app.module.ts`:
```ts
export const createWebAppModule = (rateLimiter: RateLimiterMiddleware) => {
  const webAppRepo = new MongoWebAppRepository();
  const categoryRepo = new MongoWebAppCategoryRepository();
  const favoriteRepo = new MongoFavoriteRepository();
  const service = new WebAppService(webAppRepo, categoryRepo, favoriteRepo);
  const controller = new WebAppController(service);

  return {
    webAppAdminRouter: createAdminWebAppRoutes(controller),
    webAppUserRouter: createUserWebAppRoutes(controller, rateLimiter)
  };
};
```
In `modules.loader.ts` (line ~147): read how the existing `RateLimiterMiddleware` instance is created/named in the loader (the same instance passed to other modules), then:
```ts
const { webAppAdminRouter, webAppUserRouter } = createWebAppModule(rateLimiter);
```
(Use the exact variable name the loader already uses for the limiter instance.)

- [ ] **Step 5: Manual evidence — 429 after limit**

Not scripted here (100/5min). Confirm the header appears on a normal call:
```bash
curl -s -D - http://localhost:5000/api/v1/apps/categories -o /dev/null | grep -i "ratelimit\|cache-control"
```
Expected: `RateLimit-*` headers + `Cache-Control: public, max-age=300`.

- [ ] **Step 6: Quality gate + commit**

```bash
cd server && yarn format && yarn lint && yarn type-check
git add src/constants/redis/rate-limit.ts src/middlewares/common/rate-limiter.middleware.ts src/modules/web-app/web-app.routes.ts src/modules/web-app/web-app.module.ts src/loaders/modules.loader.ts src/i18n/locales/en/webApp.json src/i18n/locales/vi/webApp.json
git commit -m "feat(web-app): IP rate-limit + cache headers on public categories endpoint"
```

---

### Task 3 (BE): Update Swagger for public `/apps/categories`

**Files:**
- Modify: `server/src/modules/web-app/swagger/paths.ts:303-342`

- [ ] **Step 1: Remove auth from the spec**

Replace the `/apps/categories` GET block: delete `security: [{ bearerAuth: [] }]`, update the description to state no auth required + rate-limit, and replace the `401` response with a `429`:
```ts
"/apps/categories": {
  get: {
    summary: "List categories (public)",
    description: `
List all app categories for the launcher catalog filter. Public endpoint —
no authentication required (optional Bearer token is accepted but not needed).
IP rate-limited; responses are cacheable (Cache-Control: public).
    `.trim(),
    tags: ["Web App"],
    responses: {
      "200": {
        description: "Categories retrieved successfully",
        content: {
          "application/json": {
            schema: {
              allOf: [
                { $ref: "#/components/schemas/SuccessResponse" },
                {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserCategoryResponse" }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      "429": { $ref: "#/components/responses/TooManyRequests" }
    }
  }
}
```
If `#/components/responses/TooManyRequests` does not exist, omit the 429 ref (keep only 200) rather than inventing a broken $ref.

- [ ] **Step 2: Quality gate + commit**

```bash
cd server && yarn format && yarn lint && yarn type-check
git add src/modules/web-app/swagger/paths.ts
git commit -m "docs(web-app): swagger — mark GET /apps/categories public"
```

---

### Task 4 (FE): Server-side category fetch util

**Files:**
- Create: `client/src/requests/server/apps.ts`

**Interfaces:**
- Produces: `getServerAppCategories(): Promise<UserCategory[] | null>` — consumed by Task 5.

- [ ] **Step 1: Implement the server fetch**

```ts
// types
import type { UserCategory } from "@/types/Apps";
// others
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

// Server-only: uses API_SERVER_URL (not exposed to browser). Sends NO auth
// header — the endpoint is public. Returns null on any failure so the caller
// can fall back to the client fetch instead of crashing the page.
export const getServerAppCategories = async (): Promise<
  UserCategory[] | null
> => {
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

- [ ] **Step 2: Quality gate + commit**

```bash
cd client && yarn format && yarn lint && npx tsc --noEmit
git add src/requests/server/apps.ts
git commit -m "feat(apps): server-side category fetch util"
```

---

### Task 5 (FE): Wire Server Component → prop → AppsBoard fallback

**Files:**
- Modify: `client/src/app/[locale]/(private)/(dashboard)/apps/page.tsx`
- Modify: `client/src/views/Apps/index.tsx`
- Modify: `client/src/views/Apps/mains/AppsBoard/index.tsx`
- Modify: `client/src/views/Apps/hooks/useAppCategories.ts`

**Interfaces:**
- Consumes: `getServerAppCategories` (Task 4), `useAppCategories` (extended with `enabled`).
- Produces: `Apps({ categories })`, `AppsBoard({ categories })`.

- [ ] **Step 1: `useAppCategories` accepts an `enabled` option**

```ts
// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAppCategories } from "@/requests/apps";

export const APP_CATEGORIES_QUERY_KEY = "appCategories";

const useAppCategories = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: [APP_CATEGORIES_QUERY_KEY],
    queryFn: getAppCategories,
    enabled: options?.enabled ?? true
  });

export default useAppCategories;
```

- [ ] **Step 2: `page.tsx` fetches categories server-side and passes prop**

Keep `generateMetadata` unchanged. Replace the default export:
```tsx
// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import Apps from "@/views/Apps";
// requests
import { getServerAppCategories } from "@/requests/server/apps";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apps" });
  return { title: t("title"), description: t("description") };
}

const AppsPage = async () => {
  const categories = await getServerAppCategories();
  return <Apps categories={categories} />;
};

export default AppsPage;
```

- [ ] **Step 3: `Apps` view forwards the prop**

```tsx
// types
import type { UserCategory } from "@/types/Apps";
// components
import AppsBoard from "./mains/AppsBoard";

const Apps = ({ categories }: { categories: UserCategory[] | null }) => (
  <AppsBoard categories={categories} />
);

export default Apps;
```

- [ ] **Step 4: `AppsBoard` uses prop, falls back to hook when null**

In `AppsBoard/index.tsx`: add `UserCategory` to the type imports, change the signature and the categories source. Replace:
```tsx
const { data: categories = [] } = useAppCategories();
```
with:
```tsx
const { data: fallbackCategories = [] } = useAppCategories({
  enabled: serverCategories == null
});
const categories = serverCategories ?? fallbackCategories;
```
and change the component signature:
```tsx
const AppsBoard = ({
  categories: serverCategories
}: {
  categories: UserCategory[] | null;
}) => {
```
Everything downstream (`categoryOptions`, `resolveCategoryLabel`, `buildAppsFilterDefs`) is unchanged — it consumes the local `categories`.

- [ ] **Step 5: Manual evidence (both paths)**

- BE up + FE up. Load `/apps`: category filter options present in the server HTML (view-source shows options / no spinner), and Network shows **no** client `GET /apps/categories` (M2). 
- Stop BE, reload `/apps`: page still renders; `AppsBoard` fallback fires (server prop null) — filter degrades, apps list attempts load. No white screen (M2 both-fail / row 14).

- [ ] **Step 6: Quality gate + commit**

```bash
cd client && yarn format && yarn lint && npx tsc --noEmit
git add src/app/[locale]/\(private\)/\(dashboard\)/apps/page.tsx src/views/Apps/index.tsx src/views/Apps/mains/AppsBoard/index.tsx src/views/Apps/hooks/useAppCategories.ts
git commit -m "feat(apps): render categories from Server Component with client fallback"
```

---

### Task 6 (E2E): Reconcile `web-app-user-list` suite (add/update/remove)

**Files:**
- Modify: `docs/specs/web-app-user-list/e2e.md` (reconcile scenario doc)
- Modify: `client/e2e/web-app-user-list/*.e2e.ts` (add/update tests)

**Reconcile rule (e2e-scenario-coverage):** do NOT rebuild the suite. ADD new-behavior cases, UPDATE changed-expectation cases, REMOVE obsolete ones. Keep design.md matrix ↔ e2e.md ↔ test files in sync.

- [ ] **Step 1: UPDATE the changed-expectation case (categories auth)**

Find the existing scenario asserting `/apps/categories` behavior without a token. The old "API 401 without token" scenario: if it targeted `/apps/categories`, its expected changes from **401 → 200** (endpoint now public). If it targeted `/apps` (list), leave it (still 401). Update `e2e.md` + the corresponding test accordingly. Also update the existing "Categories 5xx degrade" scenario to reflect the new **server-fetch-fail → client fallback** path (row 14), not just a client 5xx.

- [ ] **Step 2: ADD new scenarios (rows 13–20)** — one test each, matching existing style (role/name selectors; `page.request` for API-level; `test.use({ storageState })` for auth variants):
  - **[row 2a/20]** anonymous + user + admin `GET /apps/categories` → all **200** and **byte-identical** arrays (M12). Use `page.request.get("/api/v1/apps/categories")` with cleared storageState for anon.
  - **[row 13/M1]** `GET /apps/categories` with `Authorization: Bearer garbage` → **401**; with no header → **200** (behavior cliff).
  - **[row 14/M2]** happy path: load `/apps`, assert **zero** client `GET /apps/categories` requests (server prop used); then BE-down path → filter empty graceful, no crash.
  - **[row 15/M3+M8]** response header `Cache-Control: public, max-age=300` present on `GET /apps/categories`.
  - **[row 16/M6]** `/en/apps` and `/vi/apps`: filter group label differs per locale; a category whose slug has an i18n key shows localized name; a slug WITHOUT a key falls back to raw `displayName` in both locales.
  - **[row 18/M9]** deep-link `/vi/apps?categoryId=<validId>` cold load → filter pre-selected + options present + apps list filtered; back/forward preserves state; `/apps?categoryId=<garbage>` → no crash.
  - **[row 19/M11]** trigger client fallback (BE server-fetch down but client proxy up is hard to force in one env — if not reproducible, assert instead that the client category call, when it fires, targets same-origin `/api/v1/apps/categories`; document any deferral in e2e.md).
  - **[row 17/M7]** rate-limit 429: `A only`, deferred if 100/5min is impractical to exhaust in CI — **record the deferral reason in e2e.md** (no silent cap).

- [ ] **Step 3: Sync e2e.md + matrix**

Ensure every added/updated test has a matching row in `docs/specs/web-app-user-list/e2e.md`, and that `design.md` matrix (this feature) stays the source. Note deferrals explicitly.

- [ ] **Step 4: Commit**

```bash
cd client && yarn lint
git add e2e/web-app-user-list/
git commit -m "test(apps): E2E for public categories + SSR hybrid (reconcile web-app-user-list)"
# docs commit happens in the docs repo/worktree
```

---

## §4.3 E2E Dual-Gate (execution step, after Task 6)

Run gate A (`cd client && yarn e2e` scoped to web-app-user-list) + gate B (Playwright MCP walk of the matrix) in parallel; both must pass. Precondition: check BE :5000 / FE :3000 / Mongo / Redis running (agent self-checks once; if down, ask user run vs agent run — CLAUDE.md §4.3). Mutation-heavy rows are `A only`; gate B verifies read/render only. Fail → systematic-debugging → `e2e-bugs.md` → fix → re-run (max 3 rounds).

## Post-implementation gates (CLAUDE.md §4.5–4.8)

- **§4.5 Security review** — feature touches auth surface (guard swap) + makes an endpoint public → **run** (agent self-runs `/security-review` or a security-audit subagent). Save `docs/specs/apps-category-ssr/security-report.md`. BLOCK if Critical.
- **§4.6 CLAUDE.md drift audit** — deps unchanged; route/middleware convention unchanged structurally. Likely minimal; run `claude-md-improver` on `server/.claude/CLAUDE.md` only if a documented fact changed (e.g. new public-route convention). Non-blocking.
- **§4.7 Green checks** — BE: `cd server && yarn lint && yarn type-check && yarn test && yarn build`. FE: `cd client && yarn lint && yarn build`. All green before PR.
- **§4.8 Finish branch + README** — setup/env/deps unchanged → README sync likely skip. Then §5 step 5 `creating-github-pr` per-repo (server + client + docs) — **STOP before merge, ask user** (per user preference).

## Self-Review (plan vs spec)

- **Coverage:** design §BE (route/rate-limit/cache/swagger) → Tasks 1–3; §FE (server fetch/prop/fallback) → Tasks 4–5; E2E matrix (rows 1–20) → Task 6. ✅
- **Placeholders:** none — code shown per step; the two reference-to-pattern points (loader rate-limiter var name; TooManyRequests $ref) are explicitly conditional with fallbacks. ✅
- **Type consistency:** `UserCategory` used consistently (FE); `getServerAppCategories(): UserCategory[] | null`; `AppsBoard({ categories: UserCategory[] | null })`; `createWebAppModule(rateLimiter)` / `createUserWebAppRoutes(controller, rateLimiter)`. ✅
