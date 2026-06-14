# Favorite Apps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho user đánh dấu/bỏ yêu thích app và đồng bộ trạng thái yêu thích trên Apps catalog, Home, và trang Favorites (Recently Used defer).

**Architecture:** Collection mới `user_favorites` (BE module `favorite` độc lập: POST/DELETE/GET `/users/me/favorites`). `web-app` module được inject `FavoriteRepository` (read-only) để annotate `isFavorite` cho mỗi item của `GET /apps`. FE: component dùng chung `FavoriteButton` + hook `useToggleFavorite` (optimistic update + rollback) dùng ở 3 view; trang Favorites wire API thật bằng `src/components/AppCard` (extract từ `views/Apps`).

**Tech Stack:** BE Express + Mongoose 8 + Joi + i18next, test Jest. FE Next.js 15 + React 19 + TanStack Query + next-intl + Tailwind/shadcn.

**Convention guards:** chạm `server/src/**` đọc `server/.claude/CLAUDE.md` + skills (`module-struct`, `standard-mongodb`, `standard-restful-api`); chạm `client/src/**` đọc `client/.claude/CLAUDE.md` + rules (`views.md`, `components.md`, `imports.md`, `accessibility.md`). Import groups bắt buộc theo `rules/imports.md` mỗi side.

**Worktrees (đã tạo, branch `feat/favorite-apps` từ `origin/main`):** `server/.worktrees/favorite-apps`, `client/.worktrees/favorite-apps`, `docs/.worktrees/favorite-apps`. Mọi path code dưới đây ghi theo repo gốc (`server/src/...`, `client/src/...`) — khi implement, làm trong worktree tương ứng.

**Commit gate (CLAUDE.md §7):** Review ON (mặc định) — implementer subagent viết HẾT code + stage, KHÔNG commit per-task; main loop trình diff tổng thể cho user duyệt 1 lần rồi mới commit. (Các "Commit" step dưới đây là điểm commit logic; under Review ON chúng gộp vào 1 lần duyệt cuối.)

---

## Decisions locked (từ design §8)

- **POST `/users/me/favorites/:appId`** → idempotent upsert, luôn trả **201** (`CreatedSuccess`), kể cả đã favorite (unique index chống trùng).
- **DELETE** → **204** (`NoContentSuccess`), idempotent.
- **GET `/users/me/favorites`** → `{ items: UserAppDto[] }`, **không phân trang**; query `search?`, `categoryId?`, `sort?` (`recent` default | `name`), filter **server-side**, lọc `status=ACTIVE` + role.
- Favorite annotate `isFavorite` trên `/apps` qua `WebAppService` inject `FavoriteRepository`.

---

## File Structure

### Backend (`server/`)

| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `src/constants/models.ts` | thêm `USER_FAVORITE: "UserFavorite"` | Modify |
| `src/constants/error-code.ts` | thêm nhóm `// ── Favorite ──` | Modify |
| `src/models/user-favorite.ts` | Mongoose schema `user_favorites` | Create |
| `src/modules/favorite/types/index.ts` | `UserFavoriteDocument`, typed requests, query | Create |
| `src/modules/favorite/dtos/{favorite-app.dto.ts,index.ts}` | (reuse UserAppDto shape) | Create |
| `src/modules/favorite/favorite.repository.ts` | `FavoriteRepository` contract + Mongo impl | Create |
| `src/modules/favorite/guards/{app-favoritable.guard.ts,index.ts}` | validate app active + role-visible | Create |
| `src/modules/favorite/favorite.service.ts` | add/remove/list business logic | Create |
| `src/modules/favorite/favorite.service.spec.ts` | unit tests | Create |
| `src/modules/favorite/favorite.controller.ts` | handlers | Create |
| `src/modules/favorite/favorite.routes.ts` | route factory | Create |
| `src/modules/favorite/favorite.module.ts` | DI wiring + export router + repo | Create |
| `src/validators/schemas/favorite.ts` | Joi param/query schemas | Create |
| `src/i18n/locales/{en,vi}/favorite.json` | success/errors/validation | Create |
| `src/i18n/locales/{en,vi}/*` index/registration | register `favorite` namespace | Modify (theo cơ chế i18n hiện có) |
| `src/loaders/modules.loader.ts` | register favorite module | Modify |
| `src/modules/web-app/repositories/web-app.repository.ts` | `findFavoritedAppIds`, `findActiveByIds` | Modify |
| `src/modules/web-app/dtos/user-app.dto.ts` | `isFavorite` field + mapper param | Modify |
| `src/modules/web-app/web-app.service.ts` | annotate isFavorite trong `listUserApps` | Modify |
| `src/modules/web-app/web-app.module.ts` | inject `MongoFavoriteRepository` | Modify |
| `src/modules/web-app/web-app.service.spec.ts` | cập nhật mock repos + test isFavorite | Modify |
| `src/modules/web-app/swagger/*` | doc `isFavorite` + 3 endpoint favorites | Modify |

### Frontend (`client/`)

| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `src/types/Apps/index.ts` | `UserApp.isFavorite` + `FavoritesSortKey` | Modify |
| `src/constants/endpoints.ts` | `FAVORITES`, `FAVORITE_TOGGLE` | Modify |
| `src/constants/queryKeys.ts` | `FAVORITES` | Modify |
| `src/requests/favorites.ts` | `getFavorites/addFavorite/removeFavorite` | Create |
| `src/components/FavoriteButton/index.tsx` | nút tim dùng chung | Create |
| `src/components/AppCard/index.tsx` | card app dùng chung (extract) + heart | Create |
| `src/hooks/useToggleFavorite.ts` | mutation optimistic + rollback + announce | Create |
| `src/hooks/index.ts` | export `useToggleFavorite` | Modify |
| `src/views/Apps/components/AppCard/index.tsx` | **DELETE** (thay bằng shared) | Delete |
| `src/views/Apps/mains/AppsBoard/index.tsx` | dùng shared AppCard + truyền isFavorite/toggle | Modify |
| `src/views/Favorites/index.tsx` | compose | Modify |
| `src/views/Favorites/mains/PageHeader/index.tsx` | title/description (bỏ mock count) | Modify |
| `src/views/Favorites/mains/FavoritesGrid/index.tsx` | wire API thật + shared AppCard | Modify |
| `src/views/Favorites/hooks/useFavorites.ts` | query GET favorites | Create |
| `src/views/Favorites/components/FavoriteAppCard/index.tsx` | **DELETE** | Delete |
| `src/mocks/Favorites` (`.ts` hoặc folder) | **DELETE** | Delete |
| `src/views/Home/components/QuickAccessCard/index.tsx` | thêm heart (sibling, không nested) | Modify |
| `src/views/Home/components/RecommendedAppCard/index.tsx` | thêm heart | Modify |
| `src/views/Home/mains/{QuickAccessSection,RecommendedSection}/index.tsx` | truyền `id`+`isFavorite` | Modify |
| `src/locales/{en,vi}/favorites.json` | reconcile (bỏ rating/reviews, thêm button/toast) | Modify |
| `src/locales/{en,vi}/apps.json` | thêm `card.addFavorite/removeFavorite` + announce | Modify |
| `client/e2e/favorite-apps/*.e2e.ts` | E2E suite | Create |

---

# PHASE 1 — BACKEND

## Task BE-1: Model `user_favorites` + constants + i18n

**Files:**
- Modify: `server/src/constants/models.ts`
- Modify: `server/src/constants/error-code.ts`
- Create: `server/src/models/user-favorite.ts`
- Create: `server/src/i18n/locales/en/favorite.json`, `server/src/i18n/locales/vi/favorite.json`
- Modify: i18n namespace registration (en + vi) theo cơ chế hiện có

- [ ] **Step 1: Add MODEL_NAMES key.** Trong `models.ts`, thêm sau `WEB_APP_CATEGORY`:

```typescript
  ENTITLEMENT: "Entitlement",
  USER_FAVORITE: "UserFavorite",
```

- [ ] **Step 2: Add ERROR_CODES group.** Trong `error-code.ts`, thêm nhóm mới (sau nhóm Web App):

```typescript
  // ── Favorite ──
  FAVORITE_APP_NOT_FOUND: "FAVORITE_APP_NOT_FOUND",
```

- [ ] **Step 3: Create model** `server/src/models/user-favorite.ts`:

```typescript
// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { UserFavoriteDocument } from "@/modules/favorite/types";
// others
import { MODEL_NAMES } from "@/constants/models";

const { USER_FAVORITE, USER, WEB_APP } = MODEL_NAMES;

const UserFavoriteSchema = new Schema<UserFavoriteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "User ID is required"]
    },
    webAppId: {
      type: Schema.Types.ObjectId,
      ref: WEB_APP,
      required: [true, "Web app ID is required"]
    }
  },
  {
    collection: "user_favorites",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

UserFavoriteSchema.index({ userId: 1, webAppId: 1 }, { unique: true });
UserFavoriteSchema.index({ userId: 1, createdAt: -1 });

UserFavoriteSchema.virtual("webApp", {
  ref: WEB_APP,
  localField: "webAppId",
  foreignField: "_id",
  justOne: true
});

const UserFavoriteModel: Model<UserFavoriteDocument> =
  model<UserFavoriteDocument>(USER_FAVORITE, UserFavoriteSchema);

export default UserFavoriteModel;
```

- [ ] **Step 4: Create i18n** `server/src/i18n/locales/en/favorite.json`:

```json
{
  "success": {
    "add": "App added to favorites.",
    "remove": "App removed from favorites.",
    "list": "Favorite apps retrieved successfully."
  },
  "errors": {
    "appNotFound": "App not found or not available."
  },
  "validation": {
    "appId": {
      "required": "App id is required.",
      "invalid": "Invalid app id."
    },
    "sort": {
      "invalid": "Invalid sort value."
    }
  }
}
```

`server/src/i18n/locales/vi/favorite.json`:

```json
{
  "success": {
    "add": "Đã thêm ứng dụng vào yêu thích.",
    "remove": "Đã xóa ứng dụng khỏi yêu thích.",
    "list": "Lấy danh sách ứng dụng yêu thích thành công."
  },
  "errors": {
    "appNotFound": "Không tìm thấy ứng dụng hoặc ứng dụng không khả dụng."
  },
  "validation": {
    "appId": {
      "required": "Thiếu mã ứng dụng.",
      "invalid": "Mã ứng dụng không hợp lệ."
    },
    "sort": {
      "invalid": "Giá trị sắp xếp không hợp lệ."
    }
  }
}
```

- [ ] **Step 5: Register `favorite` namespace** trong i18n loader (mirror cách `webApp`/`notification` được đăng ký — đọc `server/src/i18n/` để tìm file index gộp namespace, thêm `favorite`).

- [ ] **Step 6: Commit**

```bash
git add server/src/constants/models.ts server/src/constants/error-code.ts server/src/models/user-favorite.ts server/src/i18n/locales/en/favorite.json server/src/i18n/locales/vi/favorite.json server/src/i18n
git commit -m "feat(favorite): add user_favorites model, error code, i18n"
```

## Task BE-2: Types + DTO

**Files:**
- Create: `server/src/modules/favorite/types/index.ts`
- Create: `server/src/modules/favorite/dtos/favorite-app.dto.ts`, `server/src/modules/favorite/dtos/index.ts`

- [ ] **Step 1: types** `server/src/modules/favorite/types/index.ts`:

```typescript
// types
import type { Request } from "express";
import type { Schema } from "mongoose";

export interface UserFavoriteDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  createdAt: Date;
}

export type FavoriteSort = "recent" | "name";

export interface ListFavoritesQuery {
  search?: string;
  categoryId?: string;
  sort?: FavoriteSort;
}

export interface FavoriteAppIdParams {
  appId: string;
}

export interface FavoriteAppIdRequest extends Omit<Request, "params"> {
  params: FavoriteAppIdParams;
}

export interface ListFavoritesRequest extends Omit<Request, "query"> {
  query: ListFavoritesQuery;
}
```

- [ ] **Step 2: DTO** — favorites trả về cùng shape `UserAppDto` của web-app + `isFavorite: true`. Tái dùng bằng cách import từ web-app. `server/src/modules/favorite/dtos/favorite-app.dto.ts`:

```typescript
// types
import type { WebAppWithCategory } from "@/modules/web-app/types";
import type { UserAppDto } from "@/modules/web-app/dtos";

export const toFavoriteAppDto = (doc: WebAppWithCategory): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  category: doc.category?.displayName ?? null,
  isFavorite: true
});
```

> Lưu ý: `UserAppDto` sẽ có thêm `isFavorite` ở Task BE-8. Task BE-8 phải hoàn thành trước khi type-check pass; thứ tự build BE-8 trước hoặc cùng đợt.

`server/src/modules/favorite/dtos/index.ts`:

```typescript
export { toFavoriteAppDto } from "./favorite-app.dto";
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/favorite/types server/src/modules/favorite/dtos
git commit -m "feat(favorite): add types and dto"
```

## Task BE-3: Repository

**Files:**
- Create: `server/src/modules/favorite/favorite.repository.ts`

- [ ] **Step 1: Implement** `server/src/modules/favorite/favorite.repository.ts`:

```typescript
// libs
import { Types } from "mongoose";
// types
import type { UserFavoriteDocument } from "@/modules/favorite/types";
// models
import UserFavoriteModel from "@/models/user-favorite";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type FavoriteRepository = {
  add(userId: string, webAppId: string): Promise<void>;
  remove(userId: string, webAppId: string): Promise<void>;
  findWebAppIdsByUser(userId: string): Promise<string[]>;
  findFavoritedAppIds(userId: string, webAppIds: string[]): Promise<Set<string>>;
};

export class MongoFavoriteRepository implements FavoriteRepository {
  async add(userId: string, webAppId: string): Promise<void> {
    return asyncDatabaseHandler("favorite.add", async () => {
      await UserFavoriteModel.updateOne(
        {
          userId: new Types.ObjectId(userId),
          webAppId: new Types.ObjectId(webAppId)
        },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      ).exec();
    });
  }

  async remove(userId: string, webAppId: string): Promise<void> {
    return asyncDatabaseHandler("favorite.remove", async () => {
      await UserFavoriteModel.deleteOne({
        userId: new Types.ObjectId(userId),
        webAppId: new Types.ObjectId(webAppId)
      }).exec();
    });
  }

  async findWebAppIdsByUser(userId: string): Promise<string[]> {
    return asyncDatabaseHandler("favorite.findWebAppIdsByUser", async () => {
      const docs = await UserFavoriteModel.find({
        userId: new Types.ObjectId(userId)
      })
        .sort({ createdAt: -1 })
        .select("webAppId")
        .lean<Pick<UserFavoriteDocument, "webAppId">[]>()
        .exec();
      return docs.map((d) => d.webAppId.toString());
    });
  }

  async findFavoritedAppIds(
    userId: string,
    webAppIds: string[]
  ): Promise<Set<string>> {
    return asyncDatabaseHandler("favorite.findFavoritedAppIds", async () => {
      if (webAppIds.length === 0) return new Set<string>();
      const docs = await UserFavoriteModel.find({
        userId: new Types.ObjectId(userId),
        webAppId: { $in: webAppIds.map((id) => new Types.ObjectId(id)) }
      })
        .select("webAppId")
        .lean<Pick<UserFavoriteDocument, "webAppId">[]>()
        .exec();
      return new Set(docs.map((d) => d.webAppId.toString()));
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/favorite/favorite.repository.ts
git commit -m "feat(favorite): add repository"
```

## Task BE-4: Guard `AppFavoritableGuard`

**Files:**
- Create: `server/src/modules/favorite/guards/app-favoritable.guard.ts`, `server/src/modules/favorite/guards/index.ts`

- [ ] **Step 1: Implement** `app-favoritable.guard.ts`:

```typescript
// types
import type { WebAppRepository } from "@/modules/web-app/repositories";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import { WEB_APP_STATUSES } from "@/modules/web-app/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class AppFavoritableGuard {
  constructor(private readonly webAppRepo: WebAppRepository) {}

  async assert(appId: string, role?: string): Promise<void> {
    const app = await this.webAppRepo.findById(appId);
    const visible =
      app !== null &&
      app.status === WEB_APP_STATUSES.ACTIVE &&
      (role === AUTHENTICATION_ROLES.ADMIN ||
        app.requiredRoles.includes(AUTHENTICATION_ROLES.USER));

    if (!visible) {
      throw new NotFoundError({
        i18nMessage: (t) => t("favorite:errors.appNotFound"),
        code: ERROR_CODES.FAVORITE_APP_NOT_FOUND
      });
    }
  }
}
```

`server/src/modules/favorite/guards/index.ts`:

```typescript
export { AppFavoritableGuard } from "./app-favoritable.guard";
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/favorite/guards
git commit -m "feat(favorite): add app-favoritable guard"
```

## Task BE-5: Service (TDD)

**Files:**
- Create: `server/src/modules/favorite/favorite.service.ts`
- Create: `server/src/modules/favorite/favorite.service.spec.ts`
- Modify (BE-8 dependency): needs `WebAppRepository.findActiveByIds`

> Service deps: `FavoriteRepository`, `WebAppRepository` (đọc apps để list + validate qua guard), `AppFavoritableGuard`. userId/role lấy từ `RequestContext`.

- [ ] **Step 1: Write failing test** `server/src/modules/favorite/favorite.service.spec.ts`:

```typescript
// service
import { FavoriteService } from "./favorite.service";
// modules
import { NotFoundError } from "@/common/exceptions";
import { RequestContext } from "@/utils/request-context";

const USER = "507f1f77bcf86cd799439011";

const makeDeps = () => {
  const favoriteRepo = {
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    findWebAppIdsByUser: jest.fn().mockResolvedValue([]),
    findFavoritedAppIds: jest.fn().mockResolvedValue(new Set<string>())
  };
  const webAppRepo = {
    findById: jest.fn(),
    findActiveByIds: jest.fn().mockResolvedValue([])
  };
  const guard = { assert: jest.fn().mockResolvedValue(undefined) };
  return { favoriteRepo, webAppRepo, guard };
};

const appDoc = (id: string, name: string) => ({
  _id: { toString: () => id },
  displayName: name,
  description: null,
  iconUrl: null,
  homeUrl: `https://${name}.example.com`,
  category: { displayName: "Productivity" }
});

describe("FavoriteService", () => {
  beforeEach(() => {
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
    jest
      .spyOn(RequestContext, "getUser")
      .mockReturnValue({ sub: USER, authId: "a1", roles: "user" });
  });
  afterEach(() => jest.restoreAllMocks());

  it("add: asserts favoritable then upserts", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    await svc.add("app1");
    expect(guard.assert).toHaveBeenCalledWith("app1", "user");
    expect(favoriteRepo.add).toHaveBeenCalledWith(USER, "app1");
  });

  it("add: throws when guard rejects (app not favoritable)", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    guard.assert.mockRejectedValue(new NotFoundError({ message: "x" }));
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    await expect(svc.add("bad")).rejects.toBeInstanceOf(NotFoundError);
    expect(favoriteRepo.add).not.toHaveBeenCalled();
  });

  it("remove: deletes without guard (idempotent)", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    await svc.remove("app1");
    expect(favoriteRepo.remove).toHaveBeenCalledWith(USER, "app1");
  });

  it("list: returns favorited apps sorted by recency, isFavorite true", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue(["app2", "app1"]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      appDoc("app1", "alpha"),
      appDoc("app2", "beta")
    ]);
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    const res = await svc.list({ sort: "recent" });
    expect(res.items.map((i) => i._id)).toEqual(["app2", "app1"]);
    expect(res.items.every((i) => i.isFavorite)).toBe(true);
  });

  it("list: sort=name orders alphabetically", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue(["app2", "app1"]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      appDoc("app1", "alpha"),
      appDoc("app2", "beta")
    ]);
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    const res = await svc.list({ sort: "name" });
    expect(res.items.map((i) => i.displayName)).toEqual(["alpha", "beta"]);
  });

  it("list: empty favorites returns empty items without querying apps", async () => {
    const { favoriteRepo, webAppRepo, guard } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue([]);
    const svc = new FavoriteService(
      favoriteRepo as never,
      webAppRepo as never,
      guard as never
    );
    const res = await svc.list({});
    expect(res.items).toEqual([]);
    expect(webAppRepo.findActiveByIds).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL** (service not implemented):

Run: `cd server && npx jest --testMatch "**/favorite.service.spec.ts"`
Expected: FAIL ("Cannot find module './favorite.service'").
(Trong worktree, jest <rootDir> glob có thể hỏng — dùng `npx jest --testMatch "**/?(*.)+(spec).ts" -t FavoriteService` nếu cần — xem reference_jest_worktree_testmatch.)

- [ ] **Step 3: Implement** `server/src/modules/favorite/favorite.service.ts`:

```typescript
// types
import type { FavoriteRepository } from "./favorite.repository";
import type { WebAppRepository } from "@/modules/web-app/repositories";
import type { AppFavoritableGuard } from "./guards";
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQuery } from "./types";
// dtos
import { toFavoriteAppDto } from "./dtos";
// others
import { RequestContext } from "@/utils/request-context";

export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly favoritableGuard: AppFavoritableGuard
  ) {}

  async add(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;
    await this.favoritableGuard.assert(appId, role);
    await this.favoriteRepo.add(userId, appId);
  }

  async remove(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    await this.favoriteRepo.remove(userId, appId);
  }

  async list(query: ListFavoritesQuery): Promise<{ items: UserAppDto[] }> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;

    const orderedIds = await this.favoriteRepo.findWebAppIdsByUser(userId);
    if (orderedIds.length === 0) return { items: [] };

    const docs = await this.webAppRepo.findActiveByIds(orderedIds, {
      role,
      search: query.search,
      categoryId: query.categoryId
    });

    let items = docs.map(toFavoriteAppDto);

    if (query.sort === "name") {
      items = [...items].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
    } else {
      const rank = new Map(orderedIds.map((id, idx) => [id, idx]));
      items = [...items].sort(
        (a, b) => (rank.get(a._id) ?? 0) - (rank.get(b._id) ?? 0)
      );
    }

    return { items };
  }
}
```

- [ ] **Step 4: Run test, expect PASS.** Run: `cd server && npx jest --testMatch "**/favorite.service.spec.ts"` → all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/favorite/favorite.service.ts server/src/modules/favorite/favorite.service.spec.ts
git commit -m "feat(favorite): add service with unit tests"
```

## Task BE-6: Validators + Controller + Routes

**Files:**
- Create: `server/src/validators/schemas/favorite.ts`
- Create: `server/src/modules/favorite/favorite.controller.ts`
- Create: `server/src/modules/favorite/favorite.routes.ts`

- [ ] **Step 1: Validators** `server/src/validators/schemas/favorite.ts`:

```typescript
// libs
import Joi from "joi";
// types
import type { FavoriteAppIdParams, ListFavoritesQuery } from "@/modules/favorite/types";
// validators
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";

export const favoriteAppIdParamSchema: Joi.ObjectSchema<FavoriteAppIdParams> =
  Joi.object({
    appId: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
      "string.empty": "favorite:validation.appId.required",
      "any.required": "favorite:validation.appId.required",
      "string.pattern.base": "favorite:validation.appId.invalid"
    })
  });

export const listFavoritesQuerySchema: Joi.ObjectSchema<ListFavoritesQuery> =
  Joi.object({
    search: Joi.string().trim().max(SEARCH_MAX_LENGTH).optional().messages({
      "string.max": "validation:search.invalid"
    }),
    categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
      "string.pattern.base": "validation:categoryId.invalid"
    }),
    sort: Joi.string().valid("recent", "name").optional().messages({
      "any.only": "favorite:validation.sort.invalid"
    })
  }).options({ stripUnknown: true });
```

> Nếu `SEARCH_MAX_LENGTH` chưa export trong `validators/constants.ts`, copy cách `web-app` schema dùng (xác minh tên hằng khi implement).

- [ ] **Step 2: Controller** `server/src/modules/favorite/favorite.controller.ts`:

```typescript
// types
import type { Response } from "express";
import type {
  FavoriteAppIdRequest,
  ListFavoritesRequest
} from "@/modules/favorite/types";
import type { FavoriteService } from "./favorite.service";
// commons
import { CreatedSuccess, NoContentSuccess, OkSuccess } from "@/common/responses";

export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  add = async (req: FavoriteAppIdRequest, res: Response): Promise<void> => {
    await this.service.add(req.params.appId);
    new CreatedSuccess({ message: "favorite:success.add" }).send(req, res);
  };

  remove = async (req: FavoriteAppIdRequest, res: Response): Promise<void> => {
    await this.service.remove(req.params.appId);
    new NoContentSuccess({ message: "favorite:success.remove" }).send(req, res);
  };

  list = async (req: ListFavoritesRequest, res: Response): Promise<void> => {
    const data = await this.service.list(req.query);
    new OkSuccess({ data, message: "favorite:success.list" }).send(req, res);
  };
}
```

> Xác minh constructor signature của `CreatedSuccess`/`NoContentSuccess`/`OkSuccess` trong `server/src/common/responses/index.ts` (data optional). Nếu `CreatedSuccess` bắt buộc `data`, truyền `{ data: null, message }`.

- [ ] **Step 3: Routes** `server/src/modules/favorite/favorite.routes.ts`:

```typescript
// libs
import { Router } from "express";
// types
import type { FavoriteController } from "./favorite.controller";
// validators
import {
  favoriteAppIdParamSchema,
  listFavoritesQuerySchema
} from "@/validators/schemas/favorite";
// others
import { authGuard, paramsPipe, queryPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createFavoriteUserRoutes = (
  controller: FavoriteController
): Router => {
  const router = Router();
  const favorites = Router();

  favorites.use(authGuard);

  favorites.get(
    "/",
    queryPipe(listFavoritesQuerySchema),
    asyncHandler(controller.list)
  );
  favorites.post(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    asyncHandler(controller.add)
  );
  favorites.delete(
    "/:appId",
    paramsPipe(favoriteAppIdParamSchema),
    asyncHandler(controller.remove)
  );

  router.use("/users/me/favorites", favorites);
  return router;
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/validators/schemas/favorite.ts server/src/modules/favorite/favorite.controller.ts server/src/modules/favorite/favorite.routes.ts
git commit -m "feat(favorite): add validators, controller, routes"
```

## Task BE-7: Module factory + loader registration

**Files:**
- Create: `server/src/modules/favorite/favorite.module.ts`
- Modify: `server/src/loaders/modules.loader.ts`

- [ ] **Step 1: Module factory** `server/src/modules/favorite/favorite.module.ts`:

```typescript
// others
import { MongoFavoriteRepository } from "./favorite.repository";
import { MongoWebAppRepository } from "@/modules/web-app/repositories";
import { AppFavoritableGuard } from "./guards";
import { FavoriteService } from "./favorite.service";
import { FavoriteController } from "./favorite.controller";
import { createFavoriteUserRoutes } from "./favorite.routes";

export const createFavoriteModule = () => {
  const favoriteRepo = new MongoFavoriteRepository();
  const webAppRepo = new MongoWebAppRepository();
  const guard = new AppFavoritableGuard(webAppRepo);
  const service = new FavoriteService(favoriteRepo, webAppRepo, guard);
  const controller = new FavoriteController(service);

  return {
    favoriteRepository: favoriteRepo,
    favoriteUserRouter: createFavoriteUserRoutes(controller)
  };
};
```

> Xác minh `MongoWebAppRepository` được export từ `@/modules/web-app/repositories` barrel.

- [ ] **Step 2: Register in loader.** Trong `server/src/loaders/modules.loader.ts`:
  - thêm import: `import { createFavoriteModule } from "@/modules/favorite/favorite.module";`
  - thêm field `favorite: Router;` vào interface `ModuleRoutes`.
  - trong `loadModules`: `const { favoriteUserRouter } = createFavoriteModule();`
  - trong `mountRoutes` (mục User): `v1Router.use(routes.favorite);`
  - truyền `favorite: favoriteUserRouter` vào object `mountRoutes(app, {...})`.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/favorite/favorite.module.ts server/src/loaders/modules.loader.ts
git commit -m "feat(favorite): wire module into loader"
```

## Task BE-8: web-app — `isFavorite` annotation + `findActiveByIds`

**Files:**
- Modify: `server/src/modules/web-app/repositories/web-app.repository.ts`
- Modify: `server/src/modules/web-app/dtos/user-app.dto.ts`
- Modify: `server/src/modules/web-app/web-app.service.ts`
- Modify: `server/src/modules/web-app/web-app.module.ts`
- Modify: `server/src/modules/web-app/web-app.service.spec.ts`

- [ ] **Step 1: DTO** — add `isFavorite` to `UserAppDto` + mapper param. `user-app.dto.ts`:

```typescript
// types
import type { WebAppWithCategory } from "../types";

export interface UserAppDto {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  isFavorite: boolean;
}

export const toUserAppDto = (
  doc: WebAppWithCategory,
  isFavorite = false
): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  category: doc.category?.displayName ?? null,
  isFavorite
});
```

- [ ] **Step 2: Repository** — add to `WebAppRepository` contract + Mongo impl in `web-app.repository.ts`:

```typescript
  // contract additions
  findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategory[]>;
```

Implementation (mirror `findActivePaginated`; build filter `_id $in ids` + active + role + optional search/category — reuse `buildWebAppFilter` if it accepts these, else inline):

```typescript
  async findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategory[]> {
    return asyncDatabaseHandler("findActiveByIds", () => {
      const mongoFilter = buildWebAppFilter({
        search: filter.search,
        status: "active",
        categoryId: filter.categoryId
      });
      mongoFilter._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
      if (filter.role !== AUTHENTICATION_ROLES.ADMIN) {
        mongoFilter.requiredRoles = AUTHENTICATION_ROLES.USER;
      }
      return WebAppModel.find(mongoFilter)
        .populate<{ category: WebAppCategoryDocument | null }>({
          path: "category",
          select: "displayName"
        })
        .lean<WebAppWithCategory[]>()
        .exec();
    });
  }
```

> Import `Types` (mongoose), `buildWebAppFilter`, `AUTHENTICATION_ROLES`, `WebAppCategoryDocument` nếu chưa có trong file — xác minh existing imports. `buildWebAppFilter` ở `web-app/helpers`.

- [ ] **Step 3: Service** — inject `FavoriteRepository`, annotate `isFavorite` in `listUserApps`. `web-app.service.ts`:

```typescript
// add ctor param:
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly categoryRepo: WebAppCategoryRepository,
    private readonly favoriteRepo: FavoriteRepository
  ) {}
```

Trong `listUserApps`, sau khi có `docs`:

```typescript
    const userId = RequestContext.getUserId();
    const favoriteIds = userId
      ? await this.favoriteRepo.findFavoritedAppIds(
          userId,
          docs.map((d) => d._id.toString())
        )
      : new Set<string>();

    return {
      items: docs.map((d) => toUserAppDto(d, favoriteIds.has(d._id.toString()))),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
    };
```

Add imports: `import type { FavoriteRepository } from "@/modules/favorite/favorite.repository";` (types group) + `import { RequestContext } from "@/utils/request-context";` (others).

- [ ] **Step 4: Module** — `web-app.module.ts`: construct + inject favorite repo:

```typescript
import { MongoFavoriteRepository } from "@/modules/favorite/favorite.repository";
// ...
  const favoriteRepo = new MongoFavoriteRepository();
  const service = new WebAppService(webAppRepo, categoryRepo, favoriteRepo);
```

- [ ] **Step 5: Update spec** `web-app.service.spec.ts` — add `favoriteRepo` to `makeRepos()` and pass as 3rd ctor arg everywhere `new WebAppService(...)` is called; add a test for isFavorite:

```typescript
  // in makeRepos():
  const favoriteRepo = {
    findFavoritedAppIds: jest.fn().mockResolvedValue(new Set<string>())
  };
  return { webAppRepo, categoryRepo, favoriteRepo };
```

Update every `new WebAppService(webAppRepo as any, categoryRepo as any)` → `new WebAppService(webAppRepo as any, categoryRepo as any, favoriteRepo as any)`. Add test:

```typescript
describe("WebAppService.listUserApps isFavorite", () => {
  it("marks isFavorite=true for favorited app ids", async () => {
    const { webAppRepo, categoryRepo, favoriteRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([
      { _id: { toString: () => "app1" }, displayName: "A", description: null, iconUrl: null, homeUrl: "h", category: null },
      { _id: { toString: () => "app2" }, displayName: "B", description: null, iconUrl: null, homeUrl: "h", category: null }
    ]);
    webAppRepo.countActive.mockResolvedValue(2);
    favoriteRepo.findFavoritedAppIds.mockResolvedValue(new Set(["app1"]));
    jest.spyOn(RequestContext, "getUserId").mockReturnValue("u1");
    const service = new WebAppService(webAppRepo as any, categoryRepo as any, favoriteRepo as any);
    const res = await service.listUserApps({}, "user");
    expect(res.items.find((i) => i._id === "app1")?.isFavorite).toBe(true);
    expect(res.items.find((i) => i._id === "app2")?.isFavorite).toBe(false);
  });
});
```

Add `import { RequestContext } from "@/utils/request-context";` to spec; `afterEach(() => jest.restoreAllMocks())`.

- [ ] **Step 6: Run BE tests, expect PASS.** Run: `cd server && npx jest --testMatch "**/web-app.service.spec.ts" "**/favorite.service.spec.ts"` → pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/web-app
git commit -m "feat(web-app): annotate isFavorite on /apps, add findActiveByIds"
```

## Task BE-9: Swagger/API docs

**Files:**
- Modify: `server/src/modules/web-app/swagger/*` (add `isFavorite` to user app schema)
- Add favorite endpoints doc (theo `standard-doc-api`): POST/DELETE/GET `/users/me/favorites`. Đặt swagger trong `server/src/modules/favorite/swagger/` nếu module khác làm vậy, hoặc nơi quy ước.

- [ ] **Step 1:** Update user-app response schema thêm `isFavorite: boolean`. Add 3 favorite paths với security bearer, params `appId`, query `search/categoryId/sort`, responses 201/204/200/400/401/404.
- [ ] **Step 2: Commit**

```bash
git add server/src/modules
git commit -m "docs(favorite): swagger for favorites endpoints + isFavorite"
```

## Task BE-GREEN: Backend green checks

- [ ] Run (must all pass): `cd server && yarn format && yarn lint && yarn type-check && yarn test && yarn build`
- [ ] Fix any error, re-run until green. (Trong worktree: nếu jest `<rootDir>` glob hỏng → `npx jest --testMatch "**/?(*.)+(spec).ts"`; lint/tsc nhiễu `.worktrees` → lint touched files trực tiếp — xem [[reference_worktrees_lint_noise]].)

---

# PHASE 2 — FRONTEND

## Task FE-1: Types + constants + requests

**Files:**
- Modify: `client/src/types/Apps/index.ts`
- Modify: `client/src/constants/endpoints.ts`, `client/src/constants/queryKeys.ts`
- Create: `client/src/requests/favorites.ts`

- [ ] **Step 1: Types** — add `isFavorite` + sort type in `types/Apps/index.ts`:

```typescript
export interface UserApp {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  isFavorite: boolean;
}

export type FavoritesSortKey = "recent" | "name";

export interface FavoritesQueryParams {
  search?: string;
  categoryId?: string;
  sort?: FavoritesSortKey;
}

export interface FavoritesResponse {
  items: UserApp[];
}
```

- [ ] **Step 2: Endpoints** — add to `endpoints.ts` (App Registry group):

```typescript
  FAVORITES: "/users/me/favorites",
  FAVORITE_TOGGLE: (appId: string) => `/users/me/favorites/${appId}`,
```

- [ ] **Step 3: Query key** — add to `queryKeys.ts`:

```typescript
  FAVORITES: "favorites",
```

- [ ] **Step 4: Requests** `client/src/requests/favorites.ts`:

```typescript
// types
import type { FavoritesQueryParams, FavoritesResponse } from "@/types/Apps";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const getFavorites = async (
  params?: FavoritesQueryParams
): Promise<FavoritesResponse> => {
  const response = await axiosInstance.get<ResponsePattern<FavoritesResponse>>(
    END_POINTS.FAVORITES,
    { params }
  );
  return response.data.data;
};

export const addFavorite = async (appId: string): Promise<void> => {
  await axiosInstance.post(END_POINTS.FAVORITE_TOGGLE(appId));
};

export const removeFavorite = async (appId: string): Promise<void> => {
  await axiosInstance.delete(END_POINTS.FAVORITE_TOGGLE(appId));
};
```

- [ ] **Step 5: Commit**

```bash
git add client/src/types/Apps client/src/constants/endpoints.ts client/src/constants/queryKeys.ts client/src/requests/favorites.ts
git commit -m "feat(fe-favorite): types, endpoints, query key, requests"
```

## Task FE-2: Shared `FavoriteButton`

**Files:**
- Create: `client/src/components/FavoriteButton/index.tsx`

- [ ] **Step 1: Implement** (props inline per `rules/types.md`; uses `CustomButton` icon-sm ghost; `aria-pressed` reflects favorite; `Heart` filled when active):

```tsx
// libs
import { Heart } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";
// others
import { cn } from "@/libs/utils";

const FavoriteButton = ({
  isFavorite,
  pending = false,
  addLabel,
  removeLabel,
  onToggle
}: {
  isFavorite: boolean;
  pending?: boolean;
  addLabel: string;
  removeLabel: string;
  onToggle: () => void;
}) => (
  <CustomButton
    size="icon-sm"
    variant="ghost"
    type="button"
    disabled={pending}
    aria-pressed={isFavorite}
    aria-label={isFavorite ? removeLabel : addLabel}
    onClick={onToggle}
    className={cn(
      "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
      isFavorite && "text-destructive hover:text-destructive"
    )}
  >
    <Heart
      className={cn("size-5", isFavorite && "fill-destructive")}
      aria-hidden="true"
    />
  </CustomButton>
);

export default FavoriteButton;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/FavoriteButton
git commit -m "feat(fe-favorite): shared FavoriteButton component"
```

## Task FE-3: Shared `useToggleFavorite` (optimistic) + `useFavorites`

**Files:**
- Create: `client/src/hooks/useToggleFavorite.ts`
- Modify: `client/src/hooks/index.ts` (export)
- Create: `client/src/views/Favorites/hooks/useFavorites.ts`

- [ ] **Step 1: `useToggleFavorite`** — optimistic update across APPS + FAVORITES caches, rollback on error, announce + toast. `client/src/hooks/useToggleFavorite.ts`:

```typescript
"use client";
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { PaginatedUserAppsResponse, FavoritesResponse, UserApp } from "@/types/Apps";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { addFavorite, removeFavorite } from "@/requests/favorites";
// others
import CONSTANTS from "@/constants";

const { QUERY_KEYS } = CONSTANTS;

const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("favorites");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: ({ appId, isFavorite }: { appId: string; isFavorite: boolean }) =>
      isFavorite ? removeFavorite(appId) : addFavorite(appId),
    onMutate: async ({ appId, isFavorite }) => {
      const next = !isFavorite;
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.APPS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.FAVORITES] });
      const prevApps = queryClient.getQueriesData<PaginatedUserAppsResponse>({
        queryKey: [QUERY_KEYS.APPS]
      });
      const prevFavs = queryClient.getQueriesData<FavoritesResponse>({
        queryKey: [QUERY_KEYS.FAVORITES]
      });
      queryClient.setQueriesData<PaginatedUserAppsResponse>(
        { queryKey: [QUERY_KEYS.APPS] },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((a: UserApp) =>
                  a._id === appId ? { ...a, isFavorite: next } : a
                )
              }
            : old
      );
      queryClient.setQueriesData<FavoritesResponse>(
        { queryKey: [QUERY_KEYS.FAVORITES] },
        (old) =>
          old
            ? { items: old.items.filter((a: UserApp) => a._id !== appId) }
            : old
      );
      return { prevApps, prevFavs };
    },
    onError: (_err, _vars, context) => {
      context?.prevApps?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      context?.prevFavs?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error(t("toast.error"));
      announce(t("announce.error"));
    },
    onSuccess: (_data, { isFavorite }) => {
      announce(isFavorite ? t("announce.removed") : t("announce.added"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FAVORITES] });
    }
  });
};

export default useToggleFavorite;
```

> Pattern này là optimistic update mới (chưa có tiền lệ trong repo). Note trong PR. `announce` dùng key không tham số (added/removed generic) — nếu muốn kèm tên app, đổi sang nhận `name` trong variables.

- [ ] **Step 2: Export** — add to `client/src/hooks/index.ts`: `export { default as useToggleFavorite } from "./useToggleFavorite";`

- [ ] **Step 3: `useFavorites`** `client/src/views/Favorites/hooks/useFavorites.ts`:

```typescript
// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// types
import type { FavoritesQueryParams } from "@/types/Apps";
// requests
import { getFavorites } from "@/requests/favorites";
// others
import CONSTANTS from "@/constants";

const useFavorites = (params: FavoritesQueryParams) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.FAVORITES, params],
    queryFn: () => getFavorites(params),
    placeholderData: keepPreviousData
  });

export default useFavorites;
```

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useToggleFavorite.ts client/src/hooks/index.ts client/src/views/Favorites/hooks/useFavorites.ts
git commit -m "feat(fe-favorite): useToggleFavorite (optimistic) + useFavorites hooks"
```

## Task FE-4: Extract shared `AppCard` (with heart) + remove old

**Files:**
- Create: `client/src/components/AppCard/index.tsx`
- Delete: `client/src/views/Apps/components/AppCard/index.tsx`

- [ ] **Step 1: Create** `client/src/components/AppCard/index.tsx` (base on old AppCard + `FavoriteButton`; props inline):

```tsx
// libs
import { ArrowUpRight } from "lucide-react";
// components
import CardItemTitle from "@/components/CardItemTitle";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import FavoriteButton from "@/components/FavoriteButton";
import { Card } from "@/components/ui/card";

const AppCard = ({
  id,
  displayName,
  category,
  description,
  iconUrl,
  homeUrl,
  isFavorite,
  openLabel,
  addFavoriteLabel,
  removeFavoriteLabel,
  togglePending = false,
  onToggleFavorite
}: {
  id: string;
  displayName: string;
  category: string | null;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  isFavorite: boolean;
  openLabel: string;
  addFavoriteLabel: string;
  removeFavoriteLabel: string;
  togglePending?: boolean;
  onToggleFavorite: () => void;
}) => {
  const initial = displayName.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  const iconNode = iconUrl ? (
    <CustomImage
      src={iconUrl}
      alt=""
      width={48}
      height={48}
      className="size-full object-cover"
    />
  ) : (
    initial
  );
  return (
    <Card
      className="flex flex-col overflow-hidden rounded-xl border p-0"
      aria-labelledby={`apps-${id}-title`}
    >
      <div className="flex flex-col gap-3.5 p-6">
        <div className="flex items-start gap-3">
          <div
            className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-semibold"
            aria-hidden="true"
          >
            {iconNode}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CardItemTitle id={`apps-${id}-title`} className="truncate">
              {displayName}
            </CardItemTitle>
            {category && (
              <span className="text-muted-foreground text-xs font-medium">
                {category}
              </span>
            )}
          </div>
          <FavoriteButton
            isFavorite={isFavorite}
            pending={togglePending}
            addLabel={`${addFavoriteLabel}: ${displayName}`}
            removeLabel={`${removeFavoriteLabel}: ${displayName}`}
            onToggle={onToggleFavorite}
          />
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

- [ ] **Step 2: Delete** old `client/src/views/Apps/components/AppCard/index.tsx`.
- [ ] **Step 3: Commit**

```bash
git add client/src/components/AppCard
git rm client/src/views/Apps/components/AppCard/index.tsx
git commit -m "refactor(fe-favorite): extract shared AppCard with FavoriteButton"
```

## Task FE-5: Wire Apps catalog

**Files:**
- Modify: `client/src/views/Apps/mains/AppsBoard/index.tsx`

- [ ] **Step 1:** Update import: `import AppCard from "@/components/AppCard";` (remove `../../components/AppCard`). Add hook: `import { useToggleFavorite } from "@/hooks";`. In component: `const toggleFavorite = useToggleFavorite();`. Extract favorite labels: `const tCard = useTranslations("apps.card");` already `t = useTranslations("apps")`. Use `t("card.addFavorite")`, `t("card.removeFavorite")`.

- [ ] **Step 2:** Update the `items.map` render to pass new props:

```tsx
            items.map((app) => (
              <AppCard
                key={app._id}
                id={app._id}
                displayName={app.displayName}
                category={app.category}
                description={app.description}
                iconUrl={app.iconUrl}
                homeUrl={app.homeUrl}
                isFavorite={app.isFavorite}
                openLabel={t("card.open")}
                addFavoriteLabel={t("card.addFavorite")}
                removeFavoriteLabel={t("card.removeFavorite")}
                togglePending={toggleFavorite.isPending}
                onToggleFavorite={() =>
                  toggleFavorite.mutate({
                    appId: app._id,
                    isFavorite: app.isFavorite
                  })
                }
              />
            ))
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/Apps/mains/AppsBoard/index.tsx
git commit -m "feat(fe-favorite): favorite toggle on Apps catalog"
```

## Task FE-6: Favorites page — wire real API + remove dead code

**Files:**
- Modify: `client/src/views/Favorites/index.tsx`, `mains/PageHeader/index.tsx`, `mains/FavoritesGrid/index.tsx`
- Delete: `client/src/views/Favorites/components/FavoriteAppCard/index.tsx`
- Delete: `client/src/mocks/Favorites` (file `.ts` hoặc folder — xác minh path: `client/src/mocks/Favorites.ts` hoặc `client/src/mocks/Favorites/index.ts`)

- [ ] **Step 1: PageHeader** — bỏ mock count (count động → để client grid lo). `mains/PageHeader/index.tsx`:

```tsx
// libs
import { getTranslations } from "next-intl/server";
// components
import PageTitle from "@/components/PageTitle";

const PageHeader = async () => {
  const t = await getTranslations("favorites");
  return (
    <div className="flex flex-col gap-1.5">
      <PageTitle>{t("title")}</PageTitle>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
    </div>
  );
};

export default PageHeader;
```

- [ ] **Step 2: FavoritesGrid** — rewrite to real API + shared AppCard + category filter (real categories) + sort + search. `mains/FavoritesGrid/index.tsx`:

```tsx
"use client";
// libs
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { FavoritesSortKey } from "@/types/Apps";
// components
import AppCard from "@/components/AppCard";
import CustomButton from "@/components/CustomButton";
import SearchInput from "@/components/SearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
// hooks
import { useAnnounce, useDebouncedValue, useToggleFavorite } from "@/hooks";
// others
import useFavorites from "../../hooks/useFavorites";
import useAppCategories from "@/views/Apps/hooks/useAppCategories";
import { cn } from "@/libs/utils";

const FavoritesGrid = () => {
  const t = useTranslations("favorites");
  const { announce } = useAnnounce();
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<FavoritesSortKey>("recent");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: categories } = useAppCategories();
  const { data, isLoading, isError } = useFavorites({
    sort,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(activeCategoryId && { categoryId: activeCategoryId })
  });
  const toggleFavorite = useToggleFavorite();
  const items = data?.items ?? [];
  const categoryOptions = useMemo(
    () => [{ _id: null, displayName: t("categories.all") }, ...(categories ?? [])],
    [categories, t]
  );
  const handleCategory = (id: string | null, label: string) => {
    setActiveCategoryId(id);
    announce(t("announce.categoryChanged", { category: label }));
  };
  const handleSort = (value: FavoritesSortKey) => {
    setSort(value);
    announce(t("announce.sortChanged", { sort: t(`sort.${value}`) }));
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("search.placeholder")}
          ariaLabel={t("search.placeholder")}
          className="w-72"
        />
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("categories.groupLabel")}
        >
          {categoryOptions.map((c) => {
            const isActive = activeCategoryId === c._id;
            return (
              <CustomButton
                key={c._id ?? "all"}
                size="sm"
                onClick={() => handleCategory(c._id, c.displayName)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {c.displayName}
              </CustomButton>
            );
          })}
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CustomButton
                size="default"
                variant="outline"
                iconLeft={<ArrowUpDown className="size-3.5" aria-hidden="true" />}
                iconRight={<ChevronDown className="size-3.5" aria-hidden="true" />}
                className="h-10"
              >
                {t("sort.label", { value: t(`sort.${sort}`) })}
              </CustomButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort("recent")}>
                {t("sort.recent")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("name")}>
                {t("sort.name")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : !isLoading && items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((app) => (
            <AppCard
              key={app._id}
              id={app._id}
              displayName={app.displayName}
              category={app.category}
              description={app.description}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              isFavorite={app.isFavorite}
              openLabel={t("card.open")}
              addFavoriteLabel={t("card.add")}
              removeFavoriteLabel={t("card.remove")}
              togglePending={toggleFavorite.isPending}
              onToggleFavorite={() =>
                toggleFavorite.mutate({ appId: app._id, isFavorite: app.isFavorite })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesGrid;
```

> `useDebouncedValue` đã có (`@/hooks`). `useAppCategories` import xuyên view từ `@/views/Apps/hooks/useAppCategories` — chấp nhận (đã là shared query). Nếu lint cấm import xuyên view, promote hook lên `src/hooks/` hoặc tạo bản local; xác minh khi implement.

- [ ] **Step 3: index.tsx** giữ nguyên compose (PageHeader + FavoritesGrid) — đã đúng.

- [ ] **Step 4: Delete dead code:** `git rm client/src/views/Favorites/components/FavoriteAppCard/index.tsx` và file mock `client/src/mocks/Favorites*`. Grep xác minh không còn import `@/mocks/Favorites` hay `FavoriteAppCard` ở đâu.

- [ ] **Step 5: Commit**

```bash
git add client/src/views/Favorites
git rm client/src/views/Favorites/components/FavoriteAppCard/index.tsx
git rm -r client/src/mocks/Favorites*   # adjust path
git commit -m "feat(fe-favorite): wire Favorites page to API, remove mock dead code"
```

## Task FE-7: Home cards — heart (sibling, not nested)

**Files:**
- Modify: `client/src/views/Home/components/QuickAccessCard/index.tsx`
- Modify: `client/src/views/Home/components/RecommendedAppCard/index.tsx`
- Modify: `client/src/views/Home/mains/QuickAccessSection/index.tsx`, `mains/RecommendedSection/index.tsx`

- [ ] **Step 1: QuickAccessCard** — root hiện là `<CustomButton>` (cả tile là button). KHÔNG nest `FavoriteButton` trong button. Restructure: wrapper `<div className="relative">`, tile button giữ nguyên, heart là sibling absolute top-right. Add props `id`, `isFavorite`, `addFavoriteLabel`, `removeFavoriteLabel`, `togglePending`, `onToggleFavorite`. Heart wrapper:

```tsx
  return (
    <div className="relative">
      <CustomButton ...existing tile button... >
        ...existing content...
      </CustomButton>
      <div className="absolute top-3 right-3">
        <FavoriteButton
          isFavorite={isFavorite}
          pending={togglePending}
          addLabel={`${addFavoriteLabel}: ${name}`}
          removeLabel={`${removeFavoriteLabel}: ${name}`}
          onToggle={onToggleFavorite}
        />
      </div>
    </div>
  );
```

Add `import FavoriteButton from "@/components/FavoriteButton";`. Vì nền tile là gradient đậm, override màu heart cho tương phản: truyền `className` qua (hoặc bọc div `text-primary-foreground`). Đơn giản: wrap heart trong `<div className="text-primary-foreground [&_button]:text-primary-foreground/80 [&_button:hover]:text-white">` hoặc thêm prop className vào FavoriteButton. **Quyết định khi implement**: nếu cần đổi màu trên nền tối, thêm optional `className` prop cho `FavoriteButton`.

- [ ] **Step 2: RecommendedAppCard** — root là `<Card>` (div). Thêm `FavoriteButton` ở góc trên-phải vùng icon, hoặc cạnh title. Thêm props tương tự. Đặt heart absolute trong card header hoặc trong hàng title:

```tsx
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardItemTitle id={`rec-${name}-title`}>{name}</CardItemTitle>
          {category && <span className="text-muted-foreground text-xs">{category}</span>}
        </div>
        <FavoriteButton isFavorite={isFavorite} pending={togglePending}
          addLabel={`${addFavoriteLabel}: ${name}`} removeLabel={`${removeFavoriteLabel}: ${name}`}
          onToggle={onToggleFavorite} />
      </div>
```

- [ ] **Step 3: Sections** — `QuickAccessSection`/`RecommendedSection`: `const toggleFavorite = useToggleFavorite();` + `const tCard = useTranslations("apps.card");`. Pass `id={app._id}`, `isFavorite={app.isFavorite}`, `addFavoriteLabel={tCard("addFavorite")}`, `removeFavoriteLabel={tCard("removeFavorite")}`, `togglePending={toggleFavorite.isPending}`, `onToggleFavorite={() => toggleFavorite.mutate({ appId: app._id, isFavorite: app.isFavorite })}` to each card.

- [ ] **Step 4: Commit**

```bash
git add client/src/views/Home
git commit -m "feat(fe-favorite): favorite toggle on Home cards"
```

## Task FE-8: i18n (en + vi) — favorites + apps

**Files:**
- Modify: `client/src/locales/en/favorites.json`, `client/src/locales/vi/favorites.json`
- Modify: `client/src/locales/en/apps.json`, `client/src/locales/vi/apps.json`

- [ ] **Step 1: favorites.json (en)** — reconcile: bỏ `sort.rating`, `card.reviews`; sửa `categories` thành chỉ `all` + `groupLabel` (category thật từ API, không cần key tĩnh); thêm `card.add/remove`, `toast.*`, `announce.added/removed/error`, `empty`, `error`:

```json
{
  "title": "Favorites",
  "description": "Your bookmarked apps, always one click away.",
  "search": { "placeholder": "Search favorites..." },
  "categories": { "all": "All", "groupLabel": "Filter by category" },
  "sort": { "label": "Sort: {value}", "recent": "Recent", "name": "Name" },
  "card": { "open": "Open", "add": "Add to favorites", "remove": "Remove from favorites" },
  "toast": { "error": "Failed to update favorites. Please try again." },
  "empty": "You haven't favorited any apps yet.",
  "error": "Could not load favorites. Please try again.",
  "announce": {
    "categoryChanged": "Filtered favorites by {category}.",
    "sortChanged": "Sorted by {sort}.",
    "added": "Added to favorites.",
    "removed": "Removed from favorites.",
    "error": "Failed to update favorites."
  }
}
```

- [ ] **Step 2: favorites.json (vi)** — bản dịch tương ứng (tone theo `ux-copy.md`):

```json
{
  "title": "Yêu thích",
  "description": "Các ứng dụng đã lưu, chỉ một cú nhấp.",
  "search": { "placeholder": "Tìm trong yêu thích..." },
  "categories": { "all": "Tất cả", "groupLabel": "Lọc theo danh mục" },
  "sort": { "label": "Sắp xếp: {value}", "recent": "Gần đây", "name": "Tên" },
  "card": { "open": "Mở", "add": "Thêm vào yêu thích", "remove": "Xóa khỏi yêu thích" },
  "toast": { "error": "Cập nhật yêu thích thất bại. Vui lòng thử lại." },
  "empty": "Bạn chưa yêu thích ứng dụng nào.",
  "error": "Không tải được danh sách yêu thích. Vui lòng thử lại.",
  "announce": {
    "categoryChanged": "Đã lọc yêu thích theo {category}.",
    "sortChanged": "Đã sắp xếp theo {sort}.",
    "added": "Đã thêm vào yêu thích.",
    "removed": "Đã xóa khỏi yêu thích.",
    "error": "Cập nhật yêu thích thất bại."
  }
}
```

- [ ] **Step 3: apps.json (en + vi)** — add to `card`: `"addFavorite": "Add to favorites"` / `"removeFavorite": "Remove from favorites"` (vi: `"Thêm vào yêu thích"` / `"Xóa khỏi yêu thích"`). (Announce favorite dùng namespace `favorites` qua `useToggleFavorite`, nên apps chỉ cần label nút.)

- [ ] **Step 4: Verify no orphan keys** — grep `t("favorites.sort.rating"`, `card.reviews`, `categories.productivity` etc. trong code; xóa nếu mồ côi. Đảm bảo mọi key dùng có trong cả en+vi (tránh missing-message như bài học `adminUsers.pagination`).

- [ ] **Step 5: Commit**

```bash
git add client/src/locales
git commit -m "feat(fe-favorite): i18n en+vi for favorites + apps card labels"
```

## Task FE-GREEN: Frontend green checks

- [ ] Run (must pass): `cd client && yarn format && yarn lint && npx tsc --noEmit && yarn build`
- [ ] Fix all errors, re-run until green. Re-read auto-fixed files.

---

# PHASE 3 — E2E (expand Scenario Matrix → tests)

**Files:**
- Create: `client/e2e/favorite-apps/toggle.e2e.ts`, `favorites-page.e2e.ts`, `i18n.e2e.ts` (split theo nhóm)
- Create: `docs/specs/favorite-apps/e2e.md` (kịch bản cuối)
- Reuse: `client/e2e/helpers/`, `auth.setup.ts` storageState

> Mỗi Applicable scenario trong matrix (design §6, 13 nhóm) = ≥1 test. Mutation revert trong `afterAll` (idempotent: cleanup các app đã favorite trong test bằng DELETE). Selector ưu tiên role/label: nút tim có `aria-label` "Add/Remove ... to favorites" + `aria-pressed`.

- [ ] **Task E2E-1: Catalog toggle** (`toggle.e2e.ts`) — nhóm 1,8,11,12,13:
  - mở `/apps`, tìm card đầu, đọc `aria-pressed` của heart; click → `aria-pressed` lật + (sau invalidate) vẫn đúng; reload → trạng thái persist (nhóm 11 ST).
  - double-click nhanh → không lỗi, kết thúc ở trạng thái nhất quán (idempotent).
  - cross-page (nhóm 13): favorite app X ở `/apps` → vào `/favorites` thấy X → bỏ ở favorites → về `/apps` heart X outline.
  - `afterAll`: đảm bảo X về trạng thái ban đầu (DELETE nếu test để nó favorited).
- [ ] **Task E2E-2: Favorites page** (`favorites-page.e2e.ts`) — nhóm 1,5,6,7,10,12:
  - happy: list hiển thị app đã favorite (card có Open + heart filled).
  - empty (nhóm 5): user không có favorite → empty state `favorites.empty`. (Cần seed/cleanup user-không-favorite, hoặc xóa hết rồi assert empty, rồi khôi phục.)
  - filter/search (nhóm 7): search match/no-match; category chip filter; "All" reset.
  - sort: recent vs name đổi thứ tự.
  - remove on page: click heart filled → item biến mất (optimistic).
- [ ] **Task E2E-3: i18n en+vi** (`i18n.e2e.ts`) — nhóm 9: render `/apps` + `/favorites` ở en và vi; assert nhãn nút tim (`aria-label` add/remove), sort labels, empty state; bắt missing-message (không có chuỗi `favorites.` hoặc raw key lộ ra).
- [ ] **Task E2E-4: AuthN** — (nhóm 2) có thể nằm trong suite chung: truy cập `/favorites` chưa đăng nhập → redirect `/login`. (Dùng context không storageState.)
- [ ] **Task E2E-5: Write `docs/specs/favorite-apps/e2e.md`** — liệt kê scenario cuối + cột Gate (A only cho mutation-heavy: idempotency, AuthZ, validation, error/loading, cross-page) + follow-up gaps nếu có (vd cần seed user rỗng favorite).
- [ ] **Commit**

```bash
git add client/e2e/favorite-apps
git commit -m "test(fe-favorite): e2e suite for favorite apps"
# docs commit in docs worktree:
# git -C docs/.worktrees/favorite-apps add specs/favorite-apps/e2e.md && git commit -m "docs(favorite-apps): e2e scenarios"
```

> **Dual-gate (§4.3)** chạy ở bước E2E của flow (sau code review), KHÔNG trong writing-plans: gate A `cd client && yarn e2e` (scope favorite-apps) + gate B MCP walk (auth context riêng, skip mutation của `A only` rows). Fail → `systematic-debugging` → `e2e-bugs.md` → fix → lặp max 3.

---

## Self-Review (đã chạy)

**1. Spec coverage:**
- DR-1 user_favorites collection → BE-1. DR-2 isFavorite trên /apps → BE-8. DR-3 Favorites search+category+sort, bỏ rating → FE-6, FE-8. DR-4 scope 3 trang → FE-5/6/7 (Recently Used không có task ✓ defer). DR-5 dead code → FE-4 (old AppCard), FE-6 (mock + FavoriteAppCard). DR-6 shared AppCard → FE-4. DR-7 Pencil đã xong (brainstorming).
- API contract (design §3.4): POST/DELETE/GET → BE-3/5/6; isFavorite field → BE-8/FE-1. ✓
- ERD update (design §3.5): **GAP** → thêm Task DOCS-1 dưới đây.
- E2E matrix 13 nhóm → Phase 3 (mỗi nhóm map vào E2E-1..4). ✓
- Env/seed (design §9): không env mới; collection mới rỗng, seeder optional → ghi nhận, không bắt buộc task (CLAUDE.md §5.3.2: cập nhật seeder khi cần data mẫu — favorite không cần seed để chạy).

**2. Placeholder scan:** Một số bước có "xác minh khi implement" cho tên hằng/đường dẫn không chắc (SEARCH_MAX_LENGTH, mock path, response ctor) — đây là verify-step có chủ đích, không phải placeholder logic; code chính đầy đủ.

**3. Type consistency:** `UserAppDto.isFavorite` (BE-8) ↔ `toFavoriteAppDto` (BE-2) ↔ FE `UserApp.isFavorite` (FE-1) khớp. `useToggleFavorite` variables `{appId, isFavorite}` dùng nhất quán ở FE-5/6/7. `findActiveByIds`/`findFavoritedAppIds`/`findWebAppIdsByUser` tên khớp giữa repo (BE-3/8) và service (BE-5/8).

## Task DOCS-1: ERD update (docs repo)

**Files:** Modify `docs/erd.md`

- [ ] Add `USER_FAVORITE { _id, user_id FK→USER, web_app_id FK→WEB_APP, created_at }` + unique `(user_id, web_app_id)` + relationships `USER ||--o{ USER_FAVORITE`, `WEB_APP ||--o{ USER_FAVORITE`; note DR-1 (favorite tách khỏi entitlement). Commit trong docs worktree.

```bash
git -C docs/.worktrees/favorite-apps add erd.md
git -C docs/.worktrees/favorite-apps commit -m "docs(erd): add user_favorites collection"
```
