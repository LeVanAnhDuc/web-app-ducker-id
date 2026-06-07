# Web-App Create (Đăng ký ứng dụng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `POST /admin/apps` to register a satellite app (generate OAuth clientId + clientSecret, hash & store), and wire the existing FE create form to it with a one-time secret-reveal dialog.

**Architecture:** Extend the existing `web-app` module (currently read-only) with a create path: validator → controller → service → repository, returning a DTO that carries the plaintext `clientSecret` exactly once. FE swaps `createAdminApp` from mock to a real request, moves the create mutation into a view-local hook, and adds a secret-reveal dialog after creation.

**Tech Stack:** BE — Express, Mongoose, Joi, bcrypt, Jest. FE — Next.js 15, React 19, React Query, React Hook Form + Zod, shadcn/ui, next-intl.

---

## ⚠️ Worktree — ALL work happens in the isolated worktrees (đã tạo sẵn)

Two worktrees already exist on branch `feat/web-app-create`. **Every BE task** runs inside the server worktree; **every FE task** inside the client worktree. Never edit the main checkouts.

| Side | Worktree cwd | Branch |
|---|---|---|
| BE | `D:\Learn\web-app-store-server-client\server\.worktrees\web-app-create` | `feat/web-app-create` |
| FE | `D:\Learn\web-app-store-server-client\client\.worktrees\web-app-create` | `feat/web-app-create` |

Deps installed, baseline green (client: tsc clean). **Server `feat/web-app-create` is based on `c4ddaca`** — the `chore/web-app-list-followup` tip that includes the ReDoS fix VULN-BE-1 (touches `web-app/helpers/index.ts` + spec). Run `npx jest --testMatch "**/?(*.)+(spec).ts"` once at start to capture the current baseline count before BE-2. Commits land on `feat/web-app-create` in each respective sub-repo.

**Note — untracked swagger:** `server/src/modules/web-app/swagger/` (`index.ts`, `paths.ts`, `schemas.ts`) exists ONLY in the main server checkout (untracked, not carried into the worktree). Task BE-8 ports/creates Swagger in the worktree.

**Convention gates (CLAUDE.md):**
- BE touches only `server/src/**`; FE touches only `client/src/**`.
- BE: `standard-typescript`, `module-struct`, `standard-restful-api`, `standard-mongodb`, `standard-jwt`, `standard-doc-api`.
- FE: `standard-react`, `standard-nextjs`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility`; rules `views.md` (mutations → `hooks/`), `accessibility.md` (`useAnnounce` on copy/dialog), `imports.md`, `component-folder.md`, `types.md`.
- FE mandatory after each task: `yarn format && yarn lint && yarn tsc` (all clean before commit).

---

## File Structure

### BE — `server/src/` (worktree)
| File | Responsibility | Action |
|---|---|---|
| `constants/error-code.ts` | + `WEB_APP_NAME_EXISTS`, `WEB_APP_CATEGORY_NOT_FOUND` | Modify |
| `modules/web-app/constants/index.ts` | + `WEB_APP_DEFAULT_SCOPES`, `CLIENT_ID_PREFIX`, `CLIENT_ID_RANDOM_BYTES`, `CLIENT_SECRET_RANDOM_BYTES` | Modify |
| `modules/web-app/helpers/index.ts` | + `toInternalStatus()`, `generateClientId()`, `generateClientSecret()` | Modify |
| `modules/web-app/helpers/index.spec.ts` | Tests for the 3 new helpers | Modify |
| `modules/web-app/types/index.ts` | + `AdminAppCreateBody`, `AdminCreateAppRequest`, `WebAppCreateInput` | Modify |
| `validators/schemas/web-app.ts` | + `adminCreateAppBodySchema` | Modify |
| `modules/web-app/repositories/web-app.repository.ts` | + `existsByName()`, `create()` | Modify |
| `modules/web-app/repositories/web-app-category.repository.ts` | + `existsById()` | Modify |
| `modules/web-app/dtos/admin-app.dto.ts` | + `AdminAppCreatedDto`, `toAdminAppCreatedDto()` | Modify |
| `modules/web-app/dtos/index.ts` | export the new DTO + mapper | Modify |
| `modules/web-app/dtos/admin-app.dto.spec.ts` | Tests for `toAdminAppCreatedDto` | Modify |
| `modules/web-app/web-app.service.ts` | + `createApp()` | Modify |
| `modules/web-app/web-app.service.spec.ts` | NEW — service unit tests | Create |
| `modules/web-app/web-app.controller.ts` | + `createApp` handler | Modify |
| `modules/web-app/web-app.routes.ts` | + `POST /` route | Modify |
| `i18n/locales/{en,vi}/webApp.json` | + `success.createApp`, `errors.*`, `validation.*` | Modify |
| `modules/web-app/swagger/{paths,schemas,index}.ts` | POST `/admin/apps` doc | Create/port |

### FE — `client/src/` (worktree)
| File | Responsibility | Action |
|---|---|---|
| `types/AdminApps/index.ts` | + `AdminAppCreateResult` | Modify |
| `requests/adminApps.ts` | + `createAdminApp()` | Modify |
| `views/AdminApps/hooks/useCreateAdminApp.ts` | NEW — create mutation + `ADMIN_APPS_QUERY_KEY` | Create |
| `views/AdminApps/components/SecretField/index.tsx` | NEW — read-only value + copy button | Create |
| `views/AdminApps/mains/AdminAppsSecretDialog/index.tsx` | NEW — one-time secret reveal dialog | Create |
| `views/AdminApps/mains/AdminAppsFormSheet/index.tsx` | Use hook for create; add `onCreated` prop | Modify |
| `views/AdminApps/index.tsx` | `createdApp` state + render secret dialog | Modify |
| `locales/{en,vi}/adminApps.json` | + `secretDialog.*` + announce keys | Modify |

---

## BE Tasks

> Run all BE commands from `server/.worktrees/web-app-create`. Test command (worktree jest glob workaround): `npx jest --testMatch "**/?(*.)+(spec).ts" <path>`.

### Task BE-1: Error codes + module constants

**Files:**
- Modify: `src/constants/error-code.ts`
- Modify: `src/modules/web-app/constants/index.ts`

- [ ] **Step 1: Add web-app error codes**

In `src/constants/error-code.ts`, after the `CONTACT_NOT_FOUND` line add a new section:

```ts
  // ── Web App ──
  WEB_APP_NAME_EXISTS: "WEB_APP_NAME_EXISTS",
  WEB_APP_CATEGORY_NOT_FOUND: "WEB_APP_CATEGORY_NOT_FOUND",
```

- [ ] **Step 2: Add OAuth defaults + generator config to module constants**

In `src/modules/web-app/constants/index.ts`, append:

```ts
export const WEB_APP_DEFAULT_SCOPES = ["openid", "profile", "email"] as const;

export const CLIENT_CREDENTIALS_CONFIG = {
  CLIENT_ID_PREFIX: "client_",
  CLIENT_ID_RANDOM_BYTES: 6,
  CLIENT_SECRET_RANDOM_BYTES: 32
} as const;
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/constants/error-code.ts src/modules/web-app/constants/index.ts
git commit -m "feat(web-app): add create error codes and credential constants"
```

---

### Task BE-2: Helpers — status mapping + credential generators (TDD)

**Files:**
- Modify: `src/modules/web-app/helpers/index.ts`
- Test: `src/modules/web-app/helpers/index.spec.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/modules/web-app/helpers/index.spec.ts` (add imports at top: update the existing `import { buildWebAppFilter } from "./index";` line to also import the new helpers):

```ts
import {
  buildWebAppFilter,
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "./index";
import { WEB_APP_STATUSES } from "../constants";

describe("toInternalStatus", () => {
  it("maps 'active' to ACTIVE", () => {
    expect(toInternalStatus("active")).toBe(WEB_APP_STATUSES.ACTIVE);
  });
  it("maps 'inactive' to INACTIVE", () => {
    expect(toInternalStatus("inactive")).toBe(WEB_APP_STATUSES.INACTIVE);
  });
});

describe("generateClientId", () => {
  it("starts with the client_ prefix", () => {
    expect(generateClientId().startsWith("client_")).toBe(true);
  });
  it("produces unique values across calls", () => {
    expect(generateClientId()).not.toBe(generateClientId());
  });
});

describe("generateClientSecret", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    expect(generateClientSecret()).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

> Keep the existing `buildWebAppFilter` describe block as-is (it already imports `buildWebAppFilter` + `WEB_APP_STATUSES` — collapse to the single import lines above, do not duplicate).

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/helpers/index.spec.ts`
Expected: FAIL — `toInternalStatus`/`generateClientId`/`generateClientSecret` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/modules/web-app/helpers/index.ts`, update imports and append the new exports. **⚠️ The file already imports `escapeRegex` (ReDoS fix VULN-BE-1, commit `c4ddaca`) and uses it in `buildWebAppFilter` — PRESERVE that import and the existing `buildWebAppFilter`/`PUBLIC_TO_STATUS` exactly.** Replace only the import block with:

```ts
// types
import type { FilterQuery } from "mongoose";
import type {
  AdminAppsQuery,
  WebAppDocument,
  WebAppStatus,
  WebAppStatusPublic
} from "../types";
// modules
import { WEB_APP_STATUSES, CLIENT_CREDENTIALS_CONFIG } from "../constants";
// others
import { escapeRegex } from "@/utils/string/escape-regex";
import { generateSecureToken } from "@/utils/crypto/secure-token";
```

The existing `PUBLIC_TO_STATUS` const is reused by `toInternalStatus`. Do NOT touch the `escapeRegex(query.search)` call inside `buildWebAppFilter`.

Keep the existing `PUBLIC_TO_STATUS` and `buildWebAppFilter`, then append:

```ts
export const toInternalStatus = (status: WebAppStatusPublic): WebAppStatus =>
  PUBLIC_TO_STATUS[status];

export const generateClientId = (): string =>
  `${CLIENT_CREDENTIALS_CONFIG.CLIENT_ID_PREFIX}${generateSecureToken(
    CLIENT_CREDENTIALS_CONFIG.CLIENT_ID_RANDOM_BYTES
  )}`;

export const generateClientSecret = (): string =>
  generateSecureToken(CLIENT_CREDENTIALS_CONFIG.CLIENT_SECRET_RANDOM_BYTES);
```

> `generateSecureToken(n)` returns `crypto.randomBytes(n).toString("hex")` → `2n` hex chars. 6 bytes → 12 hex (clientId suffix); 32 bytes → 64 hex (secret).

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/helpers/index.spec.ts`
Expected: PASS (all helper + filter tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/web-app/helpers/index.ts src/modules/web-app/helpers/index.spec.ts
git commit -m "feat(web-app): add status mapping and OAuth credential generators"
```

---

### Task BE-3: Types + Joi create-body validator

**Files:**
- Modify: `src/modules/web-app/types/index.ts`
- Modify: `src/validators/schemas/web-app.ts`

- [ ] **Step 1: Add request/body/create-input types**

In `src/modules/web-app/types/index.ts`, append (the file already imports `Request`, `AuthenticationRole`, and exports `WebAppStatusPublic`):

```ts
export interface AdminAppCreateBody {
  name: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  homeUrl: string;
  categoryId: string;
  status: WebAppStatusPublic;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
}

export interface AdminCreateAppRequest extends Omit<Request, "body"> {
  body: AdminAppCreateBody;
}

export interface WebAppCreateInput {
  name: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  categoryId: string;
  status: WebAppStatus;
  requiredRoles: AuthenticationRole[];
  redirectUris: string[];
  clientId: string;
  clientSecretHash: string;
  scopes: string[];
}
```

- [ ] **Step 2: Add the Joi create-body schema**

In `src/validators/schemas/web-app.ts`, append (the file already imports `Joi`, `WEB_APP_STATUS_PUBLIC`, defines `STATUS_VALUES` + `OBJECTID_PATTERN`). Add role values + new schema:

```ts
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import type { AdminAppCreateBody } from "@/modules/web-app/types";

const ROLE_VALUES = Object.values(AUTHENTICATION_ROLES);
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const URL_PATTERN = /^https?:\/\/.+/i;

const NAME = { MIN: 2, MAX: 64 };
const DISPLAY_NAME = { MIN: 2, MAX: 80 };
const DESCRIPTION_MAX = 500;
const URL_MAX = 2000;
const MAX_REDIRECT_URIS = 20;

export const adminCreateAppBodySchema: Joi.ObjectSchema<AdminAppCreateBody> =
  Joi.object({
    name: Joi.string()
      .trim()
      .lowercase()
      .min(NAME.MIN)
      .max(NAME.MAX)
      .pattern(NAME_PATTERN)
      .required()
      .messages({
        "string.empty": "webApp:validation.name.required",
        "any.required": "webApp:validation.name.required",
        "string.min": "webApp:validation.name.minLength",
        "string.max": "webApp:validation.name.maxLength",
        "string.pattern.base": "webApp:validation.name.invalid"
      }),
    displayName: Joi.string()
      .trim()
      .min(DISPLAY_NAME.MIN)
      .max(DISPLAY_NAME.MAX)
      .required()
      .messages({
        "string.empty": "webApp:validation.displayName.required",
        "any.required": "webApp:validation.displayName.required",
        "string.min": "webApp:validation.displayName.minLength",
        "string.max": "webApp:validation.displayName.maxLength"
      }),
    description: Joi.string()
      .trim()
      .max(DESCRIPTION_MAX)
      .allow("")
      .optional()
      .messages({ "string.max": "webApp:validation.description.maxLength" }),
    iconUrl: Joi.string()
      .trim()
      .max(URL_MAX)
      .pattern(URL_PATTERN)
      .allow("")
      .optional()
      .messages({
        "string.max": "webApp:validation.iconUrl.maxLength",
        "string.pattern.base": "webApp:validation.iconUrl.invalid"
      }),
    homeUrl: Joi.string()
      .trim()
      .max(URL_MAX)
      .pattern(URL_PATTERN)
      .required()
      .messages({
        "string.empty": "webApp:validation.homeUrl.required",
        "any.required": "webApp:validation.homeUrl.required",
        "string.max": "webApp:validation.homeUrl.maxLength",
        "string.pattern.base": "webApp:validation.homeUrl.invalid"
      }),
    categoryId: Joi.string()
      .pattern(OBJECTID_PATTERN)
      .required()
      .messages({
        "string.empty": "webApp:validation.categoryId.required",
        "any.required": "webApp:validation.categoryId.required",
        "string.pattern.base": "webApp:validation.categoryId.invalid"
      }),
    status: Joi.string()
      .valid(...STATUS_VALUES)
      .required()
      .messages({
        "any.only": "webApp:validation.status.invalid",
        "any.required": "webApp:validation.status.invalid"
      }),
    requiredRoles: Joi.array()
      .items(Joi.string().valid(...ROLE_VALUES))
      .min(1)
      .required()
      .messages({
        "array.min": "webApp:validation.requiredRoles.required",
        "any.required": "webApp:validation.requiredRoles.required",
        "any.only": "webApp:validation.requiredRoles.invalid"
      }),
    redirectUris: Joi.array()
      .items(Joi.string().trim().max(URL_MAX).pattern(URL_PATTERN))
      .min(1)
      .max(MAX_REDIRECT_URIS)
      .required()
      .messages({
        "array.min": "webApp:validation.redirectUris.required",
        "array.max": "webApp:validation.redirectUris.maxItems",
        "any.required": "webApp:validation.redirectUris.required",
        "string.pattern.base": "webApp:validation.redirectUris.invalid"
      })
  }).options({ stripUnknown: true });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/types/index.ts src/validators/schemas/web-app.ts
git commit -m "feat(web-app): add create-app request types and body validator"
```

---

### Task BE-4: Repository methods (existsByName, create, existsById)

**Files:**
- Modify: `src/modules/web-app/repositories/web-app.repository.ts`
- Modify: `src/modules/web-app/repositories/web-app-category.repository.ts`

> DB-bound methods; no unit spec (mirrors existing repos which have none). Verified via service tests (mocked) + tsc.

- [ ] **Step 1: Extend the web-app repository**

In `src/modules/web-app/repositories/web-app.repository.ts`, update the type + class. Add the `WebAppCreateInput` import:

```ts
// types
import type { FilterQuery } from "mongoose";
import type { WebAppDocument, WebAppCreateInput } from "../types";
// models
import WebAppModel from "@/models/web-app";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type WebAppRepository = {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  existsByName(name: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
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

  async existsByName(name: string): Promise<boolean> {
    return asyncDatabaseHandler("existsByName", async () => {
      const found = await WebAppModel.exists({ name });
      return found !== null;
    });
  }

  async create(data: WebAppCreateInput): Promise<WebAppDocument> {
    return asyncDatabaseHandler("create", async () => {
      const doc = await WebAppModel.create(data);
      return doc.toObject<WebAppDocument>();
    });
  }
}
```

- [ ] **Step 2: Extend the category repository**

In `src/modules/web-app/repositories/web-app-category.repository.ts`:

```ts
export type WebAppCategoryRepository = {
  findAll(): Promise<WebAppCategoryDocument[]>;
  existsById(id: string): Promise<boolean>;
};
```

Add the method to the class:

```ts
  async existsById(id: string): Promise<boolean> {
    return asyncDatabaseHandler("existsById", async () => {
      const found = await WebAppCategoryModel.exists({ _id: id });
      return found !== null;
    });
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/repositories/
git commit -m "feat(web-app): add repository create + existence checks"
```

---

### Task BE-5: Created DTO (TDD)

**Files:**
- Modify: `src/modules/web-app/dtos/admin-app.dto.ts`
- Modify: `src/modules/web-app/dtos/index.ts`
- Test: `src/modules/web-app/dtos/admin-app.dto.spec.ts`

- [ ] **Step 1: Write failing test**

Append to `src/modules/web-app/dtos/admin-app.dto.spec.ts` (update the top import to include the new mapper):

```ts
import { toAdminAppDto, toAdminAppCreatedDto } from "./admin-app.dto";
```

Add a describe block (reuses the existing `baseDoc`):

```ts
describe("toAdminAppCreatedDto", () => {
  it("includes the plaintext clientSecret", () => {
    const dto = toAdminAppCreatedDto(baseDoc, "plaintext-secret");
    expect(dto.clientSecret).toBe("plaintext-secret");
  });

  it("carries all AdminAppDto fields and still excludes the hash", () => {
    const dto = toAdminAppCreatedDto(baseDoc, "x") as unknown as Record<
      string,
      unknown
    >;
    expect(dto.clientId).toBe("client_blog");
    expect(dto.clientSecretHash).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/dtos/admin-app.dto.spec.ts`
Expected: FAIL — `toAdminAppCreatedDto` is not exported.

- [ ] **Step 3: Implement the DTO + mapper**

In `src/modules/web-app/dtos/admin-app.dto.ts`, after `toAdminAppDto`, append:

```ts
export interface AdminAppCreatedDto extends AdminAppDto {
  clientSecret: string;
}

export const toAdminAppCreatedDto = (
  doc: WebAppDocument,
  clientSecret: string
): AdminAppCreatedDto => ({
  ...toAdminAppDto(doc),
  clientSecret
});
```

In `src/modules/web-app/dtos/index.ts`, add:

```ts
export type { AdminAppCreatedDto } from "./admin-app.dto";
export { toAdminAppCreatedDto } from "./admin-app.dto";
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/dtos/admin-app.dto.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/web-app/dtos/
git commit -m "feat(web-app): add AdminAppCreatedDto with one-time clientSecret"
```

---

### Task BE-6: Service createApp (TDD)

**Files:**
- Modify: `src/modules/web-app/web-app.service.ts`
- Test: `src/modules/web-app/web-app.service.spec.ts` (create)

- [ ] **Step 1: Write failing tests**

Create `src/modules/web-app/web-app.service.spec.ts`:

```ts
// service
import { WebAppService } from "./web-app.service";
// modules
import { WEB_APP_STATUSES } from "./constants";
import { ConflictRequestError, NotFoundError } from "@/common/exceptions";

const makeRepos = () => {
  const webAppRepo = {
    findAll: jest.fn(),
    existsByName: jest.fn().mockResolvedValue(false),
    create: jest.fn()
  };
  const categoryRepo = {
    findAll: jest.fn(),
    existsById: jest.fn().mockResolvedValue(true)
  };
  return { webAppRepo, categoryRepo };
};

const validBody = {
  name: "blog",
  displayName: "Blog",
  description: "",
  iconUrl: "",
  homeUrl: "https://blog.example.com",
  categoryId: "6a24f14e6d65650b697c34c5",
  status: "active" as const,
  requiredRoles: ["user" as const],
  redirectUris: ["https://blog.example.com/cb"]
};

const createdDoc = {
  _id: { toString: () => "app1" },
  categoryId: { toString: () => "6a24f14e6d65650b697c34c5" },
  name: "blog",
  displayName: "Blog",
  description: null,
  iconUrl: null,
  homeUrl: "https://blog.example.com",
  clientId: "client_generated",
  clientSecretHash: "hashed",
  redirectUris: ["https://blog.example.com/cb"],
  requiredRoles: ["user"],
  status: WEB_APP_STATUSES.ACTIVE,
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-07T00:00:00.000Z")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("WebAppService.createApp", () => {
  it("throws ConflictRequestError when the name already exists", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.existsByName.mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await expect(service.createApp(validBody)).rejects.toBeInstanceOf(
      ConflictRequestError
    );
    expect(webAppRepo.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the category does not exist", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    categoryRepo.existsById.mockResolvedValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);
    await expect(service.createApp(validBody)).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(webAppRepo.create).not.toHaveBeenCalled();
  });

  it("generates credentials, hashes the secret, persists, and returns it once", async () => {
    const { webAppRepo, categoryRepo } = makeRepos();
    webAppRepo.create.mockResolvedValue(createdDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new WebAppService(webAppRepo as any, categoryRepo as any);

    const result = await service.createApp(validBody);

    const persisted = webAppRepo.create.mock.calls[0][0];
    expect(persisted.clientId).toMatch(/^client_/);
    expect(persisted.clientSecretHash).not.toBe("");
    expect(persisted.clientSecretHash).not.toMatch(/^[a-f0-9]{64}$/); // hashed, not raw secret
    expect(persisted.status).toBe(WEB_APP_STATUSES.ACTIVE);
    expect(persisted.scopes).toEqual(["openid", "profile", "email"]);
    expect(persisted.description).toBeNull(); // "" → null
    expect(result.clientSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(result.clientId).toBe("client_generated");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/web-app.service.spec.ts`
Expected: FAIL — `createApp` is not a method on `WebAppService`.

- [ ] **Step 3: Implement createApp**

In `src/modules/web-app/web-app.service.ts`, extend imports and add the method:

```ts
// types
import type { AdminAppsQuery, AdminAppCreateBody } from "./types";
import type {
  WebAppRepository,
  WebAppCategoryRepository
} from "./repositories";
import type {
  AdminAppDto,
  AdminCategoryDto,
  AdminAppCreatedDto
} from "./dtos";
// dtos
import { toAdminAppDto, toAdminCategoryDto, toAdminAppCreatedDto } from "./dtos";
// others
import {
  buildWebAppFilter,
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "./helpers";
import { WEB_APP_DEFAULT_SCOPES } from "./constants";
import { ConflictRequestError, NotFoundError } from "@/common/exceptions";
import { ERROR_CODES } from "@/constants/error-code";
import { hashValue } from "@/utils/crypto/bcrypt";
```

Add the method inside the class (after `listCategories`):

```ts
  async createApp(body: AdminAppCreateBody): Promise<AdminAppCreatedDto> {
    const nameTaken = await this.webAppRepo.existsByName(body.name);
    if (nameTaken) {
      throw new ConflictRequestError({
        i18nMessage: (t) => t("webApp:errors.nameExists"),
        code: ERROR_CODES.WEB_APP_NAME_EXISTS
      });
    }

    const categoryExists = await this.categoryRepo.existsById(body.categoryId);
    if (!categoryExists) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.categoryNotFound"),
        code: ERROR_CODES.WEB_APP_CATEGORY_NOT_FOUND
      });
    }

    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    const doc = await this.webAppRepo.create({
      name: body.name,
      displayName: body.displayName,
      description: body.description?.trim() ? body.description.trim() : null,
      iconUrl: body.iconUrl?.trim() ? body.iconUrl.trim() : null,
      homeUrl: body.homeUrl,
      categoryId: body.categoryId,
      status: toInternalStatus(body.status),
      requiredRoles: body.requiredRoles,
      redirectUris: body.redirectUris,
      clientId,
      clientSecretHash: hashValue(clientSecret),
      scopes: [...WEB_APP_DEFAULT_SCOPES]
    });

    return toAdminAppCreatedDto(doc, clientSecret);
  }
```

> `grantTypes`, `responseTypes`, `tokenEndpointAuthMethod`, `sortOrder` are omitted — the Mongoose model already defaults them (`[authorization_code, refresh_token]`, `[code]`, `client_secret_basic`, `0`). Only `scopes` needs an explicit value (model default is `[]`).

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/web-app/web-app.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/web-app/web-app.service.ts src/modules/web-app/web-app.service.spec.ts
git commit -m "feat(web-app): add createApp service with credential generation"
```

---

### Task BE-7: Controller handler + POST route

**Files:**
- Modify: `src/modules/web-app/web-app.controller.ts`
- Modify: `src/modules/web-app/web-app.routes.ts`

- [ ] **Step 1: Add the controller handler**

In `src/modules/web-app/web-app.controller.ts`, update imports and add the handler:

```ts
// types
import type { Request, Response } from "express";
import type { WebAppService } from "./web-app.service";
import type { AdminAppsQueryRequest, AdminCreateAppRequest } from "./types";
// common
import { OkSuccess, CreatedSuccess } from "@/common/responses";
```

Add inside the class (after `listCategories`):

```ts
  createApp = async (
    req: AdminCreateAppRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.createApp(req.body);
    new CreatedSuccess({
      data,
      message: "webApp:success.createApp"
    }).send(req, res);
  };
```

- [ ] **Step 2: Add the POST route**

In `src/modules/web-app/web-app.routes.ts`, update imports and register the route (router-level `authGuard, adminGuard` already applied):

```ts
// validators
import {
  adminListAppsQuerySchema,
  adminCreateAppBodySchema
} from "@/validators/schemas/web-app";
// others
import { adminGuard, authGuard, queryPipe, bodyPipe } from "@/middlewares";
```

Add after the existing `GET /` registration:

```ts
  adminApps.post(
    "/",
    bodyPipe(adminCreateAppBodySchema),
    asyncHandler(controller.createApp)
  );
```

- [ ] **Step 3: Type-check + full suite**

Run: `npx tsc --noEmit && npx jest --testMatch "**/?(*.)+(spec).ts"`
Expected: tsc clean; all suites pass (157 baseline + new web-app tests).

- [ ] **Step 4: Commit**

```bash
git add src/modules/web-app/web-app.controller.ts src/modules/web-app/web-app.routes.ts
git commit -m "feat(web-app): wire POST /admin/apps controller and route"
```

---

### Task BE-8: i18n messages + Swagger doc

**Files:**
- Modify: `src/i18n/locales/en/webApp.json`, `src/i18n/locales/vi/webApp.json`
- Create: `src/modules/web-app/swagger/{paths,schemas,index}.ts`

- [ ] **Step 1: Add EN messages**

Replace `src/i18n/locales/en/webApp.json` content with:

```json
{
  "success": {
    "listApps": "Apps retrieved successfully.",
    "listCategories": "Categories retrieved successfully.",
    "createApp": "App registered successfully."
  },
  "errors": {
    "nameExists": "An app with this name already exists.",
    "categoryNotFound": "The selected category does not exist."
  },
  "validation": {
    "name": {
      "required": "App name is required.",
      "minLength": "App name must be at least 2 characters.",
      "maxLength": "App name must not exceed 64 characters.",
      "invalid": "Use lowercase letters, numbers, and hyphens only."
    },
    "displayName": {
      "required": "Display name is required.",
      "minLength": "Display name must be at least 2 characters.",
      "maxLength": "Display name must not exceed 80 characters."
    },
    "description": { "maxLength": "Description must not exceed 500 characters." },
    "iconUrl": {
      "maxLength": "Icon URL is too long.",
      "invalid": "Icon URL must start with http:// or https://."
    },
    "homeUrl": {
      "required": "Home URL is required.",
      "maxLength": "Home URL is too long.",
      "invalid": "Home URL must start with http:// or https://."
    },
    "categoryId": {
      "required": "Category is required.",
      "invalid": "Invalid category id."
    },
    "status": { "invalid": "Status must be active or inactive." },
    "requiredRoles": {
      "required": "Select at least one required role.",
      "invalid": "Invalid role value."
    },
    "redirectUris": {
      "required": "Add at least one redirect URI.",
      "maxItems": "Too many redirect URIs (max 20).",
      "invalid": "Each redirect URI must start with http:// or https://."
    }
  }
}
```

- [ ] **Step 2: Add VI messages**

Replace `src/i18n/locales/vi/webApp.json` content with:

```json
{
  "success": {
    "listApps": "Lấy danh sách ứng dụng thành công.",
    "listCategories": "Lấy danh sách danh mục thành công.",
    "createApp": "Đăng ký ứng dụng thành công."
  },
  "errors": {
    "nameExists": "Đã tồn tại ứng dụng với tên này.",
    "categoryNotFound": "Danh mục đã chọn không tồn tại."
  },
  "validation": {
    "name": {
      "required": "Vui lòng nhập tên ứng dụng.",
      "minLength": "Tên ứng dụng tối thiểu 2 ký tự.",
      "maxLength": "Tên ứng dụng tối đa 64 ký tự.",
      "invalid": "Chỉ dùng chữ thường, số và dấu gạch ngang."
    },
    "displayName": {
      "required": "Vui lòng nhập tên hiển thị.",
      "minLength": "Tên hiển thị tối thiểu 2 ký tự.",
      "maxLength": "Tên hiển thị tối đa 80 ký tự."
    },
    "description": { "maxLength": "Mô tả tối đa 500 ký tự." },
    "iconUrl": {
      "maxLength": "URL icon quá dài.",
      "invalid": "URL icon phải bắt đầu bằng http:// hoặc https://."
    },
    "homeUrl": {
      "required": "Vui lòng nhập Home URL.",
      "maxLength": "Home URL quá dài.",
      "invalid": "Home URL phải bắt đầu bằng http:// hoặc https://."
    },
    "categoryId": {
      "required": "Vui lòng chọn danh mục.",
      "invalid": "Danh mục không hợp lệ."
    },
    "status": { "invalid": "Trạng thái phải là active hoặc inactive." },
    "requiredRoles": {
      "required": "Chọn ít nhất một vai trò.",
      "invalid": "Giá trị vai trò không hợp lệ."
    },
    "redirectUris": {
      "required": "Thêm ít nhất một redirect URI.",
      "maxItems": "Quá nhiều redirect URI (tối đa 20).",
      "invalid": "Mỗi redirect URI phải bắt đầu bằng http:// hoặc https://."
    }
  }
}
```

- [ ] **Step 3: Add Swagger doc (standard-doc-api)**

Read `server/.claude/skills/standard-doc-api` for the project Swagger convention, then create `src/modules/web-app/swagger/` with `paths.ts` (POST `/admin/apps`: 201 returns `AdminAppCreatedDto`, 400 validation, 401, 403 admin-only, 409 name conflict), `schemas.ts` (`AdminAppCreateBody`, `AdminAppCreatedDto`), and `index.ts` barrel. Reference the untracked `src/modules/web-app/swagger/` in the MAIN checkout (`D:\Learn\web-app-store-server-client\server\src\modules\web-app\swagger\`) as a starting point and complete the POST path. Register the swagger paths/schemas where other modules register theirs (follow an existing module, e.g. `contact-admin/swagger`).

- [ ] **Step 4: Verify build + tests**

Run: `npx tsc --noEmit && npx jest --testMatch "**/?(*.)+(spec).ts"`
Expected: clean + all pass.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en/webApp.json src/i18n/locales/vi/webApp.json src/modules/web-app/swagger/
git commit -m "feat(web-app): add create-app i18n messages and Swagger docs"
```

---

## FE Tasks

> Run all FE commands from `client/.worktrees/web-app-create`. After EVERY task: `yarn format && yarn lint && yarn tsc` must pass before commit.

### Task FE-1: Result type

**Files:**
- Modify: `src/types/AdminApps/index.ts`

- [ ] **Step 1: Add the create-result type**

Append to `src/types/AdminApps/index.ts`:

```ts
export type AdminAppCreateResult = WebApp & { clientSecret: string };
```

- [ ] **Step 2: Verify**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/types/AdminApps/index.ts
git commit -m "feat(admin-apps): add AdminAppCreateResult type"
```

---

### Task FE-2: Real createAdminApp request

**Files:**
- Modify: `src/requests/adminApps.ts`

- [ ] **Step 1: Add the request function**

In `src/requests/adminApps.ts`, update the type import and append the function:

```ts
// types
import type {
  AdminAppsQueryParams,
  AdminAppCreateInput,
  AdminAppCreateResult,
  WebApp,
  WebAppCategory
} from "@/types/AdminApps";
```

Append after `getAdminAppCategories`:

```ts
export const createAdminApp = async (
  input: AdminAppCreateInput
): Promise<AdminAppCreateResult> => {
  const response = await axiosInstance.post<
    ResponsePattern<AdminAppCreateResult>
  >(END_POINTS.ADMIN_APPS, input);
  return response.data.data;
};
```

- [ ] **Step 2: Verify**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/requests/adminApps.ts
git commit -m "feat(admin-apps): add real createAdminApp request"
```

---

### Task FE-3: useCreateAdminApp hook

**Files:**
- Create: `src/views/AdminApps/hooks/useCreateAdminApp.ts`

- [ ] **Step 1: Create the hook**

Create `src/views/AdminApps/hooks/useCreateAdminApp.ts`:

```ts
// libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// requests
import { createAdminApp } from "@/requests/adminApps";

export const ADMIN_APPS_QUERY_KEY = "adminApps";

const useCreateAdminApp = () => {
  const queryClient = useQueryClient();
  const tToast = useTranslations("adminApps.toast");

  return useMutation({
    mutationFn: createAdminApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_APPS_QUERY_KEY] });
      toast.success(tToast("createSuccess"));
    },
    onError: () => toast.error(tToast("error"))
  });
};

export default useCreateAdminApp;
```

> a11y announce + secret-dialog opening stay in the consumer (they need entity context) — passed via per-call `mutate(values, { onSuccess })`.

- [ ] **Step 2: Verify**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/views/AdminApps/hooks/useCreateAdminApp.ts
git commit -m "feat(admin-apps): extract create mutation into useCreateAdminApp hook"
```

---

### Task FE-4: SecretField component

**Files:**
- Create: `src/views/AdminApps/components/SecretField/index.tsx`

- [ ] **Step 1: Create the component**

Create `src/views/AdminApps/components/SecretField/index.tsx` (mirrors `Security/components/ApiKeyRow` copy pattern; props inline per `types.md`):

```tsx
"use client";

// libs
import { Copy } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";

const SecretField = ({
  label,
  value,
  copyLabel,
  onCopy
}: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) => (
  <div className="space-y-1.5">
    <p className="text-foreground text-sm font-medium">{label}</p>
    <div className="border-border flex items-center gap-2 rounded-md border p-2">
      <code className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-sm">
        {value}
      </code>
      <CustomButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        iconLeft={<Copy className="size-3.5" aria-hidden="true" />}
      >
        {copyLabel}
      </CustomButton>
    </div>
  </div>
);

export default SecretField;
```

- [ ] **Step 2: Verify**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/views/AdminApps/components/SecretField/index.tsx
git commit -m "feat(admin-apps): add SecretField copy component"
```

---

### Task FE-5: Secret reveal dialog

**Files:**
- Create: `src/views/AdminApps/mains/AdminAppsSecretDialog/index.tsx`

- [ ] **Step 1: Create the dialog**

Create `src/views/AdminApps/mains/AdminAppsSecretDialog/index.tsx` (uses `@/components/ui/dialog` like `AdminAppsDeleteDialog`; `useAnnounce` on copy per accessibility rule):

```tsx
"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminAppCreateResult } from "@/types/AdminApps";
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
import SecretField from "../../components/SecretField";
// hooks
import { useAnnounce } from "@/hooks";

const AdminAppsSecretDialog = ({
  app,
  onClose
}: {
  app: AdminAppCreateResult | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminApps.secretDialog");
  const tActions = useTranslations("adminApps.actions");
  const { announce } = useAnnounce();

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard may be unavailable; announce still fires
    }
    announce(t("announce.copied"));
  };

  return (
    <Dialog open={app !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {app && (
          <div className="space-y-4">
            <SecretField
              label={t("clientIdLabel")}
              value={app.clientId}
              copyLabel={tActions("copy")}
              onCopy={() => handleCopy(app.clientId)}
            />
            <SecretField
              label={t("clientSecretLabel")}
              value={app.clientSecret}
              copyLabel={tActions("copy")}
              onCopy={() => handleCopy(app.clientSecret)}
            />
            <p className="text-destructive text-sm font-medium">
              {t("warning")}
            </p>
          </div>
        )}
        <DialogFooter>
          <CustomButton type="button" onClick={onClose}>
            {t("done")}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAppsSecretDialog;
```

- [ ] **Step 2: Verify**

Run: `yarn tsc`
Expected: clean (locale keys added in FE-7; tsc on next-intl strings is not type-blocking).

- [ ] **Step 3: Commit**

```bash
git add src/views/AdminApps/mains/AdminAppsSecretDialog/index.tsx
git commit -m "feat(admin-apps): add one-time client secret reveal dialog"
```

---

### Task FE-6: Wire FormSheet + page

**Files:**
- Modify: `src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`
- Modify: `src/views/AdminApps/index.tsx`

- [ ] **Step 1: Switch FormSheet create to the hook + add onCreated**

In `src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`:

1. Remove `createAdminApp` from the `@/mocks/AdminApps` import (keep `updateAdminApp` from mock — out of scope):

```ts
// others
import { updateAdminApp } from "@/mocks/AdminApps";
```

2. Add the hook import (`// hooks` group):

```ts
// hooks
import { useAnnounce } from "@/hooks";
import useCreateAdminApp from "../../hooks/useCreateAdminApp";
```

3. Add the type import for the result (`// types` group, alongside existing):

```ts
import type {
  AdminAppFormValues,
  WebApp,
  AdminAppCreateResult
} from "@/types/AdminApps";
```

4. Add `onCreated` to the props:

```tsx
const AdminAppsFormSheet = ({
  open,
  editingApp,
  onClose,
  onCreated
}: {
  open: boolean;
  editingApp: WebApp | null;
  onClose: () => void;
  onCreated: (result: AdminAppCreateResult) => void;
}) => {
```

5. Replace the inline `createMutation` (the `useMutation({ mutationFn: createAdminApp, ... })` block) with the hook + per-call side effects:

```tsx
  const createMutation = useCreateAdminApp();
```

6. Update `onSubmit` so create routes to the hook with announce + secret reveal in per-call `onSuccess`:

```tsx
  const onSubmit = (values: AdminAppFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
      return;
    }
    createMutation.mutate(values, {
      onSuccess: (created) => {
        announce(tAnnounce("created", { name: created.displayName }));
        onClose();
        onCreated(created);
      }
    });
  };
```

> `tToast("createSuccess")` + query invalidation now live in the hook. The local `ADMIN_APPS_QUERY_KEY` const is still used by `updateMutation` — keep it. Leave the `updateMutation` block unchanged (still mock).

- [ ] **Step 2: Add secret-dialog state to the page**

In `src/views/AdminApps/index.tsx`:

1. Update imports:

```tsx
// types
import type { WebApp, AdminAppCreateResult } from "@/types/AdminApps";
// components
import AdminAppsHeader from "./mains/AdminAppsHeader";
import AdminAppsToolbar from "./mains/AdminAppsToolbar";
import AdminAppsTable from "./mains/AdminAppsTable";
import AdminAppsFormSheet from "./mains/AdminAppsFormSheet";
import AdminAppsDeleteDialog from "./mains/AdminAppsDeleteDialog";
import AdminAppsSecretDialog from "./mains/AdminAppsSecretDialog";
```

2. Add state + handlers:

```tsx
  const [createdApp, setCreatedApp] = useState<AdminAppCreateResult | null>(
    null
  );

  const handleCreated = (result: AdminAppCreateResult) =>
    setCreatedApp(result);

  const handleCloseSecret = () => setCreatedApp(null);
```

3. Pass `onCreated` to the FormSheet and render the dialog:

```tsx
      <AdminAppsFormSheet
        open={formOpen}
        editingApp={editingApp}
        onClose={handleCloseForm}
        onCreated={handleCreated}
      />
      <AdminAppsDeleteDialog target={deleteTarget} onClose={handleCloseDelete} />
      <AdminAppsSecretDialog app={createdApp} onClose={handleCloseSecret} />
```

- [ ] **Step 3: Verify (full FE gate)**

Run: `yarn format && yarn lint && yarn tsc`
Expected: all clean. Re-read modified files if format/lint auto-fixed them.

- [ ] **Step 4: Commit**

```bash
git add src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx src/views/AdminApps/index.tsx
git commit -m "feat(admin-apps): wire real create flow with secret reveal"
```

---

### Task FE-7: i18n keys for the secret dialog + copy action

**Files:**
- Modify: `src/locales/en/adminApps.json`, `src/locales/vi/adminApps.json`

- [ ] **Step 1: Add EN keys**

In `src/locales/en/adminApps.json`: add `"copy": "Copy"` to the `actions` object, and add a new top-level `secretDialog` object:

```json
  "secretDialog": {
    "title": "App registered — copy your credentials",
    "description": "Share these with the app's developer to configure OAuth. The client secret is shown only once.",
    "clientIdLabel": "Client ID",
    "clientSecretLabel": "Client Secret",
    "warning": "Store the client secret now — it will not be shown again.",
    "done": "Done",
    "announce": {
      "copied": "Copied to clipboard."
    }
  }
```

- [ ] **Step 2: Add VI keys**

In `src/locales/vi/adminApps.json`: add `"copy": "Sao chép"` to `actions`, and:

```json
  "secretDialog": {
    "title": "Đã đăng ký ứng dụng — sao chép thông tin xác thực",
    "description": "Gửi các giá trị này cho lập trình viên của ứng dụng để cấu hình OAuth. Client secret chỉ hiển thị một lần.",
    "clientIdLabel": "Client ID",
    "clientSecretLabel": "Client Secret",
    "warning": "Hãy lưu client secret ngay — nó sẽ không hiển thị lại.",
    "done": "Xong",
    "announce": {
      "copied": "Đã sao chép vào clipboard."
    }
  }
```

> Ensure both files stay valid JSON (add a comma after the preceding sibling object). Match the existing key ordering style.

- [ ] **Step 3: Verify (full FE gate)**

Run: `yarn format && yarn lint && yarn tsc`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en/adminApps.json src/locales/vi/adminApps.json
git commit -m "feat(admin-apps): add secret dialog i18n keys (en, vi)"
```

---

### Task FE-8: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the app + exercise the flow**

With the BE worktree server running (real DB seeded), run `yarn dev` in the FE worktree. Use the `webapp-testing` skill (Playwright) to: log in as admin → open App Registry → Register App → fill valid data → submit → assert the secret dialog shows `Client ID` + `Client Secret` + warning → copy buttons announce → Done closes dialog → new app appears in the table. Also verify a duplicate name surfaces the 409 toast.

- [ ] **Step 2: Final full gate**

Run: `yarn format && yarn lint && yarn tsc`
Expected: all clean. No commit needed unless fixes were made.

---

## Self-Review

**Spec coverage:**
- §1 Scope (Create only, secret reveal A) → BE-6 (createApp), FE-5/FE-6 (reveal). ✓
- §3 BE service flow steps 1–6 → BE-2 (generators/status), BE-4 (repo), BE-5 (DTO), BE-6 (service), BE-7 (controller/route). ✓
- §3.2 file table → all covered across BE-1..BE-8. ✓
- §3.3 validator mirrors zod → BE-3. ✓
- §4 FE table → FE-1..FE-7. ✓
- §5 API contract (`"" → null`, status map, secret once) → BE-6 service + BE-5 DTO; asserted in BE-6 tests. ✓
- §6 security (entropy, bcrypt, admin-guard, URL validation) → BE-2 (entropy), BE-6 (hash), router guards pre-existing, BE-3 (URL pattern). ✓
- Convention: mutation in hook (FE-3), announce on copy/dialog (FE-5/FE-6), CustomButton (FE-4/FE-5). ✓

**Placeholder scan:** No TBD/TODO; all code shown. BE-8 step 3 (Swagger) intentionally references the standard-doc-api skill + existing untracked swagger as source — concrete enough given developer-owned Swagger convention. ✓

**Type consistency:** `AdminAppCreateBody` (BE-3) ↔ service param (BE-6) ↔ validator generic (BE-3); `WebAppCreateInput` (BE-3) ↔ repo.create (BE-4) ↔ service call (BE-6); `AdminAppCreatedDto` (BE-5) ↔ controller return (BE-7); `AdminAppCreateResult` (FE-1) ↔ request (FE-2) ↔ FormSheet `onCreated` (FE-6) ↔ dialog prop (FE-5); `ADMIN_APPS_QUERY_KEY` defined once in hook (FE-3). ✓
