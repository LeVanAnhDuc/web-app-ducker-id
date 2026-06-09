# Admin Users List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/admin/users` (paginated, filtered, admin-only) and wire the existing `AdminUsers` FE view from mock to the real API with pagination.

**Architecture:** Extend the existing `user` BE module with an admin route group (mirroring `login-history` admin pattern). The list composes data across three collections via a MongoDB aggregation rooted on `users`: `$lookup` `auths` (role, isActive), `$lookup` `login_histories` (latest successful login → `lastLoginAt`). FE swaps the mock query fn for an axios request and adds URL-driven pagination using the shared `TablePagination` component.

**Tech Stack:** BE — Express + Mongoose aggregation + Joi validation + Jest. FE — Next.js 15 + React Query + axios + shadcn/ui.

**Worktrees (already created on `feat/admin-users-list` from `origin/main`):**
- `server/.worktrees/admin-users-list/` — BE work
- `client/.worktrees/admin-users-list/` — FE work
- `docs/.worktrees/admin-users-list/` — this spec

**Convention sources to read before coding:**
- BE: `server/.claude/CLAUDE.md` + `.claude/rules/{modules,types,validators,models,imports}.md`; skills `module-struct`, `standard-restful-api`, `standard-mongodb`, `standard-doc-api`, `standard-typescript`.
- FE: `client/.claude/CLAUDE.md` + `.claude/rules/{components,constants,imports}.md`; skills `standard-react`, `standard-nextjs`, `standard-tailwind`, `standard-typescript`.

**Drift corrections vs design.md (apply these — design had two inaccuracies):**
1. Validation library is **Joi**, not Zod (design §4.2 said zod).
2. `Authentication.roles` is a **single `String` enum** (`"user"`/`"admin"`), NOT an array. `role` maps directly (`row.role = "$auth.roles"`) — no "includes" logic.
3. Query sort param naming follows project convention: `sortBy` + `sortOrder` (not `order`).

---

## Backend

All BE paths are under `server/.worktrees/admin-users-list/`. Test command in worktree (jest `<rootDir>` glob is broken in worktrees — see memory `reference_jest_worktree_testmatch`):

```bash
cd server/.worktrees/admin-users-list
npx jest --testMatch "**/?(*.)+(spec).ts" <path-substring> -- --runTestsByPath
```
(Simplest reliable form: `npx jest --testMatch "**/?(*.)+(spec).ts" -t "<describe-name>"`.)

### Task 1: BE types for admin users list

**Files:**
- Modify: `server/src/modules/user/types/index.ts`

- [ ] **Step 1: Add types**

Append to `server/src/modules/user/types/index.ts`. Add `AUTHENTICATION_ROLES` to the existing `// modules` type-import area (use `import type`, mirroring login-history's `typeof` pattern):

```ts
// add to the existing top import block (types section)
import type { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
```

```ts
// append at end of file

export type AdminUserRole =
  (typeof AUTHENTICATION_ROLES)[keyof typeof AUTHENTICATION_ROLES];

export type AdminUserStatusFilter = "active" | "locked";

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatusFilter;
  sortBy?: "createdAt" | "fullName" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

export interface AdminUsersFilter {
  search?: string;
  role?: AdminUserRole;
  isActive?: boolean;
}

export interface AdminUserListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// shape returned by the aggregation pipeline (one row per user)
export interface AdminUserAggregateRow {
  _id: Schema.Types.ObjectId;
  fullName: string;
  email: string;
  avatar?: string | null;
  createdAt: Date;
  role: AdminUserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface GetAdminUsersRequest extends Omit<Request, "query"> {
  query: AdminUsersQuery;
}
```

- [ ] **Step 2: Type-check**

Run: `cd server/.worktrees/admin-users-list && yarn tsc`
Expected: PASS (no new errors). `Request` and `Schema` are already imported at top of the file.

- [ ] **Step 3: Commit** (staged only — see commit gate note at end)

```bash
git add src/modules/user/types/index.ts
```

---

### Task 2: Joi query schema + validation i18n key

**Files:**
- Modify: `server/src/validators/schemas/user.ts`
- Modify: i18n validation locale files (find with: `ls server/src/i18n/locales/*/validation.json`)

- [ ] **Step 1: Add the schema**

Append to `server/src/validators/schemas/user.ts`. Add imports to the existing groups:

```ts
// libs  → (Joi already imported)
// modules
import { GENDERS } from "@/modules/user/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// validators
import {
  FULLNAME_VALIDATION,
  SAFE_FULLNAME_PATTERN,
  SAFE_ADDRESS_PATTERN,
  SEARCH_MAX_LENGTH
} from "@/validators/constants";
```

```ts
// append at end of file

const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const STATUS_FILTER_VALUES = ["active", "locked"] as const;
const ADMIN_USERS_SORT_BY = ["createdAt", "fullName", "lastLoginAt"] as const;
const SORT_ORDER_VALUES = ["asc", "desc"] as const;
const LIMIT_MAX = 100;

export const adminUsersQuerySchema = Joi.object({
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
    .messages({ "string.max": "validation:search.invalid" }),

  role: Joi.string()
    .valid(...ROLE_VALUES)
    .optional()
    .messages({ "any.only": "validation:role.invalid" }),

  status: Joi.string()
    .valid(...STATUS_FILTER_VALUES)
    .optional()
    .messages({ "any.only": "validation:status.invalid" }),

  sortBy: Joi.string()
    .valid(...ADMIN_USERS_SORT_BY)
    .optional()
    .messages({ "any.only": "validation:sortBy.invalid" }),

  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortOrder.invalid" })
}).options({ stripUnknown: true });
```

- [ ] **Step 2: Confirm `SEARCH_MAX_LENGTH` export exists**

Run: `grep -n "SEARCH_MAX_LENGTH" server/src/validators/constants.ts`
Expected: a `export const SEARCH_MAX_LENGTH = ...` line (login-history already imports it). If missing, stop and report — do not invent a value.

- [ ] **Step 3: Add `validation:role.invalid` i18n key**

`validation:page.invalid`, `limit.invalid`, `search.invalid`, `status.invalid`, `sortBy.invalid`, `sortOrder.invalid` already exist (used by login-history). Only `role.invalid` is new. For each `server/src/i18n/locales/<lang>/validation.json`, add under the existing keys:

- en: `"role": { "invalid": "Invalid role filter." }`
- vi: `"role": { "invalid": "Vai trò lọc không hợp lệ." }`

(Match the existing nesting style of that file — if keys are flat like `"sortBy.invalid"`, add `"role.invalid"` flat instead. Inspect the file first.)

- [ ] **Step 4: Type-check**

Run: `cd server/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/validators/schemas/user.ts src/i18n/locales
```

---

### Task 3: DTO + unit test

**Files:**
- Create: `server/src/modules/user/dtos/admin-user-item.dto.ts`
- Create: `server/src/modules/user/dtos/admin-user-item.dto.spec.ts`
- Modify: `server/src/modules/user/dtos/index.ts`

- [ ] **Step 1: Write the failing test**

`server/src/modules/user/dtos/admin-user-item.dto.spec.ts`:

```ts
// types
import type { AdminUserAggregateRow } from "@/modules/user/types";
// dtos
import { toAdminUserDto } from "./admin-user-item.dto";

const baseRow = (): AdminUserAggregateRow => ({
  _id: { toString: () => "user1" } as unknown as AdminUserAggregateRow["_id"],
  fullName: "Alice",
  email: "alice@example.com",
  avatar: null,
  createdAt: new Date("2026-01-10T10:00:00.000Z"),
  role: "admin",
  isActive: true,
  lastLoginAt: new Date("2026-05-24T08:12:00.000Z")
});

describe("toAdminUserDto", () => {
  it("maps all fields and serialises dates to ISO strings", () => {
    expect(toAdminUserDto(baseRow())).toEqual({
      _id: "user1",
      fullName: "Alice",
      email: "alice@example.com",
      avatar: null,
      role: "admin",
      isActive: true,
      lastLoginAt: "2026-05-24T08:12:00.000Z",
      createdAt: "2026-01-10T10:00:00.000Z"
    });
  });

  it("returns null lastLoginAt when user never logged in", () => {
    const dto = toAdminUserDto({ ...baseRow(), lastLoginAt: null });
    expect(dto.lastLoginAt).toBeNull();
  });

  it("coerces undefined avatar to null", () => {
    const dto = toAdminUserDto({ ...baseRow(), avatar: undefined });
    expect(dto.avatar).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "toAdminUserDto"`
Expected: FAIL — cannot find `./admin-user-item.dto`.

- [ ] **Step 3: Write the DTO**

`server/src/modules/user/dtos/admin-user-item.dto.ts`:

```ts
// types
import type {
  AdminUserAggregateRow,
  AdminUserRole
} from "@/modules/user/types";

export interface AdminUserDto {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: AdminUserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const toAdminUserDto = (row: AdminUserAggregateRow): AdminUserDto => ({
  _id: row._id.toString(),
  fullName: row.fullName,
  email: row.email,
  avatar: row.avatar ?? null,
  role: row.role,
  isActive: row.isActive,
  lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  createdAt: row.createdAt.toISOString()
});
```

- [ ] **Step 4: Add to barrel**

In `server/src/modules/user/dtos/index.ts`, add:

```ts
export * from "./admin-user-item.dto";
```
(Match the existing export style of that file — if it uses named re-exports, follow suit.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "toAdminUserDto"`
Expected: PASS (3 tests).

- [ ] **Step 6: Stage**

```bash
git add src/modules/user/dtos/admin-user-item.dto.ts src/modules/user/dtos/admin-user-item.dto.spec.ts src/modules/user/dtos/index.ts
```

---

### Task 4: Repository aggregation + unit test

**Files:**
- Modify: `server/src/modules/user/user.repository.ts`
- Create: `server/src/modules/user/user.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

`server/src/modules/user/user.repository.spec.ts` (mocks `UserModel.aggregate`, asserts mapping + pagination passthrough — mirrors existing `*.repository.spec.ts` style):

```ts
jest.mock("@/models/user", () => ({
  __esModule: true,
  default: { aggregate: jest.fn() }
}));

// types
import type { PaginationOptions } from "@/types/common";
// models
import UserModel from "@/models/user";
import { MongoUserRepository } from "./user.repository";

const mockedAggregate = UserModel.aggregate as unknown as jest.Mock;

const options: PaginationOptions = {
  skip: 0,
  limit: 20,
  sort: { createdAt: -1 }
};

describe("MongoUserRepository.findAdminUsers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns data + total from the $facet result", async () => {
    const row = { _id: "u1", fullName: "A", email: "a@e.vn", role: "user" };
    mockedAggregate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([{ data: [row], total: [{ count: 1 }] }])
    });

    const repo = new MongoUserRepository();
    const result = await repo.findAdminUsers({}, options);

    expect(result).toEqual({ data: [row], total: 1 });
  });

  it("returns total 0 when facet count bucket is empty", async () => {
    mockedAggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ data: [], total: [] }])
    });

    const repo = new MongoUserRepository();
    const result = await repo.findAdminUsers({}, options);

    expect(result).toEqual({ data: [], total: 0 });
  });

  it("adds a $match stage for search, role and isActive when filtered", async () => {
    mockedAggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ data: [], total: [] }])
    });

    const repo = new MongoUserRepository();
    await repo.findAdminUsers(
      { search: "ali", role: "admin", isActive: false },
      options
    );

    const pipeline = mockedAggregate.mock.calls[0][0] as Record<
      string,
      unknown
    >[];
    const matchStages = pipeline.filter((s) => "$match" in s);
    // first $match is the filter stage (search/role/status)
    const filterMatch = matchStages[0]["$match"] as Record<string, unknown>;
    expect(filterMatch["auth.roles"]).toBe("admin");
    expect(filterMatch["auth.isActive"]).toBe(false);
    expect(filterMatch.$or).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "findAdminUsers"`
Expected: FAIL — `repo.findAdminUsers is not a function`.

- [ ] **Step 3: Implement the repository method**

In `server/src/modules/user/user.repository.ts`:

Add imports (types group + escapeRegex in others group):
```ts
// types
import type {
  AdminUserAggregateRow,
  AdminUsersFilter
} from "@/modules/user/types";
import type { PaginationOptions } from "@/types/common";
// others
import { escapeRegex } from "@/utils/string/escape-regex";
```

Add to the `UserRepository` type:
```ts
  findAdminUsers(
    filter: AdminUsersFilter,
    options: PaginationOptions
  ): Promise<{ data: AdminUserAggregateRow[]; total: number }>;
```

Add the method to `MongoUserRepository`:
```ts
  async findAdminUsers(
    filter: AdminUsersFilter,
    options: PaginationOptions
  ): Promise<{ data: AdminUserAggregateRow[]; total: number }> {
    return asyncDatabaseHandler("findAdminUsers", async () => {
      const match: Record<string, unknown> = {};
      if (filter.search) {
        const rx = new RegExp(escapeRegex(filter.search), "i");
        match.$or = [{ fullName: rx }, { email: rx }];
      }
      if (filter.role) match["auth.roles"] = filter.role;
      if (typeof filter.isActive === "boolean") {
        match["auth.isActive"] = filter.isActive;
      }

      const [result] = await UserModel.aggregate<{
        data: AdminUserAggregateRow[];
        total: { count: number }[];
      }>([
        {
          $lookup: {
            from: "auths",
            localField: "authId",
            foreignField: "_id",
            as: "auth"
          }
        },
        { $unwind: "$auth" },
        { $match: match },
        {
          $lookup: {
            from: "login_histories",
            let: { authId: "$authId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$authId"] },
                      { $eq: ["$status", "success"] }
                    ]
                  }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, createdAt: 1 } }
            ],
            as: "lastLogin"
          }
        },
        {
          $project: {
            _id: 1,
            fullName: 1,
            email: 1,
            avatar: 1,
            createdAt: 1,
            role: "$auth.roles",
            isActive: "$auth.isActive",
            lastLoginAt: {
              $ifNull: [{ $arrayElemAt: ["$lastLogin.createdAt", 0] }, null]
            }
          }
        },
        {
          $facet: {
            data: [
              { $sort: options.sort },
              { $skip: options.skip },
              { $limit: options.limit }
            ],
            total: [{ $count: "count" }]
          }
        }
      ]).exec();

      return {
        data: result?.data ?? [],
        total: result?.total[0]?.count ?? 0
      };
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "findAdminUsers"`
Expected: PASS (3 tests).

- [ ] **Step 5: Stage**

```bash
git add src/modules/user/user.repository.ts src/modules/user/user.repository.spec.ts
```

---

### Task 5: Service method + unit test

**Files:**
- Modify: `server/src/modules/user/user.service.ts`
- Create: `server/src/modules/user/user.service.spec.ts` (or extend if one exists — check first)

- [ ] **Step 1: Write the failing test**

`server/src/modules/user/user.service.spec.ts`:

```ts
jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireUserId: jest.fn(), requireAuthId: jest.fn() }
}));

// types
import type { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

const buildRepo = (
  over: Partial<UserRepository> = {}
): UserRepository =>
  ({
    findAdminUsers: jest.fn(),
    ...over
  }) as unknown as UserRepository;

describe("UserService.getAdminUsers", () => {
  it("maps rows to DTOs and computes pagination meta", async () => {
    const findAdminUsers = jest.fn().mockResolvedValue({
      data: [
        {
          _id: { toString: () => "u1" },
          fullName: "A",
          email: "a@e.vn",
          avatar: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          role: "user",
          isActive: true,
          lastLoginAt: null
        }
      ],
      total: 25
    });
    const service = new UserService(buildRepo({ findAdminUsers }));

    const result = await service.getAdminUsers({ page: 2, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]._id).toBe("u1");
    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3
    });
    expect(findAdminUsers).toHaveBeenCalledWith(
      {},
      { skip: 10, limit: 10, sort: { createdAt: -1 } }
    );
  });

  it("translates status filter to isActive and defaults sort", async () => {
    const findAdminUsers = jest
      .fn()
      .mockResolvedValue({ data: [], total: 0 });
    const service = new UserService(buildRepo({ findAdminUsers }));

    await service.getAdminUsers({ status: "locked", search: "x", role: "admin" });

    expect(findAdminUsers).toHaveBeenCalledWith(
      { search: "x", role: "admin", isActive: false },
      { skip: 0, limit: 20, sort: { createdAt: -1 } }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "getAdminUsers"`
Expected: FAIL — `service.getAdminUsers is not a function`.

- [ ] **Step 3: Implement the service method**

In `server/src/modules/user/user.service.ts`:

Add imports:
```ts
// types
import type {
  AdminUsersQuery,
  AdminUsersFilter,
  AdminUserListMeta
} from "@/modules/user/types";
// dtos
import { toAdminUserDto } from "./dtos";
import type { AdminUserDto } from "./dtos";
```

Add module-level constants above the class:
```ts
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
```

Add the method to `UserService`:
```ts
  async getAdminUsers(
    query: AdminUsersQuery
  ): Promise<{ items: AdminUserDto[]; meta: AdminUserListMeta }> {
    const {
      page = DEFAULT_PAGE,
      limit: rawLimit = DEFAULT_LIMIT,
      sortBy = "createdAt",
      sortOrder: rawSortOrder,
      search,
      role,
      status
    } = query;

    const limit = Math.min(rawLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = rawSortOrder === "asc" ? 1 : -1;

    const filter: AdminUsersFilter = {
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { isActive: status === "active" } : {})
    };

    const { data, total } = await this.userRepo.findAdminUsers(filter, {
      skip,
      limit,
      sort: { [sortBy]: sortOrder }
    });

    return {
      items: data.map(toAdminUserDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server/.worktrees/admin-users-list && npx jest --testMatch "**/?(*.)+(spec).ts" -t "getAdminUsers"`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git add src/modules/user/user.service.ts src/modules/user/user.service.spec.ts
```

---

### Task 6: Controller + admin routes + module wiring + loader + success i18n

**Files:**
- Modify: `server/src/modules/user/user.controller.ts`
- Modify: `server/src/modules/user/user.routes.ts`
- Modify: `server/src/modules/user/user.module.ts`
- Modify: `server/src/loaders/modules.loader.ts`
- Modify: i18n `server/src/i18n/locales/<lang>/user.json`

- [ ] **Step 1: Controller handler**

In `server/src/modules/user/user.controller.ts`, add the request type to the existing `// types` import and a handler:

```ts
// add GetAdminUsersRequest to the existing type import from "@/modules/user/types"
```
```ts
  getAdminUsers = async (
    req: GetAdminUsersRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getAdminUsers(req.query);
    new OkSuccess({ data, message: "user:success.getAdminUsers" }).send(
      req,
      res
    );
  };
```

- [ ] **Step 2: Admin routes factory**

In `server/src/modules/user/user.routes.ts`:

Add to imports:
```ts
// validators
import {
  updateProfileSchema,
  getPublicProfileSchema,
  adminUsersQuerySchema
} from "@/validators/schemas/user";
// others
import { authGuard, adminGuard, bodyPipe, paramsPipe, queryPipe } from "@/middlewares";
```

Add a new exported factory (keep `createUserRoutes` unchanged):
```ts
export const createUserAdminRoutes = (controller: UserController): Router => {
  const router = Router();
  const adminUsers = Router();

  adminUsers.use(authGuard, adminGuard);

  adminUsers.get(
    "/",
    queryPipe(adminUsersQuerySchema),
    asyncHandler(controller.getAdminUsers)
  );

  router.use("/admin/users", adminUsers);
  return router;
};
```

- [ ] **Step 3: Module wiring**

In `server/src/modules/user/user.module.ts`:
```ts
import { createUserRoutes, createUserAdminRoutes } from "./user.routes";
```
```ts
  return {
    userRouter: createUserRoutes(userController, rateLimiter),
    userAdminRouter: createUserAdminRoutes(userController),
    userService
  };
```

- [ ] **Step 4: Loader wiring**

In `server/src/loaders/modules.loader.ts`:
- Add `userAdmin: Router;` to the `ModuleRoutes` interface (after `user`).
- In `mountRoutes`, under the `// User` group: `v1Router.use(routes.userAdmin);`
- In `loadModules`, destructure: `const { userRouter, userAdminRouter, userService } = createUserModule(rateLimiter);`
- In the `mountRoutes(app, { ... })` object, add: `userAdmin: userAdminRouter,`

- [ ] **Step 5: Add success i18n key**

In each `server/src/i18n/locales/<lang>/user.json`, under `success`:
- en: `"getAdminUsers": "Users retrieved successfully."`
- vi: `"getAdminUsers": "Lấy danh sách người dùng thành công."`

- [ ] **Step 6: Type-check + run full BE suite**

Run: `cd server/.worktrees/admin-users-list && yarn tsc && npx jest --testMatch "**/?(*.)+(spec).ts"`
Expected: tsc PASS; all jest specs pass (incl. Tasks 3–5).

- [ ] **Step 7: Manual smoke (optional, if BE + Mongo running)**

Run: `curl -s -H "Authorization: Bearer <admin-token>" "http://localhost:5000/api/v1/admin/users?page=1&limit=5" | jq .data.meta`
Expected: `{ total, page: 1, limit: 5, totalPages }`.

- [ ] **Step 8: Stage**

```bash
git add src/modules/user/user.controller.ts src/modules/user/user.routes.ts src/modules/user/user.module.ts src/loaders/modules.loader.ts src/i18n/locales
```

---

### Task 7: Compound index for the lastLoginAt lookup

**Files:**
- Modify: `server/src/models/login-history.ts`

- [ ] **Step 1: Add compound index**

In `server/src/models/login-history.ts`, after the schema definition and before `model(...)`, add (alongside existing `.index(...)` declarations):

```ts
LoginHistorySchema.index({ userId: 1, status: 1, createdAt: -1 });
```

This supports the `$lookup` sub-pipeline (`userId == auth._id` + `status: "success"` + `$sort createdAt desc`). Per `.claude/rules/models.md` R5, equality fields (`userId`, `status`) precede the sort field (`createdAt`).

- [ ] **Step 2: Type-check**

Run: `cd server/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 3: Stage**

```bash
git add src/models/login-history.ts
```

---

### Task 8: Swagger docs

**Files:**
- Modify: `server/src/modules/user/swagger/paths.ts`
- Modify: `server/src/modules/user/swagger/schemas.ts`

- [ ] **Step 1: Read the doc skill + existing swagger**

Read `server/.claude/skills/standard-doc-api/SKILL.md` and the existing `server/src/modules/user/swagger/{paths,schemas}.ts` to match style.

- [ ] **Step 2: Add the path + schema**

In `schemas.ts`, add an `AdminUser` schema (fields per `AdminUserDto`) and an `AdminUsersListResponse` (`items` + `meta`). In `paths.ts`, add `GET /admin/users` documenting: bearer auth + admin role, query params (`page`, `limit`, `search`, `role`, `status`, `sortBy`, `sortOrder`), `200` (paginated), `401`, `403`. Mirror the shape of the existing documented paths in this file.

- [ ] **Step 3: Type-check**

Run: `cd server/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 4: Quality gate (BE handover)**

Run: `cd server/.worktrees/admin-users-list && yarn format && yarn lint && yarn tsc`
Expected: all pass, no errors. Re-read any files auto-fixed by format/lint.

- [ ] **Step 5: Stage**

```bash
git add src/modules/user/swagger
```

---

## Frontend

All FE paths are under `client/.worktrees/admin-users-list/`.

### Task 9: FE endpoint constant + types

**Files:**
- Modify: `client/src/constants/endpoints.ts`
- Modify: `client/src/types/AdminUsers/index.ts`

- [ ] **Step 1: Add endpoint**

In `client/src/constants/endpoints.ts`, in the admin group (near `ADMIN_LOGIN_HISTORY`):
```ts
  ADMIN_USERS: "/admin/users",
```

- [ ] **Step 2: Extend types**

In `client/src/types/AdminUsers/index.ts`, add to `AdminUsersQueryParams` and add the response types:

```ts
export interface AdminUsersQueryParams {
  search?: string;
  role?: AuthenticationRole;
  status?: AdminUserStatusFilter;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "fullName" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
}

export interface AdminUsersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedAdminUsersResponse {
  items: AdminUser[];
  meta: AdminUsersMeta;
}
```

- [ ] **Step 3: Type-check**

Run: `cd client/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 4: Stage**

```bash
git add src/constants/endpoints.ts src/types/AdminUsers/index.ts
```

---

### Task 10: FE request function

**Files:**
- Create: `client/src/requests/adminUsers.ts`

- [ ] **Step 1: Write the request**

`client/src/requests/adminUsers.ts` (mirrors `requests/loginHistory.ts` → `getAdminLoginHistory`):

```ts
// types
import type {
  AdminUsersQueryParams,
  PaginatedAdminUsersResponse
} from "@/types/AdminUsers";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getAdminUsers = async (
  params: AdminUsersQueryParams = {}
): Promise<PaginatedAdminUsersResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedAdminUsersResponse>
  >(END_POINTS.ADMIN_USERS, { params });
  return response.data.data;
};
```

- [ ] **Step 2: Type-check**

Run: `cd client/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 3: Stage**

```bash
git add src/requests/adminUsers.ts
```

---

### Task 11: Rewire hook to real API + remove dead mock fn

**Files:**
- Modify: `client/src/views/AdminUsers/hooks/useAdminUsersList.ts`
- Modify: `client/src/mocks/AdminUsers.ts`

- [ ] **Step 1: Rewire the hook**

Replace the mock import + queryFn in `client/src/views/AdminUsers/hooks/useAdminUsersList.ts`:

```ts
// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AdminUsersQueryParams } from "@/types/AdminUsers";
// requests
import { getAdminUsers } from "@/requests/adminUsers";

export const ADMIN_USERS_LIST_QUERY_KEY = "adminUsersList";

const useAdminUsersList = (params: AdminUsersQueryParams) =>
  useQuery({
    queryKey: [ADMIN_USERS_LIST_QUERY_KEY, params],
    queryFn: () => getAdminUsers(params)
  });

export default useAdminUsersList;
```

- [ ] **Step 2: Remove ONLY the now-dead mock function**

In `client/src/mocks/AdminUsers.ts`, remove `getAdminUsersList`, `matchesQuery`, and `matchesStatus` (used only by `getAdminUsersList`). **Keep** `MOCK_USERS`, `getAdminUsers`, `getAdminUserById`, and the mutation mocks (`lockAdminUser`, `unlockAdminUser`, `resetAdminUserPassword`, `forceLogoutAdminUser`) — they are still consumed by `AdminEntitlements` hooks and the AdminUsers mutation hooks (out of scope). Remove now-unused imports (`AdminUserStatusFilter`, `AdminUsersQueryParams`) only if no remaining code in the file references them.

- [ ] **Step 3: Verify no remaining references to the removed fn**

Run: `grep -rn "getAdminUsersList" client/.worktrees/admin-users-list/src`
Expected: only `useAdminUsersList.ts`'s `ADMIN_USERS_LIST_QUERY_KEY`/hook name — NO import of `getAdminUsersList` from the mock. If any other reference appears, stop and report.

- [ ] **Step 4: Type-check**

Run: `cd client/.worktrees/admin-users-list && yarn tsc`
Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/views/AdminUsers/hooks/useAdminUsersList.ts src/mocks/AdminUsers.ts
```

---

### Task 12: Pagination in AdminUsersTable + i18n

**Files:**
- Modify: `client/src/views/AdminUsers/mains/AdminUsersTable/index.tsx`
- Modify: `client/src/locales/en/adminUsers.json`
- Modify: `client/src/locales/vi/adminUsers.json`

- [ ] **Step 1: Add pagination i18n keys**

In `client/src/locales/en/adminUsers.json`, add:
```json
"pagination": { "page": "Page", "of": "of", "results": "users" }
```
In `client/src/locales/vi/adminUsers.json`, add:
```json
"pagination": { "page": "Trang", "of": "/", "results": "người dùng" }
```

- [ ] **Step 2: Wire pagination into the table**

In `client/src/views/AdminUsers/mains/AdminUsersTable/index.tsx`:

Add imports:
```ts
// libs
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
// components
import TablePagination from "@/components/TablePagination";
```

Read `page` from URL and pass into params (in the component body, near the existing searchParams reads):
```ts
  const router = useRouter();
  const pathname = usePathname();
  const page = Number(searchParams.get("page") ?? 1);

  const params: AdminUsersQueryParams = {
    page,
    ...(search && { search }),
    ...(isRole(roleParam) && { role: roleParam }),
    ...(isStatus(statusParam) && { status: statusParam })
  };
```

Add a page-change handler:
```ts
  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(newPage));
    router.push(`${pathname}?${next.toString()}`);
  };
```

Read meta and render the pager right after the closing `</Table>`'s wrapping `<div>` (inside the `bg-card` block, mirroring `AdminLoginHistoryTable`):
```ts
  const tPagination = useTranslations("adminUsers.pagination");
  const meta = data?.meta;
```
```tsx
          </Table>
          <TablePagination
            page={meta?.page ?? page}
            totalPages={meta?.totalPages ?? 1}
            total={meta?.total ?? 0}
            onPageChange={handlePageChange}
            loading={isLoading}
            labels={{
              page: tPagination("page"),
              of: tPagination("of"),
              results: tPagination("results")
            }}
          />
        </div>
```
(`TablePagination` returns `null` when `totalPages <= 1`, so no empty bar on small lists.)

- [ ] **Step 3: Type-check + quality gate (FE handover)**

Run: `cd client/.worktrees/admin-users-list && yarn format && yarn lint && yarn tsc`
Expected: all pass. Re-read any auto-fixed files.

- [ ] **Step 4: Stage**

```bash
git add src/views/AdminUsers/mains/AdminUsersTable/index.tsx src/locales/en/adminUsers.json src/locales/vi/adminUsers.json
```

---

### Task 13: E2E (Playwright) — fixed verification step (CLAUDE.md §4.3)

**Files:**
- Create: `client/e2e/admin-users-list/admin-users-list.e2e.ts`
- Create: `docs/specs/admin-users-list/e2e.md`

- [ ] **Step 1: App-running pre-check**

Verify BE :5000, FE :3000, Mongo, Redis are up and DB seeded (with ≥ a few users + an admin account). If not running, ask the user: (a) they start app + seed and signal ready, or (b) the agent starts the missing parts in background. Per §4.3, if the agent starts services it must tear down only what it started afterward. For a worktree FE, run a dedicated dev server on `--port 3100` with copied `.env.local` and set `E2E_BASE_URL` (memory `reference_e2e_worktree_devserver`).

- [ ] **Step 2: Write the E2E scenario doc**

`docs/specs/admin-users-list/e2e.md`: document scenarios — (1) admin loads `/admin/users`, sees a non-empty table; (2) filter by role=admin narrows rows; (3) search by email narrows rows; (4) pagination control navigates pages when total > limit. Read-only (no mutations) — no data revert needed.

- [ ] **Step 3: Write the test**

`client/e2e/admin-users-list/admin-users-list.e2e.ts` — reuse `client/e2e/helpers/` + global `auth.setup.ts` (admin storageState). Selectors: role/label first; fall back to `input[name=...]`/`data-testid` if DOM lacks associations. Do NOT modify app code from the test — flag any a11y/DOM gap as follow-up.

- [ ] **Step 4: Run E2E**

Run: `cd client && yarn e2e` (against the running app — worktree FE on :3100 via `E2E_BASE_URL` if applicable)
Expected: all admin-users-list specs green.

- [ ] **Step 5: Teardown (only if agent started services)**

Stop only the ports/processes the agent started for the test. Leave anything the user/dev had already running.

- [ ] **Step 6: Stage**

```bash
# in client worktree
git add e2e/admin-users-list/admin-users-list.e2e.ts
# in docs worktree
git add specs/admin-users-list/e2e.md
```

---

## Commit gate (CLAUDE.md §7)

Per project rule, implementer subagents **stage but do NOT commit per-task** (Review ON default). After all tasks complete, the main loop presents the full diff (per repo: server, client, docs) for a single user review, then commits per repo on `feat/admin-users-list`. Do not commit without that approval unless the user opted out of the review gate.

## Post-implementation flow

1. E2E green (Task 13).
2. `superpowers:requesting-code-review` — review BE tasks against BE conventions, FE tasks against FE conventions.
3. `security-auditor` if the diff warrants (admin data exposure — confirm `adminGuard` + no over-fetch of sensitive auth fields like password hashes; the `$project` deliberately excludes them).
4. `superpowers:finishing-a-development-branch` → `creating-github-pr` (separate PR per touched repo: server, client, docs).

---

## Self-Review

**Spec coverage** (design.md → task):
- `GET /admin/users` route + guards → Task 6. ✅
- Query params + Joi validation → Task 2. ✅
- Aggregation (auths + login_histories) → Task 4. ✅
- role mapping (corrected: single string) → Task 3/4. ✅
- DTO shape == FE `AdminUser` → Task 3. ✅
- Pagination response `{items, meta}` → Tasks 5 (BE), 9 (FE types). ✅
- Index for lastLoginAt → Task 7. ✅
- Swagger → Task 8. ✅
- FE endpoint/request/hook rewire → Tasks 9–11. ✅
- FE pager UI → Task 12. ✅
- E2E → Task 13. ✅
- Drift #1 (Joi) #2 (single role) #3 (sortBy/sortOrder) → corrected in header + tasks. ✅

**Type consistency:** `AdminUsersQuery`/`AdminUsersFilter`/`AdminUserAggregateRow`/`AdminUserListMeta` (BE types, Task 1) are used consistently in Tasks 3–6. `AdminUserDto` (Task 3) returned by service (Task 5). FE `PaginatedAdminUsersResponse`/`AdminUsersMeta` (Task 9) consumed by request (Task 10), hook (Task 11), table (Task 12). `findAdminUsers(filter, options)` signature identical across repo type, impl, service call, and test. ✅

**Placeholder scan:** No TBD/TODO; all code blocks complete. Swagger (Task 8) is the one descriptive task — it references reading the doc skill + existing file to match an established in-repo pattern rather than inventing a spec format, which is appropriate. ✅
