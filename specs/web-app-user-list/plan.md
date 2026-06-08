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
