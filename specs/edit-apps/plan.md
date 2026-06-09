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
