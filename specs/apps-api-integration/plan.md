# Apps API Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay mock bằng API `GET /apps` thật ở trang Home, gộp filter-category vào trang Apps, xoá trang Discover; BE thêm filter `categoryId` + endpoint `GET /apps/categories`.

**Architecture:** BE mở khoá `categoryId` (đã có sẵn trong `buildWebAppFilter`) cho user query + thêm 1 endpoint categories cho user (tái dùng `categoryRepo.findAll`). FE: trang Apps thêm panel category pills wire vào `useApps`; trang Home tiêu thụ `getApps` cho QuickAccess/Recommended + stat totalApps; xoá Discover và dồn chức năng vào Apps.

**Tech Stack:** BE Express + Mongoose + Joi + Jest. FE Next.js 15 + React 19 + React Query + next-intl + Tailwind/shadcn + Playwright (E2E).

**Worktrees (đã tạo, branch `feat/apps-api-integration`):**
- `server/.worktrees/apps-api-integration`
- `client/.worktrees/apps-api-integration`
- `docs/.worktrees/apps-api-integration`

> Mọi path BE dưới đây tương đối so với server worktree; path FE tương đối so với client worktree.

> **Commit gate (CLAUDE.md §7):** Review ON (mặc định). Implementer chạy hết task, **stage** thay đổi nhưng KHÔNG commit per-task; main loop trình diff tổng thể → user duyệt 1 lần → mới commit. Lệnh `git commit` trong các step dưới chỉ thực thi sau khi user duyệt (hoặc gom lại theo per-repo).

---

## File Structure

### Backend (`server/`)
- **Modify** `src/modules/web-app/types/index.ts` — thêm `categoryId?` vào `UserAppsQuery`.
- **Modify** `src/validators/schemas/web-app.ts` — thêm `categoryId` vào `listAppsQuerySchema`.
- **Modify** `src/modules/web-app/web-app.service.ts` — truyền `categoryId` vào filter; thêm `listUserCategories()`.
- **Create** `src/modules/web-app/dtos/user-category.dto.ts` — `UserCategoryDto` + `toUserCategoryDto`.
- **Modify** `src/modules/web-app/dtos/index.ts` — export DTO mới.
- **Modify** `src/modules/web-app/web-app.controller.ts` — thêm `listUserCategories`.
- **Modify** `src/modules/web-app/web-app.routes.ts` — thêm route `GET /apps/categories`.
- **Modify** `src/modules/web-app/web-app.service.spec.ts` — test categoryId filter + listUserCategories.
- **Modify** Swagger/OpenAPI doc cho web-app (xác định file ở Task BE-5).

### Frontend (`client/`)
- **Modify** `src/constants/endpoints.ts` — thêm `APP_CATEGORIES`.
- **Modify** `src/types/Apps/index.ts` — thêm `categoryId?` + `UserCategory`.
- **Modify** `src/requests/apps.ts` — thêm `getAppCategories`.
- **Create** `src/views/Apps/hooks/useAppCategories.ts`.
- **Create** `src/views/Apps/components/CategoryFilter/index.tsx`.
- **Modify** `src/views/Apps/mains/AppsBoard/index.tsx` — wire pills + categoryId.
- **Modify** `src/locales/{en,vi}/apps.json` — thêm `categories.*` + `announce.categoryChanged`, bỏ `search.filter`.
- **Create** `src/views/Home/hooks/useHomeApps.ts`.
- **Modify** `src/views/Home/mains/QuickAccessSection/index.tsx` + `src/views/Home/components/QuickAccessCard/index.tsx`.
- **Modify** `src/views/Home/mains/RecommendedSection/index.tsx` + `src/views/Home/components/RecommendedAppCard/index.tsx`.
- **Modify** `src/views/Home/mains/GreetingSection/index.tsx` — totalApps thật.
- **Modify** `src/locales/{en,vi}/home.json` — bỏ key mock không dùng.
- **Delete** `src/mocks/Home/index.ts`.
- **Delete** Discover: `src/app/[locale]/(private)/(dashboard)/discover/`, `src/views/Discover/`, `src/mocks/Discover/`, `src/locales/{en,vi}/discover.json`.
- **Modify** `src/locales/{en,vi}/index.ts`, `src/constants/routes.ts`, `src/dataSources/Dashboard/index.ts`, `src/locales/{en,vi}/dashboard.json` — gỡ tham chiếu Discover.
- **Modify** `e2e/web-app-user-list/apps-list.e2e.ts` — reconcile + category cases.
- **Create** `e2e/home/home.e2e.ts`.
- **Create** `docs/specs/apps-api-integration/e2e.md` (docs worktree).

---

## Phase 1 — Backend

### Task BE-1: `categoryId` filter cho user GET /apps

**Files:**
- Modify: `src/modules/web-app/types/index.ts`
- Modify: `src/validators/schemas/web-app.ts`
- Modify: `src/modules/web-app/web-app.service.ts:56-92` (`listUserApps`)
- Test: `src/modules/web-app/web-app.service.spec.ts`

- [ ] **Step 1: Viết failing test cho categoryId filter**

Thêm vào `describe("WebAppService.listUserApps", ...)` trong `web-app.service.spec.ts`:

```typescript
  it("passes categoryId into the filter when provided", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    await service.listUserApps(
      { categoryId: "64b2f0c2f1a2b3c4d5e6f7a8" },
      "user"
    );

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.categoryId).toBe("64b2f0c2f1a2b3c4d5e6f7a8");
  });

  it("omits categoryId from the filter when not provided", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findActivePaginated.mockResolvedValue([]);
    webAppRepo.countActive.mockResolvedValue(0);
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    await service.listUserApps({}, "user");

    const filter = webAppRepo.findActivePaginated.mock.calls[0][0];
    expect(filter.categoryId).toBeUndefined();
  });
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run (worktree jest glob hỏng — dùng testMatch tường minh, xem memory):
```bash
cd server/.worktrees/apps-api-integration && npx jest --testMatch "**/web-app.service.spec.ts" -t "categoryId"
```
Expected: FAIL — `filter.categoryId` là `undefined` ở test đầu (service chưa truyền categoryId).

- [ ] **Step 3: Thêm `categoryId?` vào type `UserAppsQuery`**

Trong `src/modules/web-app/types/index.ts`, sửa:
```typescript
export interface UserAppsQuery extends Partial<PaginationParams> {
  search?: string;
  categoryId?: string;
}
```

- [ ] **Step 4: Truyền `categoryId` vào filter trong `listUserApps`**

Trong `src/modules/web-app/web-app.service.ts`, sửa block tạo filter (dòng ~61):
```typescript
    const filter = buildWebAppFilter({
      search: query.search,
      status: "active",
      categoryId: query.categoryId
    });
```
(`buildWebAppFilter` đã xử lý `categoryId` — không sửa helper.)

- [ ] **Step 5: Chạy lại test — PASS**

Run: `cd server/.worktrees/apps-api-integration && npx jest --testMatch "**/web-app.service.spec.ts" -t "categoryId"`
Expected: PASS (2 test mới).

- [ ] **Step 6: Thêm `categoryId` vào `listAppsQuerySchema`**

Trong `src/validators/schemas/web-app.ts`, sửa `listAppsQuerySchema` — thêm field `categoryId` sau `search`:
```typescript
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
    .messages({ "string.max": "validation:search.invalid" }),
  categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({
    "string.pattern.base": "validation:categoryId.invalid"
  })
}).options({ stripUnknown: true });
```
(Key i18n `validation:categoryId.invalid` đã tồn tại trong `src/i18n/locales/en/validation.json` + `vi` — verify cả `vi` có; nếu thiếu, copy từ `en`.)

- [ ] **Step 7: Type-check**

Run: `cd server/.worktrees/apps-api-integration && npx tsc --noEmit`
Expected: 0 error.

- [ ] **Step 8: Stage**

```bash
git add src/modules/web-app/types/index.ts src/validators/schemas/web-app.ts src/modules/web-app/web-app.service.ts src/modules/web-app/web-app.service.spec.ts
```

---

### Task BE-2: Endpoint `GET /apps/categories` cho user

**Files:**
- Create: `src/modules/web-app/dtos/user-category.dto.ts`
- Modify: `src/modules/web-app/dtos/index.ts`
- Modify: `src/modules/web-app/web-app.service.ts`
- Modify: `src/modules/web-app/web-app.controller.ts`
- Modify: `src/modules/web-app/web-app.routes.ts`
- Test: `src/modules/web-app/web-app.service.spec.ts`

- [ ] **Step 1: Viết failing test cho `listUserCategories`**

Thêm describe mới vào `web-app.service.spec.ts`:
```typescript
describe("WebAppService.listUserCategories", () => {
  it("returns all categories mapped to UserCategoryDto", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    categoryRepo.findAll.mockResolvedValue([
      {
        _id: { toString: () => "c1" },
        displayName: "Productivity",
        name: "productivity"
      },
      {
        _id: { toString: () => "c2" },
        displayName: "Entertainment",
        name: "entertainment"
      }
    ]);
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    const result = await service.listUserCategories();

    expect(result).toEqual([
      { _id: "c1", displayName: "Productivity" },
      { _id: "c2", displayName: "Entertainment" }
    ]);
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd server/.worktrees/apps-api-integration && npx jest --testMatch "**/web-app.service.spec.ts" -t "listUserCategories"`
Expected: FAIL — `service.listUserCategories is not a function`.

- [ ] **Step 3: Tạo DTO `UserCategoryDto`**

Create `src/modules/web-app/dtos/user-category.dto.ts`:
```typescript
// types
import type { WebAppCategoryDocument } from "../types";

export interface UserCategoryDto {
  _id: string;
  displayName: string;
}

export const toUserCategoryDto = (
  doc: WebAppCategoryDocument
): UserCategoryDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName
});
```

- [ ] **Step 4: Export DTO mới trong barrel**

Thêm vào cuối `src/modules/web-app/dtos/index.ts`:
```typescript
export type { UserCategoryDto } from "./user-category.dto";
export { toUserCategoryDto } from "./user-category.dto";
```

- [ ] **Step 5: Thêm method `listUserCategories` vào service**

Trong `src/modules/web-app/web-app.service.ts`:
- Thêm `UserCategoryDto` vào import type từ `./dtos`:
```typescript
import type {
  AdminAppDto,
  AdminCategoryDto,
  AdminAppCreatedDto,
  UserAppDto,
  UserCategoryDto
} from "./dtos";
```
- Thêm `toUserCategoryDto` vào import value từ `./dtos`:
```typescript
import {
  toAdminAppDto,
  toAdminCategoryDto,
  toAdminAppCreatedDto,
  toUserAppDto,
  toUserCategoryDto
} from "./dtos";
```
- Thêm method sau `listCategories()`:
```typescript
  async listUserCategories(): Promise<UserCategoryDto[]> {
    const docs = await this.categoryRepo.findAll();
    return docs.map(toUserCategoryDto);
  }
```

- [ ] **Step 6: Chạy lại test — PASS**

Run: `cd server/.worktrees/apps-api-integration && npx jest --testMatch "**/web-app.service.spec.ts" -t "listUserCategories"`
Expected: PASS.

- [ ] **Step 7: Thêm controller method**

Trong `src/modules/web-app/web-app.controller.ts`, thêm sau `listCategories`:
```typescript
  listUserCategories = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.listUserCategories();
    new OkSuccess({
      data,
      message: "webApp:success.listCategories"
    }).send(req, res);
  };
```
(`Request`/`Response` đã import; `webApp:success.listCategories` key đã tồn tại.)

- [ ] **Step 8: Thêm route trong `createUserWebAppRoutes`**

Trong `src/modules/web-app/web-app.routes.ts`, thêm dòng `/categories` TRƯỚC route `/`:
```typescript
  apps.use(authGuard);

  apps.get("/categories", asyncHandler(controller.listUserCategories));

  apps.get(
    "/",
    queryPipe(listAppsQuerySchema),
    asyncHandler(controller.listUserApps)
  );
```

- [ ] **Step 9: Type-check + full test**

Run: `cd server/.worktrees/apps-api-integration && npx tsc --noEmit && npx jest --testMatch "**/web-app.service.spec.ts"`
Expected: 0 type error; tất cả test PASS.

- [ ] **Step 10: Stage**

```bash
git add src/modules/web-app/dtos/ src/modules/web-app/web-app.service.ts src/modules/web-app/web-app.controller.ts src/modules/web-app/web-app.routes.ts src/modules/web-app/web-app.service.spec.ts
```

---

### Task BE-3: Cập nhật API doc (Swagger/Postman)

**Files:** Swagger/OpenAPI doc cho web-app (xác định ở Step 1).

- [ ] **Step 1: Tìm file doc**

Run: `cd server/.worktrees/apps-api-integration && grep -rl "/apps" src docs 2>/dev/null | grep -iE "swagger|openapi|postman|\.ya?ml|api-doc"`
Đọc file tìm được + skill `standard-doc-api`. Nếu KHÔNG có Swagger setup cho web-app → ghi N/A vào e2e.md/PR note và bỏ qua task này.

- [ ] **Step 2: Thêm doc**

Cho `GET /apps`: thêm query param `categoryId` (string, ObjectId pattern, optional). Mirror cách `GET /admin/apps` mô tả `categoryId`.
Cho `GET /apps/categories`: thêm path mới (auth bearer) trả `200` `{ data: [{ _id, displayName }] }`. Mirror path `GET /apps` về security + response wrapper.

- [ ] **Step 3: Stage** — `git add` file doc đã sửa.

---

## Phase 2 — Frontend contract (requests / types / hooks)

### Task FE-1: Endpoint + type + request + hook categories

**Files:**
- Modify: `src/constants/endpoints.ts`
- Modify: `src/types/Apps/index.ts`
- Modify: `src/requests/apps.ts`
- Create: `src/views/Apps/hooks/useAppCategories.ts`

- [ ] **Step 1: Thêm endpoint constant**

Trong `src/constants/endpoints.ts`, dưới `// App Registry`:
```typescript
  // App Registry
  APPS: "/apps",
  APP_CATEGORIES: "/apps/categories",
  ADMIN_APPS: "/admin/apps",
  ADMIN_APP_CATEGORIES: "/admin/apps/categories",
```

- [ ] **Step 2: Thêm type**

Trong `src/types/Apps/index.ts`:
- Sửa `UserAppsQueryParams`:
```typescript
export interface UserAppsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}
```
- Thêm cuối file:
```typescript
export interface UserCategory {
  _id: string;
  displayName: string;
}
```

- [ ] **Step 3: Thêm request `getAppCategories`**

Trong `src/requests/apps.ts`:
- Sửa import type:
```typescript
import type {
  UserAppsQueryParams,
  PaginatedUserAppsResponse,
  UserCategory
} from "@/types/Apps";
```
- Thêm cuối file:
```typescript
export const getAppCategories = async (): Promise<UserCategory[]> => {
  const response = await axiosInstance.get<ResponsePattern<UserCategory[]>>(
    END_POINTS.APP_CATEGORIES
  );
  return response.data.data;
};
```

- [ ] **Step 4: Tạo hook `useAppCategories`**

Create `src/views/Apps/hooks/useAppCategories.ts`:
```typescript
// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAppCategories } from "@/requests/apps";

export const APP_CATEGORIES_QUERY_KEY = "appCategories";

const useAppCategories = () =>
  useQuery({
    queryKey: [APP_CATEGORIES_QUERY_KEY],
    queryFn: getAppCategories
  });

export default useAppCategories;
```

- [ ] **Step 5: Type-check**

Run: `cd client/.worktrees/apps-api-integration && yarn tsc`
Expected: 0 error.

- [ ] **Step 6: Stage** — `git add src/constants/endpoints.ts src/types/Apps/index.ts src/requests/apps.ts src/views/Apps/hooks/useAppCategories.ts`

---

## Phase 3 — Frontend Apps page (category filter)

### Task FE-2: `CategoryFilter` component + wire vào AppsBoard

**Files:**
- Create: `src/views/Apps/components/CategoryFilter/index.tsx`
- Modify: `src/views/Apps/mains/AppsBoard/index.tsx`
- Modify: `src/locales/en/apps.json`, `src/locales/vi/apps.json`

- [ ] **Step 1: Thêm i18n keys (en)**

Trong `src/locales/en/apps.json`: **xoá** `search.filter`, **thêm** block `categories` + key `announce.categoryChanged`:
```json
{
  "title": "Apps",
  "description": "Browse and search all available web applications.",
  "search": {
    "placeholder": "Search apps..."
  },
  "categories": {
    "all": "All",
    "groupLabel": "Filter by category"
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
    "categoryChanged": "Filtered by {category}.",
    "loading": "Loading apps...",
    "loaded": "{total} apps loaded."
  }
}
```

- [ ] **Step 2: Thêm i18n keys (vi)**

Trong `src/locales/vi/apps.json`: tương ứng:
```json
{
  "title": "Ứng dụng",
  "description": "Duyệt và tìm kiếm tất cả ứng dụng web khả dụng.",
  "search": {
    "placeholder": "Tìm ứng dụng..."
  },
  "categories": {
    "all": "Tất cả",
    "groupLabel": "Lọc theo danh mục"
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
    "categoryChanged": "Đã lọc theo {category}.",
    "loading": "Đang tải ứng dụng...",
    "loaded": "Đã tải {total} ứng dụng."
  }
}
```

- [ ] **Step 3: Tạo `CategoryFilter`**

Create `src/views/Apps/components/CategoryFilter/index.tsx`:
```tsx
"use client";
// types
import type { UserCategory } from "@/types/Apps";
// components
import CustomButton from "@/components/CustomButton";
// others
import { cn } from "@/libs/utils";

const pillClass = (isActive: boolean) =>
  cn(
    "rounded-full border px-4 py-2 text-sm font-semibold",
    isActive
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
      : "border-border bg-background text-muted-foreground hover:bg-muted"
  );

const CategoryFilter = ({
  categories,
  activeId,
  allLabel,
  groupLabel,
  onSelect
}: {
  categories: UserCategory[];
  activeId: string | null;
  allLabel: string;
  groupLabel: string;
  onSelect: (id: string | null) => void;
}) => (
  <div className="flex flex-wrap gap-2.5" role="group" aria-label={groupLabel}>
    <CustomButton
      size="sm"
      onClick={() => onSelect(null)}
      aria-pressed={activeId === null}
      className={pillClass(activeId === null)}
    >
      {allLabel}
    </CustomButton>
    {categories.map((category) => (
      <CustomButton
        key={category._id}
        size="sm"
        onClick={() => onSelect(category._id)}
        aria-pressed={activeId === category._id}
        className={pillClass(activeId === category._id)}
      >
        {category.displayName}
      </CustomButton>
    ))}
  </div>
);

export default CategoryFilter;
```

- [ ] **Step 4: Wire vào `AppsBoard`**

Trong `src/views/Apps/mains/AppsBoard/index.tsx`:
- Sửa import libs (bỏ `Filter`, giữ `LayoutGrid, List`):
```tsx
import { LayoutGrid, List } from "lucide-react";
```
- Thêm import component + hook:
```tsx
import CategoryFilter from "../../components/CategoryFilter";
```
```tsx
import useApps from "../../hooks/useApps";
import useAppCategories from "../../hooks/useAppCategories";
```
- Thêm state + hook + handler trong component (sau `const [page, setPage] = useState(1);`):
```tsx
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const { data: categories } = useAppCategories();
```
- Sửa `useApps(...)` để thêm categoryId:
```tsx
  const { data, isLoading, isError } = useApps({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(activeCategoryId && { categoryId: activeCategoryId })
  });
```
- Thêm handler (cạnh `handleSearch`):
```tsx
  const handleCategoryChange = (id: string | null) => {
    setActiveCategoryId(id);
    setPage(1);
    const label = id
      ? (categories?.find((c) => c._id === id)?.displayName ?? "")
      : t("categories.all");
    announce(t("announce.categoryChanged", { category: label }));
  };
```
- Trong JSX: **xoá** khối `<CustomButton ... iconLeft={<Filter .../>} ...>{t("search.filter")}</CustomButton>` (nút Filter). Toolbar bên trái chỉ còn `SearchInput`.
- **Thêm** `<CategoryFilter />` ngay sau khối toolbar `</div>` (div `flex flex-wrap items-center justify-between`), trước khối grid:
```tsx
      <CategoryFilter
        categories={categories ?? []}
        activeId={activeCategoryId}
        allLabel={t("categories.all")}
        groupLabel={t("categories.groupLabel")}
        onSelect={handleCategoryChange}
      />
```

- [ ] **Step 5: Verify checks**

Run: `cd client/.worktrees/apps-api-integration && yarn format && yarn lint && yarn tsc`
Expected: 0 lỗi. Re-read file đã sửa nếu format/lint auto-fix.

- [ ] **Step 6: Stage** — `git add src/views/Apps/components/CategoryFilter/ src/views/Apps/mains/AppsBoard/index.tsx src/locales/en/apps.json src/locales/vi/apps.json`

---

## Phase 4 — Frontend Home page

### Task FE-3: Hook `useHomeApps`

**Files:** Create `src/views/Home/hooks/useHomeApps.ts`

- [ ] **Step 1: Tạo hook**
```typescript
// libs
import { useQuery, keepPreviousData } from "@tanstack/react-query";
// requests
import { getApps } from "@/requests/apps";

export const HOME_APPS_LIMIT = 8;

const useHomeApps = () =>
  useQuery({
    queryKey: ["apps", { limit: HOME_APPS_LIMIT }],
    queryFn: () => getApps({ limit: HOME_APPS_LIMIT }),
    placeholderData: keepPreviousData
  });

export default useHomeApps;
```
> Query key dùng namespace `"apps"` (chung cache với trang Apps, params khác → entry riêng). Cố ý, không tách key.

- [ ] **Step 2: Type-check** — `cd client/.worktrees/apps-api-integration && yarn tsc` → 0 error.
- [ ] **Step 3: Stage** — `git add src/views/Home/hooks/useHomeApps.ts`

---

### Task FE-4: QuickAccessSection + QuickAccessCard dùng API

**Files:**
- Modify: `src/views/Home/components/QuickAccessCard/index.tsx`
- Modify: `src/views/Home/mains/QuickAccessSection/index.tsx`

- [ ] **Step 1: Sửa `QuickAccessCard`** (bỏ `lastOpenedText`, thêm `category`/`iconUrl`/`homeUrl`, click mở app):
```tsx
"use client";
// types
import type { ReactNode } from "react";
// components
import { Button } from "@/components/ui/button";
import CustomImage from "@/components/CustomImage";
// others
import { cn } from "@/libs/utils";

const QuickAccessCard = ({
  name,
  category,
  iconUrl,
  homeUrl,
  gradient
}: {
  name: string;
  category: string | null;
  iconUrl: string | null;
  homeUrl: string;
  gradient: string;
}) => {
  const initial = name.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  const icon: ReactNode = iconUrl ? (
    <CustomImage
      src={iconUrl}
      alt=""
      width={40}
      height={40}
      className="size-full object-cover"
    />
  ) : (
    initial
  );
  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      onClick={handleOpen}
      aria-label={category ? `${name}, ${category}` : name}
      className={cn(
        "flex h-[140px] cursor-pointer flex-col items-start justify-start gap-2.5 rounded-xl p-6 text-left whitespace-normal transition-opacity hover:opacity-90",
        gradient
      )}
    >
      <div
        className="bg-primary-foreground/15 text-primary-foreground flex size-10 items-center justify-center overflow-hidden rounded-xl text-base font-semibold"
        aria-hidden="true"
      >
        {icon}
      </div>
      <span
        className="text-primary-foreground text-base font-bold"
        aria-hidden="true"
      >
        {name}
      </span>
      {category && (
        <span className="text-primary-foreground/80 text-xs" aria-hidden="true">
          {category}
        </span>
      )}
    </Button>
  );
};

export default QuickAccessCard;
```

- [ ] **Step 2: Sửa `QuickAccessSection`** (client component, lấy `items[0..3]` từ API, gradient cycle, loading/empty/error):
```tsx
"use client";
// libs
import { useTranslations } from "next-intl";
// components
import QuickAccessCard from "../../components/QuickAccessCard";
import { Skeleton } from "@/components/ui/skeleton";
// others
import useHomeApps from "../../hooks/useHomeApps";

const GRADIENTS = [
  "bg-gradient-to-br from-primary to-primary/60",
  "bg-gradient-to-br from-info to-info/60",
  "bg-gradient-to-br from-warning to-warning/60",
  "bg-gradient-to-br from-success to-success/60"
];

const QuickAccessSection = () => {
  const t = useTranslations("home.quickAccess");
  const { data, isLoading, isError } = useHomeApps();
  const items = (data?.items ?? []).slice(0, 4);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="quick-access-title">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="quick-access-title" className="text-foreground text-xl font-bold">
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>
      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`qa-skeleton-${idx}`} className="h-[140px] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((app, idx) => (
            <QuickAccessCard
              key={app._id}
              name={app.displayName}
              category={app.category}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              gradient={GRADIENTS[idx % GRADIENTS.length]}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default QuickAccessSection;
```

- [ ] **Step 3: Thêm i18n keys** `home.quickAccess.empty` + `home.quickAccess.error` (en+vi), **xoá** `home.quickAccess.lastOpened`. (Thực hiện cùng Task FE-6.)

- [ ] **Step 4: Verify** — `yarn tsc` (chạy đầy đủ ở FE-7). Stage:
```bash
git add src/views/Home/components/QuickAccessCard/index.tsx src/views/Home/mains/QuickAccessSection/index.tsx
```

---

### Task FE-5: RecommendedSection + RecommendedAppCard dùng API

**Files:**
- Modify: `src/views/Home/components/RecommendedAppCard/index.tsx`
- Modify: `src/views/Home/mains/RecommendedSection/index.tsx`

- [ ] **Step 1: Sửa `RecommendedAppCard`** (bỏ `rating`/`installLabel`/`freeLabel`, thêm `iconUrl`/`homeUrl`/`openLabel`, nút Open):
```tsx
"use client";
// libs
import { ArrowUpRight } from "lucide-react";
// components
import { Card } from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
// others
import { cn } from "@/libs/utils";

const RecommendedAppCard = ({
  name,
  category,
  iconUrl,
  homeUrl,
  gradient,
  openLabel
}: {
  name: string;
  category: string | null;
  iconUrl: string | null;
  homeUrl: string;
  gradient: string;
  openLabel: string;
}) => {
  const initial = name.charAt(0).toUpperCase();
  const handleOpen = () => {
    window.open(homeUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <Card className="flex flex-col gap-4 rounded-xl border p-6" aria-labelledby={`rec-${name}-title`}>
      <div
        className={cn("flex h-24 items-center justify-center overflow-hidden rounded-xl text-2xl font-semibold", gradient)}
        aria-hidden="true"
      >
        {iconUrl ? (
          <CustomImage src={iconUrl} alt="" width={56} height={56} className="size-14 object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 id={`rec-${name}-title`} className="text-foreground text-base font-semibold">
          {name}
        </h3>
        {category && <span className="text-muted-foreground text-xs">{category}</span>}
      </div>
      <CustomButton
        size="sm"
        variant="outline"
        fullWidth
        onClick={handleOpen}
        iconRight={<ArrowUpRight className="size-3.5" aria-hidden="true" />}
        aria-label={`${openLabel} ${name}`}
      >
        {openLabel}
      </CustomButton>
    </Card>
  );
};

export default RecommendedAppCard;
```

- [ ] **Step 2: Sửa `RecommendedSection`** (client component, `items[4..8]`, giữ exploreCTA card mock, bỏ icon mock):
```tsx
"use client";
// libs
import { ArrowRight, Compass } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendedAppCard from "../../components/RecommendedAppCard";
// others
import useHomeApps from "../../hooks/useHomeApps";

const GRADIENTS = [
  "bg-gradient-to-br from-cream to-cream/60",
  "bg-gradient-to-br from-success/20 to-success/5",
  "bg-gradient-to-br from-destructive/20 to-warning/10",
  "bg-gradient-to-br from-info/20 to-info/5"
];

const RecommendedSection = () => {
  const t = useTranslations("home.recommended");
  const tCTA = useTranslations("home.exploreCTA");
  const tCard = useTranslations("apps.card");
  const { data, isLoading, isError } = useHomeApps();
  const items = (data?.items ?? []).slice(4, 8);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="recommended-title">
      <div className="flex items-center justify-between">
        <h2 id="recommended-title" className="text-foreground text-xl font-bold">
          {t("title")}
        </h2>
        <CustomButton size="sm" variant="ghost" iconRight={<ArrowRight className="size-3.5" aria-hidden="true" />}>
          {t("seeAll")}
        </CustomButton>
      </div>
      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`rec-skeleton-${idx}`} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((app, idx) => (
            <RecommendedAppCard
              key={app._id}
              name={app.displayName}
              category={app.category}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              gradient={GRADIENTS[idx % GRADIENTS.length]}
              openLabel={tCard("open")}
            />
          ))}
        </div>
      )}
      <Card className="from-primary to-primary/90 text-primary-foreground mt-2 flex items-center justify-between gap-4 rounded-2xl border-0 bg-gradient-to-br p-7">
        <div className="flex items-center gap-4">
          <div className="bg-primary-foreground/10 flex size-12 items-center justify-center rounded-xl" aria-hidden="true">
            <Compass className="text-primary-foreground size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-semibold">{tCTA("title")}</p>
            <p className="text-primary-foreground/70 text-xs">{tCTA("subtitle")}</p>
          </div>
        </div>
        <CustomButton
          size="sm"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          iconRight={<ArrowRight className="size-3.5" aria-hidden="true" />}
        >
          {tCTA("cta")}
        </CustomButton>
      </Card>
    </section>
  );
};

export default RecommendedSection;
```

- [ ] **Step 3: Stage** — `git add src/views/Home/components/RecommendedAppCard/index.tsx src/views/Home/mains/RecommendedSection/index.tsx`

---

### Task FE-6: GreetingSection totalApps + dọn home.json + xoá mock

**Files:**
- Modify: `src/views/Home/mains/GreetingSection/index.tsx`
- Modify: `src/locales/en/home.json`, `src/locales/vi/home.json`
- Delete: `src/mocks/Home/index.ts`

- [ ] **Step 1: Wire totalApps thật**

Trong `src/views/Home/mains/GreetingSection/index.tsx`:
- Thêm import hook (nhóm `// others`):
```tsx
import useHomeApps from "../../hooks/useHomeApps";
```
- Trong component, thêm:
```tsx
  const { data } = useHomeApps();
  const totalApps = data?.meta.total ?? 0;
```
- Sửa StatCard totalApps: `value="47"` → `value={String(totalApps)}`.
(Các StatCard khác giữ mock.)

- [ ] **Step 2: Dọn `home.json` (en)**

Trong `src/locales/en/home.json`:
- `quickAccess`: bỏ `lastOpened`, thêm `empty` + `error`:
```json
  "quickAccess": {
    "title": "Quick Access",
    "subtitle": "Jump back in",
    "empty": "No apps yet.",
    "error": "Could not load apps."
  },
  "recommended": {
    "title": "Recommended for You",
    "seeAll": "See all apps",
    "empty": "No apps to recommend yet.",
    "error": "Could not load apps."
  },
```
(bỏ `recommended.install`, `recommended.free`.)

- [ ] **Step 3: Dọn `home.json` (vi)**
```json
  "quickAccess": {
    "title": "Truy cập nhanh",
    "subtitle": "Quay lại ngay",
    "empty": "Chưa có ứng dụng nào.",
    "error": "Không thể tải ứng dụng."
  },
  "recommended": {
    "title": "Đề xuất cho bạn",
    "seeAll": "Xem tất cả ứng dụng",
    "empty": "Chưa có ứng dụng để đề xuất.",
    "error": "Không thể tải ứng dụng."
  },
```

- [ ] **Step 4: Xoá mock file**

Run: `cd client/.worktrees/apps-api-integration && rm src/mocks/Home/index.ts`
(Xác nhận không còn import: `grep -rn "mocks/Home" src` → 0 kết quả.)

- [ ] **Step 5: Stage** — `git add -A src/views/Home/mains/GreetingSection/index.tsx src/locales/en/home.json src/locales/vi/home.json src/mocks/Home/index.ts`

---

### Task FE-7: Verify Home

- [ ] **Step 1:** `cd client/.worktrees/apps-api-integration && yarn format && yarn lint && yarn tsc` → 0 lỗi. Re-read file auto-fixed.

---

## Phase 5 — Xoá Discover

### Task FE-8: Xoá file + thư mục Discover

**Files (delete):**
- `src/app/[locale]/(private)/(dashboard)/discover/`
- `src/views/Discover/`
- `src/mocks/Discover/`
- `src/locales/en/discover.json`, `src/locales/vi/discover.json`

- [ ] **Step 1: Xoá**
```bash
cd client/.worktrees/apps-api-integration
rm -rf "src/app/[locale]/(private)/(dashboard)/discover" src/views/Discover src/mocks/Discover src/locales/en/discover.json src/locales/vi/discover.json
```

- [ ] **Step 2: Stage** — `git add -A src/app src/views/Discover src/mocks/Discover src/locales`

---

### Task FE-9: Gỡ tham chiếu Discover (i18n registry, routes, nav, dashboard.json)

**Files:**
- Modify: `src/locales/en/index.ts`, `src/locales/vi/index.ts`
- Modify: `src/constants/routes.ts`
- Modify: `src/dataSources/Dashboard/index.ts`
- Modify: `src/locales/en/dashboard.json`, `src/locales/vi/dashboard.json`

- [ ] **Step 1: Gỡ khỏi locale registry**

Trong `src/locales/en/index.ts` và `src/locales/vi/index.ts`: xoá dòng `import discover from "./discover.json";` và key `discover,` trong object messages.

- [ ] **Step 2: Gỡ route constant**

Trong `src/constants/routes.ts`: xoá dòng `DISCOVER: "/discover",`.

- [ ] **Step 3: Gỡ nav item + NavKey**

Trong `src/dataSources/Dashboard/index.ts`:
- Xoá `"discover"` khỏi union `NavKey` (dòng `| "discover"`).
- Xoá `Compass` khỏi import lucide nếu không còn dùng (kiểm tra: chỉ NavItem discover dùng `Compass` ở file này → xoá khỏi import).
- Xoá object NavItem discover trong group `"discover"`:
```ts
  {
    key: "discover",
    items: [
      { key: "home", icon: Home, href: ROUTES.HOME },
      { key: "apps", icon: LayoutGrid, href: ROUTES.APPS }
    ]
  },
```
(giữ group key `"discover"` — vẫn chứa Home + Apps.)

- [ ] **Step 4: Gỡ nav label**

Trong `src/locales/en/dashboard.json` và `vi/dashboard.json`: xoá key `sidebar.nav.discover` (giữ `sidebar.groups.discover`).

- [ ] **Step 5: Verify không còn tham chiếu**

Run: `cd client/.worktrees/apps-api-integration && grep -rni "discover" src --include=*.ts --include=*.tsx --include=*.json | grep -vi "groups.*discover\|exploreCTA"`
Expected: chỉ còn `sidebar.groups.discover` (group label) + copy `exploreCTA`/`home.json` (text thuần) — không còn import/route/nav-item/namespace.

- [ ] **Step 6: Verify checks**

Run: `yarn format && yarn lint && yarn tsc` → 0 lỗi.

- [ ] **Step 7: Stage** — `git add -A src/locales src/constants/routes.ts src/dataSources/Dashboard/index.ts`

---

## Phase 6 — E2E (Playwright)

> Tiền đề app-running (CLAUDE.md §4.3): agent tự check BE :5000 + FE + Mongo/Redis; worktree cần dev server riêng `--port 3100` + `E2E_BASE_URL` (memory [[reference_e2e_worktree_devserver]]). Seed phải có ≥1 category + apps thuộc category để test filter. Auth qua `e2e/auth.setup.ts` (seed user `user@test.com`).

### Task E2E-1: Reconcile Apps suite + thêm category cases

**Files:** Modify `e2e/web-app-user-list/apps-list.e2e.ts`

- [ ] **Step 1: Thêm test category filter (vi)** — append vào `test.describe("Apps catalog (/vi/apps)", ...)`:
```typescript
  test("category pills filter the catalog server-side", async ({ page }) => {
    await page.goto(APPS_PATH);
    await page.waitForResponse(
      (r) => r.url().includes("/api/v1/apps") && r.status() === 200
    );

    // Category pills come from GET /apps/categories. Pick the first real
    // category pill (skip the "All"/"Tất cả" pill at index 0).
    const group = page.getByRole("group", { name: /Lọc theo danh mục|Filter by category/ });
    const pills = group.getByRole("button");
    await expect(pills.first()).toBeVisible();
    const realPill = pills.nth(1);
    await expect(realPill).toBeVisible();

    const filtered = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/apps") &&
        r.url().includes("categoryId=") &&
        r.status() === 200
    );
    await realPill.click();
    await filtered;
    await expect(realPill).toHaveAttribute("aria-pressed", "true");

    // Back to "All" clears the categoryId filter.
    const cleared = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/apps") &&
        !r.url().includes("categoryId=") &&
        r.status() === 200
    );
    await pills.first().click();
    await cleared;
    await expect(pills.first()).toHaveAttribute("aria-pressed", "true");
  });

  test("invalid categoryId query returns 400 from the API", async ({ page }) => {
    await page.goto(APPS_PATH);
    const res = await page.request.get("/api/v1/apps?categoryId=not-an-objectid");
    expect(res.status()).toBe(400);
  });
```

- [ ] **Step 2: Thêm test render i18n EN** — thêm describe mới (matrix row 9, en):
```typescript
test.describe("Apps catalog (/apps EN locale)", () => {
  test("renders catalog and category group in English", async ({ page }) => {
    await page.goto("/apps");
    await page.waitForResponse(
      (r) => r.url().includes("/api/v1/apps") && r.status() === 200
    );
    await expect(
      page.getByRole("group", { name: "Filter by category" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Blog" })).toBeVisible();
  });
});
```

- [ ] **Step 3: Chạy E2E Apps**

Run: `cd client/.worktrees/apps-api-integration && yarn e2e --grep "Apps catalog"`
Expected: tất cả PASS (app + seed đang chạy).

- [ ] **Step 4: Stage** — `git add e2e/web-app-user-list/apps-list.e2e.ts`

---

### Task E2E-2: Home suite

**Files:** Create `e2e/home/home.e2e.ts`

- [ ] **Step 1: Tạo test Home**
```typescript
import { test, expect } from "@playwright/test";

// Home dashboard at /vi/home — QuickAccess + Recommended now consume the real
// GET /apps API; totalApps stat reflects meta.total. Read-only, nothing to revert.
// Auth from global auth.setup.ts (seed user@test.com).

const HOME_PATH = "/vi/home";

test.describe("Home dashboard (/vi/home)", () => {
  test("QuickAccess and Recommended render real apps from the API", async ({ page }) => {
    const listResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/apps") && r.status() === 200
    );
    await page.goto(HOME_PATH);
    await listResponse;

    // QuickAccess shows the first user-visible app (Blog) as a card heading/label.
    await expect(
      page.getByRole("button", { name: /Blog/ }).first()
    ).toBeVisible();
    // Recommended renders an Open action for a user-visible app.
    await expect(
      page.getByRole("button", { name: /Mở .+/ }).first()
    ).toBeVisible();
  });

  test("totalApps stat reflects the API total", async ({ page }) => {
    const listResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/apps") && r.status() === 200
    );
    await page.goto(HOME_PATH);
    const res = await listResponse;
    const body = await res.json();
    const total: number = body.data.meta.total;
    await expect(page.getByText(String(total), { exact: true }).first()).toBeVisible();
  });

  test("renders in English at /home", async ({ page }) => {
    await page.goto("/home");
    await page.waitForResponse(
      (r) => r.url().includes("/api/v1/apps") && r.status() === 200
    );
    await expect(page.getByRole("heading", { name: "Quick Access" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommended for You" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Chạy E2E Home**

Run: `cd client/.worktrees/apps-api-integration && yarn e2e --grep "Home dashboard"`
Expected: PASS. Nếu selector totalApps trùng nhiều text → tinh chỉnh dùng `getByLabel`/scope StatCard.

- [ ] **Step 3: Stage** — `git add e2e/home/home.e2e.ts`

---

### Task E2E-3: Tài liệu kịch bản

**Files:** Create `docs/specs/apps-api-integration/e2e.md` (docs worktree)

- [ ] **Step 1:** Viết `e2e.md` liệt kê scenario cuối cùng theo matrix §6 design.md, đánh dấu đã cover / defer (kèm lý do). Ghi rõ các phụ thuộc seed (category + apps-per-category) + follow-up gaps nếu có (vd test empty-category cần seed category rỗng).
- [ ] **Step 2: Stage** (docs worktree) — `git add specs/apps-api-integration/e2e.md`

---

## Phase 7 — Verification tổng thể & commit gate

- [ ] **Step 1: BE full check** — `cd server/.worktrees/apps-api-integration && npx tsc --noEmit && npx jest --testMatch "**/?(*.)+(spec).ts"` → 0 lỗi, test xanh.
- [ ] **Step 2: FE full check** — `cd client/.worktrees/apps-api-integration && yarn format && yarn lint && yarn tsc` → 0 lỗi.
- [ ] **Step 3: E2E xanh** — `cd client/.worktrees/apps-api-integration && yarn e2e` (Apps + Home) → xanh.
- [ ] **Step 4: Code review** — `superpowers:requesting-code-review` theo side (BE convention cho server, FE convention cho client) + `security-auditor` nếu cần (endpoint mới + query param).
- [ ] **Step 5: Commit gate (§7)** — trình diff tổng thể 3 repo cho user review → duyệt → commit per-repo (server/client/docs) với Conventional Commit.
- [ ] **Step 6: Finish** — `superpowers:finishing-a-development-branch` → `creating-github-pr` (PR riêng từng repo).

---

## Self-Review (đã chạy)

1. **Spec coverage:** BE categoryId filter (BE-1) ✓; categories endpoint (BE-2) ✓; API doc (BE-3) ✓; FE contract (FE-1) ✓; Apps pills (FE-2) ✓; Home QuickAccess/Recommended/totalApps (FE-3..6) ✓; xoá Discover (FE-8/9) ✓; E2E matrix 12 nhóm (E2E-1/2/3) ✓.
2. **Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể. (BE-3 có nhánh N/A nếu không có Swagger — có điều kiện rõ ràng, không phải placeholder.)
3. **Type consistency:** `UserCategoryDto = { _id, displayName }` (BE) ↔ `UserCategory = { _id, displayName }` (FE) ↔ `getAppCategories(): Promise<UserCategory[]>` ↔ `CategoryFilter` props `categories: UserCategory[]`. `categoryId?: string` thống nhất `UserAppsQuery` (BE) ↔ `UserAppsQueryParams` (FE). `useAppCategories` key `"appCategories"`; `useHomeApps` key `["apps",{limit}]`. Endpoint `APP_CATEGORIES="/apps/categories"`.
4. **Ambiguity:** §8 design chốt — không persist URL; categories trả tất cả; nút Recommended → Open.
