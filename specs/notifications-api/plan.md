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

---

# PHASE D — E2E Backfill (client worktree)

## E2E Backfill Plan

> **Mục đích**: backfill các scenario `NEW` trong Scenario Matrix (`design.md` §6) mà suite hiện tại (13 `test(...)` blocks trong `client/e2e/notifications/notifications.e2e.ts`) chưa cover. Đây là **reconcile**, KHÔNG rebuild: chỉ ADD/extend test cho behavior chưa được assert; không xóa test cũ. Mỗi task = 1 checkbox = 1 scenario `NEW`/extended. Code đầy đủ cho case NON-OBVIOUS (header bell, intercept-per-tab, mutation-failure, idempotency, persistence, vi relative-time, announcer, keyboard). TDD: viết test → chạy `yarn e2e` (chỉ file này) → đỏ nếu app chưa đúng → xanh.
>
> **File mục tiêu (extend, không tạo mới)**: `client/e2e/notifications/notifications.e2e.ts`. Tất cả test chạy dưới project `chromium` (user storageState từ `auth.setup.ts`, login `user@test.com`).
>
> **Drift đã chốt (bám sát code thật — KHÔNG optimistic UI)**: `useMarkNotificationRead` / `useMarkAllRead` chỉ `invalidateQueries` trong `onSuccess` (KHÔNG `onMutate`, KHÔNG rollback). Mutation **fail** → cache giữ nguyên → item ở lại unread + toast từ `onError`. Mark-read button `disabled={isMarking}` với `isMarking = markRead.isPending` **dùng chung cho mọi item** (1 mutation hook cho cả list) → trong lúc pending, **TẤT CẢ** nút mark-read bị disabled (quan trọng cho test idempotency).
>
> **Restoration (drift fix)**: KHÔNG có mark-unread API và `afterAll` **KHÔNG** auto-reseed (block là no-op documented). Test mutate seed thật (mark-single thật, mark-all thật) → DEFER auto-revert với lý do "no mark-unread API"; restore THỦ CÔNG bằng `cd server && yarn seed --clear && yarn seed`. Ưu tiên `page.route` intercept ở mọi case có thể để KHÔNG mutate seed.
>
> **Gate**: scenario read/render = `A+B`; scenario mutation-heavy (chạy PATCH thật) = **`A only`** (gate B MCP chỉ verify read/render, không mutate song song — contamination rule §4.3).

### Hằng số chrome cần bổ sung vào đầu file (test mới tham chiếu)

Khối `EN` / `VI` hiện có thiếu một số key mà các test backfill cần. Thêm các field sau (string lấy verbatim từ `client/src/locales/{en,vi}/notifications.json` + `dashboard.json`):

```ts
// Bổ sung vào object EN hiện có:
const EN = {
  // ...existing keys...
  markRead: "Mark as read",
  loadMore: "Load more notifications",
  empty: "No notifications here.",
  error: "Couldn't load notifications.",
  // announce.* (live-region — notifications.json → announce)
  announceTabChangedRead: "Showing Read notifications.",
  announceMarkedRead: "Notification marked as read.",
  announceMarkedAllRead: "All notifications marked as read.",
  announceLoadingMore: "Loading more notifications...",
  // toast (notifications.json → toast)
  toastMarkReadError: "Could not mark as read.",
  // header bell (dashboard.json → header.notificationsLabel)
  bellLabel: "Notifications",
  // panel (dashboard.json → notifications)
  panelMarkAll: "Mark all as read"
};

// Bổ sung vào object VI hiện có:
const VI = {
  // ...existing keys...
  markRead: "Đánh dấu đã đọc"
};
```

> **Lưu ý namespace (dễ nhầm)**: page (`/notifications`) dùng namespace **`notifications`** (`tabs.*`, `actions.*`, `states.*`, `toast.*`, `announce.*`). Header `NotificationPanel` + bell dùng namespace **`dashboard`** (`dashboard.header.notificationsLabel`, `dashboard.notifications.{title,markAllRead,all,unread,viewAll}`). Panel "Mark all as read" (`dashboard.notifications.markAllRead`) trùng chuỗi với page nhưng là affordance khác — test header phải scope trong popover, không nhầm với nút trên `PageHeader`.

### Task D1: Header bell badge + panel (matrix row 1b) — `A only` (panel có nút mark-all → mutate)

- [ ] **1b header bell badge + panel** [Decision Table] — badge hiện ⇔ `unreadCount > 0` (intercept `unread-count`); mở panel → list page-1 + nút "Mark all as read"; badge **ẩn** khi `count === 0` → render bell badge theo `unreadCount`, panel có affordance mark-all.

Badge chỉ render khi `unreadCount > 0` (`AppHeader` line ~105). Panel list lấy `data?.pages[0]?.items`. Dùng intercept để cố định count (read-only — KHÔNG bấm mark-all để giữ `A only` an toàn cho seed; chỉ assert affordance tồn tại):

```ts
test.describe("Notifications — header bell + panel", () => {
  // Gate A only: panel exposes a mark-all mutation affordance; we assert its
  // presence/visibility but never CLICK it here, so no real mutation fires.
  // Badge + count are pinned via intercept (read-only) so the assertion does
  // not depend on live seed counts.
  test("bell shows the unread badge and the panel lists recent items + mark-all", async ({
    page
  }) => {
    await page.route(UNREAD_COUNT_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: 3 }))
      })
    );
    await page.route(LIST_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: [fakeItem(201), fakeItem(202)],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
          })
        )
      })
    );

    await page.goto("/notifications");

    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell).toBeVisible();
    // Badge text is the unread count; only rendered when count > 0.
    await expect(bell.getByText("3", { exact: true })).toBeVisible();

    await bell.click();
    // Panel (Popover content) lists the intercepted first-page items...
    await expect(
      page.getByText("Intercepted notification 201", { exact: true })
    ).toBeVisible();
    // ...and exposes a "Mark all as read" affordance (do NOT click — A only).
    await expect(
      page.getByRole("button", { name: EN.panelMarkAll })
    ).toBeVisible();
  });

  test("bell badge is hidden when the unread count is zero", async ({
    page
  }) => {
    await page.route(UNREAD_COUNT_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseEnvelope({ count: 0 }))
      })
    );
    await page.goto("/notifications");
    const bell = page.getByRole("button", { name: EN.bellLabel });
    await expect(bell).toBeVisible();
    // No numeric badge node rendered (AppHeader renders <Badge> only on > 0).
    await expect(bell.getByText(/^\d+$/)).toHaveCount(0);
  });
});
```

### Task D2: Per-tab empty state (matrix row 5a) — `A+B`

- [ ] **5a per-tab empty — Read tab** [EP] — intercept list (`isRead=true`) → `items: []` trên tab **Read** → `states.empty` render (chứng minh empty *per-tab*, không chỉ "user không có gì"). Empty-set partition.

`useNotifications` đặt `isRead` vào queryKey và gửi `isRead` query param; chỉ trả `[]` khi `isRead=true` để tab Unread vẫn có data thật, tab Read mới rỗng:

```ts
test("Read tab renders the per-tab empty state when no read items exist", async ({
  page
}) => {
  // Only the read filter (isRead=true) returns empty; the unread filter still
  // serves data so the page does not look globally empty.
  await page.route(LIST_RE, (route: Route) => {
    const url = new URL(route.request().url());
    const isReadParam = url.searchParams.get("isRead");
    const empty = isReadParam === "true";
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items: empty ? [] : [fakeItem(1)],
          meta: {
            total: empty ? 0 : 1,
            page: 1,
            limit: 20,
            totalPages: empty ? 0 : 1
          }
        })
      )
    });
  });

  await gotoNotifications(page);
  await page.getByRole("tab", { name: EN.read, exact: true }).click();
  await expect(
    page.getByRole("tab", { name: EN.read, exact: true })
  ).toHaveAttribute("data-state", "active");
  await expect(page.getByText(EN.empty)).toBeVisible();
});
```

- [ ] **5c null-readAt renders (no crash)** [EP] — unread item với `readAt: null` render không lỗi (page chỉ render `createdAt` qua `relativeTime`; `readAt` không đi vào UI nên dùng case này để bảo vệ regression nếu sau này render readAt). `fakeItem(i)` mặc định đã `isRead:false, readAt:null` → intercept 1 item, assert title visible + không có console error.

```ts
test("an unread item with readAt:null renders without crashing", async ({
  page
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(LIST_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items: [fakeItem(1)], // isRead:false, readAt:null by default
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
        })
      )
    })
  );
  await gotoNotifications(page);
  await expect(
    page.getByText("Intercepted notification 1", { exact: true })
  ).toBeVisible();
  expect(errors).toEqual([]);
});
```

### Task D3: Single-page boundary — no "Load more" from the start (matrix row 6b) — `A+B`

- [ ] **6b single full page (totalPages:1, exactly 20 items)** [BVA] — `limit`-boundary: trả đúng **20** item, `totalPages:1` → `hasNextPage === false` → nút "Load more" **KHÔNG render từ đầu** (khác row 6a là nút biến mất *sau khi* tới trang cuối).

```ts
test("no Load more button when the dataset is a single full page", async ({
  page
}) => {
  const items = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
  await page.route(LIST_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          // exactly limit items, but totalPages 1 → getNextPageParam undefined
          items,
          meta: { total: 20, page: 1, limit: 20, totalPages: 1 }
        })
      )
    })
  );
  await gotoNotifications(page);
  await expect(
    page.getByText("Intercepted notification 1", { exact: true })
  ).toBeVisible();
  // Load more must NEVER appear (hasNextPage === false from page 1).
  await expect(
    page.getByRole("button", { name: EN.loadMore })
  ).toHaveCount(0);
});
```

### Task D4: Read-tab content assertion (matrix row 7) — `A+B`

- [ ] **7 Read tab content** [Decision Table] — `SEED_READ_TITLE = "Password changed"` **visible trên tab Read** và **absent trên tab Unread**; `SEED_UNREAD_TITLE` thì ngược lại. tab × isRead → expected subset. Real backend (seed có sẵn cả read & unread item).

Import `SEED_READ_TITLE` từ helper (đã export). Test real backend — KHÔNG mutate:

```ts
test("Read tab shows read seed titles and hides unread ones (and vice versa)", async ({
  page
}) => {
  await gotoNotifications(page);

  // Unread tab (default): unread title present, read title absent.
  await expect(
    page.getByText(SEED_UNREAD_TITLE, { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText(SEED_READ_TITLE, { exact: true })
  ).toHaveCount(0);

  // Switch to Read tab: read title present, unread title absent.
  await page.getByRole("tab", { name: EN.read, exact: true }).click();
  await expect(
    page.getByText(SEED_READ_TITLE, { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText(SEED_UNREAD_TITLE, { exact: true })
  ).toHaveCount(0);
});
```

> **Import**: thêm `SEED_READ_TITLE` vào import từ `../helpers/notifications` (hiện chỉ import `fetchUnreadCount, SEED_UNREAD_TITLE`).

### Task D5: vi relative-time `/trước/` (matrix row 9 NEW) — `A+B`

- [ ] **9 vi relative-time** [Error Guessing] — trên `/vi/notifications`, một timestamp render khớp **`/trước/`** cụ thể (chứng minh `date-fns` locale **vi** được wire, không phải regex lỏng `/ago|trước/`); và "ago" tiếng Anh **KHÔNG** xuất hiện trên trang vi (locale-leak). Real backend.

`relativeTime(iso, "vi")` dùng `date-fns/locale` `vi` với `addSuffix:true` → hậu tố "trước":

```ts
test("vi locale renders relative time with the Vietnamese suffix 'trước'", async ({
  page
}) => {
  await gotoNotifications(page, "/vi");
  // The vi date-fns locale renders the "ago" suffix as "trước".
  await expect(page.getByText(/trước/).first()).toBeVisible();
  // Locale-leak guard: the English "ago" suffix must not appear on the vi page.
  await expect(page.getByText(/\bago\b/i)).toHaveCount(0);
});
```

### Task D6: Mark-read mutation failure (matrix row 10c) — `A+B`

- [ ] **10c mark-read mutation failure** [Error Guessing] — intercept `PATCH /notifications/:id/read` → **500** → toast `notifications.toast.markReadError` fires **và** item **ở lại unread** (invalidate-on-success: fail không flip cache, không cần rollback). Intercept → KHÔNG mutate seed thật.

Cần route matcher cho PATCH `:id/read` (chưa có hằng số) — thêm `MARK_READ_RE` cạnh các regex hiện có. Phải loại trừ `/read-all`:

```ts
// Bổ sung cạnh LIST_RE/UNREAD_COUNT_RE/READ_ALL_RE ở đầu file:
// PATCH /api/v1/notifications/<id>/read  (NOT /read-all)
const MARK_READ_RE = /\/api\/v1\/notifications\/[^/]+\/read(\?|$)/;
```

```ts
test("mark-read failure shows an error toast and leaves the item unread", async ({
  page
}) => {
  // Seed-agnostic: serve one unread item via intercept, then fail the PATCH.
  await page.route(LIST_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items: [fakeItem(301)],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
        })
      )
    })
  );
  await page.route(MARK_READ_RE, (route: Route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        code: "INTERNAL",
        message: "boom",
        timestamp: new Date().toISOString(),
        path: "/api/v1/notifications/fake-301/read"
      })
    })
  );

  await gotoNotifications(page);
  const button = markReadButtons(page).first();
  await expect(button).toBeVisible();
  await button.click();

  // onError toast fires (sonner renders role="status"/text).
  await expect(page.getByText(EN.toastMarkReadError)).toBeVisible();
  // invalidate-on-success means a FAILED mutation never flipped the cache:
  // the item is still in the unread list and still has its mark-read button.
  await expect(
    page.getByText("Intercepted notification 301", { exact: true })
  ).toBeVisible();
  await expect(markReadButtons(page)).toHaveCount(1);
});
```

### Task D7: Mark-all-when-empty no-op (matrix row 11c) — `A only`

- [ ] **11c mark-all no-op khi đã empty** [BVA] — intercept list rỗng + `unread-count: 0` + `read-all` PATCH trả `{ updated: 0 }` → bấm "Mark all as read" → UI no-op, **không badge âm** (count không bao giờ < 0). `A only` (gọi `read-all` PATCH — nhưng qua intercept nên KHÔNG chạm seed; vẫn xếp `A only` vì là mutation-path).

Đặt trong `describe.serial("Notifications — mutations")` hiện có (cùng nhóm mutation, ordered). Tất cả qua intercept → KHÔNG mutate seed thật:

```ts
test("mark-all on an already-empty list is a no-op (no negative badge)", async ({
  page
}) => {
  await page.route(LIST_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items: [],
          meta: { total: 0, page: 1, limit: 20, totalPages: 0 }
        })
      )
    })
  );
  await page.route(UNREAD_COUNT_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseEnvelope({ count: 0 }))
    })
  );
  await page.route(READ_ALL_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseEnvelope({ updated: 0 }))
    })
  );

  await gotoNotifications(page);
  await expect(page.getByText(EN.empty)).toBeVisible();
  // PageHeader mark-all button is always present; clicking with nothing unread.
  await page.getByRole("button", { name: EN.markAll }).click();

  // Still empty, still no negative/any numeric badge on the bell.
  await expect(page.getByText(EN.empty)).toBeVisible();
  const bell = page.getByRole("button", { name: EN.bellLabel });
  await expect(bell.getByText(/^-?\d+$/)).toHaveCount(0);
});
```

### Task D8: Double-click idempotency (matrix row 11d) — `A only`

- [ ] **11d double-click mark-read → count −1, không −2** [State Transition] — nút mark-read `disabled` khi `markRead.isPending` (shared trên cả list), nên click thứ 2 bị nuốt → chỉ 1 PATCH fire → count giảm **đúng 1**. Đếm số PATCH thật fire qua `page.on("request")`; intercept PATCH để KHÔNG mutate seed (assert call-count thay vì badge thật) → tránh phải reseed.

Idempotency đo ở tầng **số request PATCH** (assertion bền hơn so với chờ badge), intercept để không chạm seed:

```ts
test("double-clicking mark-read fires the PATCH once, not twice", async ({
  page
}) => {
  let patchCount = 0;
  await page.route(LIST_RE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({
          items: [fakeItem(401)],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
        })
      )
    })
  );
  // Delay the PATCH so the button stays disabled (isPending) across the 2nd
  // click; the 2nd click must be swallowed by `disabled={isMarking}`.
  await page.route(MARK_READ_RE, async (route: Route) => {
    patchCount += 1;
    await new Promise((r) => setTimeout(r, 600));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        responseEnvelope({ ...fakeItem(401, true), id: "fake-401" })
      )
    });
  });

  await gotoNotifications(page);
  const button = markReadButtons(page).first();
  await expect(button).toBeVisible();
  // Two rapid clicks: the 2nd lands while isPending → disabled → no-op.
  await button.click();
  await button.click({ force: true }).catch(() => {});
  // Let any pending PATCH settle.
  await page.waitForTimeout(1000);
  expect(patchCount).toBe(1);
});
```

> **Lưu ý**: `isMarking` dùng chung cho mọi `NotificationItem` (1 hook/list) → trong lúc pending, click thứ 2 trên cùng nút (hoặc bất kỳ nút mark-read nào) đều bị disabled. Đây chính là forcing-function chống double-fire.

### Task D9: Persistence after reload (matrix row 11e) — `A only` (REAL mark-single)

- [ ] **11e persistence sau reload** [State Transition] — sau mark-single **thật**, **reload** trang → item ở lại Read / ra khỏi Unread (invalidate refetch server state authoritative). REAL mutation → `A only`. **DEFER auto-revert** (no mark-unread API); restore thủ công `cd server && yarn seed --clear && yarn seed`.

Đây là test mutate seed thật duy nhất được thêm (cùng nhóm với test mark-single thật đã có). Đặt trong `describe.serial("Notifications — mutations")`, **sau** test mark-single hiện có:

```ts
// REAL mutation (A only) — permanently flips one seeded item to read.
// No mark-unread API → afterAll cannot revert; restore via:
//   cd server && yarn seed --clear && yarn seed
test("a marked item stays read after a full page reload", async ({ page }) => {
  await gotoNotifications(page);
  const firstButton = markReadButtons(page).first();
  await expect(firstButton).toBeVisible();
  const firstArticle = page.locator("article").first();
  const markedTitle = (await firstArticle.getAttribute("aria-label"))?.trim();
  expect(markedTitle).toBeTruthy();

  await firstButton.click();
  // Wait for the item to leave the unread tab (invalidate → refetch).
  await expect(
    page.getByText(markedTitle!, { exact: true })
  ).toHaveCount(0, { timeout: 15_000 });

  // Reload: authoritative server state is refetched, item must stay out of Unread.
  await page.reload();
  await expect(
    page.getByRole("tab", { name: EN.unread, exact: true })
  ).toHaveAttribute("data-state", "active");
  await expect(
    page.getByText(markedTitle!, { exact: true })
  ).toHaveCount(0);

  // ...and it appears on the Read tab.
  await page.getByRole("tab", { name: EN.read, exact: true }).click();
  await expect(
    page.getByText(markedTitle!, { exact: true }).first()
  ).toBeVisible();
});
```

> Cập nhật `afterAll` trong `describe.serial` để liệt kê **cả hai** test mutate thật (mark-single hiện có + persistence mới) cần reseed thủ công.

### Task D10: `#announcer` aria-live updates (matrix row 12 NEW) — `A+B` (tab-change/load-more); mark announce — `A only`

- [ ] **12 announcer — tab change** [State Transition] `A+B` — đổi tab → `#announcer` (`aria-live="polite"`) nhận text `announce.tabChanged` (vd "Showing Read notifications."). Read-only.
- [ ] **12 announcer — load-more** `A+B` — bấm Load more (intercept paginate) → `#announcer` nhận `announce.loadingMore`. Read-only path (intercept).

`#announcer` ở root layout (`app/[locale]/layout.tsx`). `useAnnounce` ghi text vào đó. Đợi text vì announce có thể clear sau timeout:

```ts
test.describe("Notifications — announcer (aria-live)", () => {
  test("tab change announces via the #announcer live region", async ({
    page
  }) => {
    await gotoNotifications(page);
    await page.getByRole("tab", { name: EN.read, exact: true }).click();
    // The polite live region receives the tab-change announcement text.
    await expect(page.locator("#announcer")).toHaveText(
      EN.announceTabChangedRead,
      { timeout: 5_000 }
    );
  });

  test("load-more announces via the #announcer live region", async ({
    page
  }) => {
    const page1 = Array.from({ length: 20 }, (_, i) => fakeItem(i + 1));
    const page2 = Array.from({ length: 3 }, (_, i) => fakeItem(i + 21));
    await page.route(LIST_RE, (route: Route) => {
      const url = new URL(route.request().url());
      const isPage2 = url.searchParams.get("page") === "2";
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: isPage2 ? page2 : page1,
            meta: { total: 23, page: isPage2 ? 2 : 1, limit: 20, totalPages: 2 }
          })
        )
      });
    });
    await gotoNotifications(page);
    await page.getByRole("button", { name: EN.loadMore }).click();
    await expect(page.locator("#announcer")).toHaveText(
      EN.announceLoadingMore,
      { timeout: 5_000 }
    );
  });
});
```

> **`A only` announce variants (mark-read / mark-all)**: `announce.markedRead` / `announce.markedAllRead` chỉ fire trên `onSuccess` của mutation thật → cần mutate thật để assert. **DEFER** assertion live-region cho 2 case này, lý do: (a) fire một mark-read/mark-all thật chỉ để check announcer = mutate seed mà không thêm coverage so với test mark-single thật đã có (D9) + no-op (D7); (b) tránh thêm reseed burden. Tab-change + load-more (read-only/intercept) đã chứng minh `#announcer` được wire qua `useAnnounce` — đủ cho row 12 announcer. Nếu user yêu cầu thorough → có thể assert `announce.markedRead` ngay trong D9 (chồng lên mark-single thật) bằng `expect(page.locator("#announcer")).toHaveText(EN.announceMarkedRead)` sau click, KHÔNG cần test mutate riêng.

### Task D11: Keyboard activation (Enter/Space) on mark-read (matrix row 12 NEW) — `A only`

- [ ] **12 keyboard activation Enter** [State Transition] — focus nút mark-read, nhấn **Enter** → fire mark-read (cùng handler như click). Keyboard fire mutation thật → `A only`. Dùng **intercept** PATCH để KHÔNG chạm seed (assert PATCH fired, không cần badge thật) → tránh reseed.
- [ ] **12 keyboard activation Space** [State Transition] — như trên với **Space**. (Hai phím tách 2 case vì `CustomButton` là `<button>` native, Enter & Space đều activate — assert cả hai.)

Đo bằng số PATCH fire (intercept), không mutate seed:

```ts
test.describe("Notifications — keyboard activation", () => {
  for (const key of ["Enter", "Space"] as const) {
    test(`pressing ${key} on a focused mark-read button fires the mutation`, async ({
      page
    }) => {
      let patchFired = false;
      await page.route(LIST_RE, (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({
              items: [fakeItem(501)],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
            })
          )
        })
      );
      await page.route(MARK_READ_RE, (route: Route) => {
        patchFired = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            responseEnvelope({ ...fakeItem(501, true), id: "fake-501" })
          )
        });
      });

      await gotoNotifications(page);
      const button = markReadButtons(page).first();
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press(key);
      // Same handler as click → the mark-read PATCH is issued.
      await expect.poll(() => patchFired, { timeout: 5_000 }).toBe(true);
    });
  }
});
```

### Task D12: Reconcile `docs/specs/notifications-api/e2e.md`

- [ ] **Cập nhật `docs/specs/notifications-api/e2e.md`** — reconcile tài liệu kịch bản với 13 test cũ + các test backfill mới (D1–D11). Cụ thể:
  - **§3 bảng Scenarios**: ADD rows cho: 1b header bell/panel (Real+intercept, A only), 5a per-tab empty Read (Intercept), 5c null-readAt (Intercept), 6b single-full-page no-load-more (Intercept), 7 read-tab content (Real), 9 vi `/trước/` (Real), 10c mark-read failure (Intercept), 11c mark-all no-op (Intercept), 11d double-click idempotent (Intercept, A only), 11e persistence-after-reload (**Real mutates**, A only), 12 announcer tab-change/load-more (Real/Intercept), 12 keyboard Enter/Space (Intercept, A only). Cập nhật cột Gate (`A+B` vs `A only`) cho khớp matrix.
  - **§5 Teardown/reseed**: bổ sung **test 11e (persistence)** vào danh sách test mutate seed thật cần reseed thủ công (hiện chỉ liệt kê test 9). Nêu rõ: 2 test mutate thật = mark-single (cũ) + persistence-reload (mới); tất cả còn lại dùng intercept.
  - **§6 Follow-ups**: ghi các assertion **DEFER** + lý do: (a) `announce.markedRead`/`markedAllRead` live-region không test riêng (mutate-only, đã cover qua tab-change/load-more + optional piggyback trên D9); (b) auto-revert mark-single/persistence DEFER vì no mark-unread API.
  - **Verified-run note (§2)**: KHÔNG sửa số "14/14" cũ — thêm dòng mới ghi rằng suite mở rộng cần re-run + cập nhật test-count thực tế sau khi chạy `yarn e2e` (đừng claim con số chưa verify).
  - Giữ matrix (`design.md` §6) ↔ `e2e.md` ↔ test file đồng bộ: mỗi `NEW` trong matrix có đúng 1 test + 1 row e2e.md.

### Step cuối: chạy & verify (TDD green)

- [ ] **Run** — `cd client && yarn e2e e2e/notifications/notifications.e2e.ts` trên app thật đã seed (worktree FE riêng port + `E2E_BASE_URL` nếu chạy trong worktree — [[reference_e2e_worktree_devserver]], [[reference_worktree_missing_env]]). Tất cả xanh trước khi sang `requesting-code-review`. **Reseed sau khi chạy** nếu test mutate thật (D9 + mark-single cũ) đã fire: `cd server && yarn seed --clear && yarn seed`.

### Deferred (ghi rõ lý do — KHÔNG để gap im lặng)

- **`announce.markedRead` / `announce.markedAllRead` live-region (row 12)** — DEFER assertion riêng: chỉ fire trên mutation `onSuccess` thật; test riêng = mutate seed thừa, không thêm coverage so với D9/D7. Có thể piggyback trên D9 nếu muốn thorough.
- **Auto-revert cho mark-single (cũ) + persistence D9** — DEFER: **không có mark-unread API**; `afterAll` là no-op documented; restore thủ công `yarn seed --clear && yarn seed`.
- **Per-tab 2-page pagination trên backend thật** — vẫn defer (seed/tab < 20), cover bằng intercept (đã ghi trong e2e.md §6). Không đổi.
- **Loading-skeleton (`states.loading`)** — giữ defer (transient, race-prone) như e2e.md §3 hiện tại; row 10b vẫn N/A-deterministic.
- **AuthZ-FE (row 3) / Validation-FE-form (row 4)** — N/A như cũ (không có UI path foreign id; không có form page/limit). Cover ở BE. Không thêm.
