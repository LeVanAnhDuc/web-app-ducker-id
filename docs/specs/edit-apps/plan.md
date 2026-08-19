# Edit Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PATCH /admin/apps/:id` on the backend and rewire the FE App Registry edit + "hide" flows from mocks to the real API, where "hide" = set `status=INACTIVE` (tạm dừng), not a delete.

**Architecture:** BE extends the existing `web-app` module with one update use case (controller → service → repository), reusing `AdminAppDto` and the create field validators. FE replaces the two mock calls (`updateAdminApp`, `deleteAdminApp`) with `PATCH` requests via two view-local hooks; the row "Delete" action becomes a Hide/Unhide toggle. INACTIVE is relabeled "Paused / Tạm dừng" in the UI.

**Tech Stack:** BE — Express 4, Mongoose 8, Joi, i18next, Jest. FE — Next.js 15, React 19, React Query, react-hook-form + Zod, next-intl, Playwright.

**Conventions:** Read before touching code — `server/.claude/CLAUDE.md` + `.claude/rules/{modules,types,validators,imports,i18n}.md` for BE; `client/.claude/CLAUDE.md` + `.claude/rules/{views,ghosts,imports,constants,components,mocks}.md` for FE. Spec: `docs/specs/edit-apps/design.md`.

**Worktrees (already created, branch `feat/edit-apps`):** `server/.worktrees/edit-apps`, `client/.worktrees/edit-apps`, `docs/.worktrees/edit-apps`. Run `yarn install` in the server + client worktrees before starting their tasks (deps are not shared across worktrees).

---

## File Structure

**Backend** (`server/.worktrees/edit-apps/src/`)
- Modify `modules/web-app/types/index.ts` — add `AdminAppUpdateBody`, `AdminAppIdParams`, `AdminUpdateAppRequest`, `WebAppUpdateInput`.
- Modify `constants/error-code.ts` — add `WEB_APP_NOT_FOUND`.
- Modify `validators/schemas/web-app.ts` — add `adminAppIdParamSchema`, `adminUpdateAppBodySchema`.
- Modify `modules/web-app/repositories/web-app.repository.ts` — add `findById`, `existsByNameExcludingId`, `updateById`.
- Modify `modules/web-app/web-app.service.ts` — add `updateApp`.
- Modify `modules/web-app/web-app.service.spec.ts` — add update test suite.
- Modify `modules/web-app/web-app.controller.ts` — add `updateApp` handler.
- Modify `modules/web-app/web-app.routes.ts` — add `PATCH /:id`.
- Modify `i18n/locales/{en,vi}/webApp.json` — add `success.updateApp`, `errors.notFound`, `validation.id`, `validation.body`.
- Modify `modules/web-app/swagger/{paths,schemas}.ts` — document the endpoint.

**Frontend** (`client/.worktrees/edit-apps/src/`)
- Modify `constants/errorCodes.ts` — add `WEB_APP_NAME_EXISTS`.
- Modify `requests/adminApps.ts` — add `updateAdminApp`, `setAdminAppStatus`.
- Create `views/AdminApps/hooks/useUpdateAdminApp.ts`, `views/AdminApps/hooks/useSetAdminAppStatus.ts`.
- Modify `views/AdminApps/mains/AdminAppsFormSheet/index.tsx` — use real update hook + map 409 to name field.
- Modify `views/AdminApps/components/AppRowActions/index.tsx` — Hide/Unhide toggle.
- Rename `views/AdminApps/mains/AdminAppsDeleteDialog/` → `AdminAppsHideDialog/`.
- Modify `views/AdminApps/mains/AdminAppsTable/index.tsx`, `views/AdminApps/index.tsx` — prop/handler rewire.
- Modify `locales/{en,vi}/adminApps.json` — relabel + add hide keys.
- Delete `mocks/AdminApps.ts`.

**E2E** (`client/.worktrees/edit-apps/`)
- Create `e2e/admin.setup.ts`, `e2e/admin-apps/edit-apps.e2e.ts`, `e2e/helpers/adminApps.ts`.
- Modify `playwright.config.ts` — admin storageState project.
- Create `docs/specs/edit-apps/e2e.md`.

---

## Task 1: BE — types + error code

**Files:**
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/types/index.ts`
- Modify: `server/.worktrees/edit-apps/src/constants/error-code.ts`

- [ ] **Step 1: Add update types** to `types/index.ts` (append after `WebAppCreateInput`). `Request` is already imported at the top of the file.

```ts
export interface AdminAppUpdateBody {
  name?: string;
  displayName?: string;
  description?: string;
  iconUrl?: string;
  homeUrl?: string;
  categoryId?: string;
  status?: WebAppStatusPublic;
  requiredRoles?: AuthenticationRole[];
  redirectUris?: string[];
}

export interface AdminAppIdParams {
  id: string;
}

export interface AdminUpdateAppRequest
  extends Omit<Request, "body" | "params"> {
  body: AdminAppUpdateBody;
  params: AdminAppIdParams;
}

export interface WebAppUpdateInput {
  name?: string;
  displayName?: string;
  description?: string | null;
  iconUrl?: string | null;
  homeUrl?: string;
  categoryId?: string;
  status?: WebAppStatus;
  requiredRoles?: AuthenticationRole[];
  redirectUris?: string[];
}
```

- [ ] **Step 2: Add error code** in `constants/error-code.ts`, in the `// ── Web App ──` group:

```ts
  // ── Web App ──
  WEB_APP_NAME_EXISTS: "WEB_APP_NAME_EXISTS",
  WEB_APP_CATEGORY_NOT_FOUND: "WEB_APP_CATEGORY_NOT_FOUND",
  WEB_APP_NOT_FOUND: "WEB_APP_NOT_FOUND",
```

- [ ] **Step 3: Type-check**

Run: `cd server/.worktrees/edit-apps && yarn tsc`
Expected: PASS (no emit, 0 errors).

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/types/index.ts src/constants/error-code.ts
git commit -m "feat(web-app): BE add update types + WEB_APP_NOT_FOUND code"
```

---

## Task 2: BE — validators (id param + update body)

**Files:**
- Modify: `server/.worktrees/edit-apps/src/validators/schemas/web-app.ts`

- [ ] **Step 1: Import the new types** — extend the existing type import block at the top:

```ts
// types
import type { AdminAppsQuery } from "@/modules/web-app/types";
import type {
  AdminAppCreateBody,
  AdminAppUpdateBody,
  AdminAppIdParams
} from "@/modules/web-app/types";
```

- [ ] **Step 2: Append the two schemas** at the end of `web-app.ts`. The update body is derived from the create schema with `.fork()` so field rules/messages stay DRY; `.min(1)` forces at least one field.

```ts
export const adminAppIdParamSchema: Joi.ObjectSchema<AdminAppIdParams> =
  Joi.object({
    id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
      "string.empty": "webApp:validation.id.required",
      "any.required": "webApp:validation.id.required",
      "string.pattern.base": "webApp:validation.id.invalid"
    })
  });

export const adminUpdateAppBodySchema = adminCreateAppBodySchema
  .fork(
    [
      "name",
      "displayName",
      "homeUrl",
      "categoryId",
      "status",
      "requiredRoles",
      "redirectUris"
    ],
    (schema) => schema.optional()
  )
  .min(1)
  .messages({
    "object.min": "webApp:validation.body.empty"
  }) as Joi.ObjectSchema<AdminAppUpdateBody>;
```

- [ ] **Step 3: Type-check**

Run: `cd server/.worktrees/edit-apps && yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/validators/schemas/web-app.ts
git commit -m "feat(web-app): BE add update body + id param validators"
```

---

## Task 3: BE — repository methods

**Files:**
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/repositories/web-app.repository.ts`

- [ ] **Step 1: Import the update input type** — extend the existing type import:

```ts
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppUpdateInput
} from "../types";
```

- [ ] **Step 2: Extend the `WebAppRepository` contract**:

```ts
export type WebAppRepository = {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  findById(id: string): Promise<WebAppDocument | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcludingId(name: string, excludeId: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
  updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null>;
};
```

- [ ] **Step 3: Implement the methods** inside `MongoWebAppRepository` (after `create`):

```ts
  async findById(id: string): Promise<WebAppDocument | null> {
    return asyncDatabaseHandler("findById", () =>
      WebAppModel.findById(id).lean<WebAppDocument>().exec()
    );
  }

  async existsByNameExcludingId(
    name: string,
    excludeId: string
  ): Promise<boolean> {
    return asyncDatabaseHandler("existsByNameExcludingId", async () => {
      const found = await WebAppModel.exists({ name, _id: { $ne: excludeId } });
      return found !== null;
    });
  }

  async updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null> {
    return asyncDatabaseHandler("updateById", async () => {
      try {
        return await WebAppModel.findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true
        })
          .lean<WebAppDocument>()
          .exec();
      } catch (err) {
        if (isDuplicateKeyError(err) && getDuplicatedField(err) === "name") {
          throw new ConflictRequestError({
            i18nMessage: (t) => t("webApp:errors.nameExists"),
            code: ERROR_CODES.WEB_APP_NAME_EXISTS
          });
        }
        throw err;
      }
    });
  }
```

- [ ] **Step 4: Type-check**

Run: `cd server/.worktrees/edit-apps && yarn tsc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/web-app/repositories/web-app.repository.ts
git commit -m "feat(web-app): BE add findById/existsByNameExcludingId/updateById"
```

---

## Task 4: BE — service `updateApp` (TDD) + i18n

**Files:**
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/web-app.service.spec.ts`
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/web-app.service.ts`
- Modify: `server/.worktrees/edit-apps/src/i18n/locales/en/webApp.json`
- Modify: `server/.worktrees/edit-apps/src/i18n/locales/vi/webApp.json`

- [ ] **Step 1: Write the failing tests.** First update `makeRepos` in `web-app.service.spec.ts` to include the new repo methods, then append the `updateApp` suite. Replace the existing `webAppRepo` literal inside `makeRepos`:

```ts
  const webAppRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    existsByName: jest.fn().mockResolvedValue(false),
    existsByNameExcludingId: jest.fn().mockResolvedValue(false),
    create: jest.fn(),
    updateById: jest.fn()
  };
```

Then append this suite at the end of the file:

```ts
const existingDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "6a24f14e6d65650b697c34c5" },
  name: "blog",
  displayName: "Blog",
  description: null,
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_blog",
  clientSecretHash: "hashed",
  redirectUris: ["https://blog.example.com/cb"],
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-07T00:00:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("WebAppService.updateApp", () => {
  it("throws NotFoundError when the app does not exist", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await expect(
      service.updateApp("app1", { displayName: "New" })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("throws ConflictRequestError when renaming to a name owned by another app", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.existsByNameExcludingId.mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await expect(
      service.updateApp("app1", { name: "taken" })
    ).rejects.toBeInstanceOf(ConflictRequestError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("skips the name check when the name is unchanged", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue(existingDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await service.updateApp("app1", { name: "blog", displayName: "Blog 2" });
    expect(webAppRepo.existsByNameExcludingId).not.toHaveBeenCalled();
    expect(webAppRepo.updateById).toHaveBeenCalled();
  });

  it("throws NotFoundError when the new category does not exist", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    categoryRepo.existsById.mockResolvedValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await expect(
      service.updateApp("app1", { categoryId: "6a24f14e6d65650b697c34c6" })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(webAppRepo.updateById).not.toHaveBeenCalled();
  });

  it("maps public status to internal when hiding (inactive)", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue({
      ...existingDoc,
      status: WEB_APP_STATUSES.INACTIVE
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    const result = await service.updateApp("app1", { status: "inactive" });
    const persisted = webAppRepo.updateById.mock.calls[0][1];
    expect(persisted.status).toBe(WEB_APP_STATUSES.INACTIVE);
    expect(result.status).toBe("inactive");
  });

  it("only persists provided fields and returns the mapped DTO", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.findById.mockResolvedValue(existingDoc);
    webAppRepo.updateById.mockResolvedValue({
      ...existingDoc,
      displayName: "Renamed"
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    const result = await service.updateApp("app1", { displayName: "Renamed" });
    const persisted = webAppRepo.updateById.mock.calls[0][1];
    expect(Object.keys(persisted)).toEqual(["displayName"]);
    expect(result.displayName).toBe("Renamed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).clientSecret).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server/.worktrees/edit-apps && npx jest --testMatch "**/web-app.service.spec.ts"`
Expected: FAIL — `service.updateApp is not a function`.

(Note: this project's jest `<rootDir>` glob misbehaves inside `.worktrees/`; use the explicit `--testMatch` form above.)

- [ ] **Step 3: Implement `updateApp`.** Add imports to `web-app.service.ts` type block:

```ts
import type { AdminAppsQuery, AdminAppCreateBody, AdminAppUpdateBody } from "./types";
import type { WebAppRepository, WebAppCategoryRepository } from "./repositories";
import type { WebAppUpdateInput } from "./types";
```

Then add the method to `WebAppService` (after `createApp`):

```ts
  async updateApp(
    id: string,
    body: AdminAppUpdateBody
  ): Promise<AdminAppDto> {
    const existing = await this.webAppRepo.findById(id);
    if (!existing) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.notFound"),
        code: ERROR_CODES.WEB_APP_NOT_FOUND
      });
    }

    if (body.name !== undefined && body.name !== existing.name) {
      const taken = await this.webAppRepo.existsByNameExcludingId(
        body.name,
        id
      );
      if (taken) {
        throw new ConflictRequestError({
          i18nMessage: (t) => t("webApp:errors.nameExists"),
          code: ERROR_CODES.WEB_APP_NAME_EXISTS
        });
      }
    }

    if (body.categoryId !== undefined) {
      const categoryExists = await this.categoryRepo.existsById(
        body.categoryId
      );
      if (!categoryExists) {
        throw new NotFoundError({
          i18nMessage: (t) => t("webApp:errors.categoryNotFound"),
          code: ERROR_CODES.WEB_APP_CATEGORY_NOT_FOUND
        });
      }
    }

    const updateInput: WebAppUpdateInput = {};
    if (body.name !== undefined) updateInput.name = body.name;
    if (body.displayName !== undefined)
      updateInput.displayName = body.displayName;
    if (body.description !== undefined)
      updateInput.description = body.description.trim()
        ? body.description.trim()
        : null;
    if (body.iconUrl !== undefined)
      updateInput.iconUrl = body.iconUrl.trim() ? body.iconUrl.trim() : null;
    if (body.homeUrl !== undefined) updateInput.homeUrl = body.homeUrl;
    if (body.categoryId !== undefined)
      updateInput.categoryId = body.categoryId;
    if (body.status !== undefined)
      updateInput.status = toInternalStatus(body.status);
    if (body.requiredRoles !== undefined)
      updateInput.requiredRoles = body.requiredRoles;
    if (body.redirectUris !== undefined)
      updateInput.redirectUris = body.redirectUris;

    const updated = await this.webAppRepo.updateById(id, updateInput);
    if (!updated) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.notFound"),
        code: ERROR_CODES.WEB_APP_NOT_FOUND
      });
    }

    return toAdminAppDto(updated);
  }
```

- [ ] **Step 4: Add i18n keys.** In `en/webApp.json` add `success.updateApp`, `errors.notFound`, and `validation.id` + `validation.body`:

```jsonc
  "success": {
    "listApps": "Apps retrieved successfully.",
    "listCategories": "Categories retrieved successfully.",
    "createApp": "App registered successfully.",
    "updateApp": "App updated successfully."
  },
  "errors": {
    "nameExists": "An app with this name already exists.",
    "categoryNotFound": "The selected category does not exist.",
    "notFound": "App not found."
  },
```

And inside `"validation"` add:

```jsonc
    "id": {
      "required": "App id is required.",
      "invalid": "Invalid app id."
    },
    "body": {
      "empty": "Provide at least one field to update."
    }
```

In `vi/webApp.json` mirror with: `success.updateApp` = `"Cập nhật ứng dụng thành công."`, `errors.notFound` = `"Không tìm thấy ứng dụng."`, `validation.id.required` = `"Thiếu id ứng dụng."`, `validation.id.invalid` = `"id ứng dụng không hợp lệ."`, `validation.body.empty` = `"Cần ít nhất một trường để cập nhật."`

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server/.worktrees/edit-apps && npx jest --testMatch "**/web-app.service.spec.ts"`
Expected: PASS (all create + update tests green).

- [ ] **Step 6: Commit**

```bash
git add src/modules/web-app/web-app.service.ts src/modules/web-app/web-app.service.spec.ts src/i18n/locales/en/webApp.json src/i18n/locales/vi/webApp.json
git commit -m "feat(web-app): BE service updateApp + i18n"
```

---

## Task 5: BE — controller + route

**Files:**
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/web-app.controller.ts`
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/web-app.routes.ts`

- [ ] **Step 1: Add the controller handler.** Extend the type import and add the method:

```ts
import type { AdminAppsQueryRequest, AdminCreateAppRequest, AdminUpdateAppRequest } from "./types";
```

```ts
  updateApp = async (
    req: AdminUpdateAppRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.updateApp(req.params.id, req.body);
    new OkSuccess({
      data,
      message: "webApp:success.updateApp"
    }).send(req, res);
  };
```

- [ ] **Step 2: Wire the route.** Update imports and add the `PATCH` route after `POST /`:

```ts
import {
  adminListAppsQuerySchema,
  adminCreateAppBodySchema,
  adminUpdateAppBodySchema,
  adminAppIdParamSchema
} from "@/validators/schemas/web-app";
import {
  adminGuard,
  authGuard,
  queryPipe,
  bodyPipe,
  paramsPipe
} from "@/middlewares";
```

```ts
  adminApps.patch(
    "/:id",
    paramsPipe(adminAppIdParamSchema),
    bodyPipe(adminUpdateAppBodySchema),
    asyncHandler(controller.updateApp)
  );
```

- [ ] **Step 3: Type-check + tests**

Run: `cd server/.worktrees/edit-apps && yarn tsc && npx jest --testMatch "**/web-app.service.spec.ts"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/web-app.controller.ts src/modules/web-app/web-app.routes.ts
git commit -m "feat(web-app): BE wire PATCH /admin/apps/:id"
```

---

## Task 6: BE — Swagger docs + quality gate

**Files:**
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/swagger/paths.ts`
- Modify: `server/.worktrees/edit-apps/src/modules/web-app/swagger/schemas.ts`

- [ ] **Step 1: Read the existing swagger files** to match their exact style (`Read paths.ts` and `schemas.ts`). Follow `standard-doc-api/SKILL.md`.

- [ ] **Step 2: Add the `PATCH /admin/apps/{id}` path** mirroring the existing `POST /admin/apps` entry: `id` path param (ObjectId), request body referencing a new `AdminAppUpdateInput` schema (all fields optional, same constraints as create), responses `200` (AdminApp), `400`, `404` (WEB_APP_NOT_FOUND / WEB_APP_CATEGORY_NOT_FOUND), `409` (WEB_APP_NAME_EXISTS). Add the `AdminAppUpdateInput` schema to `schemas.ts`.

- [ ] **Step 3: Quality gate** (mandatory per `server/.claude/CLAUDE.md`):

Run: `cd server/.worktrees/edit-apps && yarn format && yarn lint && yarn tsc && npx jest --testMatch "**/web-app.service.spec.ts"`
Expected: all pass, 0 errors. Re-read any files auto-fixed by format/lint.

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/swagger/
git commit -m "docs(web-app): BE swagger for PATCH /admin/apps/:id"
```

---

## Task 7: FE — error code + requests

**Files:**
- Modify: `client/.worktrees/edit-apps/src/constants/errorCodes.ts`
- Modify: `client/.worktrees/edit-apps/src/requests/adminApps.ts`

- [ ] **Step 1: Add the FE error code** in `errorCodes.ts`:

```ts
const ERROR_CODES = {
  REFRESH_TOKEN_REQUIRED: "REFRESH_TOKEN_REQUIRED",
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
  CHANGE_PASSWORD_WRONG_CURRENT: "CHANGE_PASSWORD_WRONG_CURRENT",
  CHANGE_PASSWORD_SAME_AS_CURRENT: "CHANGE_PASSWORD_SAME_AS_CURRENT",
  WEB_APP_NAME_EXISTS: "WEB_APP_NAME_EXISTS"
} as const;
```

- [ ] **Step 2: Add the two request functions** in `requests/adminApps.ts`. Extend the type import to include `AppStatus` + `AdminAppUpdateInput`, then append (dynamic id follows the existing `${END_POINTS.X}/${id}` pattern used in `requests/contactAdmin.ts`):

```ts
import type {
  AdminAppsQueryParams,
  AdminAppCreateInput,
  AdminAppCreateResult,
  AdminAppUpdateInput,
  AppStatus,
  WebApp,
  WebAppCategory
} from "@/types/AdminApps";
```

```ts
export const updateAdminApp = async (
  id: string,
  input: AdminAppUpdateInput
): Promise<WebApp> => {
  const response = await axiosInstance.patch<ResponsePattern<WebApp>>(
    `${END_POINTS.ADMIN_APPS}/${id}`,
    input
  );
  return response.data.data;
};

export const setAdminAppStatus = async (
  id: string,
  status: AppStatus
): Promise<WebApp> => {
  const response = await axiosInstance.patch<ResponsePattern<WebApp>>(
    `${END_POINTS.ADMIN_APPS}/${id}`,
    { status }
  );
  return response.data.data;
};
```

- [ ] **Step 3: Type-check**

Run: `cd client/.worktrees/edit-apps && yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/constants/errorCodes.ts src/requests/adminApps.ts
git commit -m "feat(admin-apps): FE add update + setStatus requests"
```

---

## Task 8: FE — view-local hooks

**Files:**
- Create: `client/.worktrees/edit-apps/src/views/AdminApps/hooks/useUpdateAdminApp.ts`
- Create: `client/.worktrees/edit-apps/src/views/AdminApps/hooks/useSetAdminAppStatus.ts`

- [ ] **Step 1: Create `useUpdateAdminApp.ts`.** No `onError` here — the form maps the 409 to a field (Task 9), so error handling is per-call.

```ts
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { AdminAppUpdateInput } from "@/types/AdminApps";
// requests
import { updateAdminApp } from "@/requests/adminApps";
// others
import { ADMIN_APPS_QUERY_KEY } from "./useCreateAdminApp";

const useUpdateAdminApp = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminApps.toast");

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminAppUpdateInput }) =>
      updateAdminApp(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_APPS_QUERY_KEY] });
      toast.success(tToast("updateSuccess"));
    }
  });
};

export default useUpdateAdminApp;
```

- [ ] **Step 2: Create `useSetAdminAppStatus.ts`.**

```ts
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { AppStatus } from "@/types/AdminApps";
// requests
import { setAdminAppStatus } from "@/requests/adminApps";
// others
import { ADMIN_APPS_QUERY_KEY } from "./useCreateAdminApp";

const useSetAdminAppStatus = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminApps.toast");

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppStatus }) =>
      setAdminAppStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_APPS_QUERY_KEY] });
      toast.success(
        variables.status === "inactive"
          ? tToast("hidden")
          : tToast("reactivated")
      );
    },
    onError: () => toast.error(tToast("error"))
  });
};

export default useSetAdminAppStatus;
```

- [ ] **Step 3: Type-check**

Run: `cd client/.worktrees/edit-apps && yarn tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/AdminApps/hooks/useUpdateAdminApp.ts src/views/AdminApps/hooks/useSetAdminAppStatus.ts
git commit -m "feat(admin-apps): FE update + setStatus hooks"
```

---

## Task 9: FE — FormSheet uses real update + maps 409 to name field

**Files:**
- Modify: `client/.worktrees/edit-apps/src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`

- [ ] **Step 1: Replace the mock-backed update logic.** Apply these changes:

Imports — replace the React Query import, drop the mock + queryClient, add Axios type + the new hook + CONSTANTS:

```ts
// libs
import { FormProvider, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { AxiosError } from "axios";
import type {
  AdminAppFormValues,
  WebApp,
  AdminAppCreateResult
} from "@/types/AdminApps";
```

Hooks import block — drop the named `ADMIN_APPS_QUERY_KEY`, add the update hook:

```ts
// hooks
import { useAnnounce } from "@/hooks";
import useCreateAdminApp from "../../hooks/useCreateAdminApp";
import useUpdateAdminApp from "../../hooks/useUpdateAdminApp";
```

Remove the line `import { updateAdminApp } from "@/mocks/AdminApps";` and the `// others` group if now empty, and add CONSTANTS:

```ts
// others
import CONSTANTS from "@/constants";
```

- [ ] **Step 2: Replace the mutation wiring + `onSubmit`.** Remove the old `queryClient`, the inline `updateMutation` (`useMutation`), and rewrite:

```ts
  const { announce } = useAnnounce();
  const isEdit = editingApp !== null;

  const { NAME } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
  const { WEB_APP_NAME_EXISTS } = CONSTANTS.ERROR_CODES;

  const methods = useForm<AdminAppFormValues>(adminAppFormProps);

  const { data: categories = [] } = useQuery({
    queryKey: [ADMIN_APP_CATEGORIES_QUERY_KEY],
    queryFn: getAdminAppCategories,
    enabled: open
  });

  const createMutation = useCreateAdminApp();
  const updateMutation = useUpdateAdminApp();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: AdminAppFormValues) => {
    if (isEdit && editingApp) {
      updateMutation.mutate(
        { id: editingApp._id, input: values },
        {
          onSuccess: (updated) => {
            announce(tAnnounce("updated", { name: updated.displayName }));
            onClose();
          },
          onError: (error) => {
            const code = (error as AxiosError<ErrorResponsePattern>).response
              ?.data?.code;
            if (code === WEB_APP_NAME_EXISTS) {
              methods.setError(NAME, { message: "exists" });
            } else {
              toast.error(tToast("error"));
            }
          }
        }
      );
      return;
    }
    createMutation.mutate(values, {
      onSuccess: (created) => {
        announce(tAnnounce("created", { name: created.displayName }));
        onClose();
        onCreated(created);
      },
      onError: () => toast.error(tToast("error"))
    });
  };
```

(`ErrorResponsePattern` is a global type from `common.d.ts` — no import needed. `tToast`/`tAnnounce`/`tActions`/`t` declarations stay as-is.)

- [ ] **Step 3: Type-check + lint**

Run: `cd client/.worktrees/edit-apps && yarn tsc && yarn lint`
Expected: PASS, 0 errors. Re-read the file if lint auto-fixed it.

- [ ] **Step 4: Commit**

```bash
git add src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx
git commit -m "feat(admin-apps): FE wire edit to real API + map name conflict to field"
```

---

## Task 10: FE — Hide/Unhide (row actions, dialog rename, table, page)

**Files:**
- Modify: `client/.worktrees/edit-apps/src/views/AdminApps/components/AppRowActions/index.tsx`
- Rename: `client/.worktrees/edit-apps/src/views/AdminApps/mains/AdminAppsDeleteDialog/` → `AdminAppsHideDialog/`
- Modify: `client/.worktrees/edit-apps/src/views/AdminApps/mains/AdminAppsTable/index.tsx`
- Modify: `client/.worktrees/edit-apps/src/views/AdminApps/index.tsx`

- [ ] **Step 1: Rewrite `AppRowActions`** to a conditional Hide/Unhide toggle:

```tsx
"use client";

// libs
import { Edit, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { WebApp } from "@/types/AdminApps";
// components
import CustomButton from "@/components/CustomButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const AppRowActions = ({
  app,
  onEdit,
  onHide,
  onUnhide
}: {
  app: WebApp;
  onEdit: (app: WebApp) => void;
  onHide: (app: WebApp) => void;
  onUnhide: (app: WebApp) => void;
}) => {
  const t = useTranslations("adminApps.actions");
  const isActive = app.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CustomButton
          variant="ghost"
          size="icon-sm"
          aria-label={t("rowMenuLabel")}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </CustomButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => onEdit(app)}
        >
          <Edit className="size-4" aria-hidden="true" />
          <span>{t("edit")}</span>
        </DropdownMenuItem>
        {isActive ? (
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2"
            onSelect={() => onHide(app)}
          >
            <EyeOff className="size-4" aria-hidden="true" />
            <span>{t("hide")}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => onUnhide(app)}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span>{t("unhide")}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppRowActions;
```

- [ ] **Step 2: Rename the dialog folder and rewrite it.** Move `AdminAppsDeleteDialog/index.tsx` to `AdminAppsHideDialog/index.tsx`:

```bash
git mv src/views/AdminApps/mains/AdminAppsDeleteDialog src/views/AdminApps/mains/AdminAppsHideDialog
```

Replace its contents (uses the status hook; confirm is for hide only):

```tsx
"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { WebApp } from "@/types/AdminApps";
// components
import CustomButton from "@/components/CustomButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
// hooks
import { useAnnounce } from "@/hooks";
import useSetAdminAppStatus from "../../hooks/useSetAdminAppStatus";

const AdminAppsHideDialog = ({
  target,
  onClose
}: {
  target: WebApp | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminApps");
  const tActions = useTranslations("adminApps.actions");
  const tAnnounce = useTranslations("adminApps.announce");
  const { announce } = useAnnounce();
  const mutation = useSetAdminAppStatus();

  const handleConfirm = () => {
    if (!target) return;
    mutation.mutate(
      { id: target._id, status: "inactive" },
      {
        onSuccess: () => {
          announce(tAnnounce("hidden", { name: target.displayName }));
          onClose();
        }
      }
    );
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("hide.title", { name: target?.displayName ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("hide.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {tActions("cancel")}
          </CustomButton>
          <CustomButton
            type="button"
            variant="destructive"
            loading={mutation.isPending}
            onClick={handleConfirm}
          >
            {tActions("confirmHide")}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAppsHideDialog;
```

- [ ] **Step 3: Update `AdminAppsTable`** — change the props and pass-through. Replace the prop type and the `AppRowActions` usage:

```tsx
const AdminAppsTable = ({
  onEdit,
  onHide,
  onUnhide
}: {
  onEdit: (app: WebApp) => void;
  onHide: (app: WebApp) => void;
  onUnhide: (app: WebApp) => void;
}) => {
```

```tsx
                  <AppRowActions
                    app={app}
                    onEdit={onEdit}
                    onHide={onHide}
                    onUnhide={onUnhide}
                  />
```

- [ ] **Step 4: Update the page `index.tsx`** — rename delete state to hide, add unhide via the status hook:

```tsx
"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { WebApp, AdminAppCreateResult } from "@/types/AdminApps";
// components
import AdminAppsHeader from "./mains/AdminAppsHeader";
import AdminAppsToolbar from "./mains/AdminAppsToolbar";
import AdminAppsTable from "./mains/AdminAppsTable";
import AdminAppsFormSheet from "./mains/AdminAppsFormSheet";
import AdminAppsHideDialog from "./mains/AdminAppsHideDialog";
import AdminAppsSecretDialog from "./mains/AdminAppsSecretDialog";
// hooks
import { useAnnounce } from "@/hooks";
import useSetAdminAppStatus from "./hooks/useSetAdminAppStatus";

const AdminApps = () => {
  const tAnnounce = useTranslations("adminApps.announce");
  const { announce } = useAnnounce();
  const setStatusMutation = useSetAdminAppStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<WebApp | null>(null);
  const [hideTarget, setHideTarget] = useState<WebApp | null>(null);
  const [createdApp, setCreatedApp] = useState<AdminAppCreateResult | null>(
    null
  );

  const handleCreate = () => {
    setEditingApp(null);
    setFormOpen(true);
  };

  const handleEdit = (app: WebApp) => {
    setEditingApp(app);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingApp(null);
  };

  const handleHide = (app: WebApp) => setHideTarget(app);

  const handleCloseHide = () => setHideTarget(null);

  const handleUnhide = (app: WebApp) =>
    setStatusMutation.mutate(
      { id: app._id, status: "active" },
      {
        onSuccess: () =>
          announce(tAnnounce("reactivated", { name: app.displayName }))
      }
    );

  const handleCloseSecret = () => setCreatedApp(null);

  return (
    <div className="space-y-6">
      <AdminAppsHeader onCreate={handleCreate} />
      <AdminAppsToolbar />
      <AdminAppsTable
        onEdit={handleEdit}
        onHide={handleHide}
        onUnhide={handleUnhide}
      />
      <AdminAppsFormSheet
        open={formOpen}
        editingApp={editingApp}
        onClose={handleCloseForm}
        onCreated={setCreatedApp}
      />
      <AdminAppsHideDialog target={hideTarget} onClose={handleCloseHide} />
      <AdminAppsSecretDialog app={createdApp} onClose={handleCloseSecret} />
    </div>
  );
};

export default AdminApps;
```

- [ ] **Step 5: Type-check + lint**

Run: `cd client/.worktrees/edit-apps && yarn tsc && yarn lint`
Expected: PASS, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/AdminApps/
git commit -m "feat(admin-apps): FE replace delete with hide/unhide status toggle"
```

---

## Task 11: FE — i18n relabel + remove mock

**Files:**
- Modify: `client/.worktrees/edit-apps/src/locales/en/adminApps.json`
- Modify: `client/.worktrees/edit-apps/src/locales/vi/adminApps.json`
- Delete: `client/.worktrees/edit-apps/src/mocks/AdminApps.ts`

- [ ] **Step 1: Edit `en/adminApps.json`.** Apply exactly:

In `"actions"` — remove `"delete"` and `"confirmDelete"`; add `"hide"`, `"unhide"`, `"confirmHide"`:

```jsonc
    "edit": "Edit",
    "hide": "Hide",
    "unhide": "Unhide",
    "confirmHide": "Hide App",
```

In `"status"` — relabel inactive:

```jsonc
  "status": {
    "active": "Active",
    "inactive": "Paused"
  },
```

Replace the `"delete"` block with `"hide"`:

```jsonc
  "hide": {
    "title": "Hide {name}?",
    "description": "This pauses the app — it stays in the registry but is hidden from users' dashboards. You can unhide it anytime."
  },
```

In `"toast"` — remove `"deleteSuccess"`; add `"hidden"`, `"reactivated"` (keep `updateSuccess`):

```jsonc
  "toast": {
    "createSuccess": "App registered.",
    "updateSuccess": "App updated.",
    "hidden": "App hidden.",
    "reactivated": "App reactivated.",
    "error": "Something went wrong. Please try again."
  },
```

In `"announce"` — remove `"deleteOpened"` and `"deleted"`; add `"hidden"`, `"reactivated"` (keep `updated`):

```jsonc
  "announce": {
    "formOpened": "App registration form opened.",
    "formClosed": "App registration form closed.",
    "editOpened": "Editing app {name}.",
    "created": "App {name} registered.",
    "updated": "App {name} updated.",
    "hidden": "App {name} hidden.",
    "reactivated": "App {name} reactivated."
  },
```

In `"form" → "validation" → "name"` — add `"exists"` (used by the 409→field mapping in Task 9):

```jsonc
      "name": {
        "required": "Please enter a name.",
        "minLength": "Name must be at least 2 characters.",
        "maxLength": "Name must not exceed 64 characters.",
        "invalid": "Use lowercase letters, numbers, and hyphens only.",
        "exists": "An app with this name already exists."
      },
```

- [ ] **Step 2: Edit `vi/adminApps.json`** with the same key changes, Vietnamese text: `actions.hide`=`"Ẩn"`, `actions.unhide`=`"Bỏ ẩn"`, `actions.confirmHide`=`"Tạm dừng ứng dụng"` (remove `delete`/`confirmDelete`); `status.inactive`=`"Tạm dừng"`; `hide.title`=`"Tạm dừng {name}?"`, `hide.description`=`"Thao tác này tạm dừng ứng dụng — vẫn giữ trong registry nhưng ẩn khỏi dashboard người dùng. Bạn có thể bỏ ẩn bất cứ lúc nào."`; `toast.hidden`=`"Đã tạm dừng ứng dụng."`, `toast.reactivated`=`"Đã kích hoạt lại ứng dụng."` (remove `deleteSuccess`); `announce.hidden`=`"Đã tạm dừng ứng dụng {name}."`, `announce.reactivated`=`"Đã kích hoạt lại ứng dụng {name}."` (remove `deleteOpened`/`deleted`); `form.validation.name.exists`=`"Đã tồn tại ứng dụng với tên này."`

- [ ] **Step 3: Delete the mock and verify no importers remain.**

```bash
git rm src/mocks/AdminApps.ts
```

Run: `cd client/.worktrees/edit-apps && grep -rn "mocks/AdminApps" src/ || echo "NO IMPORTERS"`
Expected: `NO IMPORTERS`.

- [ ] **Step 4: Quality gate**

Run: `cd client/.worktrees/edit-apps && yarn format && yarn lint && yarn tsc`
Expected: all pass, 0 errors. Re-read auto-fixed files.

- [ ] **Step 5: Commit**

```bash
git add src/locales/en/adminApps.json src/locales/vi/adminApps.json src/mocks/
git commit -m "feat(admin-apps): FE i18n paused/hide labels + drop AdminApps mock"
```

---

## Task 12: E2E — edit + hide/unhide (FE verification gate)

> Precondition (CLAUDE.md §4.3): BE on :5000, FE on :3000 (worktree dev server, see [[reference_e2e_worktree_devserver]]), Mongo + Redis up, DB seeded with **an admin account** and the seed apps. The admin-apps page requires `ADMIN` role, so this suite needs an admin storageState distinct from the existing user one. Self-check app-running before `yarn e2e`; if not running, ask the user (run themselves vs. agent starts it), and tear down only what the agent started.

**Files:**
- Create: `client/.worktrees/edit-apps/e2e/admin.setup.ts`
- Modify: `client/.worktrees/edit-apps/playwright.config.ts`
- Create: `client/.worktrees/edit-apps/e2e/helpers/adminApps.ts`
- Create: `client/.worktrees/edit-apps/e2e/admin-apps/edit-apps.e2e.ts`
- Create: `docs/.worktrees/edit-apps/specs/edit-apps/e2e.md`

- [ ] **Step 1: Add `admin.setup.ts`** (mirrors `auth.setup.ts`, admin creds, separate storage file):

```ts
import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/admin.json";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@test.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@123";

setup("authenticate admin", async ({ page }) => {
  const res = await page.request.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: PASSWORD }
  });
  expect(res.ok()).toBeTruthy();

  const state = await page.context().storageState({ path: AUTH_FILE });
  expect(state.cookies.some((c) => c.name === "refreshToken")).toBeTruthy();
});
```

- [ ] **Step 2: Add the admin project to `playwright.config.ts`.** Scope the existing `chromium` (user) project away from admin-apps and add an `admin` project:

```ts
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "admin-setup", testMatch: /admin\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /admin-apps\//,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json"
      },
      dependencies: ["setup"]
    },
    {
      name: "admin",
      testMatch: /admin-apps\/.*\.e2e\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json"
      },
      dependencies: ["admin-setup"]
    }
  ]
```

- [ ] **Step 3: Add a revert helper `e2e/helpers/adminApps.ts`** — logs in as admin via API and restores an app's displayName + status by name (idempotent, used in `afterAll`):

```ts
import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@test.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@123";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

type AppDto = {
  _id: string;
  name: string;
  displayName: string;
  status: "active" | "inactive";
};

async function adminToken(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: PASSWORD }
  });
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error("adminApps helper: admin login failed");
  return token;
}

export async function restoreApp(
  appName: string,
  displayName: string,
  status: "active" | "inactive"
): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const token = await adminToken(ctx);
    const auth = { Authorization: `Bearer ${token}` };
    const listRes = await ctx.get("/api/v1/admin/apps", { headers: auth });
    const list = (await listRes.json()) as { data?: { items?: AppDto[] } };
    const app = list?.data?.items?.find((a) => a.name === appName);
    if (!app) throw new Error(`restoreApp: app "${appName}" not found`);
    const res = await ctx.patch(`/api/v1/admin/apps/${app._id}`, {
      headers: auth,
      data: { displayName, status }
    });
    if (!res.ok())
      throw new Error(`restoreApp: revert failed (${res.status()})`);
  } finally {
    await ctx.dispose();
  }
}
```

- [ ] **Step 4: Write the spec `e2e/admin-apps/edit-apps.e2e.ts`.** Adjust `TARGET_APP` to a seeded active app (confirm its `name`/`displayName` from the seed before running).

```ts
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { restoreApp } from "../helpers/adminApps";

const TARGET_APP = { name: "blog", displayName: "Blog" };
const EDITED_DISPLAY_NAME = "Blog (edited e2e)";

const rowMenu = (page: Page, displayName: string) =>
  page
    .getByRole("row", { name: new RegExp(displayName) })
    .getByRole("button", { name: "App actions" });

test.describe.configure({ mode: "serial" });

test.describe("Admin Apps — edit + hide/unhide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  test("edits an app's display name", async ({ page }) => {
    await rowMenu(page, TARGET_APP.displayName).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const displayName = page.getByLabel("Display Name", { exact: true });
    await expect(displayName).toBeVisible();
    await displayName.fill(EDITED_DISPLAY_NAME);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("App updated.")).toBeVisible();
    await expect(page.getByText(EDITED_DISPLAY_NAME)).toBeVisible();
  });

  test("hides then unhides an app (status toggle)", async ({ page }) => {
    await rowMenu(page, EDITED_DISPLAY_NAME).click();
    await page.getByRole("menuitem", { name: "Hide" }).click();
    await page.getByRole("button", { name: "Hide App" }).click();
    await expect(page.getByText("App hidden.")).toBeVisible();
    const row = page.getByRole("row", {
      name: new RegExp(EDITED_DISPLAY_NAME)
    });
    await expect(row.getByText("Paused")).toBeVisible();

    await rowMenu(page, EDITED_DISPLAY_NAME).click();
    await page.getByRole("menuitem", { name: "Unhide" }).click();
    await expect(page.getByText("App reactivated.")).toBeVisible();
    await expect(row.getByText("Active")).toBeVisible();
  });

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});
```

- [ ] **Step 5: Write the scenario doc `docs/specs/edit-apps/e2e.md`** — document: preconditions (app running, seeded admin + apps, worktree dev server on an alt port with `E2E_BASE_URL`), the admin storageState project, the two scenarios (edit display name; hide→unhide), and the `afterAll` revert contract (idempotent restore by app name).

- [ ] **Step 6: Run the E2E suite** (after the app-running self-check / user coordination):

Run: `cd client/.worktrees/edit-apps && yarn e2e --project=admin-setup --project=admin`
Expected: PASS (edit + hide/unhide green), DB left as seeded after revert.

- [ ] **Step 7: Commit** (two repos — client + docs):

```bash
# client worktree
git add e2e/ playwright.config.ts
git commit -m "test(e2e): admin-apps edit + hide/unhide with admin storageState"
# docs worktree
cd ../../../docs/.worktrees/edit-apps
git add specs/edit-apps/e2e.md
git commit -m "docs(edit-apps): E2E scenario doc"
```

---

## Self-Review (completed during planning)

**Spec coverage:** §3 API → Tasks 1–6; §4 BE files → Tasks 1–6; §5 FE files → Tasks 7–11; §6 error handling → Task 4 (BE codes/i18n) + Task 9 (FE 409→field); §7 testing → Task 4 (BE unit) + Task 12 (E2E); D3/D4 hide=INACTIVE → Tasks 8–11; D5 visibility (admin list keeps paused) → no list-filter change (paused rows stay), user-side filter flagged as future contract note (Task scope excludes it, matches spec §5 note).

**Placeholder scan:** Task 6 (swagger) intentionally says "mirror the existing POST entry / follow standard-doc-api" rather than inlining OpenAPI YAML, because the exact swagger DSL must match the un-read `paths.ts`/`schemas.ts` style — Step 1 requires reading them first. All code-bearing steps contain complete code.

**Type consistency:** `AdminAppUpdateBody`/`WebAppUpdateInput` (BE) and `AdminAppUpdateInput`/`AppStatus` (FE, pre-existing) used consistently. `updateAdminApp(id, input)` ↔ hook `mutate({ id, input })` ↔ `setAdminAppStatus(id, status)` ↔ hook `mutate({ id, status })`. Row action props `onHide`/`onUnhide` consistent across `AppRowActions`, `AdminAppsTable`, `index.tsx`. `ADMIN_APPS_QUERY_KEY` still exported from `useCreateAdminApp` and imported by both new hooks + the table.

**Note on §7 commit gate:** under the default Review-ON mode (CLAUDE.md §7), implementer subagents stage per task but the actual commits are batched after one overall user review — the `git commit` steps above describe intended commit boundaries, not an instruction to bypass the review gate.

---

## E2E Backfill Plan

> **Mục đích**: backfill coverage E2E cho **edit-apps** — expand toàn bộ `## E2E Scenario Matrix` (design.md §matrix, 12 nhóm) thành từng Playwright test cụ thể. Đây là backfill cho feature **đã có** suite (T1 edit display name + T2 hide/unhide đã ở `client/e2e/admin-apps/edit-apps.e2e.ts`); theo CLAUDE.md §4.3 "sửa/fix feature đã có" → **reconcile** (ADD case mới, giữ T1/T2 có sẵn, UPDATE T1 mở rộng full-prefill), KHÔNG rebuild suite.
>
> **Quy ước thực thi (TDD)**: mỗi task = 1 test (hoặc 1 nhóm `[BVA]`/`[EP]` chung field). Theo `superpowers:test-driven-development`: viết test → chạy `cd client && yarn e2e --project=admin -g "<test title>"` → đỏ vì assertion sai/feature chưa đúng → khi feature đã implement (Tasks 1–12 ở trên) → xanh. Backfill chạy **sau** khi feature code đã merge nên hầu hết phải xanh ngay; test nào đỏ → `superpowers:systematic-debugging` (ghi `e2e-bugs.md`), KHÔNG sửa app code trong test.
>
> **File đích duy nhất**: `client/e2e/admin-apps/edit-apps.e2e.ts` (EXTEND — không tạo file mới). Chạy dưới project `admin` (playwright.config.ts `testMatch: /admin-apps\/.*\.e2e\.ts/`, storageState `e2e/.auth/admin.json`).
>
> **Selector contract** (đã verify từ source — KHÔNG đoán):
> - Row menu: `page.getByRole("row", { name: <displayName> }).getByRole("button", { name: "App actions" })` (aria-label = `actions.rowMenuLabel`).
> - Menu items: `getByRole("menuitem", { name: "Edit" | "Hide" | "Unhide" })`.
> - Form fields (label → role): Name/Display Name/Description/Home URL/Icon URL = `getByRole("textbox", { name: <label> })`; Category = `getByRole("combobox", { name: "Category" })` (render `cat.name` trong `SelectValue`, KHÔNG ObjectId); Status = `getByRole("switch", { name: "Active" })`; Required Roles = `getByRole("checkbox", { name: "User" | "Admin" })`; redirect URIs = `StringListField` (dùng `input[name=...]`/index-based locator nếu role không đủ — verify lúc viết, KHÔNG sửa app DOM).
> - Submit: `getByRole("button", { name: "Save Changes" })` (`actions.updateSubmit`); Cancel: `getByRole("button", { name: "Cancel" })`.
> - Hide confirm dialog button: `getByRole("button", { name: "Hide App" })` (`actions.confirmHide`).
> - Toasts (sonner): `getByText("App updated." | "App hidden." | "App reactivated." | "Something went wrong. Please try again.")`.
> - Inline validation: `getByText(<localized message>)` trong sheet — strings từ `adminApps.form.validation.*` (en/vi đã có).
> - Announcer: `page.locator("#announcer")` (`aria-live=polite`) → `toHaveText` / `toContainText`.
>
> **Seed deps**: dùng app seed `blog` (displayName `Blog`, category `Content`, `status=active`) làm TARGET edit; app **khác** `dashboard` làm conflict-name target (409). App có `description=null`+`iconUrl=null` (seed) cho null-prefill — nếu seed `blog` không null thì pick app seed null khác hoặc tạo qua helper rồi cleanup (xem Task E2E-5).
>
> **Mutation revert**: mọi test mutate phải idempotent revert qua `restoreApp(name, displayName, status)` (helper có sẵn) ở `afterAll` (mode `serial` đã set). Test mutate ngoài `blog` → thêm restore tương ứng.
>
> **Gate**: `A+B` = gate A (`yarn e2e`) + gate B (MCP walk read/render). `A only` = mutation-heavy hoặc không verify được bằng MCP read-only (double-submit, trailing-space, 409 conflict, redirectUris boundary) — gate B chỉ render-verify, KHÔNG mutate song song (chống session contamination, [[reference_e2e_suite_session_contamination]]).

### Tasks (1 test / scenario áp dụng được)

#### Nhóm 1 — Happy path (UPDATE existing T1)

- [ ] **E2E-1 — `edits an app's display name` (row #1, EXISTS — mở rộng) [happy]** — `blog` → Edit → Display Name = `"Blog (edited e2e)"` → Save → toast `"App updated."` + giá trị mới trong bảng. Merge với T8 (full-prefill assert) hoặc giữ tách. `afterAll` revert `Blog` + `active`. **Gate A+B.** Đã có — giữ nguyên, chỉ đảm bảo không trùng assert với E2E-8.

#### Nhóm 2 — AuthN (NEW, non-obvious — full code)

- [ ] **E2E-2 — AuthN: unauth UI redirect + API 401 [Error Guessing]** — context không storageState → `/admin/apps` redirect login (không render heading); `PATCH` không Bearer → 401. **Gate A+B.**

```ts
// fresh context KHÔNG share admin storageState (cookie localhost không scope theo port → phải clear)
test("blocks unauthenticated access (UI redirect + API 401)", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  try {
    await page.context().clearCookies();
    await page.goto("/admin/apps");
    // SessionGate đẩy về login khi không có refresh cookie
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toHaveCount(0);

    // API trực tiếp không token → 401 (đoán id format hợp lệ, guard chặn trước khi tới service)
    const res = await page.request.patch(
      "/api/v1/admin/apps/000000000000000000000000",
      { data: { displayName: "x" } }
    );
    expect(res.status()).toBe(401);
  } finally {
    await ctx.dispose();
  }
});
```

#### Nhóm 3 — AuthZ (NEW, non-obvious — full code)

- [ ] **E2E-3 — AuthZ: non-admin API 403 + admin route unreachable [Error Guessing]** — user role storageState (`e2e/.auth/user.json`) → `PATCH` body `{displayName:"x"}` → 403; UI `/admin/apps` không thấy heading + không thấy row action menu. **Gate A+B.**

```ts
// non-admin auth context: tái dùng storageState của user-role (auth.setup → e2e/.auth/user.json)
test("forbids non-admin from updating apps (API 403 + UI unreachable)", async ({
  browser
}) => {
  const ctx = await browser.newContext({
    storageState: "e2e/.auth/user.json"
  });
  const page = await ctx.newPage();
  try {
    const res = await page.request.patch(
      "/api/v1/admin/apps/000000000000000000000000",
      { data: { displayName: "x" } }
    );
    expect(res.status()).toBe(403); // privilege escalation chặn ở adminGuard

    await page.goto("/admin/apps");
    // AuthGuardLayout/admin guard → redirect hoặc forbidden, không render registry
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "App actions" })
    ).toHaveCount(0);
  } finally {
    await ctx.dispose();
  }
});
```

> **Lưu ý setup**: project `admin` mặc định inject admin storageState; E2E-2/E2E-3 override bằng `browser.newContext({ storageState })` riêng nên KHÔNG bị admin cookie nhiễm. Cần `e2e/.auth/user.json` tồn tại (setup `auth.setup.ts` đã tạo) — nếu project admin không chạy `setup` dependency, thêm comment yêu cầu chạy `--project=setup --project=admin-setup` trước. Xác nhận lúc viết.

#### Nhóm 4 — Validation (NEW — biggest gap, non-obvious — full code)

- [ ] **E2E-4a — Validation [EP] single-field worked example + remaining inputs** — mở Edit `blog`. **Worked example**: clear Display Name → Save → inline `"Please enter a display name."`. **Remaining inputs (cùng test, mỗi field độc lập, reset giữa các assert)**:
  - Name = `"Blog!"` (ký tự cấm) → `"Use lowercase letters, numbers, and hyphens only."`
  - Home URL = `"ftp://x"` → `"Must start with http:// or https://"`
  - **KHÔNG mutate**: tất cả assert inline error trước khi Save thành công → no DB write. **Gate A+B.**

```ts
test("shows inline validation errors per field [EP]", async ({ page }) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  // Worked example: empty Display Name
  const displayName = page.getByRole("textbox", { name: "Display Name" });
  await displayName.fill("");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Please enter a display name.")).toBeVisible();

  // Name forbidden char
  await displayName.fill("Blog"); // restore so it's not the blocking error
  await page.getByRole("textbox", { name: "Name" }).fill("Blog!");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Use lowercase letters, numbers, and hyphens only.")
  ).toBeVisible();

  // Home URL bad scheme
  await page.getByRole("textbox", { name: "Name" }).fill("blog");
  await page.getByRole("textbox", { name: "Home URL" }).fill("ftp://x");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Must start with http:// or https://")
  ).toBeVisible();
  // no successful Save → no revert needed
});
```

- [ ] **E2E-4b — Validation [DT] combined anti-OFAT (BOTH errors at once)** — Display Name rỗng **+** Name invalid **cùng lúc** → Save → hiển thị **CẢ HAI** inline error đồng thời (zod resolve tất cả field, không stop-on-first). **Gate A+B.**

```ts
test("surfaces multiple field errors simultaneously [DT] (anti-OFAT)", async ({
  page
}) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  await page.getByRole("textbox", { name: "Display Name" }).fill("");
  await page.getByRole("textbox", { name: "Name" }).fill("Blog!");
  await page.getByRole("button", { name: "Save Changes" }).click();

  // BOTH must render — guards against OFAT where one error masks the other
  await expect(page.getByText("Please enter a display name.")).toBeVisible();
  await expect(
    page.getByText("Use lowercase letters, numbers, and hyphens only.")
  ).toBeVisible();
});
```

- [ ] **E2E-4c — Validation: 409 name conflict → field error (Gate A only — mutation attempt) [Error Guessing]** — Edit `blog` → đổi Name = `"dashboard"` (tên app **khác** đã tồn tại) → Save → BE `409 WEB_APP_NAME_EXISTS` → map về field `name`: inline `"An app with this name already exists."` (không phải toast generic). App KHÔNG bị đổi (BE reject) nhưng vì gửi PATCH thật → **Gate A only**; vẫn `afterAll` restore an toàn để chắc chắn `blog` nguyên vẹn.

```ts
test("maps 409 name conflict to the name field [Error Guessing]", async ({
  page
}) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("dashboard");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("An app with this name already exists.")
  ).toBeVisible();
  // BE rejected → no toast success; restoreApp in afterAll re-asserts blog intact
});
```

- [ ] **E2E-4d — Select-reset regression (Gate A only — mutation) [State Transition]** — GUARD cho known shadcn-Select RHF reset bug (memory: Radix Select loses RHF reset value). Mở Edit `blog` (Category prefill = `"Content"`) → đổi **chỉ** Display Name → Save → app updated → **mở lại** Edit → **Category vẫn `"Content"`** (không blank, không bị `onValueChange("")` wipe — guard `if (value) field.onChange(value)` ở CategorySelect). `afterAll` restore. **Gate A only** (mutate `blog`).

```ts
test("preserves Category when only Display Name changes [ST regression]", async ({
  page
}) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("combobox", { name: "Category" })
  ).toContainText("Content");
  await page
    .getByRole("textbox", { name: "Display Name" })
    .fill("Blog (select-reset e2e)");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("App updated.")).toBeVisible();

  // Reopen → Category must NOT have been wiped by the reset/onValueChange path
  await rowMenu(page, "Blog (select-reset e2e)").click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("combobox", { name: "Category" })
  ).toContainText("Content");
});
// afterAll: restoreApp("blog", "Blog", "active")
```

#### Nhóm 5 — Empty/null (NEW, non-obvious prefill — full code)

- [ ] **E2E-5 — null prefill không leak literal `"null"` (Gate A only — Save mutation) [Error Guessing]** — Edit 1 app seed có `description=null` + `iconUrl=null` → input Description + Icon URL **rỗng** (value `""`, KHÔNG chuỗi `"null"` — FormResetEffect map `?? ""`) → Save → toast `"App updated."`. Nếu `blog` không có null fields, dùng app seed null-fields hoặc tạo tạm qua API rồi cleanup. **Gate A only.**

```ts
const NULL_APP = { name: "minimal", displayName: "Minimal" }; // seed app w/ null desc+icon
test("renders empty inputs for null fields without leaking 'null' [Error Guessing]", async ({
  page
}) => {
  await rowMenu(page, NULL_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue(
    ""
  );
  await expect(page.getByRole("textbox", { name: "Icon URL" })).toHaveValue("");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("App updated.")).toBeVisible();
});
// afterAll: restoreApp("minimal", "Minimal", "active")
```

> **Defer note**: nếu seed KHÔNG có app null-fields, defer E2E-5 với lý do "cần seed app `minimal` description/iconUrl=null" — ghi vào e2e.md (Task E2E-final) thay vì viết test phụ thuộc data không tồn tại.

#### Nhóm 6 — Boundary (NEW — full code cho 1 worked example + list)

- [ ] **E2E-6a — [BVA] Name length boundary (worked example + remaining)** — Edit `blog`. **Worked example**: Name = `"a"` (1 ký tự, min-1) → Save → `"Name must be at least 2 characters."`. **Remaining inputs** (cùng test, reset Name giữa assert, KHÔNG Save thành công để tránh mutate):
  - `"ab"` (len 2, min) → no min/max error (field valid)
  - `"a".repeat(64)` (max) → no maxLength error
  - `"a".repeat(65)` (max+1) → `"Name must not exceed 64 characters."`
  - **Gate A+B** (inline error, không mutate).

```ts
test("enforces Name length boundaries [BVA]", async ({ page }) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const name = page.getByRole("textbox", { name: "Name" });

  // 1 (min-1) → error
  await name.fill("a");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Name must be at least 2 characters.")
  ).toBeVisible();

  // 65 (max+1) → error
  await name.fill("a".repeat(65));
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Name must not exceed 64 characters.")
  ).toBeVisible();

  // 2 and 64 → valid (no length error). Assert error gone after fixing length;
  // restore name so no mutation persists if this were to submit.
  await name.fill("ab");
  await expect(
    page.getByText("Name must be at least 2 characters.")
  ).toHaveCount(0);
  await name.fill("a".repeat(64));
  await expect(
    page.getByText("Name must not exceed 64 characters.")
  ).toHaveCount(0);
  await name.fill("blog"); // leave field at original; close without successful save
});
```

- [ ] **E2E-6b — [BVA] Display Name length** — cùng pattern: `2` pass / `80` (`"a".repeat(80)`) pass / `81` → `"Display name must not exceed 80 characters."`. Inline only, no mutate. **Gate A+B.**
- [ ] **E2E-6c — [BVA] redirectUris count (Gate A only, DEFER until CF-3)** — `20` URIs → Save pass; `21` → expected = inline error tại field redirectUris (`adminApps.form.validation.redirectUris.max`). **DEPENDS ON CF-3** (design.md §Known code fixes prereq: FE `.max(20)` chưa có). **Trước CF-3**: `21` rơi xuống BE `400` → toast generic `"Something went wrong. Please try again."` (assert toast, Gate A only). **Sau CF-3**: assert inline error tại field (Gate A+B). → **DEFER tới khi CF-3 implement**; ghi reason vào e2e.md. Nếu phải cover ngay, viết biến thể BE-400-toast (mutation attempt nặng → Gate A only).

#### Nhóm 7 — Filter/search → N/A (no test)

- [ ] **E2E-7 — N/A** — Toolbar filter (search/status/category) thuộc feature **list-apps** (`AdminAppsToolbar`), ngoài scope edit-apps. Cố ý loại trừ (no silent gap). KHÔNG viết test — chỉ ghi N/A + lý do vào e2e.md.

#### Nhóm 8 — Data rendering (NEW — mở rộng prefill assert của T1)

- [ ] **E2E-8 — full-prefill render (incl. Category human label) [Decision Table]** — mở Edit `blog` → verify **mọi field** prefill đúng từ app: Name (`getByRole("textbox",{name:"Name"})` value `"blog"`), Display Name `"Blog"`, Home URL khớp seed, Required Roles checkbox `User`/`Admin` checked đúng, Status switch state khớp `status`, **Category combobox hiển thị `"Content"`** (human label, KHÔNG ObjectId — `SelectValue` render `cat.name`), redirect URI count khớp. Chỉ READ → **Gate A+B**, không mutate.

```ts
test("prefills every field from the selected app [Decision Table]", async ({
  page
}) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("blog");
  await expect(
    page.getByRole("textbox", { name: "Display Name" })
  ).toHaveValue("Blog");
  await expect(
    page.getByRole("combobox", { name: "Category" })
  ).toContainText("Content"); // human label, not ObjectId
  await expect(page.getByRole("switch", { name: "Active" })).toBeChecked(); // status=active
  await expect(page.getByRole("checkbox", { name: "User" })).toBeChecked();
  // redirect URI inputs render existing values; assert count matches seed
  // (locator depends on StringListField DOM — verify role/input[name] when writing)
});
```

#### Nhóm 9 — i18n vi (NEW — MANDATORY, non-obvious — full code)

- [ ] **E2E-9 — i18n vi: edit sheet + validation + toast + badge [EP locale]** — `goto /vi/admin/apps` → mở Edit → verify VI strings: tiêu đề sheet `"Chỉnh sửa ứng dụng"`, nút Save `"Lưu thay đổi"`, Display Name rỗng → `"Vui lòng nhập tên hiển thị."`. Save thành công (đổi displayName) → toast `"Đã cập nhật ứng dụng."`. Status badge VI `"Đang hoạt động"`. **Gate A+B** (Save mutate → cẩn trọng; nếu muốn full read-only, tách phần Save thành Gate A only). `afterAll` restore.

```ts
test("renders the edit flow in Vietnamese [EP locale]", async ({ page }) => {
  await page.goto("/vi/admin/apps");
  await expect(
    page.getByRole("heading", { name: "Đăng ký ứng dụng" })
  ).toBeVisible();
  // VI row menu label = "Thao tác với ứng dụng"
  await page
    .getByRole("row", { name: TARGET_APP.displayName })
    .getByRole("button", { name: "Thao tác với ứng dụng" })
    .click();
  await page.getByRole("menuitem", { name: "Chỉnh sửa" }).click();
  await expect(
    page.getByRole("heading", { name: "Chỉnh sửa ứng dụng" })
  ).toBeVisible();

  const displayName = page.getByRole("textbox", { name: "Tên hiển thị" });
  await displayName.fill("");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Vui lòng nhập tên hiển thị.")).toBeVisible();

  await displayName.fill("Blog (vi e2e)");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã cập nhật ứng dụng.")).toBeVisible();
});
// afterAll: restoreApp("blog", "Blog", "active")
```

#### Nhóm 10 — Error/loading (NEW, non-obvious — full code)

- [ ] **E2E-10a — Error 5xx → generic toast (no field error) [Error Guessing]** — `page.route` intercept `PATCH /api/v1/admin/apps/*` → fulfill 500 → Save → toast generic `"Something went wrong. Please try again."` (KHÔNG inline field error, vì không phải 409). Intercept = no real DB write → **Gate A+B** (B có thể skip — lean A; route-mock khó ở MCP walk).

```ts
test("shows a generic toast on server 5xx [Error Guessing]", async ({
  page
}) => {
  await page.route("**/api/v1/admin/apps/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL", message: "boom" })
      });
      return;
    }
    await route.continue();
  });

  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page
    .getByRole("textbox", { name: "Display Name" })
    .fill("Blog (5xx e2e)");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Something went wrong. Please try again.")
  ).toBeVisible();
  // No real PATCH succeeded (mocked) → no DB change, no revert needed
});
```

- [ ] **E2E-10b — Loading: Save disabled + fields disabled while pending [State Transition]** — intercept PATCH với delay → click Save → trong lúc pending, nút Save `loading` (disabled) + field form `disabled` (`disabled={isPending}` ở AppFormFields). **Gate A+B (lean B)** — quan sát transient state.

```ts
test("disables form controls while the update is in flight [ST]", async ({
  page
}) => {
  await page.route("**/api/v1/admin/apps/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await new Promise((r) => setTimeout(r, 1500)); // hold pending state
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL" })
      });
      return;
    }
    await route.continue();
  });

  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Display Name" }).fill("Blog x");
  const save = page.getByRole("button", { name: "Save Changes" });
  await save.click();
  // during pending: Save disabled + a representative field disabled
  await expect(save).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Display Name" })).toBeDisabled();
});
```

#### Nhóm 11 — Mutation safety (NEW — all Gate A only)

- [ ] **E2E-11a — double-submit → exactly 1 PATCH [State Transition]** — click Save 2 lần thật nhanh → đếm số `PATCH /admin/apps/*` request = **1** (button disabled khi pending chặn submit thứ 2). **Gate A only** (mutate).

```ts
test("fires exactly one PATCH on rapid double-submit [ST]", async ({ page }) => {
  let patchCount = 0;
  page.on("request", (req) => {
    if (req.method() === "PATCH" && /\/admin\/apps\//.test(req.url()))
      patchCount += 1;
  });

  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page
    .getByRole("textbox", { name: "Display Name" })
    .fill("Blog (double e2e)");
  const save = page.getByRole("button", { name: "Save Changes" });
  await Promise.all([save.click(), save.click().catch(() => {})]);
  await expect(page.getByText("App updated.")).toBeVisible();
  expect(patchCount).toBe(1);
});
// afterAll: restoreApp("blog", "Blog", "active")
```

- [ ] **E2E-11b — navigate-away unsaved → no PATCH + reopen shows original [Error Guessing]** — mở Edit `blog`, đổi Display Name (không Save), Cancel (hoặc Escape/overlay) → **không** có PATCH request; mở lại Edit → Display Name = `"Blog"` (FormResetEffect reset on open). **Gate A only** (verify no-mutation).

```ts
test("discards unsaved edits and reopens with original values [Error Guessing]", async ({
  page
}) => {
  let patched = false;
  page.on("request", (req) => {
    if (req.method() === "PATCH" && /\/admin\/apps\//.test(req.url()))
      patched = true;
  });

  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page
    .getByRole("textbox", { name: "Display Name" })
    .fill("Blog (unsaved)");
  await page.getByRole("button", { name: "Cancel" }).click();

  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("textbox", { name: "Display Name" })
  ).toHaveValue("Blog"); // FormResetEffect re-prefilled original
  expect(patched).toBe(false);
});
```

- [ ] **E2E-11c — trailing-space Name → BE trims [Error Guessing]** — Edit `blog` → Name = `"blog "` (space cuối) → Save → BE trim → lưu `"blog"` (không tạo tên rác). Verify qua API hoặc reopen Name = `"blog"`. **Gate A only** (mutate). `afterAll` restore (idempotent — restore set displayName+status; nếu name bị đổi cần restore name riêng → dùng API patch trong test cleanup).

> **Lưu ý revert**: `restoreApp` chỉ revert `displayName`+`status`, KHÔNG revert `name`. E2E-11c (và bất kỳ test đổi `name`) phải tự revert `name` về `"blog"` qua `page.request.patch` trong test hoặc mở rộng helper. Ghi rõ khi viết — KHÔNG để name drift trên seed.

#### Nhóm 12 — Accessibility (NEW — non-obvious announcer assert)

- [ ] **E2E-12 — a11y: focus on first invalid field + announcer on success [Error Guessing]** — (a) submit Display Name rỗng → focus chuyển field invalid đầu tiên (`expect(displayName).toBeFocused()`); (b) Save thành công → `#announcer` đọc `"App Blog updated."` (template `announce.updated` = `"App {name} updated."`). Keyboard-only flow (Tab→Enter mở menu→Edit→Tab→Save) cover trong cùng test hoặc test phụ. **Gate A+B** (mutate phần (b) → cân nhắc tách read/announce; nếu mutate thì Gate A only cho (b)). `afterAll` restore.

```ts
test("manages focus on validation and announces success [Error Guessing]", async ({
  page
}) => {
  await rowMenu(page, TARGET_APP.displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  // (a) empty Display Name → focus moves to first invalid field
  const displayName = page.getByRole("textbox", { name: "Display Name" });
  await displayName.fill("");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(displayName).toBeFocused();

  // (b) successful save → polite announcer reads "App {name} updated."
  await displayName.fill("Blog (a11y e2e)");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("App updated.")).toBeVisible();
  await expect(page.locator("#announcer")).toContainText(
    "App Blog (a11y e2e) updated."
  );
});
// afterAll: restoreApp("blog", "Blog", "active")
```

> **Defer note (a11y focus)**: nếu RHF/zodResolver không tự focus first-error field (cần `shouldFocusError` default true — verify), case (a) defer với reason "cần xác nhận focus management config"; ghi vào e2e.md. KHÔNG sửa app code để pass — flag follow-up (CLAUDE.md §4.3).

#### Task cuối — documentation

- [ ] **E2E-final — CREATE/UPDATE `docs/specs/edit-apps/e2e.md`** — reconcile doc kịch bản với 12 nhóm + per-test mapping (test title ↔ row matrix ↔ Gate ↔ technique). Ghi rõ: defer cases (E2E-5 seed null, E2E-6c CF-3, E2E-12a focus) + lý do; mutation-revert strategy (restoreApp chỉ revert displayName/status → name-changing tests tự revert); N/A nhóm 7. Giữ matrix (design.md) ↔ e2e.md ↔ `edit-apps.e2e.ts` đồng bộ (CLAUDE.md §4.3 reconcile-3-artifact). KHÔNG sửa client code.

### Coverage check (matrix ↔ task)

| Matrix row | Task | Gate | Technique | Note |
| ---------- | ---- | ---- | --------- | ---- |
| 1 Happy | E2E-1 (exists) | A+B | happy | keep |
| 2 AuthN | E2E-2 | A+B | Error Guessing | full code |
| 3 AuthZ | E2E-3 | A+B | Error Guessing | full code |
| 4 Validation EP | E2E-4a | A+B | EP | worked example + list |
| 4 Validation DT | E2E-4b | A+B | DT | anti-OFAT both errors |
| 4 409 conflict | E2E-4c | A only | Error Guessing | field error |
| 4 select-reset | E2E-4d | A only | ST | regression guard |
| 5 Empty/null | E2E-5 | A only | Error Guessing | defer if no null seed |
| 6 BVA Name | E2E-6a | A+B | BVA | 1/2/64/65 |
| 6 BVA DisplayName | E2E-6b | A+B | BVA | 2/80/81 |
| 6 BVA redirectUris | E2E-6c | A only | BVA | DEFER → CF-3 |
| 7 Filter/search | E2E-7 | — | — | N/A documented |
| 8 Data render | E2E-8 | A+B | Decision Table | full prefill + Category label |
| 9 i18n vi | E2E-9 | A+B | EP locale | MANDATORY |
| 10 Error 5xx | E2E-10a | A+B (lean A) | Error Guessing | route mock |
| 10 Loading | E2E-10b | A+B (lean B) | ST | disabled state |
| 11 double-submit | E2E-11a | A only | ST | 1 PATCH |
| 11 navigate-away | E2E-11b | A only | Error Guessing | no PATCH + reset |
| 11 trailing-space | E2E-11c | A only | Error Guessing | BE trim + revert name |
| 12 a11y | E2E-12 | A+B | Error Guessing | focus + announcer |

No silent gaps: 11/12 nhóm có ≥1 test áp dụng (row 7 N/A có lý do). Deferred: E2E-5 (seed), E2E-6c (CF-3), E2E-12a (focus config) — mỗi cái có reason ghi rõ.

