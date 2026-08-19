# Web-App User List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a user-facing `GET /apps` endpoint returning the active-app catalog (paginated + searchable) and wire the `/vi/apps` page to it, replacing the template mock with a real launcher grid.

**Architecture:** Extend the existing `web-app` BE module with a second (user) route group guarded by `authGuard` only — no entitlement filter, server forces `status=ACTIVE`. Pagination is embedded in `data` as `{ items, meta }`, mirroring the `login-history` user pattern. On the FE, `views/Apps` fetches via React Query through a view-local hook, renders a launcher card (icon + name + category + description + Open→homeUrl), and paginates with `CustomPagination`. `project-goals.md` is updated so its app-registry semantics match the catalog decision.

**Tech Stack:** Express + Mongoose + Joi (BE); Next.js 15 + React 19 + React Query + next-intl + Tailwind/shadcn (FE).

**Worktree:** branch `feat/web-app-user-list`, per-repo worktrees under `server/.worktrees/web-app-user-list`, `client/.worktrees/web-app-user-list`, `docs/.worktrees/web-app-user-list`. All paths below are repo-relative; run BE commands inside the server worktree, FE inside the client worktree.

**Conventions:** BE — `server/.claude/CLAUDE.md` + `rules/modules.md` + `module-struct`. FE — `client/.claude/CLAUDE.md` + `rules/views.md`, `rules/imports.md`, `rules/types.md`, `rules/accessibility.md`, `rules/component-folder.md`. Read the side's CLAUDE.md before touching its `src/`.

---

## Part A — Backend (`server/`)

### Task A1: User-list types

**Files:**
- Modify: `src/modules/web-app/types/index.ts`

- [ ] **Step 1: Add the user-list types**

Append to `src/modules/web-app/types/index.ts` (after the existing `WebAppCreateInput`):

```ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface UserAppsQuery extends Partial<PaginationParams> {
  search?: string;
}

export interface UserAppsQueryRequest extends Omit<Request, "query"> {
  query: UserAppsQuery;
}

export interface WebAppWithCategory extends WebAppDocument {
  category: WebAppCategoryDocument | null;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

`Request` and `WebAppCategoryDocument` are already imported/declared in this file — do not re-import.

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/modules/web-app/types/index.ts
git commit -m "feat(web-app): add user-list query and paginated-result types"
```

---

### Task A2: `listAppsQuerySchema` validator

**Files:**
- Modify: `src/validators/schemas/web-app.ts`

- [ ] **Step 1: Add the schema**

In `src/validators/schemas/web-app.ts`, add `UserAppsQuery` to the type import and append the schema after `adminListAppsQuerySchema`:

```ts
// add to the existing "@/modules/web-app/types" import:
import type { AdminAppsQuery, AdminAppCreateBody, UserAppsQuery } from "@/modules/web-app/types";
```

```ts
const LIMIT_MAX = 100;

export const listAppsQuerySchema: Joi.ObjectSchema<UserAppsQuery> = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    "number.base": "validation:page.invalid",
    "number.integer": "validation:page.invalid",
    "number.min": "validation:page.invalid"
  }),
  limit: Joi.number().integer().min(1).max(LIMIT_MAX).optional().messages({
    "number.base": "validation:limit.invalid",
    "number.integer": "validation:limit.invalid",
    "number.min": "validation:limit.invalid",
    "number.max": "validation:limit.invalid"
  }),
  search: Joi.string()
    .trim()
    .max(SEARCH_MAX_LENGTH)
    .optional()
    .messages({ "string.max": "validation:search.invalid" })
}).options({ stripUnknown: true });
```

Note: the two type imports from `@/modules/web-app/types` on separate lines in the current file may be merged into one — keep both `AdminAppsQuery` and `AdminAppCreateBody`. `SEARCH_MAX_LENGTH` is already imported.

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/validators/schemas/web-app.ts
git commit -m "feat(web-app): add listAppsQuerySchema for user GET /apps"
```

---

### Task A3: `UserAppDto` + mapper (TDD)

**Files:**
- Create: `src/modules/web-app/dtos/user-app.dto.ts`
- Create: `src/modules/web-app/dtos/user-app.dto.spec.ts`
- Modify: `src/modules/web-app/dtos/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/web-app/dtos/user-app.dto.spec.ts`:

```ts
// dtos
import { toUserAppDto } from "./user-app.dto";
// modules
import { WEB_APP_STATUSES, TOKEN_ENDPOINT_AUTH_METHODS } from "../constants";

const baseDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "cat1" },
  name: "blog",
  displayName: "Blog",
  description: "A blog",
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_blog",
  clientSecretHash: "secret-hash",
  redirectUris: ["https://blog.example.com/cb"],
  postLogoutRedirectUris: [],
  backchannelLogoutUri: null,
  grantTypes: ["authorization_code"],
  responseTypes: ["code"],
  scopes: ["openid"],
  tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  sortOrder: 1,
  category: { displayName: "Content" },
  createdAt: new Date("2026-03-12T09:24:00.000Z"),
  updatedAt: new Date("2026-05-18T14:02:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("toUserAppDto", () => {
  it("maps the user-facing fields", () => {
    const dto = toUserAppDto(baseDoc);
    expect(dto._id).toBe("app1");
    expect(dto.displayName).toBe("Blog");
    expect(dto.description).toBe("A blog");
    expect(dto.homeUrl).toBe("https://blog.example.com");
    expect(dto.category).toBe("Content");
  });

  it("falls back to null category when not populated", () => {
    const dto = toUserAppDto({ ...baseDoc, category: null });
    expect(dto.category).toBeNull();
  });

  it("excludes clientSecretHash, clientId and all OAuth internals", () => {
    const dto = toUserAppDto(baseDoc) as unknown as Record<string, unknown>;
    expect(dto.clientSecretHash).toBeUndefined();
    expect(dto.clientId).toBeUndefined();
    expect(dto.grantTypes).toBeUndefined();
    expect(dto.scopes).toBeUndefined();
    expect(dto.tokenEndpointAuthMethod).toBeUndefined();
    expect(dto.requiredRoles).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.redirectUris).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testMatch "**/user-app.dto.spec.ts" -i`
Expected: FAIL — cannot find module `./user-app.dto`.

- [ ] **Step 3: Create the DTO**

Create `src/modules/web-app/dtos/user-app.dto.ts`:

```ts
// types
import type { WebAppWithCategory } from "../types";

export interface UserAppDto {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
}

export const toUserAppDto = (doc: WebAppWithCategory): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  category: doc.category?.displayName ?? null
});
```

- [ ] **Step 4: Export from the barrel**

In `src/modules/web-app/dtos/index.ts`, add:

```ts
export * from "./user-app.dto";
```

(Match the existing export style in that file — if it uses named `export { ... } from`, mirror that and export `UserAppDto`, `toUserAppDto`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest --testMatch "**/user-app.dto.spec.ts" -i`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/modules/web-app/dtos/user-app.dto.ts src/modules/web-app/dtos/user-app.dto.spec.ts src/modules/web-app/dtos/index.ts
git commit -m "feat(web-app): add UserAppDto excluding OAuth internals"
```

---

### Task A4: Repository — `findActivePaginated` + `countActive`

**Files:**
- Modify: `src/modules/web-app/repositories/web-app.repository.ts`

- [ ] **Step 1: Extend the repository contract + class**

In `src/modules/web-app/repositories/web-app.repository.ts`:

Add to the type imports:

```ts
import type { FilterQuery } from "mongoose";
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppWithCategory,
  WebAppCategoryDocument
} from "../types";
```

Add two methods to the `WebAppRepository` type:

```ts
export type WebAppRepository = {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    options: { skip: number; limit: number }
  ): Promise<WebAppWithCategory[]>;
  countActive(filter: FilterQuery<WebAppDocument>): Promise<number>;
  existsByName(name: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
};
```

Add the implementations inside `MongoWebAppRepository` (after `findAll`):

```ts
  async findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    { skip, limit }: { skip: number; limit: number }
  ): Promise<WebAppWithCategory[]> {
    return asyncDatabaseHandler("findActivePaginated", () =>
      WebAppModel.find(filter)
        .sort({ sortOrder: 1, displayName: 1 })
        .skip(skip)
        .limit(limit)
        .populate<{ category: WebAppCategoryDocument | null }>({
          path: "category",
          select: "displayName"
        })
        .lean<WebAppWithCategory[]>()
        .exec()
    );
  }

  async countActive(filter: FilterQuery<WebAppDocument>): Promise<number> {
    return asyncDatabaseHandler("countActive", () =>
      WebAppModel.countDocuments(filter).exec()
    );
  }
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/web-app/repositories/web-app.repository.ts
git commit -m "feat(web-app): add findActivePaginated + countActive repo methods"
```

---

### Task A5: Service — `listUserApps` (TDD)

**Files:**
- Modify: `src/modules/web-app/web-app.service.ts`
- Modify: `src/modules/web-app/web-app.service.spec.ts`

- [ ] **Step 1: Write the failing test**

In `src/modules/web-app/web-app.service.spec.ts`, extend `makeRepos()` to include the new repo methods (replace the `webAppRepo` object):

```ts
  const webAppRepo = {
    findAll: jest.fn(),
    findActivePaginated: jest.fn().mockResolvedValue([]),
    countActive: jest.fn().mockResolvedValue(0),
    existsByName: jest.fn().mockResolvedValue(false),
    create: jest.fn()
  };
```

Append a new describe block at the end of the file:

```ts
describe("WebAppService.listUserApps", () => {
  const activeDoc = {
    _id: { toString: () => "app1" },
    displayName: "Blog",
    description: "A blog",
    iconUrl: null,
    homeUrl: "https://blog.example.com",
    category: { displayName: "Content" }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it("forces an ACTIVE-only filter and applies search", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([activeDoc]);
    webAppRepo.countActive.mockResolvedValue(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    await service.listUserApps({ search: "blog" });

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
    expect(filter.$or).toHaveLength(3);
  });

  it("maps docs to UserAppDto and computes pagination meta", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([activeDoc]);
    webAppRepo.countActive.mockResolvedValue(25);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    const result = await service.listUserApps({ page: 2, limit: 12 });

    expect(result.items[0]).toEqual({
      _id: "app1",
      displayName: "Blog",
      description: "A blog",
      iconUrl: null,
      homeUrl: "https://blog.example.com",
      category: "Content"
    });
    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 12,
      totalPages: 3
    });
    const { skip, limit } = webAppRepo.findActivePaginated.mock.calls[0][1];
    expect(skip).toBe(12);
    expect(limit).toBe(12);
  });

  it("clamps limit to MAX_LIMIT and defaults page/limit", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    const result = await service.listUserApps({ limit: 9999 });

    const { skip, limit } = webAppRepo.findActivePaginated.mock.calls[0][1];
    expect(limit).toBe(100);
    expect(skip).toBe(0);
    expect(result.meta.page).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --testMatch "**/web-app.service.spec.ts" -i`
Expected: FAIL — `service.listUserApps is not a function`.

- [ ] **Step 3: Implement `listUserApps`**

In `src/modules/web-app/web-app.service.ts`:

Add to the type imports from `./dtos`:

```ts
import type { AdminAppDto, AdminCategoryDto, AdminAppCreatedDto, UserAppDto } from "./dtos";
```

Add to the value import from `./dtos`:

```ts
import {
  toAdminAppDto,
  toAdminCategoryDto,
  toAdminAppCreatedDto,
  toUserAppDto
} from "./dtos";
```

Add to the `./types` import:

```ts
import type { AdminAppsQuery, AdminAppCreateBody, UserAppsQuery, PaginatedResult } from "./types";
```

Add module-level constants near the top of the file (after imports):

```ts
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
```

Add the method to the `WebAppService` class (after `listApps`):

```ts
  async listUserApps(
    query: UserAppsQuery
  ): Promise<PaginatedResult<UserAppDto>> {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const filter = buildWebAppFilter({ search: query.search, status: "active" });

    const [docs, total] = await Promise.all([
      this.webAppRepo.findActivePaginated(filter, {
        skip: (page - 1) * limit,
        limit
      }),
      this.webAppRepo.countActive(filter)
    ]);

    return {
      items: docs.map(toUserAppDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }
```

`buildWebAppFilter` is already imported from `./helpers`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --testMatch "**/web-app.service.spec.ts" -i`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/modules/web-app/web-app.service.ts src/modules/web-app/web-app.service.spec.ts
git commit -m "feat(web-app): add listUserApps service for active-app catalog"
```

---

### Task A6: Controller + routes + module + loader

**Files:**
- Modify: `src/modules/web-app/web-app.controller.ts`
- Modify: `src/modules/web-app/web-app.routes.ts`
- Modify: `src/modules/web-app/web-app.module.ts`
- Modify: `src/loaders/modules.loader.ts`

- [ ] **Step 1: Add the controller handler**

In `src/modules/web-app/web-app.controller.ts`:

Add `UserAppsQueryRequest` to the `./types` type import:

```ts
import type { AdminAppsQueryRequest, AdminCreateAppRequest, UserAppsQueryRequest } from "./types";
```

Add the handler to the `WebAppController` class (after `listApps`):

```ts
  listUserApps = async (
    req: UserAppsQueryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.listUserApps(req.query);
    new OkSuccess({
      data,
      message: "webApp:success.listApps"
    }).send(req, res);
  };
```

- [ ] **Step 2: Add the user route factory**

In `src/modules/web-app/web-app.routes.ts`, add `listAppsQuerySchema` to the validators import:

```ts
import {
  adminListAppsQuerySchema,
  adminCreateAppBodySchema,
  listAppsQuerySchema
} from "@/validators/schemas/web-app";
```

Append a new factory after `createAdminWebAppRoutes`:

```ts
export const createUserWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const apps = Router();

  apps.use(authGuard);

  apps.get(
    "/",
    queryPipe(listAppsQuerySchema),
    asyncHandler(controller.listUserApps)
  );

  router.use("/apps", apps);
  return router;
};
```

(`authGuard`, `queryPipe`, `asyncHandler`, `Router` are already imported.)

- [ ] **Step 3: Export the user router from the module**

In `src/modules/web-app/web-app.module.ts`, import the new factory and return its router:

```ts
import {
  createAdminWebAppRoutes,
  createUserWebAppRoutes
} from "./web-app.routes";
```

```ts
  return {
    webAppAdminRouter: createAdminWebAppRoutes(controller),
    webAppUserRouter: createUserWebAppRoutes(controller)
  };
```

- [ ] **Step 4: Register in the modules loader**

In `src/loaders/modules.loader.ts`:

Add to the `ModuleRoutes` interface (next to `webAppAdmin: Router;`):

```ts
  webAppUser: Router;
```

Update the destructure of `createWebAppModule()`:

```ts
  const { webAppAdminRouter, webAppUserRouter } = createWebAppModule();
```

Add to the returned routes object (next to `webAppAdmin: webAppAdminRouter`):

```ts
    webAppUser: webAppUserRouter,
```

Mount it in `mountRoutes` (next to `v1Router.use(routes.webAppAdmin);`):

```ts
  v1Router.use(routes.webAppUser);
```

- [ ] **Step 5: Type-check + run the whole module's tests**

Run: `yarn tsc`
Expected: PASS.
Run: `npx jest --testMatch "**/web-app/**/*.spec.ts" -i`
Expected: PASS.

- [ ] **Step 6: Manual smoke (optional but recommended)**

Start the server (`yarn dev`) with Mongo seeded, then with a valid user Bearer token:
Run: `curl -s -H "Authorization: Bearer <token>" "http://localhost:5000/api/v1/apps?page=1&limit=12"`
Expected: `200` with `data.items` (active apps only) + `data.meta`.

- [ ] **Step 7: Commit**

```bash
git add src/modules/web-app/web-app.controller.ts src/modules/web-app/web-app.routes.ts src/modules/web-app/web-app.module.ts src/loaders/modules.loader.ts
git commit -m "feat(web-app): expose user GET /apps (auth-guarded active catalog)"
```

---

### Task A7: Swagger docs for `GET /apps`

**Files:**
- Modify: `src/modules/web-app/swagger/paths.ts`
- Modify: `src/modules/web-app/swagger/schemas.ts`

- [ ] **Step 1: Add the path entry**

In `src/modules/web-app/swagger/paths.ts`, add a new top-level key inside `webAppPaths` (sibling to `"/admin/apps"`):

```ts
  "/apps": {
    get: {
      summary: "List apps (user)",
      description: `
List the active-app catalog for the launcher. Returns every app with \`status=active\`; OAuth internals and secrets are never exposed.

**Authentication:**
- Requires valid Bearer token (any authenticated user)

**Query params:**
- \`page\` — 1-based page number (default 1)
- \`limit\` — page size (default 12, max 100)
- \`search\` — case-insensitive match on name / display name / description
      `.trim(),
      tags: ["Web App"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, example: 1 } },
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, example: 12 } },
        { name: "search", in: "query", required: false, schema: { type: "string", example: "blog" } }
      ],
      responses: {
        "200": {
          description: "Paginated active-app catalog",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserAppsListResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  },
```

- [ ] **Step 2: Add the response schemas**

In `src/modules/web-app/swagger/schemas.ts`, add two entries inside `webAppSwaggerSchemas`:

```ts
  UserAppResponse: {
    type: "object",
    required: ["_id", "displayName", "description", "iconUrl", "homeUrl", "category"],
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      displayName: { type: "string", example: "Satellite Monitor" },
      description: { type: "string", nullable: true, example: "Real-time constellation monitoring dashboard" },
      iconUrl: { type: "string", nullable: true, example: "https://cdn.example.com/icons/monitor.png" },
      homeUrl: { type: "string", example: "https://monitor.example.com" },
      category: { type: "string", nullable: true, example: "Internal Tools" }
    }
  },
  UserAppsListResponse: {
    type: "object",
    required: ["items", "meta"],
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/UserAppResponse" } },
      meta: {
        type: "object",
        required: ["total", "page", "limit", "totalPages"],
        properties: {
          total: { type: "integer", example: 25 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 12 },
          totalPages: { type: "integer", example: 3 }
        }
      }
    }
  },
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/swagger/paths.ts src/modules/web-app/swagger/schemas.ts
git commit -m "docs(web-app): add OpenAPI spec for user GET /apps"
```

---

### Task A8: BE quality gate

- [ ] **Step 1: Run all three checks**

Run: `yarn format && yarn lint && yarn tsc`
Expected: all pass, zero errors. Re-read any files auto-fixed by format/lint and fix remaining issues.

- [ ] **Step 2: Run the full web-app test suite**

Run: `npx jest --testMatch "**/web-app/**/*.spec.ts" -i`
Expected: PASS.

- [ ] **Step 3: Commit any format/lint fixes**

```bash
git add -A
git commit -m "chore(web-app): format + lint fixes" || echo "nothing to commit"
```

---

## Part B — Frontend (`client/`)

### Task B1: `useDebouncedValue` shared hook

**Files:**
- Create: `src/hooks/useDebouncedValue.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useDebouncedValue.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export default useDebouncedValue;
```

- [ ] **Step 2: Add to the hooks barrel**

In `src/hooks/index.ts`, add (matching the existing re-export style):

```ts
export { default as useDebouncedValue } from "./useDebouncedValue";
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDebouncedValue.ts src/hooks/index.ts
git commit -m "feat(hooks): add useDebouncedValue"
```

---

### Task B2: Endpoint constant + Apps types

**Files:**
- Modify: `src/constants/endpoints.ts`
- Create: `src/types/Apps/index.ts`

- [ ] **Step 1: Add the endpoint**

In `src/constants/endpoints.ts`, under the `// App Registry` group, add:

```ts
  APPS: "/apps",
```

(Place it before `ADMIN_APPS` so user + admin app endpoints are grouped.)

- [ ] **Step 2: Create the types**

Create `src/types/Apps/index.ts`:

```ts
export interface UserApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
}

export interface UserAppsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUserAppsResponse {
  items: UserApp[];
  meta: UserAppsMeta;
}

export interface UserAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/constants/endpoints.ts src/types/Apps/index.ts
git commit -m "feat(apps): add /apps endpoint constant and UserApp types"
```

---

### Task B3: Request function

**Files:**
- Create: `src/requests/apps.ts`

- [ ] **Step 1: Create the request**

Create `src/requests/apps.ts`:

```ts
// types
import type {
  UserAppsQueryParams,
  PaginatedUserAppsResponse
} from "@/types/Apps";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getApps = async (
  params?: UserAppsQueryParams
): Promise<PaginatedUserAppsResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedUserAppsResponse>
  >(END_POINTS.APPS, { params });
  return response.data.data;
};
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/requests/apps.ts
git commit -m "feat(apps): add getApps request"
```

---

### Task B4: View-local query hook

**Files:**
- Create: `src/views/Apps/hooks/useApps.ts`

- [ ] **Step 1: Create the hook**

Create `src/views/Apps/hooks/useApps.ts`:

```ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { UserAppsQueryParams } from "@/types/Apps";
import { getApps } from "@/requests/apps";

export const APPS_QUERY_KEY = "apps";

const useApps = (params: UserAppsQueryParams) =>
  useQuery({
    queryKey: [APPS_QUERY_KEY, params],
    queryFn: () => getApps(params),
    placeholderData: keepPreviousData
  });

export default useApps;
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/views/Apps/hooks/useApps.ts
git commit -m "feat(apps): add useApps query hook"
```

---

### Task B5: Launcher card + skeleton

**Files:**
- Create: `src/views/Apps/components/AppCard/index.tsx`
- Create: `src/views/Apps/components/AppCardSkeleton/index.tsx`
- Delete: `src/views/Apps/components/AppManagedCard/index.tsx`

- [ ] **Step 1: Create the launcher card**

Create `src/views/Apps/components/AppCard/index.tsx`:

```tsx
// libs
import { ArrowUpRight } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";
import { Card } from "@/components/ui/card";
// others
import { cn } from "@/libs/utils";

const AppCard = ({
  displayName,
  category,
  description,
  iconUrl,
  homeUrl,
  openLabel
}: {
  displayName: string;
  category: string | null;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  openLabel: string;
}) => {
  const initial = displayName.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <Card
      className="flex flex-col overflow-hidden rounded-xl border p-0"
      aria-labelledby={`apps-${displayName}-title`}
    >
      <div className="flex flex-col gap-3.5 p-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-semibold"
            )}
            aria-hidden="true"
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3
              id={`apps-${displayName}-title`}
              className="text-foreground truncate text-base font-semibold"
            >
              {displayName}
            </h3>
            {category && (
              <span className="text-muted-foreground text-xs font-medium">
                {category}
              </span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <div className="border-border border-t" aria-hidden="true" />
      <div className="flex items-center justify-end px-6 py-3">
        <CustomButton
          size="sm"
          onClick={handleOpen}
          iconRight={<ArrowUpRight className="size-3" aria-hidden="true" />}
          aria-label={`${openLabel} ${displayName}`}
        >
          {openLabel}
        </CustomButton>
      </div>
    </Card>
  );
};

export default AppCard;
```

Note on `<img>`: if `yarn lint` flags `@next/next/no-img-element`, swap to `next/image` with `unoptimized` or add an eslint-disable consistent with how other cards in the codebase render remote icons — check `views/Dashboard/components/AppCard` for the established pattern and match it.

- [ ] **Step 2: Create the skeleton**

Create `src/views/Apps/components/AppCardSkeleton/index.tsx`:

```tsx
// components
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AppCardSkeleton = () => (
  <Card className="flex flex-col overflow-hidden rounded-xl border p-0">
    <div className="flex flex-col gap-3.5 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="border-border border-t" aria-hidden="true" />
    <div className="flex items-center justify-end px-6 py-3">
      <Skeleton className="h-8 w-20" />
    </div>
  </Card>
);

export default AppCardSkeleton;
```

- [ ] **Step 3: Delete the old mock card**

```bash
git rm src/views/Apps/components/AppManagedCard/index.tsx
```

- [ ] **Step 4: Type-check**

Run: `yarn tsc`
Expected: PASS (AppsBoard still imports `AppManagedCard` — this is fixed in B6; if running standalone, expect that one import error and resolve it in B6).

- [ ] **Step 5: Commit**

```bash
git add src/views/Apps/components/AppCard src/views/Apps/components/AppCardSkeleton
git commit -m "feat(apps): add launcher AppCard + skeleton, drop mock card"
```

---

### Task B6: Rewrite `AppsBoard` to use the API

**Files:**
- Modify: `src/views/Apps/mains/AppsBoard/index.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `src/views/Apps/mains/AppsBoard/index.tsx` entirely:

```tsx
"use client";
// libs
import { Filter, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import SearchInput from "@/components/SearchInput";
import CustomPagination from "@/components/CustomPagination";
import AppCard from "../../components/AppCard";
import AppCardSkeleton from "../../components/AppCardSkeleton";
// hooks
import { useAnnounce, useDebouncedValue } from "@/hooks";
// others
import useApps from "../../hooks/useApps";
import { cn } from "@/libs/utils";

const PAGE_SIZE = 12;

const AppsBoard = () => {
  const t = useTranslations("apps");
  const { announce } = useAnnounce();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError } = useApps({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() })
  });
  const items = data?.items ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    announce(t("announce.searchChanged", { count: total }));
  };
  const handleViewChange = (mode: "grid" | "list") => {
    setView(mode);
    announce(t("announce.viewModeChanged", { mode: t(`view.${mode}`) }));
  };
  const handlePageChange = (next: number) => {
    setPage(next);
    announce(t("announce.pageChanged", { page: next }));
  };
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder={t("search.placeholder")}
            ariaLabel={t("search.placeholder")}
            className="w-72"
          />
          <CustomButton
            size="default"
            variant="outline"
            iconLeft={<Filter className="size-4" aria-hidden="true" />}
            className="h-10"
          >
            {t("search.filter")}
          </CustomButton>
        </div>
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label={t("view.grid")}
        >
          <CustomButton
            size="icon"
            aria-label={t("view.grid")}
            aria-pressed={view === "grid"}
            onClick={() => handleViewChange("grid")}
            className={cn(
              "size-10",
              view === "grid"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-background hover:bg-muted text-muted-foreground border"
            )}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </CustomButton>
          <CustomButton
            size="icon"
            aria-label={t("view.list")}
            aria-pressed={view === "list"}
            onClick={() => handleViewChange("list")}
            className={cn(
              "size-10",
              view === "list"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-background hover:bg-muted text-muted-foreground border"
            )}
          >
            <List className="size-4" aria-hidden="true" />
          </CustomButton>
        </div>
      </div>
      <div
        className={cn(
          "grid gap-4",
          view === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        )}
      >
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, idx) => (
              <AppCardSkeleton key={`skeleton-${idx}`} />
            ))
          : items.map((app) => (
              <AppCard
                key={app._id}
                displayName={app.displayName}
                category={app.category}
                description={app.description}
                iconUrl={app.iconUrl}
                homeUrl={app.homeUrl}
                openLabel={t("card.open")}
              />
            ))}
      </div>
      {isError && (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("empty")}
        </p>
      )}
      {meta && total > 0 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label={t("pagination.next")}
        >
          <span className="text-muted-foreground text-sm font-medium">
            {t("pagination.summary", { shown: items.length, total })}
          </span>
          {totalPages > 1 && (
            <CustomPagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </nav>
      )}
    </div>
  );
};

export default AppsBoard;
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/views/Apps/mains/AppsBoard/index.tsx
git commit -m "feat(apps): wire AppsBoard to GET /apps with server pagination"
```

---

### Task B7: i18n locale updates

**Files:**
- Modify: `src/locales/en/apps.json`
- Modify: `src/locales/vi/apps.json`

- [ ] **Step 1: Update the English locale**

Replace `src/locales/en/apps.json` with:

```json
{
  "title": "Apps",
  "description": "Browse and search all available web applications.",
  "search": {
    "placeholder": "Search apps...",
    "filter": "Filters"
  },
  "view": {
    "grid": "Grid view",
    "list": "List view"
  },
  "card": {
    "open": "Open"
  },
  "empty": "No apps found.",
  "error": "Could not load apps. Please try again.",
  "pagination": {
    "summary": "Showing {shown} of {total} apps",
    "previous": "Previous",
    "next": "Next"
  },
  "announce": {
    "viewModeChanged": "View mode changed to {mode}.",
    "pageChanged": "Page {page} loaded.",
    "searchChanged": "{count} apps match the search."
  }
}
```

- [ ] **Step 2: Update the Vietnamese locale**

Replace `src/locales/vi/apps.json` with:

```json
{
  "title": "Ứng dụng",
  "description": "Duyệt và tìm kiếm tất cả ứng dụng web khả dụng.",
  "search": {
    "placeholder": "Tìm ứng dụng...",
    "filter": "Bộ lọc"
  },
  "view": {
    "grid": "Xem dạng lưới",
    "list": "Xem dạng danh sách"
  },
  "card": {
    "open": "Mở"
  },
  "empty": "Không tìm thấy ứng dụng nào.",
  "error": "Không thể tải ứng dụng. Vui lòng thử lại.",
  "pagination": {
    "summary": "Hiển thị {shown} trên {total} ứng dụng",
    "previous": "Trước",
    "next": "Sau"
  },
  "announce": {
    "viewModeChanged": "Đã chuyển sang {mode}.",
    "pageChanged": "Đã tải trang {page}.",
    "searchChanged": "{count} ứng dụng khớp với tìm kiếm."
  }
}
```

- [ ] **Step 3: Type-check (next-intl message typing)**

Run: `yarn tsc`
Expected: PASS. If the project has a generated messages type that flags removed `status`/`card.menu` keys, ensure no other file references `apps.status.*` or `apps.card.menu` (B5/B6 already removed them).

- [ ] **Step 4: Commit**

```bash
git add src/locales/en/apps.json src/locales/vi/apps.json
git commit -m "feat(apps): update locales for launcher list (drop status/menu, add empty/error)"
```

---

### Task B8: Remove the template mock

**Files:**
- Delete: `src/mocks/Apps/index.ts`

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "mocks/Apps\b\|MANAGED_APPS_MOCK\|from \"@/mocks/Apps\"" src` (PowerShell: `Select-String -Path src -Pattern "mocks/Apps|MANAGED_APPS_MOCK" -Recurse`)
Expected: no matches (the old `AppManagedCard` imported `AppStatus` from it — already deleted in B5).

- [ ] **Step 2: Delete the mock**

```bash
git rm src/mocks/Apps/index.ts
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(apps): remove template MANAGED_APPS_MOCK"
```

---

### Task B9: FE quality gate

- [ ] **Step 1: Run all three checks**

Run: `yarn format && yarn lint && yarn tsc`
Expected: all pass, zero errors. Re-read auto-fixed files and resolve remaining issues (esp. the `<img>` lint note from B5).

- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "chore(apps): format + lint fixes" || echo "nothing to commit"
```

---

## Part C — Docs (`docs/`)

### Task C1: Update `project-goals.md` to catalog semantics

**Files:**
- Modify: `project-goals.md`

- [ ] **Step 1: Edit G5 and the App Registry row**

In `project-goals.md`:

1. **G5 — Per-user entitlement** section: change the line
   `- User chỉ thấy + launch được app trong entitlement của mình.`
   to:
   `- Danh sách app ở \`/apps\` hiển thị **catalog tất cả app \`ACTIVE\`** (không lọc theo entitlement). Entitlement điều khiển **quyền launch** (đối chiếu khi mở app) — gating này là follow-up, không lọc danh sách ở vòng này.`

2. **App Registry capability row** (the table row containing `` `GET /apps` (user — chỉ app trong entitlement) ``): change that cell to
   `` `GET /apps` (user — catalog tất cả app `ACTIVE`, auth-guarded) ``
   and update its status from `❌ CHƯA CÓ — MVP-2` to `✅ user list (catalog) đã có / entitlement-gated launch ❌ MVP-2`.

Keep wording consistent with the file's existing Vietnamese style; do not alter other goals.

- [ ] **Step 2: Show the diff for owner review**

Run: `git diff project-goals.md`
Present the diff to the user (owner) and get approval before committing (docs/CLAUDE.md: goals changes are owner-reviewed).

- [ ] **Step 3: Commit (after approval)**

```bash
git add project-goals.md
git commit -m "docs(goals): /apps lists active catalog; entitlement gates launch (follow-up)"
```

---

## Part D — E2E (per CLAUDE.md §4.3)

> Runs **after** implementation + the BE/FE quality gates, **before** `requesting-code-review`. Requires the app running (BE :5000 + FE :3000 + Mongo/Redis seeded). Agent self-checks app-running state first; if not running, asks the user to run it or starts the missing parts itself, then tears down only what it started.

### Task D1: E2E scenario doc + test

**Files:**
- Create: `docs/specs/web-app-user-list/e2e.md` (docs repo)
- Create: `client/e2e/web-app-user-list/apps-list.e2e.ts` (client repo)

- [ ] **Step 1: Write the scenario doc** (`docs/specs/web-app-user-list/e2e.md`): list the cases below.

- [ ] **Step 2: Write the Playwright test** covering:
  - Visiting `/vi/apps` (authenticated via global `auth.setup.ts` storageState) renders app cards from the API (at least one seeded active app).
  - Typing in search filters the grid (network request to `/api/v1/apps?...search=`); clearing restores.
  - If seed yields > 12 apps, pagination control appears and navigating page 2 changes the visible cards.
  - The "Open" button has an accessible name `Open <displayName>` and targets `homeUrl`.
  - Selectors: prefer role/label; fall back to `data-testid`/`input[name]` if DOM lacks associations. Do NOT modify app code from the test — flag any a11y/DOM gap as a follow-up.

- [ ] **Step 3: Run E2E green**

Run (client worktree, app running + seeded): `yarn e2e`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
# docs repo
git add specs/web-app-user-list/e2e.md && git commit -m "docs(web-app-user-list): add E2E scenario"
# client repo
git add e2e/web-app-user-list && git commit -m "test(apps): add /apps list E2E"
```

---

## Self-Review (completed)

- **Spec coverage:** BE endpoint (A1–A7), auth-guard (A6), active-only + search + server pagination (A5), secret exclusion (A3), FE wiring + launcher card + Open→homeUrl + server search/pagination (B2–B6), locales (B7), mock removal (B8), project-goals update (C1), testing/E2E (A3/A5, D1). All design sections map to a task.
- **Placeholder scan:** none — every code step has full content; the only "read the existing pattern" note (B5 `<img>`) points at a concrete file and is gated by the lint run.
- **Type consistency:** `UserAppDto`/`UserApp` fields identical across BE DTO (A3), FE type (B2), swagger (A7). `PaginatedResult.meta` = `{ total, page, limit, totalPages }` consistent across A1/A5/B2 and matches login-history. `findActivePaginated`/`countActive` signatures match between A4 (repo) and A5 (service mock). `listAppsQuerySchema`/`listUserApps`/`createUserWebAppRoutes`/`webAppUserRouter`/`webAppUser` names consistent across A2/A5/A6.
- **Pagination default:** `DEFAULT_LIMIT = 12` (BE A5) == `PAGE_SIZE = 12` (FE B6).

---

## E2E Backfill Plan

> **Mục đích**: backfill suite E2E `web-app-user-list` cho khớp **toàn bộ** `## E2E Scenario Matrix` ở `design.md §6` (12 nhóm rubric đã hợp nhất cả category-filter + EN-locale từ `apps-api-integration`). Suite hiện tại (`client/e2e/web-app-user-list/apps-list.e2e.ts`) đã cover rows 1, 3, 8 (happy / authZ / data-render), một phần 7 (category pill) + một phần 9 (EN render mỏng). Phần backfill: rows **2 (AuthN), 4 (Validation API), 5 (Empty/null), 6 (Boundary — seed-gated), 7 (search+category DT + reset-on-reload), 9 (EN depth), 10 (Error/loading), 12 (a11y keyboard + announcer)**.
>
> **Phương pháp**: TDD, bite-sized — mỗi scenario áp dụng = **một `test()` mới** (one test per applicable scenario). EXTEND file có sẵn, KHÔNG rebuild. Row 11 (mutation safety) = N/A (read-only, không có write). Vị trí trong flow: sau implement + BE/FE quality gates, **trước** `requesting-code-review`; dual-gate §4.3 (gate A `yarn e2e` + gate B MCP walk).
>
> **Tiền đề (app-running, agent tự check 1 lần trước khi dispatch)**: BE :5000 + FE :3000 + Mongo + Redis chạy & seeded (web-app seeder → 5 active app: Blog, Analytics Dashboard, IDMS Portal, Notes, Operations Console; `team-calendar` inactive). Role-scoped: account `user@test.com` (role `user`) thấy **3** app: Blog, IDMS Portal, Notes. Auth qua global `auth.setup.ts` storageState. Worktree → chạy BE/FE alternate port + `E2E_BASE_URL` (xem `e2e.md` Preconditions).
>
> **Selector convention**: ưu tiên role/name (heading `level: 3`, button accessible-name, textbox); KHÔNG sửa app code để test (gặp a11y/DOM gap → flag follow-up). VI labels ở `/vi/apps`, EN labels ở `/apps` (no prefix). i18n strings lấy từ `client/src/locales/{en,vi}/apps.json` (đã verify).

### Task E1: Extend suite — bite-sized scenarios

**File:** EXTEND `client/e2e/web-app-user-list/apps-list.e2e.ts` (client repo). Mỗi checkbox = 1 `test()`. Format: `- [ ] <row#> <name> [technique] — <data> → <expected>`.

#### Đã có (giữ nguyên, không viết lại) — chỉ liệt kê để trace

- [x] 1 Happy path — `/vi/apps` → 200 → Blog/Notes/IDMS Portal headings + nút "Mở" mỗi card (`test: renders only the role-permitted active apps`).
- [x] 3 AuthZ — Analytics Dashboard / Operations Console `toHaveCount(0)` (same test).
- [x] 7 (partial) Category pill — pill thật `aria-pressed=true` + `categoryId=` request; "All" về cache (`test: category pills filter`).
- [x] 8 Data render + Open — heading là `<h3>`, Open → `https://blog.example.com` (`test: Open launches the app homeUrl`).
- [x] 9 (thin) EN render — `/apps` group "Filter by category" + "Open Blog" visible (`test: renders catalog and category group in English`).

#### Backfill — obvious (1 dòng, pattern đã rõ từ test có sẵn)

- [ ] 7 search server-side + clear [EP] — `search="Notes"` → request `search=Notes`, chỉ Notes hiển thị, Blog `toHaveCount(0)`; clear → Blog trở lại. (ĐÃ có test `search filters... and clears` — giữ; xác nhận trace, không nhân bản.)

> Các backfill còn lại NON-OBVIOUS → full Playwright code bên dưới (E1.2–E1.9). Append vào file trong các `test.describe` phù hợp (group VI: `Apps catalog (/vi/apps)`; group EN: `Apps catalog (/apps EN locale)`; group mới `Apps catalog — AuthN / errors / a11y` cho case dùng fresh-context / route-intercept).

##### E1.2 — Row 2 AuthN (fresh-context redirect + API 401) `[EP]`

- [ ] 2 AuthN UI redirect [EP] — no-token (clear cookies + storageState undefined) vào `/vi/apps` → redirect `/login`.
- [ ] 2 AuthN API 401 [EP] — `GET /api/v1/apps/categories` không `Bearer` → 401 (gate A only).

```ts
import { test, expect, request as pwRequest } from "@playwright/test";

// NEW describe block — needs a NON-authenticated context, so it overrides the
// project-level storageState. Cookies on localhost are not port-scoped, so we
// BOTH clear cookies AND drop storageState (lesson: e2e fresh-context auth).
test.describe("Apps catalog — AuthN (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects an unauthenticated user from /vi/apps to /login [EP]", async ({
    page,
    context
  }) => {
    await context.clearCookies();
    await page.goto("/vi/apps");
    // AuthGuardLayout enforces auth client-side → URL settles on the login route.
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /api/v1/apps/categories without a Bearer token returns 401 [EP]", async () => {
    // API-level leg (gate A only): hit the proxy with no Authorization header.
    const apiContext = await pwRequest.newContext({
      baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000"
    });
    const res = await apiContext.get("/api/v1/apps/categories");
    expect(res.status()).toBe(401);
    await apiContext.dispose();
  });
});
```

##### E1.3 — Row 4 Validation (tampered params, API-level) `[EP]`

- [ ] 4 Validation page=abc [EP] — `?page=abc` → 400.
- [ ] 4 Validation limit=0 [EP] — `?limit=0` → 400 (dưới min).
- [ ] 4 Validation limit=101 [EP] — `?limit=101` → 400 (vượt `MAX_LIMIT=100`).
- [ ] 4 Validation status stripped [EP] — `?status=DISABLED` → 200, `stripUnknown` bỏ `status`, server ép ACTIVE (response không vỡ; chỉ ACTIVE apps).

```ts
import { test, expect, request as pwRequest } from "@playwright/test";

// API-level: the UI never builds a bad query (pills emit only valid _id), so
// tampered params are tested directly against the endpoint with a real token.
// Reuse the authenticated storageState to obtain an access token.
test.describe("Apps catalog — query validation (API) [EP]", () => {
  const apiUrl = (q: string) => `/api/v1/apps${q}`;

  test("rejects non-numeric and out-of-range pagination params [EP]", async ({
    request
  }) => {
    // `request` fixture inherits the project storageState → carries auth cookies.
    const pageAbc = await request.get(apiUrl("?page=abc"));
    expect(pageAbc.status()).toBe(400);

    const limitZero = await request.get(apiUrl("?limit=0"));
    expect(limitZero.status()).toBe(400);

    const limitOver = await request.get(apiUrl("?limit=101"));
    expect(limitOver.status()).toBe(400);
  });

  test("strips an unknown status param and forces ACTIVE [EP]", async ({
    request
  }) => {
    // status is NOT a valid query param → stripUnknown drops it; server forces
    // status=ACTIVE. Request must still succeed (200) and return only active apps.
    const res = await request.get(apiUrl("?status=DISABLED"));
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.data.items as Array<{ displayName: string }>;
    // Inactive `team-calendar` must never leak in despite the tampered status.
    expect(items.some((a) => a.displayName === "Team Calendar")).toBe(false);
  });
});
```

> **Lưu ý token**: nếu `request` fixture (kế thừa storageState) KHÔNG tự gắn `Authorization` header (token nằm trong store/localStorage chứ không phải cookie) → các call validation trên có thể trả 401 thay vì 400. Khi implement: nếu gặp 401, đọc access token từ storageState origins (`localStorage` key theo `CONSTANTS.STORAGE`) và set header thủ công qua `request.newContext({ extraHTTPHeaders })`. Verify một lần ở bước chạy đầu tiên rồi chốt cách lấy token.

##### E1.4 — Row 5 Empty / null states

- [ ] 5 Empty no-match — search `"zzzqqq"` → `apps.empty` visible ("Không tìm thấy ứng dụng nào." / "No apps found."), grid rỗng.
- [ ] 5 Null icon fallback — app `iconUrl=null` → render chữ cái đầu (no broken `<img>`); `description=null` → ô mô tả trống, layout không vỡ (`min-h-10`).

```ts
test("shows the empty state when the search matches nothing", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  const search = page.getByRole("textbox", {
    name: /Tìm ứng dụng|Search apps/
  });
  await search.fill("zzzqqq");
  // Debounced server request returns an empty list.
  await page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      r.url().includes("search=zzzqqq") &&
      r.status() === 200
  );

  await expect(page.getByText("Không tìm thấy ứng dụng nào.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Blog", exact: true })
  ).toHaveCount(0);
});

test("renders an initial-letter fallback when an app has no icon (no broken img)", async ({
  page
}) => {
  // Stub the catalog response so one app has iconUrl=null + description=null.
  await page.route("**/api/v1/apps?**", async (route) => {
    const json = {
      timestamp: new Date().toISOString(),
      path: "/api/v1/apps",
      message: "ok",
      data: {
        items: [
          {
            _id: "stub-noicon",
            displayName: "Zephyr",
            description: null,
            iconUrl: null,
            homeUrl: "https://zephyr.example.com",
            category: null
          }
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 }
      }
    };
    await route.fulfill({ json });
  });
  await page.goto("/vi/apps");

  await expect(
    page.getByRole("heading", { level: 3, name: "Zephyr", exact: true })
  ).toBeVisible();
  // No <img> rendered for the null-icon card → the decorative initial "Z" shows.
  await expect(page.locator("img")).toHaveCount(0);
  await expect(page.getByText("Z", { exact: true })).toBeVisible();
});
```

##### E1.5 — Row 6 Boundary / pagination `[BVA]` (seed-gated)

- [ ] 6 Pager hidden single page [BVA] — seed user-visible = 3 (< PAGE_SIZE 12) → `totalPages=1` → `CustomPagination` KHÔNG render; summary "Hiển thị 3 trên 3 ứng dụng" visible.
- [ ] 6 limit boundary API [BVA] — `?limit=1` → 200 (min hợp lệ); `?limit=100` → 200 (max hợp lệ); `?limit=101` → 400 (cover ở E1.3).
- [ ] ⛔ **DEFER** 6 page click-through [BVA] (`page=1` / `last` / `999`) — **lý do**: seed chỉ có 3 app user-visible (< page size 12) nên pager KHÔNG render → không click được trang 2/last/999 trên UI. **No silent cap**: cần seed > 12 app user-visible mới enable; tới lúc đó assert click page 2 đổi card + `page=999` → grid rỗng không crash. Hiện cover biên `limit` ở **tầng API** (E1.3) thay cho biên `page` ở UI.

```ts
test("hides the pager and shows the summary on a single page [BVA]", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  // 3 user-visible apps < PAGE_SIZE (12) → totalPages = 1 → pager not rendered.
  await expect(page.getByText("Hiển thị 3 trên 3 ứng dụng")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^2$/ })
  ).toHaveCount(0);
});

test("accepts limit boundary values at the API [BVA]", async ({ request }) => {
  expect((await request.get("/api/v1/apps?limit=1")).status()).toBe(200);
  expect((await request.get("/api/v1/apps?limit=100")).status()).toBe(200);
  // limit=101 (> MAX_LIMIT) → 400 is asserted in E1.3.
});
```

##### E1.6 — Row 7 search + category combined `[DT]` + reset-on-reload

- [ ] 7 search+category intersection [DT] — chọn pill category + nhập search → grid = giao 2 điều kiện; combo không match → empty.
- [ ] 7 reset on reload — by design state in-memory (no `useSearchParams`) → reload `/vi/apps` → pill "Tất cả" `aria-pressed=true` + search rỗng (KHÔNG deep-link filter).

```ts
test("combines search and category as an intersection [DT]", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      !r.url().includes("/apps/categories") &&
      r.status() === 200
  );

  const group = page.getByRole("group", {
    name: /Lọc theo danh mục|Filter by category/
  });
  const realPill = group.getByRole("button").nth(1);
  await expect(realPill).toBeVisible();

  // Decision table: (category=selected) AND (search=term) → request carries BOTH.
  const combined = page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      r.url().includes("categoryId=") &&
      r.url().includes("search=") &&
      r.status() === 200
  );
  await realPill.click();
  await page.getByRole("textbox", { name: /Tìm ứng dụng|Search apps/ }).fill("Blog");
  await combined;
});

test("resets filter and search on reload (state is in-memory by design)", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  const group = page.getByRole("group", {
    name: /Lọc theo danh mục|Filter by category/
  });
  const allPill = group.getByRole("button").first();
  const search = page.getByRole("textbox", {
    name: /Tìm ứng dụng|Search apps/
  });
  await group.getByRole("button").nth(1).click();
  await search.fill("Notes");

  // No useSearchParams → filter/search are NOT in the URL; a fresh load drops them.
  await page.reload();
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );
  await expect(allPill).toHaveAttribute("aria-pressed", "true");
  await expect(search).toHaveValue("");
});
```

##### E1.7 — Row 9 i18n EN depth

- [ ] 9 EN strings depth — `/apps` (EN) → search placeholder "Search apps...", empty "No apps found." (qua search no-match), pagination summary "Showing {n} of {total} apps", nút "Open {App}", group "Filter by category". Bắt missing-message key (string render đúng, không phải `apps.xxx`).

```ts
// Append inside the existing `Apps catalog (/apps EN locale)` describe.
test("renders EN strings: placeholder, empty, summary, open, group", async ({
  page
}) => {
  await page.goto("/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  // Search placeholder + category group + Open label in English.
  await expect(
    page.getByRole("textbox", { name: "Search apps..." })
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Filter by category" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Blog" })).toBeVisible();

  // Pagination summary string (3 of 3 on the seed) — guards missing-message keys.
  await expect(page.getByText("Showing 3 of 3 apps")).toBeVisible();

  // Empty state in English via a no-match search.
  await page.getByRole("textbox", { name: "Search apps..." }).fill("zzzqqq");
  await page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      r.url().includes("search=zzzqqq") &&
      r.status() === 200
  );
  await expect(page.getByText("No apps found.")).toBeVisible();
});
```

##### E1.8 — Row 10 Error / loading

- [ ] 10 Error 5xx — `page.route` `GET /apps` → 500 (React Query retry **2 lần** cho 5xx → fulfill 500 cả 3 lần; nâng test timeout) → `role="alert"` hiện "Không thể tải ứng dụng. Vui lòng thử lại.".
- [ ] 10 Categories error — `GET /apps/categories` → 500 → pills ẩn (chỉ còn pill "Tất cả") nhưng grid "All" vẫn render app.
- [ ] 10 Loading skeleton — chặn response → trong khi pending, grid hiện `AppCardSkeleton` (skeleton ×12).

```ts
test("shows the error alert when GET /apps fails (5xx + React Query retries)", async ({
  page
}) => {
  // React Query retries 5xx up to 2× (3 attempts total) → fulfill 500 every time.
  // Each retry has backoff → bump the test timeout to absorb all attempts.
  test.setTimeout(30_000);
  await page.route("**/api/v1/apps?**", (route) =>
    route.fulfill({ status: 500, json: { message: "boom" } })
  );
  await page.goto("/vi/apps");

  await expect(
    page.getByRole("alert").filter({ hasText: "Không thể tải ứng dụng" })
  ).toBeVisible({ timeout: 20_000 });
});

test("hides category pills on a categories 5xx but still renders the All grid", async ({
  page
}) => {
  await page.route("**/api/v1/apps/categories**", (route) =>
    route.fulfill({ status: 500, json: { message: "boom" } })
  );
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      !r.url().includes("/apps/categories") &&
      r.status() === 200
  );

  // Categories failed → only the "All" pill remains; the unfiltered grid works.
  const group = page.getByRole("group", { name: /Lọc theo danh mục/ });
  await expect(group.getByRole("button")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 3, name: "Blog", exact: true })
  ).toBeVisible();
});

test("renders skeleton cards while the catalog request is pending", async ({
  page
}) => {
  // Delay the response so the loading branch (AppCardSkeleton grid) is observable.
  let release: () => void;
  const gate = new Promise<void>((res) => (release = res));
  await page.route("**/api/v1/apps?**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/vi/apps");

  // While pending: 12 skeletons render (PAGE_SIZE). Skeletons use the shadcn
  // Skeleton primitive (`data-slot="skeleton"`); assert several are present.
  await expect
    .poll(async () => page.locator('[data-slot="skeleton"]').count())
    .toBeGreaterThan(0);
  release!();
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );
});
```

> **Lưu ý skeleton selector**: `AppCardSkeleton` dùng `Skeleton` của shadcn (`@/components/ui/skeleton`). Xác nhận attribute thực tế khi implement (`data-slot="skeleton"` ở shadcn mới, hoặc class `animate-pulse`); nếu khác → đổi locator cho khớp DOM, KHÔNG sửa app code.

##### E1.9 — Row 12 Accessibility (keyboard + announcer)

- [ ] 12 Keyboard Open — Tab tới nút "Mở Blog" → focus visible → Enter kích hoạt `window.open` (cùng cơ chế stub như test Open có sẵn).
- [ ] 12 Announcer search — sau khi search loaded → live-region `#announcer` chứa `apps.announce.loaded` ("Đã tải {total} ứng dụng.").
- [ ] 12 Announcer category — đổi category → `#announcer` chứa `apps.announce.categoryChanged` ("Đã lọc theo {category}.").

```ts
test("activates Open via keyboard (focus + Enter) [a11y]", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(
        String(url ?? "")
      );
      return null;
    };
  });
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  const openBlog = page.getByRole("button", { name: "Mở Blog" });
  await openBlog.focus();
  await expect(openBlog).toBeFocused();
  await page.keyboard.press("Enter");

  const opened = await page.evaluate(
    () => (window as unknown as { __opened: string[] }).__opened
  );
  expect(opened).toContain("https://blog.example.com");
});

test("announces the loaded count in the live region after data arrives [a11y]", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) => r.url().includes("/api/v1/apps") && r.status() === 200
  );

  // useAnnounce writes into #announcer (aria-live="polite" in the root layout).
  const announcer = page.locator("#announcer");
  await expect(announcer).toContainText(/Đã tải \d+ ứng dụng\./);
});

test("announces the category change in the live region [a11y]", async ({
  page
}) => {
  await page.goto("/vi/apps");
  await page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/apps") &&
      !r.url().includes("/apps/categories") &&
      r.status() === 200
  );

  const realPill = page
    .getByRole("group", { name: /Lọc theo danh mục/ })
    .getByRole("button")
    .nth(1);
  const label = (await realPill.textContent())?.trim() ?? "";
  await realPill.click();

  const announcer = page.locator("#announcer");
  await expect(announcer).toContainText(`Đã lọc theo ${label}.`);
});
```

- [ ] **E1 Step — Run E2E green (gate A)**: client worktree, app running + seeded → `cd client && yarn e2e e2e/web-app-user-list`. Expected: PASS toàn bộ. Nếu fail → `superpowers:systematic-debugging` root-cause → ghi `docs/specs/web-app-user-list/e2e-bugs.md` → fix → chạy lại (max 3 vòng §4.3).

### Task E2: Reconcile `e2e.md` (currently stale)

**File:** UPDATE `docs/specs/web-app-user-list/e2e.md` (docs repo).

> `e2e.md` hiện **stale** — chỉ liệt kê 3 scenario (render / search / Open), **thiếu**: category-pills + EN-locale (vốn ĐÃ tồn tại trong test file) và toàn bộ backfill mới (AuthN / validation / empty-null / boundary / error-loading / a11y). Reconcile 3-artifact theo §4.3: matrix (`design.md §6`) ↔ `e2e.md` ↔ `apps-list.e2e.ts` phải đồng bộ.

- [ ] **E2 Step 1: ADD scenario đã tồn tại trong test mà `e2e.md` thiếu** — mục `## Scenarios`:
  - Category-pills filter (row 7): chọn pill → `categoryId=` request + `aria-pressed=true`; "All" về cache.
  - EN-locale render (row 9): `/apps` group "Filter by category" + "Open Blog" + các string EN (placeholder / empty / summary).
- [ ] **E2 Step 2: ADD backfill scenarios mới** vào `## Scenarios` cho khớp E1: AuthN redirect + API 401 (row 2), tampered-param validation API (row 4), empty no-match + null icon/desc fallback (row 5), boundary limit API + pager-hidden single-page (row 6), search+category combo + reset-on-reload (row 7), error 5xx + categories-error + loading skeleton (row 10), keyboard Open + announcer (row 12).
- [ ] **E2 Step 3: UPDATE `## Notes / follow-ups`** — ghi rõ DEFER page-click pagination (cần seed > 12 user-visible app; hiện cover biên `limit` ở API); ghi rõ fresh-context AuthN (clear cookies + storageState undefined); ghi React Query retry 2× cho 5xx ở error test.
- [ ] **E2 Step 4: Đồng bộ check** — đối chiếu từng row matrix `design.md §6` ↔ scenario `e2e.md` ↔ `test()` trong `apps-list.e2e.ts`; mọi row ✅ áp dụng phải có scenario + test (hoặc DEFER có lý do). KHÔNG update 1 artifact mà bỏ 2 cái còn lại.

### Task E3: Commit (review gate §7 — đợi user duyệt trước commit)

- [ ] **E3 Step**: sau khi gate A (+ gate B MCP walk) PASS, trình diff tổng thể cho user review → duyệt → commit.

```bash
# docs repo (worktree)
git add specs/web-app-user-list/e2e.md
git commit -m "docs(web-app-user-list): reconcile E2E scenario doc with full matrix"
# client repo
git add e2e/web-app-user-list/apps-list.e2e.ts
git commit -m "test(apps): backfill /apps catalog E2E (authN, validation, empty, error, a11y)"
```

### E2E Backfill — Self-Review

- **Matrix coverage**: 12/12 nhóm map: rows 1/3/8 (exists), 2 (E1.2), 4 (E1.3), 5 (E1.4), 6 (E1.5, page-click DEFER có lý do), 7 (E1.6 + search exists), 9 (E1.7 + thin EN exists), 10 (E1.8), 12 (E1.9), 11 N/A (read-only). **No silent gap**.
- **One test per applicable scenario**: mỗi `test()` cover 1 scenario/biên; multi-assert chỉ gom các biến thể cùng kỹ thuật (vd 3 param validation trong 1 `[EP]` test) — đúng skill.
- **Deferred với lý do**: page-click pagination (`page=1/last/999`) DEFER vì seed 3 app < page size 12 → pager không render; cover biên `limit` ở API thay thế; nêu rõ điều kiện enable (seed > 12). Không cap im lặng.
- **Placeholder scan**: không có placeholder; mỗi NON-OBVIOUS có full Playwright code. 2 lưu ý implement (token cho API validation test, skeleton selector) là verify-once gate, không phải code chưa viết.
- **Selector/i18n**: VI/EN strings verify từ `apps.json` (en+vi); selector role/name; không sửa app code (gặp gap → flag). Fresh-context AuthN theo lesson contamination (clearCookies + storageState undefined).
