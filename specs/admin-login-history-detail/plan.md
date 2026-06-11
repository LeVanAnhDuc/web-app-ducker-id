# Admin Login History — Detail Page & Detail API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim the admin login-history table to a focused column set with a per-row **View** action, and add a deep-linkable detail page backed by a new `GET /admin/login-history/:id` API.

**Architecture:** Mirror the existing `AdminContact` detail feature exactly (list → `[id]` page → `GET /admin/contacts/:id`). BE adds a param-validated detail route → service → repo `findById` → `NotFoundError`; FE adds a detail page + `AdminLoginHistoryDetail` view consuming a React-Query hook. Read-only feature — no mutations.

**Tech Stack:** BE: Express + Mongoose + Joi + i18next + Jest. FE: Next.js 15 App Router + React 19 + React Query + next-intl + Tailwind/shadcn. E2E: Playwright.

**Worktrees (already created, branch `feat/admin-login-history-detail`):**
- docs: `docs/.worktrees/admin-login-history-detail/`
- server: `server/.worktrees/admin-login-history-detail/`
- client: `client/.worktrees/admin-login-history-detail/`

All BE paths below are under `server/.worktrees/admin-login-history-detail/`; all FE paths under `client/.worktrees/admin-login-history-detail/`.

> **COMMIT GATE (project CLAUDE.md §7, Review ON):** Implementers **stage** changes (`git add`) per task but **do NOT commit per-task**. After ALL tasks are implemented, the main loop presents one consolidated diff per repo; the user reviews once and approves; only then the final **Task R** commits. The per-task `git add` lists below are staging only.

---

## File Structure

### Backend (`server/`, module `login-history`)
- Create `src/i18n/locales/en/loginHistory.json` + `src/i18n/locales/vi/loginHistory.json` — module i18n namespace (currently missing; controller already references `loginHistory:` keys).
- Modify `src/i18n/locales/en/index.ts` + `src/i18n/locales/vi/index.ts` — register the `loginHistory` namespace.
- Modify `src/constants/error-code.ts` — add `LOGIN_HISTORY_NOT_FOUND`.
- Modify `src/validators/schemas/login-history.ts` — add `loginHistoryIdParamSchema`.
- Modify `src/modules/login-history/types/index.ts` — add `HistoryIdParamRequest`.
- Create `src/modules/login-history/dtos/history-detail-item.dto.ts` — `HistoryDetailItemDto` + mapper.
- Modify `src/modules/login-history/dtos/index.ts` — barrel export the new DTO.
- Modify `src/modules/login-history/login-history.repository.ts` — add `findById`.
- Modify `src/modules/login-history/login-history.service.ts` — add `getLoginHistoryDetail`.
- Modify `src/modules/login-history/login-history.controller.ts` — add `getHistoryDetail`.
- Modify `src/modules/login-history/login-history.routes.ts` — wire `GET /:id`.
- Create `src/modules/login-history/login-history.service.spec.ts` — unit tests for `getLoginHistoryDetail`.

### Frontend (`client/`)
- Modify `src/constants/queryKeys.ts` — add `ADMIN_LOGIN_HISTORY_DETAIL`.
- Modify `src/types/LoginHistory/index.ts` — add `LoginHistoryAdminDetailItem`.
- Modify `src/requests/loginHistory.ts` — add `getAdminLoginHistoryDetail`.
- Create `src/views/AdminLoginHistoryDetail/hooks/useAdminLoginHistoryDetail.ts`.
- Create `src/dataSources/AdminLoginHistoryDetail/index.ts` — breadcrumb config.
- Modify `src/locales/en/loginHistory.json` + `src/locales/vi/loginHistory.json` — table action keys + `admin.detail.*`.
- Create `src/views/AdminLoginHistoryDetail/components/LoginHistoryDetailSkeleton/index.tsx`.
- Create `src/views/AdminLoginHistoryDetail/components/DetailField/index.tsx`.
- Create `src/views/AdminLoginHistoryDetail/mains/AdminLoginHistoryDetailHeader/index.tsx`.
- Create `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`.
- Create `src/views/AdminLoginHistoryDetail/index.tsx`.
- Create `src/app/[locale]/(private)/(admin)/admin/login-history/[id]/page.tsx`.
- Modify `src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx` — trim columns + Action.

### E2E (`client/`) + docs
- Create `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts`.
- Create `docs/specs/admin-login-history-detail/e2e.md`.

---

## BE Tasks (`server/`) — chỉ chạm `server/src/**`. Read `server/.claude/CLAUDE.md` + skills `standard-typescript`, `module-struct`, `standard-restful-api`, `standard-mongodb` first.

### Task BE-1: Register the `loginHistory` i18n namespace (en + vi)

**Files:**
- Create: `src/i18n/locales/en/loginHistory.json`
- Create: `src/i18n/locales/vi/loginHistory.json`
- Modify: `src/i18n/locales/en/index.ts`
- Modify: `src/i18n/locales/vi/index.ts`

Context: the controller already uses `loginHistory:success.getMyHistory/getMyStats/getAllHistory` but no `loginHistory.json` exists — those currently fall back to the raw key. This task creates the namespace (fixing the latent gap) and adds the new detail keys.

- [ ] **Step 1: Create the EN locale file**

`src/i18n/locales/en/loginHistory.json`:

```json
{
  "success": {
    "getMyHistory": "Login history retrieved successfully",
    "getMyStats": "Login statistics retrieved successfully",
    "getAllHistory": "All login history retrieved successfully",
    "getHistoryDetail": "Login history detail retrieved successfully"
  },
  "errors": {
    "notFound": "Login history record not found",
    "invalidId": "Invalid login history id"
  }
}
```

- [ ] **Step 2: Create the VI locale file**

`src/i18n/locales/vi/loginHistory.json`:

```json
{
  "success": {
    "getMyHistory": "Lấy lịch sử đăng nhập thành công",
    "getMyStats": "Lấy thống kê đăng nhập thành công",
    "getAllHistory": "Lấy toàn bộ lịch sử đăng nhập thành công",
    "getHistoryDetail": "Lấy chi tiết lịch sử đăng nhập thành công"
  },
  "errors": {
    "notFound": "Không tìm thấy bản ghi lịch sử đăng nhập",
    "invalidId": "Id lịch sử đăng nhập không hợp lệ"
  }
}
```

- [ ] **Step 3: Register in `en/index.ts`** — add this line alongside the other `export { default as ... }` lines (e.g. after the `contactAdmin` line):

```ts
export { default as loginHistory } from "./loginHistory.json";
```

- [ ] **Step 4: Register in `vi/index.ts`** — add the identical line in the VI barrel (match its existing ordering).

- [ ] **Step 5: Stage**

```bash
git add src/i18n/locales/en/loginHistory.json src/i18n/locales/vi/loginHistory.json src/i18n/locales/en/index.ts src/i18n/locales/vi/index.ts
```

### Task BE-2: Add `LOGIN_HISTORY_NOT_FOUND` error code

**Files:**
- Modify: `src/constants/error-code.ts`

- [ ] **Step 1: Add the key** — locate the `*_NOT_FOUND` group (near `CONTACT_NOT_FOUND`) and add, in the appropriate `// ── ... ──` group, the line (format `KEY: "KEY"`):

```ts
  LOGIN_HISTORY_NOT_FOUND: "LOGIN_HISTORY_NOT_FOUND",
```

- [ ] **Step 2: Stage**

```bash
git add src/constants/error-code.ts
```

### Task BE-3: Add `loginHistoryIdParamSchema` validator

**Files:**
- Modify: `src/validators/schemas/login-history.ts`

- [ ] **Step 1: Add the import** — at the top, the file already imports from `@/validators/constants`. Ensure `OBJECTID_PATTERN` is imported:

```ts
import { OBJECTID_PATTERN, SEARCH_MAX_LENGTH } from "@/validators/constants";
```

- [ ] **Step 2: Append the schema** at the end of the file (named export, mirrors `contactIdParamSchema`):

```ts
export const loginHistoryIdParamSchema = Joi.object({
  id: Joi.string().pattern(OBJECTID_PATTERN).required().messages({
    "string.empty": "loginHistory:errors.invalidId",
    "string.pattern.base": "loginHistory:errors.invalidId",
    "any.required": "loginHistory:errors.invalidId"
  })
});
```

- [ ] **Step 3: Stage**

```bash
git add src/validators/schemas/login-history.ts
```

### Task BE-4: Add `HistoryIdParamRequest` type + `HistoryDetailItemDto`

**Files:**
- Modify: `src/modules/login-history/types/index.ts`
- Create: `src/modules/login-history/dtos/history-detail-item.dto.ts`
- Modify: `src/modules/login-history/dtos/index.ts`

- [ ] **Step 1: Add the typed request** to `types/index.ts` (after the existing `AllHistoryRequest` interface):

```ts
export interface HistoryIdParamRequest extends Omit<Request, "params"> {
  params: { id: string };
}
```

- [ ] **Step 2: Create the detail DTO** `dtos/history-detail-item.dto.ts` (identical field set to `all-history-item.dto.ts`):

```ts
// types
import type {
  LoginMethod,
  LoginStatus,
  LoginFailReason,
  DeviceType,
  ClientType,
  LoginHistoryDocument
} from "@/modules/login-history/types";

export interface HistoryDetailItemDto {
  _id: string;
  method: LoginMethod;
  status: LoginStatus;
  failReason: LoginFailReason | null;
  ip: string;
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  clientType: ClientType;
  createdAt: string;
  userId: string | null;
  usernameAttempted: string;
  userAgent: string;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
}

export const toHistoryDetailItemDto = (
  doc: LoginHistoryDocument
): HistoryDetailItemDto => ({
  _id: doc._id.toString(),
  method: doc.method,
  status: doc.status,
  failReason: doc.failReason ?? null,
  ip: doc.ip,
  country: doc.country,
  city: doc.city,
  deviceType: doc.deviceType,
  os: doc.os,
  browser: doc.browser,
  clientType: doc.clientType,
  createdAt: doc.createdAt.toISOString(),
  userId: doc.userId ? doc.userId.toString() : null,
  usernameAttempted: doc.usernameAttempted,
  userAgent: doc.userAgent,
  timezoneOffset: doc.timezoneOffset,
  isAnomaly: doc.isAnomaly,
  anomalyReasons: doc.anomalyReasons
});
```

- [ ] **Step 3: Barrel-export** in `dtos/index.ts` — append:

```ts
export type { HistoryDetailItemDto } from "./history-detail-item.dto";
export { toHistoryDetailItemDto } from "./history-detail-item.dto";
```

- [ ] **Step 4: Stage**

```bash
git add src/modules/login-history/types/index.ts src/modules/login-history/dtos/history-detail-item.dto.ts src/modules/login-history/dtos/index.ts
```

### Task BE-5: Add `findById` to the repository

**Files:**
- Modify: `src/modules/login-history/login-history.repository.ts`

- [ ] **Step 1: Extend the type contract** — in `export type LoginHistoryRepository = { ... }`, add:

```ts
  findById(id: string): Promise<LoginHistoryDocument | null>;
```

- [ ] **Step 2: Implement in `MongoLoginHistoryRepository`** — add the method (e.g. after `create`):

```ts
  async findById(id: string): Promise<LoginHistoryDocument | null> {
    return asyncDatabaseHandler("findById", async () => {
      const doc = await LoginHistoryModel.findById(id).lean().exec();
      return doc as unknown as LoginHistoryDocument | null;
    });
  }
```

- [ ] **Step 3: Stage**

```bash
git add src/modules/login-history/login-history.repository.ts
```

### Task BE-6: Service `getLoginHistoryDetail` (TDD)

**Files:**
- Test: `src/modules/login-history/login-history.service.spec.ts`
- Modify: `src/modules/login-history/login-history.service.ts`

- [ ] **Step 1: Write the failing test** `login-history.service.spec.ts`:

```ts
// libs
import type { LoginHistoryRepository } from "./login-history.repository";
import type { LoginHistoryDocument } from "@/modules/login-history/types";
// module under test
import { LoginHistoryService } from "./login-history.service";
import { NotFoundError } from "@/common/exceptions";

const makeRepo = (
  overrides: Partial<LoginHistoryRepository> = {}
): LoginHistoryRepository => ({
  create: jest.fn(),
  findByUser: jest.fn(),
  findAll: jest.fn(),
  aggregateMyStats: jest.fn(),
  findById: jest.fn(),
  ...overrides
});

const fakeDoc = (): LoginHistoryDocument =>
  ({
    _id: { toString: () => "64b7f0c2f1a2b3c4d5e6f7a8" },
    userId: { toString: () => "64b7f0c2f1a2b3c4d5e6f7b9" },
    usernameAttempted: "user@test.com",
    method: "password",
    status: "success",
    failReason: undefined,
    ip: "1.2.3.4",
    country: "Vietnam",
    city: "Hanoi",
    deviceType: "DESKTOP",
    os: "Windows",
    browser: "Chrome",
    userAgent: "UA-string",
    clientType: "WEB",
    timezoneOffset: "+07:00",
    isAnomaly: false,
    anomalyReasons: [],
    createdAt: new Date("2026-06-09T07:00:00.000Z")
  }) as unknown as LoginHistoryDocument;

describe("LoginHistoryService.getLoginHistoryDetail", () => {
  it("returns the detail DTO when the record exists", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(fakeDoc())
    });
    const service = new LoginHistoryService(repo);

    const result = await service.getLoginHistoryDetail(
      "64b7f0c2f1a2b3c4d5e6f7a8"
    );

    expect(repo.findById).toHaveBeenCalledWith("64b7f0c2f1a2b3c4d5e6f7a8");
    expect(result._id).toBe("64b7f0c2f1a2b3c4d5e6f7a8");
    expect(result.userId).toBe("64b7f0c2f1a2b3c4d5e6f7b9");
    expect(result.usernameAttempted).toBe("user@test.com");
    expect(result.failReason).toBeNull();
    expect(result.createdAt).toBe("2026-06-09T07:00:00.000Z");
  });

  it("throws NotFoundError when the record is missing", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new LoginHistoryService(repo);

    await expect(
      service.getLoginHistoryDetail("000000000000000000000000")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run (from `server/.worktrees/admin-login-history-detail/`):
`npx jest --testMatch "**/login-history.service.spec.ts"`
Expected: FAIL — `service.getLoginHistoryDetail is not a function`.
(Worktree note: if jest reports "0 tests", use the broader matcher `npx jest --testMatch "**/?(*.)+(spec).ts"` per the known rootDir-glob quirk in worktrees.)

- [ ] **Step 3: Implement the method** in `login-history.service.ts`. Add imports — to the `./dtos` type import block add `HistoryDetailItemDto`; to the `./dtos` value import block add `toHistoryDetailItemDto`; add `import { NotFoundError } from "@/common/exceptions";` and `import { ERROR_CODES } from "@/constants/error-code";`. Then add the method to the class:

```ts
  async getLoginHistoryDetail(id: string): Promise<HistoryDetailItemDto> {
    const doc = await this.loginHistoryRepo.findById(id);

    if (!doc) {
      throw new NotFoundError({
        i18nMessage: (t) => t("loginHistory:errors.notFound"),
        code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
      });
    }

    return toHistoryDetailItemDto(doc);
  }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest --testMatch "**/login-history.service.spec.ts"`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git add src/modules/login-history/login-history.service.ts src/modules/login-history/login-history.service.spec.ts
```

### Task BE-7: Controller handler + route wiring

**Files:**
- Modify: `src/modules/login-history/login-history.controller.ts`
- Modify: `src/modules/login-history/login-history.routes.ts`

- [ ] **Step 1: Add the controller handler.** In `login-history.controller.ts`, extend the `types` import to include `HistoryIdParamRequest`:

```ts
import type {
  MyHistoryRequest,
  AllHistoryRequest,
  HistoryIdParamRequest
} from "@/modules/login-history/types";
```

Then add the handler method to the class:

```ts
  getHistoryDetail = async (
    req: HistoryIdParamRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getLoginHistoryDetail(req.params.id);
    new OkSuccess({
      data,
      message: "loginHistory:success.getHistoryDetail"
    }).send(req, res);
  };
```

- [ ] **Step 2: Wire the route.** In `login-history.routes.ts`, extend the validator import and the middleware import:

```ts
import {
  loginHistoryQuerySchema,
  loginHistoryAdminQuerySchema,
  loginHistoryIdParamSchema
} from "@/validators/schemas/login-history";
```

```ts
import { adminGuard, authGuard, paramsPipe, queryPipe } from "@/middlewares";
```

Then, inside `createLoginHistoryAdminRoutes`, add the detail route after the existing `adminLoginHistory.get("/", ...)`:

```ts
  adminLoginHistory.get(
    "/:id",
    paramsPipe(loginHistoryIdParamSchema),
    asyncHandler(controller.getHistoryDetail)
  );
```

- [ ] **Step 3: Type-check the whole server**

Run (from the server worktree): `yarn tsc`
Expected: no errors.

- [ ] **Step 4: Stage**

```bash
git add src/modules/login-history/login-history.controller.ts src/modules/login-history/login-history.routes.ts
```

### Task BE-8: BE quality gate

- [ ] **Step 1: Run all three checks** (from the server worktree):

```bash
yarn format
yarn lint
yarn tsc
```

Expected: all pass; fix any lint/tsc errors before continuing. Re-stage any files auto-fixed by format/lint.

---

## FE Tasks (`client/`) — chỉ chạm `client/src/**` (+ e2e). Read `client/.claude/CLAUDE.md` + skills `standard-typescript`, `standard-react`, `standard-nextjs`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility` first. API contract: `LoginHistoryAdminDetailItem` ≡ BE `HistoryDetailItemDto`.

### Task FE-1: Constants + types + request

**Files:**
- Modify: `src/constants/queryKeys.ts`
- Modify: `src/types/LoginHistory/index.ts`
- Modify: `src/requests/loginHistory.ts`

- [ ] **Step 1: Add the query key.** In `queryKeys.ts`, under the `// Login history` group add:

```ts
  ADMIN_LOGIN_HISTORY_DETAIL: "adminLoginHistoryDetail",
```

- [ ] **Step 2: Add the detail type.** In `types/LoginHistory/index.ts`, after the `LoginHistoryAdminItem` interface add:

```ts
export type LoginHistoryAdminDetailItem = LoginHistoryAdminItem;
```

- [ ] **Step 3: Add the request fn.** In `requests/loginHistory.ts`, extend the type import to include `LoginHistoryAdminDetailItem`, then append:

```ts
export const getAdminLoginHistoryDetail = async (
  id: string
): Promise<LoginHistoryAdminDetailItem> => {
  const response = await axiosInstance.get<
    ResponsePattern<LoginHistoryAdminDetailItem>
  >(`${END_POINTS.ADMIN_LOGIN_HISTORY}/${id}`);
  return response.data.data;
};
```

- [ ] **Step 4: Stage**

```bash
git add src/constants/queryKeys.ts src/types/LoginHistory/index.ts src/requests/loginHistory.ts
```

### Task FE-2: Detail query hook + breadcrumb dataSource

**Files:**
- Create: `src/views/AdminLoginHistoryDetail/hooks/useAdminLoginHistoryDetail.ts`
- Create: `src/dataSources/AdminLoginHistoryDetail/index.ts`

- [ ] **Step 1: Create the hook**

```ts
// libs
import { useQuery } from "@tanstack/react-query";
// requests
import { getAdminLoginHistoryDetail } from "@/requests/loginHistory";
// others
import CONSTANTS from "@/constants";

const useAdminLoginHistoryDetail = (id: string) =>
  useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_LOGIN_HISTORY_DETAIL, id],
    queryFn: () => getAdminLoginHistoryDetail(id),
    enabled: Boolean(id)
  });

export default useAdminLoginHistoryDetail;
```

- [ ] **Step 2: Create the breadcrumb dataSource**

```ts
// types
import type { CustomBreadcrumbItem } from "@/components/CustomBreadcrumb";
// others
import CONSTANTS from "@/constants";

export const ADMIN_LOGIN_HISTORY_DETAIL_BREADCRUMB: readonly CustomBreadcrumbItem[] =
  [
    { key: "list", href: CONSTANTS.ROUTES.ADMIN_LOGIN_HISTORY },
    { key: "current" }
  ] as const;
```

- [ ] **Step 3: Stage**

```bash
git add src/views/AdminLoginHistoryDetail/hooks/useAdminLoginHistoryDetail.ts src/dataSources/AdminLoginHistoryDetail/index.ts
```

### Task FE-3: i18n — table action keys + detail namespace (en + vi)

**Files:**
- Modify: `src/locales/en/loginHistory.json`
- Modify: `src/locales/vi/loginHistory.json`

- [ ] **Step 1: EN — add keys.** In `en/loginHistory.json`, inside the `"table"` object add three keys:

```json
    "ipLocation": "IP & Location",
    "action": "Actions",
    "viewDetail": "View"
```

Then inside the `"admin"` object (which already has `title`/`description`), add a `"detail"` sibling:

```json
    "detail": {
      "title": "Login Attempt Detail",
      "breadcrumb": {
        "list": "Login History",
        "current": "Detail"
      },
      "notFound": "Login history record not found.",
      "error": "Could not load this login record. Please try again.",
      "anomalyNone": "None",
      "fields": {
        "userId": "User ID",
        "usernameAttempted": "Username Attempted",
        "method": "Method",
        "status": "Status",
        "failReason": "Fail Reason",
        "ip": "IP Address",
        "country": "Country",
        "city": "City",
        "deviceType": "Device",
        "os": "OS",
        "browser": "Browser",
        "clientType": "Client",
        "userAgent": "User Agent",
        "timezoneOffset": "Timezone",
        "isAnomaly": "Anomaly",
        "anomalyReasons": "Anomaly Reasons",
        "createdAt": "Date"
      }
    }
```

- [ ] **Step 2: VI — add the mirrored keys.** In `vi/loginHistory.json`, inside `"table"`:

```json
    "ipLocation": "IP & Vị trí",
    "action": "Thao tác",
    "viewDetail": "Xem"
```

Inside `"admin"`:

```json
    "detail": {
      "title": "Chi tiết lần đăng nhập",
      "breadcrumb": {
        "list": "Lịch sử đăng nhập",
        "current": "Chi tiết"
      },
      "notFound": "Không tìm thấy bản ghi lịch sử đăng nhập.",
      "error": "Không thể tải bản ghi đăng nhập này. Vui lòng thử lại.",
      "anomalyNone": "Không có",
      "fields": {
        "userId": "User ID",
        "usernameAttempted": "Tên đăng nhập đã dùng",
        "method": "Phương thức",
        "status": "Trạng thái",
        "failReason": "Lý do thất bại",
        "ip": "Địa chỉ IP",
        "country": "Quốc gia",
        "city": "Thành phố",
        "deviceType": "Thiết bị",
        "os": "Hệ điều hành",
        "browser": "Trình duyệt",
        "clientType": "Client",
        "userAgent": "User Agent",
        "timezoneOffset": "Múi giờ",
        "isAnomaly": "Bất thường",
        "anomalyReasons": "Lý do bất thường",
        "createdAt": "Thời gian"
      }
    }
```

> Note: the VI `table` object must already contain the existing keys (`caption`, `method`, `status`, …). Only ADD the three new keys — do not remove existing ones. Keep both locale files structurally identical.

- [ ] **Step 3: Stage**

```bash
git add src/locales/en/loginHistory.json src/locales/vi/loginHistory.json
```

### Task FE-4: Detail view — skeleton + DetailField + card + header + index

**Files:**
- Create: `src/views/AdminLoginHistoryDetail/components/LoginHistoryDetailSkeleton/index.tsx`
- Create: `src/views/AdminLoginHistoryDetail/components/DetailField/index.tsx`
- Create: `src/views/AdminLoginHistoryDetail/mains/AdminLoginHistoryDetailHeader/index.tsx`
- Create: `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`
- Create: `src/views/AdminLoginHistoryDetail/index.tsx`

- [ ] **Step 1: Skeleton**

```tsx
// components
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 8;

const LoginHistoryDetailSkeleton = () => (
  <div className="bg-card space-y-3 rounded-xl border p-6">
    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
      <Skeleton key={`skeleton-${i}`} className="h-8 rounded-lg" />
    ))}
  </div>
);

export default LoginHistoryDetailSkeleton;
```

- [ ] **Step 2: DetailField molecule** (DRY for the `<dl>` rows; inline props type per `types.md`)

```tsx
// libs
import type { ReactNode } from "react";

const DetailField = ({
  label,
  value,
  mono = false,
  span = false
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  span?: boolean;
}) => (
  <div className={span ? "sm:col-span-2" : undefined}>
    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {label}
    </dt>
    <dd className={mono ? "mt-1 font-mono text-xs break-all" : "mt-1 text-sm"}>
      {value}
    </dd>
  </div>
);

export default DetailField;
```

- [ ] **Step 3: Header** (server component, mirrors `AdminContactDetailHeader`)

```tsx
// libs
import { getTranslations } from "next-intl/server";
// components
import CustomBreadcrumb from "@/components/CustomBreadcrumb";
// dataSources
import { ADMIN_LOGIN_HISTORY_DETAIL_BREADCRUMB } from "@/dataSources/AdminLoginHistoryDetail";

const AdminLoginHistoryDetailHeader = async () => {
  const t = await getTranslations("loginHistory.admin.detail");
  return (
    <div className="flex flex-col gap-3">
      <CustomBreadcrumb
        items={ADMIN_LOGIN_HISTORY_DETAIL_BREADCRUMB}
        namespace="loginHistory.admin.detail.breadcrumb"
      />
      <h1 className="text-foreground text-2xl font-bold tracking-tight">
        {t("title")}
      </h1>
    </div>
  );
};

export default AdminLoginHistoryDetailHeader;
```

- [ ] **Step 4: Detail card** (client; query + render + skeleton + not-found/error)

```tsx
"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { LoginHistoryMethod } from "@/types/LoginHistory";
// components
import CustomBadge from "@/components/CustomBadge";
import LoginHistoryDetailSkeleton from "../../components/LoginHistoryDetailSkeleton";
import DetailField from "../../components/DetailField";
// hooks
import useAdminLoginHistoryDetail from "../../hooks/useAdminLoginHistoryDetail";
// others
import { formatDateTimeMedium } from "@/utils";

const LoginHistoryDetailCard = ({ id }: { id: string }) => {
  const t = useTranslations("loginHistory.admin.detail");
  const tFields = useTranslations("loginHistory.admin.detail.fields");
  const tStatus = useTranslations("loginHistory.status");
  const tMethod = useTranslations("loginHistory.method");
  const tDevice = useTranslations("loginHistory.deviceType");
  const tTable = useTranslations("loginHistory.table");

  const { data, isLoading, isError } = useAdminLoginHistoryDetail(id);

  if (isLoading) return <LoginHistoryDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="bg-card rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">{t("notFound")}</p>
      </div>
    );
  }

  const location =
    data.city !== "UNKNOWN" ? `${data.city}, ${data.country}` : data.country;

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{data.usernameAttempted}</h2>
          <p className="text-muted-foreground text-sm">
            {formatDateTimeMedium(data.createdAt)}
          </p>
        </div>
        <CustomBadge
          variant={data.status === "success" ? "success" : "warning"}
          className="text-sm"
        >
          {tStatus(data.status)}
        </CustomBadge>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField
          label={tFields("method")}
          value={tMethod(data.method as LoginHistoryMethod)}
        />
        <DetailField label={tFields("status")} value={tStatus(data.status)} />
        {data.userId && (
          <DetailField label={tFields("userId")} value={data.userId} mono />
        )}
        {data.failReason && (
          <DetailField label={tFields("failReason")} value={data.failReason} />
        )}
        <DetailField label={tFields("ip")} value={data.ip} mono />
        <DetailField label={tFields("country")} value={location} />
        <DetailField label={tFields("deviceType")} value={tDevice(data.deviceType)} />
        <DetailField label={tFields("os")} value={data.os} />
        <DetailField label={tFields("browser")} value={data.browser} />
        <DetailField label={tFields("clientType")} value={data.clientType} />
        {data.timezoneOffset && (
          <DetailField
            label={tFields("timezoneOffset")}
            value={data.timezoneOffset}
          />
        )}
        <DetailField
          label={tFields("isAnomaly")}
          value={data.isAnomaly ? tTable("anomalyYes") : tTable("anomalyNo")}
        />
        <DetailField
          label={tFields("anomalyReasons")}
          value={
            data.anomalyReasons.length > 0
              ? data.anomalyReasons.join(", ")
              : t("anomalyNone")
          }
        />
        <DetailField
          label={tFields("userAgent")}
          value={data.userAgent}
          mono
          span
        />
      </dl>
    </div>
  );
};

export default LoginHistoryDetailCard;
```

- [ ] **Step 5: View index** (compose)

```tsx
// components
import AdminLoginHistoryDetailHeader from "./mains/AdminLoginHistoryDetailHeader";
import LoginHistoryDetailCard from "./mains/LoginHistoryDetailCard";

const AdminLoginHistoryDetail = ({ id }: { id: string }) => (
  <div className="space-y-6">
    <AdminLoginHistoryDetailHeader />
    <LoginHistoryDetailCard id={id} />
  </div>
);

export default AdminLoginHistoryDetail;
```

- [ ] **Step 6: Stage**

```bash
git add src/views/AdminLoginHistoryDetail
```

### Task FE-5: Route page `[id]/page.tsx`

**Files:**
- Create: `src/app/[locale]/(private)/(admin)/admin/login-history/[id]/page.tsx`

- [ ] **Step 1: Create the page** (mirrors `admin/contact/[id]/page.tsx`)

```tsx
// libs
import { getTranslations } from "next-intl/server";
// types
import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
// views
import AdminLoginHistoryDetail from "@/views/AdminLoginHistoryDetail";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "loginHistory.admin.detail"
  });

  return {
    title: t("title")
  };
}

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminLoginHistoryDetail id={id} />;
}
```

- [ ] **Step 2: Stage**

```bash
git add "src/app/[locale]/(private)/(admin)/admin/login-history/[id]/page.tsx"
```

### Task FE-6: Trim the admin table + add the Action column

**Files:**
- Modify: `src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`

This replaces the 10-column layout with **Username · Method · Status · IP & Location · Anomaly · Time · Action**. Drop the User ID, Device, and Browser columns.

- [ ] **Step 1: Add imports.** Add `ChevronRight` and `CONSTANTS`:

In the `// libs` group:

```tsx
import { ChevronRight } from "lucide-react";
```

In the `// others` group (CONSTANTS for the route):

```tsx
import CONSTANTS from "@/constants";
```

- [ ] **Step 2: Add the route constant + fix the column count.** Replace:

```tsx
const DEFAULT_PAGE_SIZE = 20;
const TABLE_COLUMN_COUNT = 10;
```

with:

```tsx
const { ADMIN_LOGIN_HISTORY } = CONSTANTS.ROUTES;
const DEFAULT_PAGE_SIZE = 20;
const TABLE_COLUMN_COUNT = 7;
```

- [ ] **Step 3: Replace the `<TableHeader>` block.** Replace the entire existing `<TableHeader>…</TableHeader>` with:

```tsx
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{tTable("usernameAttempted")}</TableHead>
              <TableHead scope="col">{tTable("method")}</TableHead>
              <TableHead scope="col">{tTable("status")}</TableHead>
              <TableHead scope="col">{tTable("ipLocation")}</TableHead>
              <TableHead scope="col">{tTable("isAnomaly")}</TableHead>
              <TableHead scope="col">{tTable("createdAt")}</TableHead>
              <TableHead scope="col">
                <span className="sr-only">{tTable("action")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
```

- [ ] **Step 4: Replace the row body (`items.map(...)`).** Replace the entire `items.map((item) => ( … ))` block with:

```tsx
              items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.usernameAttempted}</TableCell>
                  <TableCell>
                    {tMethod(item.method as LoginHistoryMethod)}
                  </TableCell>
                  <TableCell>
                    <CustomBadge
                      variant={
                        item.status === "success" ? "success" : "warning"
                      }
                      className="text-xs"
                    >
                      {tStatus(item.status)}
                    </CustomBadge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground block font-mono text-xs">
                      {item.ip}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.city !== "UNKNOWN"
                        ? `${item.city}, ${item.country}`
                        : item.country}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.isAnomaly ? (
                      <CustomBadge variant="warning" className="text-xs">
                        {tTable("anomalyYes")}
                      </CustomBadge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {tTable("anomalyNo")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTimeShort(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      iconRight={
                        <ChevronRight className="size-4" aria-hidden="true" />
                      }
                      onClick={() =>
                        router.push(`${ADMIN_LOGIN_HISTORY}/${item._id}`)
                      }
                    >
                      {tTable("viewDetail")}
                    </CustomButton>
                  </TableCell>
                </TableRow>
              ))
```

> The dropped columns (`userId`, `deviceType`, `browser`) are no longer rendered — their data still arrives in the list payload and is shown on the detail page. `tTable` keys for them remain in the locale (used by the detail page / user-side table); do not delete them.

- [ ] **Step 5: FE quality gate** (from the client worktree):

```bash
yarn format
yarn lint
yarn tsc
```

Expected: all pass. Fix any lint/tsc errors. Re-read + re-stage files auto-fixed by format/lint.

- [ ] **Step 6: Stage**

```bash
git add src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx
```

---

## E2E Task (`client/`) — expands the design.md Scenario Matrix. Read skill `e2e-scenario-coverage`.

### Task E2E-1: Author the Playwright suite + e2e.md

**Files:**
- Create: `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts`
- Create: `docs/specs/admin-login-history-detail/e2e.md`

**Harness facts:** `playwright.config.ts` runs the new folder under the **chromium** project (it ignores only `admin-apps/`), using `e2e/.auth/user.json` and depending on the `setup` project. Per the `admin-users-list` precedent, the suite must be run with the admin user (`E2E_USER_EMAIL=admin@test.com`) so the session is an admin. The admin login performed by `auth.setup.ts` records ≥1 `login_histories` row, so the list is non-empty.

**Scenario mapping (matrix → test):**
- Row 1 Happy + 8 Data render + deep-link: `admin opens list, clicks View, detail renders` + `deep-link to a detail URL renders`.
- Row 2 AuthN: `unauthenticated detail visit redirects to login` (empty storageState).
- Row 4 Validation: `invalid id shows not-found UI`.
- Row 10 Error/loading: `valid-but-missing id shows not-found UI` + `detail API failure shows not-found UI` (via `page.route` abort).
- Row 9 i18n: `vi locale renders translated action + detail labels`.
- Row 12 a11y: `View action is a button with an accessible name`.
- **Deferred (recorded, not silently dropped):**
  - Row 3 AuthZ (non-admin → blocked): the harness provides a single admin storageState; exercising a non-admin session needs a separate fixture. BE `adminGuard` covers this server-side. Defer to follow-up.
  - Row 5 Empty/null (null `userId` / failed-login record): requires a guaranteed seeded failed-login row; not guaranteed by the current seed. Defer to follow-up.

- [ ] **Step 1: Write the suite** `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts`:

```ts
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Read-only admin feature. Runs under the chromium project with the admin
// storageState (auth.setup with E2E_USER_EMAIL=admin@test.com), same precondition
// as admin-users-list. auth.setup's admin login seeds at least one login_histories
// row, so the list is non-empty. No data is mutated — no revert needed.

const DETAIL_RE = /\/admin\/login-history\/[a-f0-9]{24}/;

const openFirstDetail = async (page: Page) => {
  await page.goto("/admin/login-history");
  const viewButton = page.getByRole("button", { name: /view|xem/i }).first();
  await expect(viewButton).toBeVisible();
  await viewButton.click();
  await page.waitForURL(DETAIL_RE);
};

test.describe("Admin Login History — list + detail", () => {
  test("admin opens the list, clicks View, and the detail page renders", async ({
    page
  }) => {
    await openFirstDetail(page);
    // detail H1 (page title) is present
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    // a field label from the detail dl
    await expect(page.getByText("IP Address", { exact: true })).toBeVisible();
  });

  test("deep-linking directly to a detail URL renders the record", async ({
    page
  }) => {
    await openFirstDetail(page);
    const url = page.url();
    await page.goto("/admin/login-history"); // leave the page
    await page.goto(url); // deep-link back in fresh
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
  });

  test("the View action is a button with an accessible name", async ({
    page
  }) => {
    await page.goto("/admin/login-history");
    const viewButton = page.getByRole("button", { name: /view/i }).first();
    await expect(viewButton).toBeVisible();
  });

  test("an invalid id shows the not-found UI", async ({ page }) => {
    await page.goto("/admin/login-history/not-a-valid-id");
    await expect(
      page.getByText(/Login history record not found/i)
    ).toBeVisible();
  });

  test("a valid-but-missing id shows the not-found UI", async ({ page }) => {
    await page.goto("/admin/login-history/000000000000000000000000");
    await expect(
      page.getByText(/Login history record not found/i)
    ).toBeVisible();
  });

  test("a detail API failure shows the not-found UI", async ({ page }) => {
    await page.route("**/api/v1/admin/login-history/*", (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    await page.goto("/admin/login-history/000000000000000000000000");
    await expect(
      page.getByText(/Login history record not found/i)
    ).toBeVisible();
  });

  test("vi locale renders the translated action label and detail labels", async ({
    page
  }) => {
    await page.goto("/vi/admin/login-history");
    const viewButton = page.getByRole("button", { name: /xem/i }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForURL(/\/vi\/admin\/login-history\/[a-f0-9]{24}/);
    await expect(page.getByText("Địa chỉ IP", { exact: true })).toBeVisible();
  });
});

test.describe("Admin Login History — auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated visit to a detail URL redirects to login", async ({
    page
  }) => {
    await page.goto("/admin/login-history/000000000000000000000000");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: App-running self-check + run (§4.3).** Verify BE :5000, FE :3000 (or worktree dev `--port 3100` + `E2E_BASE_URL` per the worktree dev-server note), Mongo, Redis are up and seeded. If not running, ask the user: (a) they start it, or (b) you start the missing pieces in the background (teardown only what you started). Then run from the client worktree:

```bash
E2E_USER_EMAIL=admin@test.com yarn e2e admin-login-history
```

Expected: all non-deferred tests green.

- [ ] **Step 3: Write `docs/specs/admin-login-history-detail/e2e.md`** — record final scenarios, the test↔matrix mapping, and the two deferred rows (AuthZ, Empty/null) with their reasons so the gap is explicit (no silent truncation).

- [ ] **Step 4: Stage** (client worktree for the test; docs worktree for e2e.md)

```bash
# in client worktree:
git add client/e2e/admin-login-history/admin-login-history-detail.e2e.ts
# in docs worktree:
git add specs/admin-login-history-detail/e2e.md
```

---

## Task R: Consolidated review + commit (commit gate)

After ALL tasks above are implemented and staged, and the FE/BE quality gates + E2E are green:

- [ ] **Step 1:** Present the full diff per repo (server, client, docs) to the user for a single overall review (project §7).
- [ ] **Step 2:** On approval, commit per repo with Conventional Commit messages, e.g.:
  - server: `feat(login-history): add admin login-history detail endpoint`
  - client: `feat(admin-login-history): trim table columns and add detail page`
  - docs: `docs(admin-login-history-detail): add e2e scenarios`
- [ ] **Step 3:** Proceed to `superpowers:requesting-code-review` (per-side), then `security-auditor` if warranted, then `superpowers:finishing-a-development-branch` → `creating-github-pr` (one PR per touched repo).

---

## Self-Review (against design.md)

- **Spec coverage:** Table trim (FE-6) ✓ · Action column (FE-6) ✓ · Detail page (FE-4/FE-5) ✓ · Detail API (BE-3..BE-7) ✓ · API contract no-drift (FE-1 type alias) ✓ · Swagger skipped per design ✓ · E2E matrix expansion (E2E-1) ✓.
- **Placeholder scan:** No TBD/TODO; every code step shows full code.
- **Type consistency:** `HistoryDetailItemDto` (BE) ↔ `LoginHistoryAdminDetailItem` (FE) identical field set; `getLoginHistoryDetail`/`getAdminLoginHistoryDetail`/`useAdminLoginHistoryDetail`/`ADMIN_LOGIN_HISTORY_DETAIL`/`loginHistoryIdParamSchema`/`LOGIN_HISTORY_NOT_FOUND` names used consistently across tasks.
- **Deferrals recorded:** AuthZ + Empty/null E2E rows deferred with reasons in E2E-1 and e2e.md (not silent).
```
