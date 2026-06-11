# Notifications API + Seed + UI Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing notification UI (page + header panel/badge) to a real user-scoped notifications API with pagination (load-more), mark-single-read, mark-all-read, an unread badge, and seed data.

**Architecture:** BE completes the `notification` module (controller/routes/service/repository/dtos/helpers/validator) mirroring the `login-history` sibling; user-scoped by `RequestContext.requireUserId()` (= JWT `sub` = `User._id`, matching `notification.userId` `ref: USER`). FE replaces mock data with React Query (`useInfiniteQuery` for load-more + mutations) and a `date-fns` relative timestamp. Notification `title`/`message` are stored literal and rendered verbatim; only chrome is i18n.

**Tech Stack:** Express + Mongoose + Joi (BE) · Next.js 15 + React Query + date-fns + next-intl (FE) · Jest (BE tests) · Playwright (E2E).

**Worktrees (already created from `origin/main`, branch `feat/notifications-api`):** `server/.worktrees/notifications-api`, `client/.worktrees/notifications-api`, `docs/.worktrees/notifications-api`. All BE paths below are relative to the server worktree; FE paths to the client worktree.

---

## Critical contract notes (read before starting)

- **User scoping**: `notification.userId` references the `User` model. Use `RequestContext.requireUserId()` (JWT `sub`) everywhere — NOT `requireAuthId()`. Seed notifications with `User._id`. (login-history's use of `requireAuthId` is a misnamed-field special case; do not copy it here.)
- **Pagination shape**: BE returns `{ items, meta: { total, page, limit, totalPages } }` inside `data` (login-history style), NOT the global `meta.pagination`.
- **Content i18n**: `title`/`message` are literal DB strings rendered verbatim. Do not translate body text.
- **Mark single fires in a click handler**, never in an effect.

---

## File Structure

**BE — `server/src/`**
- Modify `modules/notification/constants/index.ts` — add `NOTIFICATION_PAGINATION`.
- Modify `modules/notification/types/index.ts` — add query/filter/result/request types.
- Create `modules/notification/dtos/notification-item.dto.ts` + `dtos/index.ts`.
- Create `modules/notification/helpers/index.ts` — `buildNotificationFilter`.
- Create `modules/notification/notification.repository.ts`.
- Create `modules/notification/notification.service.ts`.
- Create `modules/notification/notification.controller.ts`.
- Create `modules/notification/notification.routes.ts`.
- Create `modules/notification/notification.module.ts`.
- Modify `loaders/modules.loader.ts` — register module + mount routes.
- Create `validators/schemas/notification.ts`.
- Modify `constants/error-code.ts` — add `NOTIFICATION_NOT_FOUND`.
- Modify `i18n/locales/{en,vi}/validation.json` — add `isRead` key.
- Create `i18n/locales/{en,vi}/notification.json` + register in `i18n/locales/{en,vi}/index.ts`.
- Create `database/seeders/data/notifications.ts` + `database/seeders/notification.seeder.ts`; modify `database/seeders/index.ts`.
- Tests: `modules/notification/notification.service.spec.ts`.

**FE — `client/src/`**
- Modify `constants/endpoints.ts`, `constants/queryKeys.ts`.
- Modify `types/Notification/index.ts` — add API types.
- Create `requests/notification.ts`.
- Create `dataSources/Notifications/index.ts` — `type → icon/colors`.
- Create `views/Notifications/hooks/useNotifications.ts`, `useUnreadCount.ts`, `useMarkNotificationRead.ts`, `useMarkAllRead.ts`.
- Rewrite `views/Notifications/index.tsx`, `mains/NotificationList/index.tsx`, `mains/PageHeader/index.tsx`, `components/NotificationItem/index.tsx`.
- Rewrite `layouts/AppHeader/components/NotificationPanel/index.tsx` + modify `layouts/AppHeader/index.tsx`.
- Modify `locales/en/notifications.json` + `locales/vi/notifications.json` — add `actions.markRead`, `states.*`, `announce.*`.
- Remove `NOTIFICATIONS_MOCK` from `mocks/Dashboard/index.ts` (and `mocks/Notifications/index.ts` if unused).
- E2E: `e2e/notifications/notifications.e2e.ts` + helper `e2e/helpers/notifications.ts`.

---

# PHASE A — Backend (server worktree)

> Run BE checks after each task group: `yarn format && yarn lint && yarn tsc`. Jest in a worktree needs an explicit testMatch (see [[reference_jest_worktree_testmatch]]): `npx jest --testMatch "**/?(*.)+(spec).ts" <path>`.

### Task A1: Module constants

**Files:** Modify `modules/notification/constants/index.ts`

- [ ] **Step 1: Append pagination constants**

```ts
export const NOTIFICATION_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task A2: Error code

**Files:** Modify `constants/error-code.ts`

- [ ] **Step 1:** Add a `// ── Notification ──` group marker (if absent) and entry:

```ts
  // ── Notification ──
  NOTIFICATION_NOT_FOUND: "NOTIFICATION_NOT_FOUND",
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task A3: Types

**Files:** Modify `modules/notification/types/index.ts`

- [ ] **Step 1: Append** (keep the existing `NotificationType`/`NotificationDocument`):

```ts
// types
import type { Request } from "express";

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  sortOrder?: "asc" | "desc";
}

export interface NotificationFilter {
  userId: string;
  isRead?: boolean;
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

export interface NotificationListRequest extends Omit<Request, "query"> {
  query: NotificationListQuery;
}

export interface NotificationIdParams {
  id: string;
}

export interface NotificationIdRequest extends Omit<Request, "params"> {
  params: NotificationIdParams;
}
```

> Note: the existing `import type { Schema } from "mongoose"` line stays; add the `express` import in the `// types` group per `.claude/rules/imports.md`.

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task A4: Validator schema

**Files:** Create `validators/schemas/notification.ts`

- [ ] **Step 1: Write the schema** (reuse existing `validation:page/limit/sortOrder` keys; add `isRead`):

```ts
// libs
import Joi from "joi";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";

const LIMIT_MAX = 100;
const SORT_ORDER_VALUES = ["asc", "desc"] as const;

export const notificationListQuerySchema = Joi.object({
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
  isRead: Joi.boolean().optional().messages({
    "boolean.base": "validation:isRead.invalid"
  }),
  sortOrder: Joi.string()
    .valid(...SORT_ORDER_VALUES)
    .optional()
    .messages({ "any.only": "validation:sortOrder.invalid" })
}).options({ stripUnknown: true });

export const notificationIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.pattern.base": "validation:id.invalid",
    "any.required": "validation:id.invalid"
  })
});
```

- [ ] **Step 2:** Verify `OBJECTID_PATTERN` exists in `validators/constants.ts` (it is used by `login-history.ts`). If `validation:id.invalid` is absent, it is added in Task A5.

- [ ] **Step 3: Verify** — `yarn tsc` passes.

---

### Task A5: i18n keys

**Files:** Modify `i18n/locales/en/validation.json`, `i18n/locales/vi/validation.json`; create `i18n/locales/{en,vi}/notification.json`; modify `i18n/locales/{en,vi}/index.ts`

- [ ] **Step 1:** Add to `validation.json` (en) — and `vi` equivalents:

```json
  "isRead": { "invalid": "isRead must be a boolean" },
  "id": { "invalid": "Invalid identifier" }
```

(vi: `"isRead": { "invalid": "isRead phải là giá trị boolean" }`, `"id": { "invalid": "Định danh không hợp lệ" }` — only add `id` if not already present.)

- [ ] **Step 2:** Create `i18n/locales/en/notification.json`:

```json
{
  "success": {
    "list": "Notifications fetched successfully",
    "unreadCount": "Unread count fetched successfully",
    "markRead": "Notification marked as read",
    "markAllRead": "All notifications marked as read"
  },
  "errors": {
    "notFound": "Notification not found"
  }
}
```

And `i18n/locales/vi/notification.json` (Vietnamese translations of the same keys).

- [ ] **Step 3:** Register the namespace in `i18n/locales/en/index.ts` and `vi/index.ts` following the existing `webApp` import pattern (`import notification from "./notification.json"` + add `notification` to the exported resources object).

- [ ] **Step 4: Verify** — `yarn tsc` passes; app boot (`yarn dev`) shows no i18n load error.

---

### Task A6: DTO

**Files:** Create `modules/notification/dtos/notification-item.dto.ts`, `modules/notification/dtos/index.ts`

- [ ] **Step 1:** `notification-item.dto.ts`:

```ts
// types
import type { NotificationDocument, NotificationType } from "@/modules/notification/types";

export interface NotificationItemDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const toNotificationItemDto = (
  doc: NotificationDocument
): NotificationItemDto => ({
  id: doc._id.toString(),
  type: doc.type,
  title: doc.title,
  message: doc.message,
  meta: doc.meta,
  isRead: doc.isRead,
  readAt: doc.readAt ? doc.readAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString()
});
```

- [ ] **Step 2:** `dtos/index.ts`:

```ts
export { toNotificationItemDto } from "./notification-item.dto";
export type { NotificationItemDto } from "./notification-item.dto";
```

- [ ] **Step 3: Verify** — `yarn tsc` passes.

---

### Task A7: Helper

**Files:** Create `modules/notification/helpers/index.ts`

- [ ] **Step 1:**

```ts
// types
import type { NotificationFilter, NotificationListQuery } from "@/modules/notification/types";

export const buildNotificationFilter = (
  query: NotificationListQuery,
  userId: string
): NotificationFilter => {
  const filter: NotificationFilter = { userId };
  if (query.isRead !== undefined) filter.isRead = query.isRead;
  return filter;
};
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task A8: Repository

**Files:** Create `modules/notification/notification.repository.ts`

- [ ] **Step 1:**

```ts
// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type {
  NotificationDocument,
  NotificationFilter
} from "@/modules/notification/types";
import type { PaginationOptions } from "@/types/common";
// models
import NotificationModel from "@/models/notification";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type NotificationRepository = {
  findByUser(
    filter: NotificationFilter,
    options: PaginationOptions
  ): Promise<{ data: NotificationDocument[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<NotificationDocument | null>;
  markAllRead(userId: string): Promise<number>;
};

export class MongoNotificationRepository implements NotificationRepository {
  async findByUser(
    filter: NotificationFilter,
    options: PaginationOptions
  ): Promise<{ data: NotificationDocument[]; total: number }> {
    return asyncDatabaseHandler("findByUser", async () => {
      const mongoFilter = this.toMongoFilter(filter);
      const [data, total] = await Promise.all([
        NotificationModel.find(mongoFilter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        NotificationModel.countDocuments(mongoFilter).exec()
      ]);
      return { data: data as unknown as NotificationDocument[], total };
    });
  }

  async countUnread(userId: string): Promise<number> {
    return asyncDatabaseHandler("countUnread", async () =>
      NotificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false
      }).exec()
    );
  }

  async markRead(
    id: string,
    userId: string
  ): Promise<NotificationDocument | null> {
    return asyncDatabaseHandler("markRead", async () => {
      const doc = await NotificationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      )
        .lean()
        .exec();
      return (doc as unknown as NotificationDocument) ?? null;
    });
  }

  async markAllRead(userId: string): Promise<number> {
    return asyncDatabaseHandler("markAllRead", async () => {
      const res = await NotificationModel.updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      ).exec();
      return res.modifiedCount;
    });
  }

  private toMongoFilter(
    filter: NotificationFilter
  ): FilterQuery<NotificationDocument> {
    const mongo: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(filter.userId)
    };
    if (filter.isRead !== undefined) mongo.isRead = filter.isRead;
    return mongo;
  }
}
```

- [ ] **Step 2:** Confirm `PaginationOptions` is exported from `@/types/common` (login-history imports it from there). If not, define `{ skip: number; limit: number; sort: Record<string, 1 | -1> }` locally in module types instead and import that.

- [ ] **Step 3: Verify** — `yarn tsc` passes.

---

### Task A9: Service (TDD)

**Files:** Create `modules/notification/notification.service.ts`, test `modules/notification/notification.service.spec.ts`

- [ ] **Step 1: Write the failing test** (mock the repository; assert pagination math, isRead passthrough, ownership 404, mark-all):

```ts
// libs
import { NotFoundError } from "@/common/exceptions";
// modules
import { NotificationService } from "./notification.service";
import { RequestContext } from "@/utils/request-context";

const baseDoc = {
  _id: { toString: () => "n1" },
  type: "SYSTEM_ANNOUNCEMENT",
  title: "T",
  message: "M",
  meta: null,
  isRead: false,
  readAt: null,
  createdAt: new Date("2026-06-09T00:00:00Z")
};

const makeRepo = () => ({
  findByUser: jest.fn().mockResolvedValue({ data: [baseDoc], total: 1 }),
  countUnread: jest.fn().mockResolvedValue(3),
  markRead: jest.fn().mockResolvedValue(baseDoc),
  markAllRead: jest.fn().mockResolvedValue(2)
});

describe("NotificationService", () => {
  const USER = "507f1f77bcf86cd799439011";
  beforeEach(() => {
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
  });
  afterEach(() => jest.restoreAllMocks());

  it("returns paginated items with meta", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    const res = await svc.list({ page: 1, limit: 20 });
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(res.items[0].id).toBe("n1");
    expect(repo.findByUser).toHaveBeenCalledWith(
      { userId: USER },
      { skip: 0, limit: 20, sort: { createdAt: -1 } }
    );
  });

  it("passes isRead filter through", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    await svc.list({ isRead: false });
    expect(repo.findByUser).toHaveBeenCalledWith(
      { userId: USER, isRead: false },
      expect.anything()
    );
  });

  it("returns unread count", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    expect(await svc.unreadCount()).toEqual({ count: 3 });
  });

  it("throws NotFound when marking a foreign/missing id", async () => {
    const repo = makeRepo();
    repo.markRead.mockResolvedValue(null);
    const svc = new NotificationService(repo);
    await expect(svc.markRead("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("marks all read", async () => {
    const repo = makeRepo();
    const svc = new NotificationService(repo);
    expect(await svc.markAllRead()).toEqual({ updated: 2 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/notification` → fails (no `NotificationService`).

- [ ] **Step 3: Implement service:**

```ts
// types
import type { NotificationRepository } from "./notification.repository";
import type {
  NotificationListQuery,
  PaginatedResult
} from "@/modules/notification/types";
import type { NotificationItemDto } from "./dtos";
// common
import { NotFoundError } from "@/common/exceptions";
// modules
import { NOTIFICATION_PAGINATION } from "@/modules/notification/constants";
// dtos
import { toNotificationItemDto } from "./dtos";
// helpers
import { buildNotificationFilter } from "./helpers";
// others
import { RequestContext } from "@/utils/request-context";
import { ERROR_CODES } from "@/constants/error-code";

const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = NOTIFICATION_PAGINATION;

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async list(
    query: NotificationListQuery
  ): Promise<PaginatedResult<NotificationItemDto>> {
    const userId = RequestContext.requireUserId();
    const page = query.page ?? DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;

    const filter = buildNotificationFilter(query, userId);
    const { data, total } = await this.repo.findByUser(filter, {
      skip,
      limit,
      sort: { createdAt: sortOrder }
    });

    return {
      items: data.map(toNotificationItemDto),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async unreadCount(): Promise<{ count: number }> {
    const userId = RequestContext.requireUserId();
    return { count: await this.repo.countUnread(userId) };
  }

  async markRead(id: string): Promise<NotificationItemDto> {
    const userId = RequestContext.requireUserId();
    const doc = await this.repo.markRead(id, userId);
    if (!doc) {
      throw new NotFoundError({
        i18nMessage: (t) => t("notification:errors.notFound"),
        code: ERROR_CODES.NOTIFICATION_NOT_FOUND
      });
    }
    return toNotificationItemDto(doc);
  }

  async markAllRead(): Promise<{ updated: number }> {
    const userId = RequestContext.requireUserId();
    return { updated: await this.repo.markAllRead(userId) };
  }
}
```

- [ ] **Step 4: Run, expect PASS.** Confirm `NotFoundError` is exported from `@/common/exceptions`.

- [ ] **Step 5: Commit (Review OFF only — see gate note at end).**

---

### Task A10: Controller

**Files:** Create `modules/notification/notification.controller.ts`

- [ ] **Step 1:**

```ts
// types
import type { Response } from "express";
import type {
  NotificationListRequest,
  NotificationIdRequest
} from "@/modules/notification/types";
import type { NotificationService } from "./notification.service";
// common
import { OkSuccess } from "@/common/responses";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list = async (req: NotificationListRequest, res: Response): Promise<void> => {
    const data = await this.service.list(req.query);
    new OkSuccess({ data, message: "notification:success.list" }).send(req, res);
  };

  unreadCount = async (
    req: NotificationListRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.unreadCount();
    new OkSuccess({ data, message: "notification:success.unreadCount" }).send(
      req,
      res
    );
  };

  markRead = async (
    req: NotificationIdRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.markRead(req.params.id);
    new OkSuccess({ data, message: "notification:success.markRead" }).send(
      req,
      res
    );
  };

  markAllRead = async (
    req: NotificationListRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.markAllRead();
    new OkSuccess({ data, message: "notification:success.markAllRead" }).send(
      req,
      res
    );
  };
}
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task A11: Routes

**Files:** Create `modules/notification/notification.routes.ts`

- [ ] **Step 1:**

```ts
// libs
import { Router } from "express";
// types
import type { NotificationController } from "./notification.controller";
// validators
import {
  notificationListQuerySchema,
  notificationIdParamSchema
} from "@/validators/schemas/notification";
// others
import { authGuard, queryPipe, paramsPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createNotificationUserRoutes = (
  controller: NotificationController
): Router => {
  const router = Router();
  const notifications = Router();

  notifications.use(authGuard);

  notifications.get("/unread-count", asyncHandler(controller.unreadCount));
  notifications.patch("/read-all", asyncHandler(controller.markAllRead));
  notifications.get(
    "/",
    queryPipe(notificationListQuerySchema),
    asyncHandler(controller.list)
  );
  notifications.patch(
    "/:id/read",
    paramsPipe(notificationIdParamSchema),
    asyncHandler(controller.markRead)
  );

  router.use("/notifications", notifications);
  return router;
};
```

> Order matters: `/unread-count` and `/read-all` are declared before `/:id/read` so they are not shadowed by the param route.

- [ ] **Step 2:** Confirm `paramsPipe` is exported from `@/middlewares` (it is used elsewhere per CLAUDE.md).

- [ ] **Step 3: Verify** — `yarn tsc` passes.

---

### Task A12: Module factory + loader wiring

**Files:** Create `modules/notification/notification.module.ts`; modify `loaders/modules.loader.ts`

- [ ] **Step 1:** `notification.module.ts`:

```ts
// others
import { MongoNotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { createNotificationUserRoutes } from "./notification.routes";

export const createNotificationModule = () => {
  const repo = new MongoNotificationRepository();
  const service = new NotificationService(repo);
  const controller = new NotificationController(service);

  return {
    notificationService: service,
    notificationUserRouter: createNotificationUserRoutes(controller)
  };
};
```

- [ ] **Step 2:** In `loaders/modules.loader.ts`: add `import { createNotificationModule } from "@/modules/notification/notification.module";`; add `notification: Router;` to the `ModuleRoutes` interface; instantiate `const notificationModule = createNotificationModule();`; add `notification: notificationModule.notificationUserRouter` to the routes object; and in `mountRoutes` add `v1Router.use(routes.notification);` near the User group.

- [ ] **Step 3: Verify** — `yarn tsc`; `yarn dev` boots; `GET /api/v1/notifications` returns 401 without auth, 200 `{ items: [], meta: {...} }` with a valid session.

---

### Task A13: Seeder

**Files:** Create `database/seeders/data/notifications.ts`, `database/seeders/notification.seeder.ts`; modify `database/seeders/index.ts`

- [ ] **Step 1:** `data/notifications.ts` — a factory returning ~26 notifications spanning all 7 types, mixed read/unread, `createdAt` offsets across today/yesterday/earlier and beyond one page:

```ts
// modules
import { NOTIFICATION_TYPES } from "@/modules/notification/constants";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface SeedNotification {
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  ageMs: number;
}

export const TARGET_USER_EMAIL = "user@test.com";

export const buildSeedNotifications = (): SeedNotification[] => {
  const items: SeedNotification[] = [
    { type: NOTIFICATION_TYPES.LOGIN_ANOMALY, title: "Unusual sign-in detected", message: "A new sign-in from Chrome on Windows was detected.", isRead: false, ageMs: 2 * MINUTE },
    { type: NOTIFICATION_TYPES.APP_AVAILABLE, title: "New app available", message: "Atlas Imagery is now available in your launcher.", isRead: false, ageMs: 30 * MINUTE },
    { type: NOTIFICATION_TYPES.ENTITLEMENT_GRANTED, title: "Access granted", message: "You were granted access to Orbit Console.", isRead: false, ageMs: 3 * HOUR },
    { type: NOTIFICATION_TYPES.PASSWORD_CHANGED, title: "Password changed", message: "Your password was changed successfully.", isRead: true, ageMs: 5 * HOUR },
    { type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT, title: "Scheduled maintenance", message: "Maintenance window Saturday 02:00–04:00 UTC.", isRead: true, ageMs: 26 * HOUR },
    { type: NOTIFICATION_TYPES.ENTITLEMENT_REVOKED, title: "Access revoked", message: "Your access to Legacy Reports was revoked.", isRead: true, ageMs: 28 * HOUR },
    { type: NOTIFICATION_TYPES.ACCOUNT_LOCKED, title: "Account locked", message: "Your account was temporarily locked after failed logins.", isRead: true, ageMs: 3 * DAY }
  ];
  // Pad to >20 so pagination (limit 20) yields a 2nd page.
  const padded: SeedNotification[] = [...items];
  let i = 0;
  while (padded.length < 26) {
    const base = items[i % items.length];
    padded.push({
      ...base,
      title: `${base.title} (#${padded.length + 1})`,
      isRead: padded.length % 2 === 0,
      ageMs: base.ageMs + (padded.length + 1) * DAY
    });
    i++;
  }
  return padded;
};
```

- [ ] **Step 2:** `notification.seeder.ts`:

```ts
// models
import NotificationModel from "@/models/notification";
import UserModel from "@/models/user";
// others
import { buildSeedNotifications, TARGET_USER_EMAIL } from "./data/notifications";
import { Logger } from "@/libs/logger";

export const seedNotifications = async (): Promise<void> => {
  Logger.info("Starting notification seeding...");
  const user = await UserModel.findOne({ email: TARGET_USER_EMAIL });
  if (!user) {
    Logger.warn(`Seed target user ${TARGET_USER_EMAIL} not found; skipping notifications.`);
    return;
  }

  const existing = await NotificationModel.countDocuments({ userId: user._id });
  if (existing > 0) {
    Logger.warn(`Notifications already exist for ${TARGET_USER_EMAIL}; skipping.`);
    return;
  }

  const now = Date.now();
  const docs = buildSeedNotifications().map((n) => ({
    userId: user._id,
    type: n.type,
    title: n.title,
    message: n.message,
    meta: null,
    isRead: n.isRead,
    readAt: n.isRead ? new Date(now - n.ageMs) : null,
    createdAt: new Date(now - n.ageMs)
  }));

  await NotificationModel.insertMany(docs);
  Logger.info(`Created ${docs.length} notifications for ${TARGET_USER_EMAIL}`);
};

export const clearNotifications = async (): Promise<void> => {
  Logger.info("Clearing seeded notifications...");
  const user = await UserModel.findOne({ email: TARGET_USER_EMAIL });
  if (!user) return;
  const res = await NotificationModel.deleteMany({ userId: user._id });
  Logger.info(`Cleared ${res.deletedCount} notifications`);
};
```

> `createdAt` is settable here because the schema uses `timestamps: { createdAt: true }`; Mongoose lets `insertMany` accept an explicit `createdAt`. Verify after seeding that `createdAt` values stuck (if Mongoose overrides them, switch to `NotificationModel.collection.insertMany(docs)` for the raw insert).

- [ ] **Step 3:** Wire into `database/seeders/index.ts`: import `seedNotifications, clearNotifications`; call `await clearNotifications();` in the clear block (before/after users is fine — it looks up the user) and `await seedNotifications();` after `seedUsers()` (must run after users exist).

- [ ] **Step 4: Verify** — `yarn seed` then query Mongo: `user@test.com` has 26 notifications, ~ a third unread, spread across days. `yarn seed:clear` removes them.

- [ ] **Step 5: Run BE quality gate** — `yarn format && yarn lint && yarn tsc` all clean. Run the service spec once more (Task A9 command) → PASS.

---

# PHASE B — Frontend (client worktree)

> Run FE checks after each task group: `yarn format && yarn lint && yarn tsc`. The worktree may need a `node_modules` junction to run these — see [[reference_worktree_node_modules_junction]].

### Task B1: Constants

**Files:** Modify `constants/endpoints.ts`, `constants/queryKeys.ts`

- [ ] **Step 1:** In `endpoints.ts`, add a `// Notifications` group:

```ts
  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_UNREAD_COUNT: "/notifications/unread-count",
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",
  NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
```

> `END_POINTS` currently holds only string values; adding a function member is fine (the object is untyped `const`). Access as `CONSTANTS.END_POINTS.NOTIFICATION_READ(id)`.

- [ ] **Step 2:** In `queryKeys.ts`, add under a `// Notifications` comment:

```ts
  NOTIFICATIONS: "notifications",
  NOTIFICATIONS_UNREAD_COUNT: "notificationsUnreadCount",
```

- [ ] **Step 3: Verify** — `yarn tsc` passes.

---

### Task B2: Types

**Files:** Modify `types/Notification/index.ts`

- [ ] **Step 1:** Add API types (keep existing UI unions still referenced by the header panel until B8 removes them):

```ts
export type ApiNotificationType =
  | "LOGIN_ANOMALY"
  | "ACCOUNT_LOCKED"
  | "APP_AVAILABLE"
  | "ENTITLEMENT_GRANTED"
  | "ENTITLEMENT_REVOKED"
  | "PASSWORD_CHANGED"
  | "SYSTEM_ANNOUNCEMENT";

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: ApiNotification[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task B3: Request layer

**Files:** Create `requests/notification.ts`

- [ ] **Step 1:**

```ts
// types
import type {
  ApiNotification,
  NotificationListParams,
  NotificationListResponse
} from "@/types/Notification";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getNotifications = async (
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  const res = await axiosInstance.get<ResponsePattern<NotificationListResponse>>(
    END_POINTS.NOTIFICATIONS,
    { params }
  );
  return res.data.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const res = await axiosInstance.get<ResponsePattern<{ count: number }>>(
    END_POINTS.NOTIFICATIONS_UNREAD_COUNT
  );
  return res.data.data;
};

export const markNotificationRead = async (
  id: string
): Promise<ApiNotification> => {
  const res = await axiosInstance.patch<ResponsePattern<ApiNotification>>(
    END_POINTS.NOTIFICATION_READ(id)
  );
  return res.data.data;
};

export const markAllNotificationsRead = async (): Promise<{
  updated: number;
}> => {
  const res = await axiosInstance.patch<ResponsePattern<{ updated: number }>>(
    END_POINTS.NOTIFICATIONS_READ_ALL
  );
  return res.data.data;
};
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task B4: dataSource (type → visuals)

**Files:** Create `dataSources/Notifications/index.ts`

- [ ] **Step 1:**

```ts
// types
import type { LucideIcon } from "lucide-react";
import type { ApiNotificationType } from "@/types/Notification";
// libs
import {
  ShieldAlert,
  Lock,
  Sparkles,
  KeyRound,
  CircleCheck,
  CircleX,
  Megaphone
} from "lucide-react";

export interface NotificationVisual {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export const NOTIFICATION_VISUALS: Record<
  ApiNotificationType,
  NotificationVisual
> = {
  LOGIN_ANOMALY: { icon: ShieldAlert, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  ACCOUNT_LOCKED: { icon: Lock, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  APP_AVAILABLE: { icon: Sparkles, iconBg: "bg-info/15", iconColor: "text-info" },
  ENTITLEMENT_GRANTED: { icon: CircleCheck, iconBg: "bg-success/15", iconColor: "text-success" },
  ENTITLEMENT_REVOKED: { icon: CircleX, iconBg: "bg-warning/20", iconColor: "text-warning-foreground" },
  PASSWORD_CHANGED: { icon: KeyRound, iconBg: "bg-primary/15", iconColor: "text-primary" },
  SYSTEM_ANNOUNCEMENT: { icon: Megaphone, iconBg: "bg-muted", iconColor: "text-muted-foreground" }
};
```

- [ ] **Step 2: Verify** — `yarn tsc` passes; all imported icons exist in `lucide-react`.

---

### Task B5: View hooks

**Files:** Create `views/Notifications/hooks/useNotifications.ts`, `useUnreadCount.ts`, `useMarkNotificationRead.ts`, `useMarkAllRead.ts`

- [ ] **Step 1:** `useNotifications.ts`:

```ts
// libs
import { useInfiniteQuery } from "@tanstack/react-query";
// requests
import { getNotifications } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const PAGE_SIZE = 20;

const useNotifications = (isRead?: boolean) =>
  useInfiniteQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS, { isRead }],
    queryFn: ({ pageParam }) =>
      getNotifications({ page: pageParam, limit: PAGE_SIZE, isRead }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
  });

export default useNotifications;
```

- [ ] **Step 2:** `useUnreadCount.ts`:

```ts
// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getUnreadCount } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useUnreadCount = () =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT],
    queryFn: getUnreadCount
  });

export default useUnreadCount;
```

- [ ] **Step 3:** `useMarkNotificationRead.ts`:

```ts
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// requests
import { markNotificationRead } from "@/requests/notification";
// others
import CONSTANTS from "@/constants";

const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("notifications.toast");
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS]
      });
      queryClient.invalidateQueries({
        queryKey: [CONSTANTS.QUERY_KEYS.NOTIFICATIONS_UNREAD_COUNT]
      });
    },
    onError: () => toast.error(tToast("markReadError"))
  });
};

export default useMarkNotificationRead;
```

- [ ] **Step 4:** `useMarkAllRead.ts` — same shape, `mutationFn: markAllNotificationsRead`, same invalidations, `onError: toast.error(tToast("markAllError"))`.

- [ ] **Step 5: Verify** — `yarn tsc` passes. (`toast` from `sonner` is the project pattern per `views.md`.)

---

### Task B6: NotificationItem component

**Files:** Rewrite `views/Notifications/components/NotificationItem/index.tsx`

- [ ] **Step 1:** Accept `type`, literal `title`/`message`, relative `timestamp`, `isRead`, plus `onMarkRead`/`isMarking`. Derive icon/colors from the dataSource. Add a mark-read button for unread items (inline props per `types.md`):

```tsx
// libs
import { Check } from "lucide-react";
// types
import type { ApiNotificationType } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
// others
import { NOTIFICATION_VISUALS } from "@/dataSources/Notifications";
import { cn } from "@/libs/utils";

const NotificationItem = ({
  type,
  title,
  message,
  timestamp,
  isRead,
  markReadLabel,
  onMarkRead,
  isMarking = false
}: {
  type: ApiNotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  markReadLabel: string;
  onMarkRead: () => void;
  isMarking?: boolean;
}) => {
  const visual = NOTIFICATION_VISUALS[type];
  const Icon = visual.icon;
  return (
    <article
      aria-label={title}
      className={cn(
        "border-border flex items-start gap-3 border-b px-5 py-4",
        !isRead && "bg-info/5"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          visual.iconBg,
          visual.iconColor
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-foreground text-sm font-semibold">{title}</p>
          <span className="text-muted-foreground shrink-0 text-xs">
            {timestamp}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      </div>
      {!isRead ? (
        <CustomButton
          variant="ghost"
          size="icon"
          aria-label={markReadLabel}
          onClick={onMarkRead}
          disabled={isMarking}
          className="shrink-0"
        >
          <Check className="size-4" aria-hidden="true" />
        </CustomButton>
      ) : null}
    </article>
  );
};

export default NotificationItem;
```

- [ ] **Step 2: Verify** — `yarn tsc` passes.

---

### Task B7: NotificationList + PageHeader + view entry

**Files:** Rewrite `views/Notifications/mains/NotificationList/index.tsx`, `mains/PageHeader/index.tsx`, `index.tsx`. The 200-line view limit applies — keep grouping/relative-time helpers in `src/utils` if needed.

- [ ] **Step 1: `index.tsx`** — compose, no mock state:

```tsx
"use client";

// components
import PageHeader from "./mains/PageHeader";
import NotificationList from "./mains/NotificationList";

const Notifications = () => (
  <div className="flex flex-col gap-8">
    <PageHeader />
    <NotificationList />
  </div>
);

export default Notifications;
```

- [ ] **Step 2: `mains/PageHeader/index.tsx`** — wire mark-all to the mutation; announce on success:

```tsx
"use client";

// libs
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
// hooks
import { useAnnounce } from "@/hooks";
import useMarkAllRead from "../../hooks/useMarkAllRead";

const PageHeader = () => {
  const t = useTranslations("notifications");
  const { announce } = useAnnounce();
  const markAll = useMarkAllRead();

  const handleMarkAllRead = () =>
    markAll.mutate(undefined, {
      onSuccess: () => announce(t("announce.markedAllRead"))
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h1
          id="notifications-title"
          className="text-foreground text-3xl font-bold tracking-tight"
        >
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <CustomButton
        variant="outline"
        size="sm"
        iconLeft={<CheckCheck className="size-3.5" aria-hidden="true" />}
        onClick={handleMarkAllRead}
        disabled={markAll.isPending}
      >
        {t("actions.markAllRead")}
      </CustomButton>
    </div>
  );
};

export default PageHeader;
```

- [ ] **Step 3: Create relative-time + grouping helper** in `src/utils` (e.g. `src/utils/notifications.ts`) so the view stays under 200 lines:

```ts
// libs
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";

const DAY_MS = 24 * 60 * 60 * 1000;
export type NotifGroup = "today" | "yesterday" | "earlier";

export const relativeTime = (iso: string, locale: string): string =>
  formatDistanceToNow(new Date(iso), {
    addSuffix: true,
    locale: locale === "vi" ? vi : enUS
  });

export const groupOf = (iso: string, now: number): NotifGroup => {
  const startToday = new Date(now).setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= startToday) return "today";
  if (t >= startToday - DAY_MS) return "yesterday";
  return "earlier";
};
```

- [ ] **Step 4: `mains/NotificationList/index.tsx`** — tabs drive `isRead`; flatten infinite pages; group; relative timestamps; Load more → `fetchNextPage`; loading skeleton + empty state; announce. Reference contract: `useNotifications(isRead)`, `useMarkNotificationRead()`, `useLocale()` from next-intl, `relativeTime`/`groupOf` from the helper. Active tab `"unread"` → `isRead=false`; `"read"` → `isRead=true`. Mark-read handler:

```tsx
const markRead = useMarkNotificationRead();
const handleMarkRead = (id: string) =>
  markRead.mutate(id, {
    onSuccess: () => announce(t("announce.markedRead"))
  });
```

Render each item: `<NotificationItem type={n.type} title={n.title} message={n.message} timestamp={relativeTime(n.createdAt, locale)} isRead={n.isRead} markReadLabel={t("actions.markRead")} onMarkRead={() => handleMarkRead(n.id)} isMarking={markRead.isPending} />`. Load-more button: render only when `hasNextPage`; `onClick={() => { fetchNextPage(); announce(t("announce.loadingMore")); }}`, `disabled={isFetchingNextPage}`. Empty state: when flattened list is empty and `!isLoading`, render a `states.empty` message. Loading: when `isLoading`, render a skeleton/`states.loading` text with announce.

> Keep this file ≤200 lines; if it grows, extract the grouped-list rendering into `components/NotificationGroups`.

- [ ] **Step 5: Verify** — `yarn tsc` + `yarn lint` pass.

---

### Task B8: Header panel + badge

**Files:** Rewrite `layouts/AppHeader/components/NotificationPanel/index.tsx`; modify `layouts/AppHeader/index.tsx`; remove `NOTIFICATIONS_MOCK` from `mocks/Dashboard/index.ts`

- [ ] **Step 1: `AppHeader/index.tsx`** — replace `const unreadCount = NOTIFICATIONS_MOCK.filter(...)` with `const { data: unread } = useUnreadCount();` and `const unreadCount = unread?.count ?? 0;`. Remove the `NOTIFICATIONS_MOCK` import. Add `import useUnreadCount from "@/views/Notifications/hooks/useUnreadCount";`.

> View-local hooks are normally relative-imported, but the header is a layout, not a view. Importing the notifications hook here is acceptable since it is the canonical unread-count source; alternatively promote `useUnreadCount` to `src/hooks/` if review prefers. Default: import from the view path; flag for reviewer.

- [ ] **Step 2: `NotificationPanel/index.tsx`** — replace `NOTIFICATIONS_MOCK` with the first page of `useNotifications`. Tabs `all`/`unread` map to `isRead` `undefined`/`false` (drop `mentions`, or keep it inert with a follow-up note). Render `title`/`message`/relative time + `NOTIFICATION_VISUALS[type]`. Wire `markAllRead` button to `useMarkAllRead`. Keep `viewAll` navigation.

- [ ] **Step 3:** Delete the `NOTIFICATIONS_MOCK` export from `mocks/Dashboard/index.ts` and the now-unused `AppNotification` import there. Grep `NOTIFICATIONS_MOCK` repo-wide → zero hits. If `mocks/Notifications/index.ts` is now unused, delete it and remove imports.

- [ ] **Step 4: Verify** — `yarn tsc` + `yarn lint` pass; no dangling mock imports.

---

### Task B9: i18n chrome keys

**Files:** Modify `locales/en/notifications.json`, `locales/vi/notifications.json`

- [ ] **Step 1:** Add to both locales (en shown; vi translated): under `actions` add `"markRead": "Mark as read"`; add a `states` block `{ "empty": "No notifications here.", "emptyRead": "No read notifications yet.", "emptyUnread": "You're all caught up.", "loading": "Loading notifications...", "error": "Couldn't load notifications." }`; add to `announce` `"markedRead": "Notification marked as read."`; add a `toast` block `{ "markReadError": "Could not mark as read.", "markAllError": "Could not mark all as read." }`. Remove the now-unused `items.*` mock keys only after confirming nothing references them.

- [ ] **Step 2: Verify** — `yarn tsc` (next-intl typed messages) passes for both locales; keys exist in en AND vi (symmetry).

- [ ] **Step 3: Run FE quality gate** — `yarn format && yarn lint && yarn tsc` all clean.

---

# PHASE C — E2E (client worktree)

> Precondition per CLAUDE.md §4.3: BE :5000 + FE :3000 + Mongo + Redis running and DB seeded (`yarn seed`). Agent self-checks ports; if not running, ask the user (a) they run it or (b) agent starts it in background, then teardown only what it started. E2E in a worktree needs its own dev server on a separate port — see [[reference_e2e_worktree_devserver]].

### Task C1: E2E helper + spec scaffolding

**Files:** Create `e2e/helpers/notifications.ts`, `e2e/notifications/notifications.e2e.ts`

- [ ] **Step 1: Helper** — a reseed/teardown utility (mark-read mutations are destructive and there is no mark-unread API, so `afterAll` must restore state). The cleanest restore is to call the BE seeder's clear+seed. Since E2E can't run `yarn seed` mid-suite easily, the helper logs in as `user@test.com` and, in `afterAll`, leaves a note; the durable fix is to **re-run `yarn seed` (clear+seed) between E2E runs**. Document this in `e2e.md`. (If a programmatic reset is wanted, add a test-only reseed step that deletes + re-inserts via a seeded admin endpoint — out of scope here; flagged.)

> **Mutation-safety teardown decision (record in `e2e.md`):** the suite reseeds notifications by running `yarn seed --clear` + `yarn seed` before the run; within the run, mark-read/mark-all tests assert state transitions but the suite is ordered so read-state assertions tolerate prior mutations (query unread count deltas rather than absolute counts where possible).

- [ ] **Step 2: Spec file** — implement one test per ✅ scenario from the design matrix (§6). Use the global `auth.setup.ts` storageState (logged in as `user@test.com`). Selectors prefer role/label.

### Task C2: Implement scenarios (one test per matrix ✅)

- [ ] **Happy path** — visit `/notifications`; unread tab shows items grouped (Today/Yesterday/Earlier headers visible); relative timestamps render (text matches `/ago|trước/`). Header bell shows a badge with a number > 0.
- [ ] **AuthN** — a fresh context with no storageState visiting `/notifications` is redirected to login (URL contains `/login`).
- [ ] **Empty state** — Read tab for a user with all-unread subset, or assert the empty message appears when a tab has no items (use a filter that yields none, e.g. after marking all read → unread tab shows `states.emptyUnread`).
- [ ] **Boundary / pagination** — unread+read combined > 20 seeded → on the "all"/read view, Load more is visible; click it → more rows appear; on last page Load more disappears.
- [ ] **Tabs filter** — switch Unread ↔ Read; assert only matching `isRead` items show (unread items have the mark-read button; read items do not).
- [ ] **Data rendering** — a seeded title/message string is visible verbatim; timestamp is relative not ISO (no `T..:..:..Z` substring); icon container present.
- [ ] **i18n (en + vi)** — load `/notifications` (en) → assert `Unread`/`Read`/`Mark all as read`; load `/vi/notifications` → assert the vi strings for the same chrome. (Body text identical in both — assert chrome only.)
- [ ] **Error / loading** — route-intercept `GET /api/v1/notifications**` to 500 → assert `states.error` UI; (loading: intercept with delay → assert `states.loading` briefly).
- [ ] **Mutation: mark single** — click a mark-read button on an unread item → that item leaves the unread tab; header badge count decrements (assert delta). 
- [ ] **Mutation: mark all** — click Mark all as read → unread tab empties; badge → 0. `afterAll`: trigger reseed (documented).
- [ ] **A11y** — mark-read button has accessible name (`getByRole("button", { name: <markRead label> })`); keyboard `Tab` reaches it; Load more reachable by keyboard.

- [ ] **Step: Run** — `cd client && yarn e2e` (against the running, seeded app) → all green before code review. Reseed afterward if mutations ran.

> AuthZ-FE-UI and validation-FE-form scenarios are **N/A** (no UI path to a foreign id; no manual page/limit input) — covered by the BE service spec (Task A9) instead. Recorded in the matrix; do not author empty FE tests for them.

---

## Self-Review (completed by plan author)

**Spec coverage:** BE endpoints (A8–A12), seed (A13), FE list+pagination (B5,B7), mark single (B6,B7), mark all (B7,B8), unread badge (B5,B8), i18n chrome (B9), header panel (B8), E2E matrix (C2) — all design §2–6 items have a task. ✅

**Placeholder scan:** No "TBD/TODO/handle edge cases" — every code step has concrete code; edits to large existing files (endpoints, queryKeys, modules.loader, locale json) are described as precise insertions rather than full reprints because the engineer must merge into existing structure. ✅

**Type consistency:** `NotificationItemDto`/`ApiNotification` field names match across BE DTO (A6) and FE type (B2); service method names `list/unreadCount/markRead/markAllRead` consistent across A9/A10/A11; hook contracts (`useNotifications(isRead)`, mutations) consistent across B5/B7/B8. `RequestContext.requireUserId()` used uniformly. ✅

**Open flags for reviewer:** (1) `useUnreadCount` imported into a layout from the view hooks path — promote to `src/hooks/` if review prefers; (2) seeder `createdAt` override — verify Mongoose honors it, else use raw collection insert; (3) E2E mutation reseed strategy documented, not automated.

---

## Execution gate reminders

- **Commit review gate (CLAUDE.md §7):** default is Review ON — implementers write ALL code, stage but do NOT commit per-task; main loop shows one overall diff; user approves once; then commit per-repo. The per-task "Commit" steps above apply only if the user opts into Review OFF.
- **Per-repo PRs** at the end via `creating-github-pr` (server + client + docs).
