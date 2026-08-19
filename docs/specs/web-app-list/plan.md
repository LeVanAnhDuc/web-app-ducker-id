# Web-App Registry (Seed + GET API + FE Integration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed `web_app_categories` + `web_apps` into MongoDB, expose read-only `GET /admin/apps` + `GET /admin/apps/categories`, and wire the FE admin apps list to the real API.

**Architecture:** Flesh out the existing `server/src/modules/web-app/` (currently constants/types only) into a full read module mirroring the `contact-admin` admin-list pattern (controller → service → repositories → DTOs → helpers + Joi query validator). A seeder resolves category `_id`s at runtime and bcrypt-hashes confidential client secrets. On the FE, add `requests/adminApps.ts` returning the exact mock shape and swap the two read imports in `views/AdminApps`.

**Tech Stack:** Express 4, Mongoose 8, Joi, i18next, Jest (BE) · Next.js 15, React 19, TanStack Query, Axios (FE).

**Repos (separate git repos):** `server/`, `client/`, `docs/`. Run each commit inside the relevant sub-repo. The monorepo root is **not** a git repo.

**Spec:** `docs/specs/web-app-list/design.md`

---

## Reference patterns (read before starting)

- BE module: `server/src/modules/contact-admin/` (controller, routes, module, repository, service, dtos, helpers, types).
- BE seeder: `server/src/database/seeders/user.seeder.ts` (skip-if-exists + bcrypt) and `contact.seeder.ts` (clear helper).
- BE models (already exist, no change): `server/src/models/web-app.ts`, `web-app-category.ts`.
- BE conventions: `server/.claude/rules/{modules,models,validators,constants,loaders,imports}.md`.
- FE request: `client/src/requests/changePassword.ts`. FE consumers: `client/src/views/AdminApps/mains/{AdminAppsTable,AdminAppsToolbar,AdminAppsFormSheet}/index.tsx`.
- FE conventions: `client/.claude/rules/{constants,imports}.md`.

---

# PHASE A — Backend `web-app` module

### Task A1: Module constants + types

**Files:**
- Modify: `server/src/modules/web-app/constants/index.ts`
- Modify: `server/src/modules/web-app/types/index.ts`

- [ ] **Step 1: Add the public-status map to constants**

Append to `server/src/modules/web-app/constants/index.ts`:

```ts
export const WEB_APP_STATUS_PUBLIC = {
  ACTIVE: "active",
  INACTIVE: "inactive"
} as const;
```

- [ ] **Step 2: Add query + request + public-status types**

Append to `server/src/modules/web-app/types/index.ts` (the file already imports `Schema` and `AuthenticationRole`; add `Request` to the existing `// types` import group and reference `WEB_APP_STATUS_PUBLIC`):

```ts
import type { Request } from "express";
import type { WEB_APP_STATUS_PUBLIC } from "@/modules/web-app/constants";

export type WebAppStatusPublic =
  (typeof WEB_APP_STATUS_PUBLIC)[keyof typeof WEB_APP_STATUS_PUBLIC];

export interface AdminAppsQuery {
  search?: string;
  status?: WebAppStatusPublic;
  categoryId?: string;
}

export interface AdminAppsQueryRequest extends Omit<Request, "query"> {
  query: AdminAppsQuery;
}
```

> Note: `import type { Schema } ...` and the `WEB_APP_STATUSES`/`TOKEN_ENDPOINT_AUTH_METHODS` imports already exist at the top of the file — merge the new `Request` and `WEB_APP_STATUS_PUBLIC` imports into the existing `// types` / module import groups per `server/.claude/rules/imports.md`. Do not duplicate import lines.

- [ ] **Step 3: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd server
git add src/modules/web-app/constants/index.ts src/modules/web-app/types/index.ts
git commit -m "feat(web-app): add public status map and admin query types"
```

---

### Task A2: DTOs + unit tests (TDD)

**Files:**
- Create: `server/src/modules/web-app/dtos/admin-app.dto.ts`
- Create: `server/src/modules/web-app/dtos/admin-category.dto.ts`
- Create: `server/src/modules/web-app/dtos/index.ts`
- Test: `server/src/modules/web-app/dtos/admin-app.dto.spec.ts`

- [ ] **Step 1: Write the failing DTO test**

Create `server/src/modules/web-app/dtos/admin-app.dto.spec.ts`:

```ts
// dtos
import { toAdminAppDto } from "./admin-app.dto";
// modules
import {
  WEB_APP_STATUSES,
  TOKEN_ENDPOINT_AUTH_METHODS
} from "../constants";

const baseDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "cat1" },
  name: "blog",
  displayName: "Blog",
  description: "desc",
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
  createdAt: new Date("2026-03-12T09:24:00.000Z"),
  updatedAt: new Date("2026-05-18T14:02:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("toAdminAppDto", () => {
  it("maps BE status ACTIVE to public 'active'", () => {
    expect(toAdminAppDto(baseDoc).status).toBe("active");
  });

  it("excludes clientSecretHash and OAuth internals", () => {
    const dto = toAdminAppDto(baseDoc) as Record<string, unknown>;
    expect(dto.clientSecretHash).toBeUndefined();
    expect(dto.grantTypes).toBeUndefined();
    expect(dto.scopes).toBeUndefined();
    expect(dto.tokenEndpointAuthMethod).toBeUndefined();
  });

  it("converts ObjectIds and dates to strings", () => {
    const dto = toAdminAppDto(baseDoc);
    expect(dto._id).toBe("app1");
    expect(dto.categoryId).toBe("cat1");
    expect(dto.createdAt).toBe("2026-03-12T09:24:00.000Z");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && yarn test src/modules/web-app/dtos/admin-app.dto.spec.ts`
Expected: FAIL — cannot find module `./admin-app.dto`.

- [ ] **Step 3: Create `admin-app.dto.ts`**

```ts
// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { WebAppDocument, WebAppStatusPublic } from "../types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "../constants";

export interface AdminAppDto {
  _id: string;
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categoryId: string;
  status: WebAppStatusPublic;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export const toAdminAppDto = (doc: WebAppDocument): AdminAppDto => ({
  _id: doc._id.toString(),
  name: doc.name,
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  categoryId: doc.categoryId.toString(),
  status: WEB_APP_STATUS_PUBLIC[doc.status],
  requiredRoles: doc.requiredRoles,
  redirectUris: doc.redirectUris,
  clientId: doc.clientId,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});
```

- [ ] **Step 4: Create `admin-category.dto.ts`**

```ts
// types
import type { WebAppCategoryDocument } from "../types";

export interface AdminCategoryDto {
  _id: string;
  name: string;
  slug: string;
}

export const toAdminCategoryDto = (
  doc: WebAppCategoryDocument
): AdminCategoryDto => ({
  _id: doc._id.toString(),
  name: doc.displayName,
  slug: doc.name
});
```

- [ ] **Step 5: Create `dtos/index.ts` barrel**

```ts
export type { AdminAppDto } from "./admin-app.dto";
export { toAdminAppDto } from "./admin-app.dto";

export type { AdminCategoryDto } from "./admin-category.dto";
export { toAdminCategoryDto } from "./admin-category.dto";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd server && yarn test src/modules/web-app/dtos/admin-app.dto.spec.ts`
Expected: PASS (3 passing).

- [ ] **Step 7: Commit**

```bash
cd server
git add src/modules/web-app/dtos
git commit -m "feat(web-app): add admin app + category DTOs with status/secret mapping"
```

---

### Task A3: Filter helper + unit test (TDD)

**Files:**
- Create: `server/src/modules/web-app/helpers/index.ts`
- Test: `server/src/modules/web-app/helpers/index.spec.ts`

- [ ] **Step 1: Write the failing helper test**

Create `server/src/modules/web-app/helpers/index.spec.ts`:

```ts
// helpers
import { buildWebAppFilter } from "./index";
// modules
import { WEB_APP_STATUSES } from "../constants";

describe("buildWebAppFilter", () => {
  it("maps public status 'active' to BE enum ACTIVE", () => {
    const filter = buildWebAppFilter({ status: "active" });
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
  });

  it("maps public status 'inactive' to BE enum INACTIVE", () => {
    const filter = buildWebAppFilter({ status: "inactive" });
    expect(filter.status).toBe(WEB_APP_STATUSES.INACTIVE);
  });

  it("builds case-insensitive $or search across name, displayName, description", () => {
    const filter = buildWebAppFilter({ search: "blog" });
    expect(filter.$or).toEqual([
      { name: { $regex: "blog", $options: "i" } },
      { displayName: { $regex: "blog", $options: "i" } },
      { description: { $regex: "blog", $options: "i" } }
    ]);
  });

  it("passes categoryId through and returns empty filter when no params", () => {
    expect(buildWebAppFilter({ categoryId: "cat1" }).categoryId).toBe("cat1");
    expect(buildWebAppFilter({})).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && yarn test src/modules/web-app/helpers/index.spec.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Create `helpers/index.ts`**

```ts
// types
import type { FilterQuery } from "mongoose";
import type { AdminAppsQuery, WebAppDocument } from "../types";
// modules
import { WEB_APP_STATUSES } from "../constants";

const PUBLIC_TO_STATUS = {
  active: WEB_APP_STATUSES.ACTIVE,
  inactive: WEB_APP_STATUSES.INACTIVE
} as const;

export const buildWebAppFilter = (
  query: AdminAppsQuery
): FilterQuery<WebAppDocument> => {
  const filter: FilterQuery<WebAppDocument> = {};

  if (query.status) filter.status = PUBLIC_TO_STATUS[query.status];
  if (query.categoryId) filter.categoryId = query.categoryId;

  if (query.search) {
    const searchRegex = { $regex: query.search, $options: "i" };
    filter.$or = [
      { name: searchRegex },
      { displayName: searchRegex },
      { description: searchRegex }
    ];
  }

  return filter;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && yarn test src/modules/web-app/helpers/index.spec.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
cd server
git add src/modules/web-app/helpers
git commit -m "feat(web-app): add web app filter helper with status mapping"
```

---

### Task A4: Repositories

**Files:**
- Create: `server/src/modules/web-app/repositories/web-app.repository.ts`
- Create: `server/src/modules/web-app/repositories/web-app-category.repository.ts`
- Create: `server/src/modules/web-app/repositories/index.ts`

- [ ] **Step 1: Create `web-app.repository.ts`**

```ts
// types
import type { FilterQuery } from "mongoose";
import type { WebAppDocument } from "../types";
// models
import WebAppModel from "@/models/web-app";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type WebAppRepository = {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
};

export class MongoWebAppRepository implements WebAppRepository {
  async findAll(
    filter: FilterQuery<WebAppDocument>
  ): Promise<WebAppDocument[]> {
    return asyncDatabaseHandler("findAll", () =>
      WebAppModel.find(filter)
        .sort({ sortOrder: 1, displayName: 1 })
        .lean<WebAppDocument[]>()
        .exec()
    );
  }
}
```

- [ ] **Step 2: Create `web-app-category.repository.ts`**

```ts
// types
import type { WebAppCategoryDocument } from "../types";
// models
import WebAppCategoryModel from "@/models/web-app-category";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type WebAppCategoryRepository = {
  findAll(): Promise<WebAppCategoryDocument[]>;
};

export class MongoWebAppCategoryRepository
  implements WebAppCategoryRepository
{
  async findAll(): Promise<WebAppCategoryDocument[]> {
    return asyncDatabaseHandler("findAll", () =>
      WebAppCategoryModel.find()
        .sort({ sortOrder: 1, name: 1 })
        .lean<WebAppCategoryDocument[]>()
        .exec()
    );
  }
}
```

- [ ] **Step 3: Create `repositories/index.ts` barrel**

```ts
export type { WebAppRepository } from "./web-app.repository";
export { MongoWebAppRepository } from "./web-app.repository";

export type { WebAppCategoryRepository } from "./web-app-category.repository";
export { MongoWebAppCategoryRepository } from "./web-app-category.repository";
```

- [ ] **Step 4: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd server
git add src/modules/web-app/repositories
git commit -m "feat(web-app): add web app + category repositories"
```

---

### Task A5: Query validator

**Files:**
- Create: `server/src/validators/schemas/web-app.ts`

- [ ] **Step 1: Create the schema**

```ts
// libs
import Joi from "joi";
// types
import type { AdminAppsQuery } from "@/modules/web-app/types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "@/modules/web-app/constants";

const STATUS_VALUES = Object.values(WEB_APP_STATUS_PUBLIC);
const OBJECTID_PATTERN = /^[a-fA-F0-9]{24}$/;

export const adminListAppsQuerySchema: Joi.ObjectSchema<AdminAppsQuery> =
  Joi.object({
    search: Joi.string().trim().optional(),

    status: Joi.string()
      .valid(...STATUS_VALUES)
      .optional()
      .messages({ "any.only": "validation:status.invalid" }),

    categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
      "string.pattern.base": "validation:categoryId.invalid"
    })
  }).options({ stripUnknown: true });
```

- [ ] **Step 2: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd server
git add src/validators/schemas/web-app.ts
git commit -m "feat(web-app): add admin list apps query validator"
```

---

### Task A6: Service

**Files:**
- Create: `server/src/modules/web-app/web-app.service.ts`

- [ ] **Step 1: Create the service**

```ts
// types
import type { AdminAppsQuery } from "./types";
import type {
  WebAppRepository,
  WebAppCategoryRepository
} from "./repositories";
import type { AdminAppDto, AdminCategoryDto } from "./dtos";
// dtos
import { toAdminAppDto, toAdminCategoryDto } from "./dtos";
// others
import { buildWebAppFilter } from "./helpers";

export class WebAppService {
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly categoryRepo: WebAppCategoryRepository
  ) {}

  async listApps(query: AdminAppsQuery): Promise<{ items: AdminAppDto[] }> {
    const filter = buildWebAppFilter(query);
    const docs = await this.webAppRepo.findAll(filter);
    return { items: docs.map(toAdminAppDto) };
  }

  async listCategories(): Promise<AdminCategoryDto[]> {
    const docs = await this.categoryRepo.findAll();
    return docs.map(toAdminCategoryDto);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd server
git add src/modules/web-app/web-app.service.ts
git commit -m "feat(web-app): add web app service (list apps + categories)"
```

---

### Task A7: Controller

**Files:**
- Create: `server/src/modules/web-app/web-app.controller.ts`

- [ ] **Step 1: Create the controller**

```ts
// types
import type { Request, Response } from "express";
import type { WebAppService } from "./web-app.service";
import type { AdminAppsQueryRequest } from "./types";
// common
import { OkSuccess } from "@/common/responses";

export class WebAppController {
  constructor(private readonly service: WebAppService) {}

  listApps = async (
    req: AdminAppsQueryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.listApps(req.query);
    new OkSuccess({
      data,
      message: "webApp:success.listApps"
    }).send(req, res);
  };

  listCategories = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.listCategories();
    new OkSuccess({
      data,
      message: "webApp:success.listCategories"
    }).send(req, res);
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd server
git add src/modules/web-app/web-app.controller.ts
git commit -m "feat(web-app): add web app controller"
```

---

### Task A8: Routes

**Files:**
- Create: `server/src/modules/web-app/web-app.routes.ts`

- [ ] **Step 1: Create the route factory**

```ts
// libs
import { Router } from "express";
// types
import type { WebAppController } from "./web-app.controller";
// validators
import { adminListAppsQuerySchema } from "@/validators/schemas/web-app";
// others
import { adminGuard, authGuard, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createAdminWebAppRoutes = (
  controller: WebAppController
): Router => {
  const router = Router();
  const adminApps = Router();

  adminApps.use(authGuard, adminGuard);

  adminApps.get("/categories", asyncHandler(controller.listCategories));

  adminApps.get(
    "/",
    queryPipe(adminListAppsQuerySchema),
    asyncHandler(controller.listApps)
  );

  router.use("/admin/apps", adminApps);
  return router;
};
```

- [ ] **Step 2: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd server
git add src/modules/web-app/web-app.routes.ts
git commit -m "feat(web-app): add admin web app routes"
```

---

### Task A9: Module factory + loader registration

**Files:**
- Create: `server/src/modules/web-app/web-app.module.ts`
- Modify: `server/src/loaders/modules.loader.ts`

- [ ] **Step 1: Create the module factory**

```ts
// others
import {
  MongoWebAppRepository,
  MongoWebAppCategoryRepository
} from "./repositories";
import { WebAppService } from "./web-app.service";
import { WebAppController } from "./web-app.controller";
import { createAdminWebAppRoutes } from "./web-app.routes";

export const createWebAppModule = () => {
  const webAppRepo = new MongoWebAppRepository();
  const categoryRepo = new MongoWebAppCategoryRepository();
  const service = new WebAppService(webAppRepo, categoryRepo);
  const controller = new WebAppController(service);

  return {
    webAppAdminRouter: createAdminWebAppRoutes(controller)
  };
};
```

- [ ] **Step 2: Register the module import in `modules.loader.ts`**

Add to the `// modules` import group (after the `createContactAdminModule` import):

```ts
import { createWebAppModule } from "@/modules/web-app/web-app.module";
```

- [ ] **Step 3: Add the router to the `ModuleRoutes` interface**

In the `ModuleRoutes` interface, add after `contactAdmin: Router;`:

```ts
  webAppAdmin: Router;
```

- [ ] **Step 4: Mount the route in `mountRoutes`**

In `mountRoutes`, after the `// Contact` block, add:

```ts
  // App Registry
  v1Router.use(routes.webAppAdmin);
```

- [ ] **Step 5: Create the module + pass to `mountRoutes` in `loadModules`**

After the `createContactAdminModule(rateLimiter)` destructure, add:

```ts
  const { webAppAdminRouter } = createWebAppModule();
```

Then in the `mountRoutes(app, { ... })` object, add after `contactAdmin: contactAdminQueryAdminRouter`:

```ts
    webAppAdmin: webAppAdminRouter
```

- [ ] **Step 6: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd server
git add src/modules/web-app/web-app.module.ts src/loaders/modules.loader.ts
git commit -m "feat(web-app): wire web app module into loader"
```

---

# PHASE B — Backend i18n

### Task B1: Add `webApp` success namespace + `categoryId` validation key

**Files:**
- Create: `server/src/i18n/locales/en/webApp.json`
- Create: `server/src/i18n/locales/vi/webApp.json`
- Modify: `server/src/i18n/locales/en/index.ts`
- Modify: `server/src/i18n/locales/vi/index.ts`
- Modify: `server/src/i18n/locales/en/validation.json`
- Modify: `server/src/i18n/locales/vi/validation.json`

- [ ] **Step 1: Create `en/webApp.json`**

```json
{
  "success": {
    "listApps": "Apps retrieved successfully.",
    "listCategories": "Categories retrieved successfully."
  }
}
```

- [ ] **Step 2: Create `vi/webApp.json`**

```json
{
  "success": {
    "listApps": "Lấy danh sách ứng dụng thành công.",
    "listCategories": "Lấy danh sách danh mục thành công."
  }
}
```

- [ ] **Step 3: Register the namespace in both locale `index.ts` files**

Open `server/src/i18n/locales/en/index.ts` and `server/src/i18n/locales/vi/index.ts`. Follow the existing entries exactly: add an import `import webApp from "./webApp.json";` alongside the other namespace imports, and add `webApp` to the exported namespaces object/map (same shape as the existing `contactAdmin` entry).

- [ ] **Step 4: Add `categoryId.invalid` to both `validation.json` files**

In `server/src/i18n/locales/en/validation.json`, add (matching the existing JSON shape used by `status.invalid`):

```json
"categoryId": { "invalid": "Invalid category id." }
```

In `server/src/i18n/locales/vi/validation.json`:

```json
"categoryId": { "invalid": "Mã danh mục không hợp lệ." }
```

> If `status` in `validation.json` is a flat key (e.g. `"status.invalid"`) rather than nested, mirror that exact shape instead — open the file first and match the existing structure so `validation:categoryId.invalid` resolves the same way `validation:status.invalid` does.

- [ ] **Step 5: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd server
git add src/i18n/locales
git commit -m "feat(web-app): add webApp i18n namespace and categoryId validation key"
```

---

# PHASE C — Database seed

### Task C1: Category seed data

**Files:**
- Create: `server/src/database/seeders/data/web-app-categories.ts`

- [ ] **Step 1: Create the data file**

```ts
export const WEB_APP_CATEGORIES = [
  { name: "content", displayName: "Content", icon: null, sortOrder: 1 },
  { name: "tools", displayName: "Internal Tools", icon: null, sortOrder: 2 },
  { name: "identity", displayName: "Identity", icon: null, sortOrder: 3 },
  {
    name: "productivity",
    displayName: "Productivity",
    icon: null,
    sortOrder: 4
  }
] as const;
```

- [ ] **Step 2: Commit**

```bash
cd server
git add src/database/seeders/data/web-app-categories.ts
git commit -m "feat(web-app): add category seed data"
```

---

### Task C2: App seed data

**Files:**
- Create: `server/src/database/seeders/data/web-apps.ts`

- [ ] **Step 1: Create the data file**

```ts
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import {
  WEB_APP_STATUSES,
  TOKEN_ENDPOINT_AUTH_METHODS,
  OAUTH_GRANT_TYPES,
  OAUTH_RESPONSE_TYPES
} from "@/modules/web-app/constants";

const GRANT_TYPES = [
  OAUTH_GRANT_TYPES.AUTHORIZATION_CODE,
  OAUTH_GRANT_TYPES.REFRESH_TOKEN
];
const RESPONSE_TYPES = [OAUTH_RESPONSE_TYPES.CODE];
const SCOPES = ["openid", "profile", "email"];

export const WEB_APPS = [
  {
    categoryName: "content",
    name: "blog",
    displayName: "Blog",
    description: "Internal publishing platform for the constellation.",
    iconUrl: null,
    homeUrl: "https://blog.example.com",
    clientId: "client_blog_8f3a",
    clientSecret: "blog-dev-secret-8f3a",
    redirectUris: [
      "https://blog.example.com/auth/callback",
      "http://localhost:3001/auth/callback"
    ],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 1
  },
  {
    categoryName: "tools",
    name: "analytics-dashboard",
    displayName: "Analytics Dashboard",
    description: "Org-wide metrics and dashboards.",
    iconUrl: null,
    homeUrl: "https://analytics.example.com",
    clientId: "client_analytics_2b7d",
    clientSecret: "analytics-dev-secret-2b7d",
    redirectUris: ["https://analytics.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 2
  },
  {
    categoryName: "identity",
    name: "idms-portal",
    displayName: "IDMS Portal",
    description: "Identity Management System portal — this app.",
    iconUrl: null,
    homeUrl: "https://idms.example.com",
    clientId: "client_idms_core",
    clientSecret: null,
    redirectUris: ["https://idms.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER, AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 3
  },
  {
    categoryName: "productivity",
    name: "team-calendar",
    displayName: "Team Calendar",
    description: "Shared calendar for booking and reminders.",
    iconUrl: null,
    homeUrl: "https://calendar.example.com",
    clientId: "client_calendar_91ce",
    clientSecret: null,
    redirectUris: ["https://calendar.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.INACTIVE,
    sortOrder: 4
  },
  {
    categoryName: "productivity",
    name: "notes",
    displayName: "Notes",
    description: "Personal and shared notes workspace.",
    iconUrl: null,
    homeUrl: "https://notes.example.com",
    clientId: "client_notes_44a9",
    clientSecret: null,
    redirectUris: ["https://notes.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.NONE,
    requiredRoles: [AUTHENTICATION_ROLES.USER],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 5
  },
  {
    categoryName: "tools",
    name: "ops-console",
    displayName: "Operations Console",
    description: "Internal ops tooling — restricted to admin role.",
    iconUrl: null,
    homeUrl: "https://ops.example.com",
    clientId: "client_ops_5e21",
    clientSecret: "ops-dev-secret-5e21",
    redirectUris: ["https://ops.example.com/auth/callback"],
    grantTypes: GRANT_TYPES,
    responseTypes: RESPONSE_TYPES,
    scopes: SCOPES,
    tokenEndpointAuthMethod: TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC,
    requiredRoles: [AUTHENTICATION_ROLES.ADMIN],
    status: WEB_APP_STATUSES.ACTIVE,
    sortOrder: 6
  }
] as const;
```

- [ ] **Step 2: Commit**

```bash
cd server
git add src/database/seeders/data/web-apps.ts
git commit -m "feat(web-app): add web app seed data"
```

---

### Task C3: Seeder + orchestrator wiring

**Files:**
- Create: `server/src/database/seeders/web-app.seeder.ts`
- Modify: `server/src/database/seeders/index.ts`

- [ ] **Step 1: Create `web-app.seeder.ts`**

```ts
// models
import WebAppModel from "@/models/web-app";
import WebAppCategoryModel from "@/models/web-app-category";
// others
import { hashValue } from "@/utils/crypto/bcrypt";
import { WEB_APP_CATEGORIES } from "./data/web-app-categories";
import { WEB_APPS } from "./data/web-apps";
import { Logger } from "@/libs/logger";

export const seedWebApps = async (): Promise<void> => {
  Logger.info("Starting web-app seeding...");

  const categoryIdByName = new Map<string, string>();

  for (const cat of WEB_APP_CATEGORIES) {
    const existing = await WebAppCategoryModel.findOne({ name: cat.name });

    if (existing) {
      categoryIdByName.set(cat.name, existing._id.toString());
      Logger.warn(`Category already exists: ${cat.name}, skipping...`);
      continue;
    }

    const created = await WebAppCategoryModel.create({
      name: cat.name,
      displayName: cat.displayName,
      icon: cat.icon,
      sortOrder: cat.sortOrder
    });

    categoryIdByName.set(cat.name, created._id.toString());
    Logger.info(`Created category: ${cat.name}`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const app of WEB_APPS) {
    const existing = await WebAppModel.findOne({ name: app.name });

    if (existing) {
      Logger.warn(`Web app already exists: ${app.name}, skipping...`);
      skippedCount++;
      continue;
    }

    const categoryId = categoryIdByName.get(app.categoryName);

    if (!categoryId) {
      Logger.warn(
        `Category not found for app ${app.name}: ${app.categoryName}, skipping...`
      );
      skippedCount++;
      continue;
    }

    await WebAppModel.create({
      categoryId,
      name: app.name,
      displayName: app.displayName,
      description: app.description,
      iconUrl: app.iconUrl,
      homeUrl: app.homeUrl,
      clientId: app.clientId,
      clientSecretHash: app.clientSecret ? hashValue(app.clientSecret) : null,
      redirectUris: app.redirectUris,
      grantTypes: app.grantTypes,
      responseTypes: app.responseTypes,
      scopes: app.scopes,
      tokenEndpointAuthMethod: app.tokenEndpointAuthMethod,
      requiredRoles: app.requiredRoles,
      status: app.status,
      sortOrder: app.sortOrder
    });

    Logger.info(`Created web app: ${app.name}`);
    createdCount++;
  }

  Logger.info(
    `Web-app seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`
  );
};

export const clearWebApps = async (): Promise<void> => {
  Logger.info("Clearing seeded web apps...");

  const appNames = WEB_APPS.map((a) => a.name);
  const categoryNames = WEB_APP_CATEGORIES.map((c) => c.name);

  const appResult = await WebAppModel.deleteMany({ name: { $in: appNames } });
  const catResult = await WebAppCategoryModel.deleteMany({
    name: { $in: categoryNames }
  });

  Logger.info(
    `Cleared ${appResult.deletedCount} web apps and ${catResult.deletedCount} categories`
  );
};
```

- [ ] **Step 2: Register the seeder in `seeders/index.ts`**

Add to the imports (after the `contact.seeder` import):

```ts
import { seedWebApps, clearWebApps } from "./web-app.seeder";
```

In the `if (shouldClear)` block, after `await clearContacts();` add:

```ts
      await clearWebApps();
```

In the run section, after `await seedContacts();` add:

```ts
    await seedWebApps();
```

- [ ] **Step 3: Type-check**

Run: `cd server && yarn tsc`
Expected: no errors.

- [ ] **Step 4: Run the seeder against the dev DB**

Run: `cd server && yarn seed`
Expected log lines: `Created category: content` … `Created web app: blog` … `Web-app seeding completed. Created: 6, Skipped: 0`.

- [ ] **Step 5: Re-run to confirm idempotency**

Run: `cd server && yarn seed`
Expected: `Web app already exists: blog, skipping...` … `Created: 0, Skipped: 6`.

- [ ] **Step 6: Commit**

```bash
cd server
git add src/database/seeders/web-app.seeder.ts src/database/seeders/index.ts
git commit -m "feat(web-app): add web app seeder and register in orchestrator"
```

---

### Task C4: BE quality gate

- [ ] **Step 1: Run all three checks**

Run: `cd server && yarn format && yarn lint && yarn tsc && yarn test`
Expected: format/lint clean, tsc no errors, all web-app specs pass.
(If `yarn format`/`yarn lint` auto-fix any web-app files, re-read them and amend the relevant commit.)

---

# PHASE D — Frontend integration

### Task D1: Add endpoints

**Files:**
- Modify: `client/src/constants/endpoints.ts`

- [ ] **Step 1: Add the App Registry endpoints**

In `client/src/constants/endpoints.ts`, after the `// Login History` block (before the closing `};`), add:

```ts
  // App Registry
  ADMIN_APPS: "/admin/apps",
  ADMIN_APP_CATEGORIES: "/admin/apps/categories",
```

- [ ] **Step 2: Commit**

```bash
cd client
git add src/constants/endpoints.ts
git commit -m "feat(admin-apps): add app registry endpoints"
```

---

### Task D2: Request functions

**Files:**
- Create: `client/src/requests/adminApps.ts`

- [ ] **Step 1: Create the request file**

```ts
// types
import type {
  AdminAppsQueryParams,
  WebApp,
  WebAppCategory
} from "@/types/AdminApps";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getAdminApps = async (
  params: AdminAppsQueryParams = {}
): Promise<{ items: WebApp[] }> => {
  const response = await axiosInstance.get<
    ResponsePattern<{ items: WebApp[] }>
  >(END_POINTS.ADMIN_APPS, { params });
  return response.data.data;
};

export const getAdminAppCategories = async (): Promise<WebAppCategory[]> => {
  const response = await axiosInstance.get<ResponsePattern<WebAppCategory[]>>(
    END_POINTS.ADMIN_APP_CATEGORIES
  );
  return response.data.data;
};
```

> `ResponsePattern<T>` is a global type (`client/src/types/common.d.ts`) — no import needed, matching `requests/changePassword.ts` style.

- [ ] **Step 2: Type-check**

Run: `cd client && yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd client
git add src/requests/adminApps.ts
git commit -m "feat(admin-apps): add real GET apps + categories requests"
```

---

### Task D3: Swap read imports in the three consumers

**Files:**
- Modify: `client/src/views/AdminApps/mains/AdminAppsTable/index.tsx`
- Modify: `client/src/views/AdminApps/mains/AdminAppsToolbar/index.tsx`
- Modify: `client/src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`

- [ ] **Step 1: `AdminAppsTable` — move reads to `// requests` group**

In `client/src/views/AdminApps/mains/AdminAppsTable/index.tsx`, replace the current `// others` import that includes the mock:

```tsx
// others
import { getAdminApps, getAdminAppCategories } from "@/mocks/AdminApps";
import { formatDateTimeShort } from "@/utils";
```

with a `// requests` group plus the remaining `// others`:

```tsx
// requests
import { getAdminApps, getAdminAppCategories } from "@/requests/adminApps";
// others
import { formatDateTimeShort } from "@/utils";
```

- [ ] **Step 2: `AdminAppsToolbar` — point categories at requests**

In `client/src/views/AdminApps/mains/AdminAppsToolbar/index.tsx`, replace:

```tsx
// others
import { getAdminAppCategories } from "@/mocks/AdminApps";
```

with:

```tsx
// requests
import { getAdminAppCategories } from "@/requests/adminApps";
```

- [ ] **Step 3: `AdminAppsFormSheet` — split read vs write imports**

In `client/src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`, replace:

```tsx
// others
import {
  createAdminApp,
  getAdminAppCategories,
  updateAdminApp
} from "@/mocks/AdminApps";
```

with:

```tsx
// requests
import { getAdminAppCategories } from "@/requests/adminApps";
// others
import { createAdminApp, updateAdminApp } from "@/mocks/AdminApps";
```

> Place the `// requests` group in the correct position per `client/.claude/rules/imports.md` (requests come before `// others`). Keep `createAdminApp` / `updateAdminApp` on the mock — write endpoints are out of scope this round.

- [ ] **Step 4: Type-check**

Run: `cd client && yarn tsc`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd client
git add src/views/AdminApps/mains/AdminAppsTable/index.tsx src/views/AdminApps/mains/AdminAppsToolbar/index.tsx src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx
git commit -m "feat(admin-apps): wire admin apps reads to real API"
```

---

### Task D4: FE quality gate

- [ ] **Step 1: Run all three checks**

Run: `cd client && yarn format && yarn lint && yarn tsc`
Expected: format/lint clean, tsc no errors.
(If auto-fix touches files, re-read and amend the relevant commit.)

---

# PHASE E — End-to-end verification

### Task E1: Manual verification

- [ ] **Step 1: Ensure DB is seeded**

Run: `cd server && yarn seed` (idempotent — safe to re-run).
Expected: 6 apps + 4 categories present.

- [ ] **Step 2: Start the backend**

Run: `cd server && yarn dev`
Expected: `Modules loaded and routes mounted successfully`.

- [ ] **Step 3: Hit the API with an admin token**

Log in as the seeded admin (`admin@test.com` / `Admin@123`) to obtain an access token, then:

Run: `curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" http://localhost:<PORT>/api/v1/admin/apps`
Expected: `data.items` is an array of 6 apps; each item has `status` lowercase (`active`/`inactive`) and **no** `clientSecretHash` / `grantTypes` / `scopes` field.

Run: `curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" http://localhost:<PORT>/api/v1/admin/apps/categories`
Expected: 4 categories, each `{ _id, name, slug }` (e.g. `{ name: "Content", slug: "content" }`).

Run: `curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" "http://localhost:<PORT>/api/v1/admin/apps?status=inactive"`
Expected: exactly 1 app (`team-calendar`).

- [ ] **Step 4: Verify the FE page**

Run: `cd client && yarn dev`, log in as admin, open `/admin/apps`.
Expected: table renders the 6 seeded apps from the real API; the category filter lists the 4 seeded categories; search and status/category filters update the table (each change re-queries the API).

- [ ] **Step 5: Confirm write path still works on mock**

In `/admin/apps`, open the create/edit sheet and submit.
Expected: optimistic mock create/update still works (unchanged this round); the list re-fetches from the real API afterward.

---

## Self-Review (completed during planning)

- **Spec coverage:** Seed (C1–C3) ✓ · GET list+filter (A2–A8) ✓ · GET categories (A2,A4,A6–A8) ✓ · FE read integration (D1–D3) ✓ · DTO drift mapping incl. secret exclusion (A2) ✓ · status casing mapping (A2 DTO + A3 filter + A5 validator) ✓ · realistic OAuth seed fields (C2) ✓ · admin guard (A8) ✓ · quality gates + manual verify (C4, D4, E1) ✓.
- **Out of scope (not planned, by design):** C/U/D API, entitlements, user `GET /apps`, `views/Apps/` cleanup, pagination.
- **Type consistency:** `WEB_APP_STATUS_PUBLIC` (A1) → used by `toAdminAppDto` (A2), `adminListAppsQuerySchema` (A5); `buildWebAppFilter` (A3) → service (A6); `AdminAppsQuery`/`AdminAppsQueryRequest` (A1) → validator/controller (A5/A7); repo contracts `WebAppRepository`/`WebAppCategoryRepository` (A4) → service (A6); `createWebAppModule` → `webAppAdminRouter` (A9). FE request return shapes (`{ items: WebApp[] }`, `WebAppCategory[]`) match the mock signatures the consumers already expect (D2/D3).
