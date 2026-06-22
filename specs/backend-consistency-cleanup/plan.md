# Backend Consistency Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) hoặc superpowers:executing-plans để chạy plan task-by-task. Steps dùng
> checkbox (`- [ ]`).

**Goal:** Dọn nhất quán backend `server/src/**` theo `feedback.md` §backend — gom hằng/enum
dùng chung, dependency-inversion mailer, bỏ magic string/hardcode, đồng nhất naming/loader,
quét comment & validation thừa. **Mọi thay đổi giữ nguyên behavior.**

**Architecture:** Tạo lớp shared `src/common/pagination` + `src/common/sort` làm nguồn duy
nhất; các module tiêu thụ thay cho hằng/logic rải rác. Email service thêm interface `Mailer`
để consumer phụ thuộc abstraction. Còn lại là rename/destructure/sweep thuần.

**Tech Stack:** Node.js + TypeScript, Express, Mongoose, Joi, Jest. Path alias `@/` → `src/`.

**Worktree:** `server/.worktrees/backend-consistency-cleanup` (branch
`refactor/backend-consistency-cleanup`). Spec ở `docs/.worktrees/backend-consistency-cleanup`.

**Commit mode:** User đã opt-out commit-review gate → commit per-task (Review OFF), continuous.

**Pre-req mỗi task code:** đọc `server/.claude/CLAUDE.md` + skill liên quan
(`standard-typescript`, `module-struct`). Sau mỗi task chạy `yarn type-check` (xanh mới commit).
Lệnh chạy trong worktree cần `node_modules` (junction tới main — xem Task 0).

---

## Task 0: Chuẩn bị môi trường worktree

**Files:** none (setup).

- [ ] **Step 1: Tạo junction node_modules cho server worktree** (worktree mới không có
  node_modules; junction tới main để chạy lint/type-check/test/build — xem memory
  `reference_worktree_node_modules_junction`).

Run (PowerShell, từ root):
```powershell
cmd /c mklink /J "server\.worktrees\backend-consistency-cleanup\node_modules" "server\node_modules"
```
Nếu main `server/node_modules` khuyết package → `cd server && yarn install` trước.

- [ ] **Step 2: Verify baseline xanh trong worktree**

Run:
```bash
cd server/.worktrees/backend-consistency-cleanup
yarn type-check
npx jest --testMatch "**/?(*.)+(spec).ts"
```
Expected: type-check PASS; jest PASS (dùng `--testMatch` vì glob `<rootDir>` hỏng trong
worktree — memory `reference_jest_worktree_testmatch`). Nếu baseline đỏ → báo user trước khi
tiếp.

---

## Task 1: Shared pagination constants (B-1)

**Files:**
- Create: `src/common/pagination/index.ts`
- Modify: `src/modules/web-app/constants/index.ts` (thêm `WEB_APP_PAGINATION`)
- Modify: `src/modules/web-app/web-app.service.ts:44-46,65-66`
- Modify: `src/modules/contact-admin/contact-admin.service.ts:32-34`
- Modify: `src/modules/login-history/login-history.service.ts:50-52`
- Modify: `src/modules/user/user.service.ts:26-28`
- Modify: `src/modules/notification/constants/index.ts:16-20` + `notification.service.ts`

- [ ] **Step 1: Tạo hằng pagination chung**

Create `src/common/pagination/index.ts`:
```ts
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

export type PaginationDefaults = typeof PAGINATION;
```

- [ ] **Step 2: web-app override (giữ limit 12)**

Trong `src/modules/web-app/constants/index.ts` thêm (import `PAGINATION` ở đầu file):
```ts
import { PAGINATION } from "@/common/pagination";

export const WEB_APP_PAGINATION = {
  ...PAGINATION,
  DEFAULT_LIMIT: 12
} as const;
```

- [ ] **Step 3: web-app.service dùng override**

`web-app.service.ts`: xoá `const DEFAULT_PAGE/DEFAULT_LIMIT/MAX_LIMIT` (dòng 44-46). Import
`WEB_APP_PAGINATION` từ `./constants`. Trong `listUserApps` dùng:
```ts
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = WEB_APP_PAGINATION;
const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
```

- [ ] **Step 4: 3 service còn lại dùng PAGINATION chung**

Ở `contact-admin.service.ts`, `login-history.service.ts`, `user.service.ts`: xoá block
`const DEFAULT_PAGE = 1; const DEFAULT_LIMIT = 20; const MAX_LIMIT = 100;`, thay bằng:
```ts
import { PAGINATION } from "@/common/pagination";
// ... trong hàm list:
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
```
(Giữ nguyên cách dùng các biến này bên dưới — chỉ đổi nguồn.)

- [ ] **Step 5: notification dùng PAGINATION chung**

`notification/constants/index.ts`: xoá block `NOTIFICATION_PAGINATION` (dòng 16-20).
`notification.service.ts`: đổi import `NOTIFICATION_PAGINATION` → `PAGINATION` từ
`@/common/pagination`, và destructure `const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } =
PAGINATION;` (giá trị giống hệt 20/100 → không đổi behavior).

- [ ] **Step 6: Verify + commit**

Run: `yarn type-check` → PASS.
```bash
git add -A && git commit -m "refactor(common): centralize pagination defaults, web-app keeps 12 via override"
```

---

## Task 2: Shared sort util + enum (B-2)

**Files:**
- Create: `src/common/sort/index.ts`
- Create: `src/common/sort/index.spec.ts`
- Modify: services dùng `=== "asc" ? 1 : -1` — `user.service.ts:~136`,
  `contact-admin.service.ts:~82`, `login-history.service.ts:~112,~163`
- Modify: validators `user.ts:99`, `notification.ts`, `login-history.ts`, `contact-admin.ts`
  (dùng `SORT_ORDER_VALUES` chung)

- [ ] **Step 1: Tạo sort util + enum**

Create `src/common/sort/index.ts`:
```ts
export const SORT_ORDERS = {
  ASC: "asc",
  DESC: "desc"
} as const;

export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];

export const SORT_ORDER_VALUES = Object.values(SORT_ORDERS);

export const resolveSortDirection = (order?: SortOrder): 1 | -1 =>
  order === SORT_ORDERS.ASC ? 1 : -1;

export const buildSort = (
  field: string,
  order?: SortOrder
): Record<string, 1 | -1> => ({ [field]: resolveSortDirection(order) });
```

- [ ] **Step 2: Unit test cho util**

Create `src/common/sort/index.spec.ts`:
```ts
import { resolveSortDirection, buildSort, SORT_ORDERS } from "./index";

describe("sort util", () => {
  it("resolves asc to 1", () => {
    expect(resolveSortDirection(SORT_ORDERS.ASC)).toBe(1);
  });
  it("resolves desc to -1", () => {
    expect(resolveSortDirection(SORT_ORDERS.DESC)).toBe(-1);
  });
  it("defaults undefined to -1 (desc)", () => {
    expect(resolveSortDirection(undefined)).toBe(-1);
  });
  it("buildSort builds a mongo sort object", () => {
    expect(buildSort("createdAt", SORT_ORDERS.ASC)).toEqual({ createdAt: 1 });
    expect(buildSort("createdAt")).toEqual({ createdAt: -1 });
  });
});
```

- [ ] **Step 3: Run test (đỏ → xanh)**

Run: `npx jest src/common/sort/index.spec.ts` → PASS (util đã viết ở Step 1).

- [ ] **Step 4: Thay logic lặp trong services**

Ở mỗi service có `const sortOrder = rawSortOrder === "asc" ? 1 : -1;` (hoặc tương đương),
import `resolveSortDirection` từ `@/common/sort` và thay bằng
`const sortDirection = resolveSortDirection(rawSortOrder);`. Giữ nguyên biến `sortBy` và cách
build `{ [sortBy]: sortDirection }` (hoặc dùng `buildSort(sortBy, rawSortOrder)` nếu gọn hơn).
**Behavior bất biến**: default vẫn `desc`.

- [ ] **Step 5: Validators dùng SORT_ORDER_VALUES chung**

Ở `user.ts:99`, `notification.ts`, `login-history.ts`, `contact-admin.ts`: xoá khai báo cục bộ
`const SORT_ORDER_VALUES = ["asc", "desc"] as const;`, import `SORT_ORDER_VALUES` từ
`@/common/sort`. Giữ nguyên `Joi.string().valid(...SORT_ORDER_VALUES)`.
> Lưu ý: `user/swagger/paths.ts` cũng tham chiếu — nếu nó dùng giá trị literal cho doc thì
> giữ nguyên (swagger doc, không phải runtime).

- [ ] **Step 6: Verify + commit**

Run: `yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts"` → PASS.
```bash
git add -A && git commit -m "refactor(common): shared sort enum + resolveSortDirection/buildSort util"
```

---

## Task 3: Bind union types còn sót về const (B-3)

**Files:**
- Modify: `src/modules/user/types/index.ts:83,91,92` (+ const cho status filter & sortBy)
- Modify: `src/modules/contact-admin/types/index.ts:42`
- Modify: `src/modules/login-history/types/index.ts:30,31`
- Modify (nếu cần const dùng chung field): validators tương ứng export const arrays

- [ ] **Step 1: AdminUserStatusFilter derive từ const**

Trong `user/constants/index.ts` thêm:
```ts
export const ADMIN_USER_STATUS_FILTERS = {
  ACTIVE: "active",
  LOCKED: "locked"
} as const;
```
Trong `user/types/index.ts` đổi:
```ts
import { ADMIN_USER_STATUS_FILTERS } from "@/modules/user/constants";
export type AdminUserStatusFilter =
  (typeof ADMIN_USER_STATUS_FILTERS)[keyof typeof ADMIN_USER_STATUS_FILTERS];
```
Validator `user.ts:97` `STATUS_FILTER_VALUES` → `Object.values(ADMIN_USER_STATUS_FILTERS)`.

- [ ] **Step 2: sortOrder dùng SortOrder chung**

Mọi `sortOrder?: "asc" | "desc"` trong các `types/index.ts` (user:92, login-history:31,
contact-admin nếu có) → `sortOrder?: SortOrder;` (import từ `@/common/sort`).

- [ ] **Step 3: sortBy derive từ const array của validator**

Với mỗi module có `sortBy?: "a" | "b" | "c"` inline (user:91, contact-admin:42,
login-history:30): export const array tương ứng từ validator (vd
`export const ADMIN_USERS_SORT_BY = [...] as const;` đã có ở `user.ts:98` — đổi thành export)
và derive type ở `types/index.ts`:
```ts
import { ADMIN_USERS_SORT_BY } from "@/validators/schemas/user";
export type AdminUsersSortBy = (typeof ADMIN_USERS_SORT_BY)[number];
// rồi: sortBy?: AdminUsersSortBy;
```
> Nếu import từ validator vào types tạo vòng phụ thuộc → đặt const array vào
> `module/constants/index.ts` thay vì validator, cả validator lẫn types cùng import từ đó.
> Ưu tiên cách đặt ở `constants` để tránh cycle.

- [ ] **Step 4: Verify + commit**

Run: `yarn type-check` → PASS (type derive đúng, không literal lệch).
```bash
git add -A && git commit -m "refactor(types): derive sort & admin-user-status unions from const (single source)"
```

---

## Task 4: Bỏ hardcode filter active trong listUserApps (B-4)

**Files:**
- Modify: `src/modules/web-app/web-app.service.ts:67-71`

- [ ] **Step 1: Thay magic string bằng hằng**

Import `WEB_APP_STATUS_PUBLIC` từ `./constants`. Đổi:
```ts
const filter = buildWebAppFilter({
  search: query.search,
  status: WEB_APP_STATUS_PUBLIC.ACTIVE,
  categoryId: query.categoryId
});
```
(`buildWebAppFilter` nhận public status "active"/"inactive" rồi map qua `PUBLIC_TO_STATUS` —
hành vi không đổi, chỉ bỏ literal `"active"`.)

- [ ] **Step 2: Verify + commit**

Run: `yarn type-check` → PASS.
```bash
git add -A && git commit -m "refactor(web-app): use WEB_APP_STATUS_PUBLIC.ACTIVE instead of magic string"
```

---

## Task 5: Favorite sort dùng const (B-5)

**Files:**
- Modify: `src/modules/favorite/constants` (tạo nếu chưa có) + `favorite.service.ts:46`
- Modify: `src/validators/schemas/favorite.ts:28`

- [ ] **Step 1: Const cho favorite sort**

Tạo/ thêm trong `src/modules/favorite/constants/index.ts`:
```ts
export const FAVORITE_SORTS = {
  RECENT: "recent",
  NAME: "name"
} as const;

export type FavoriteSort =
  (typeof FAVORITE_SORTS)[keyof typeof FAVORITE_SORTS];
```

- [ ] **Step 2: Service + validator dùng const**

`favorite.service.ts:46`: `if (query.sort === FAVORITE_SORTS.NAME) {` (import const).
`favorite.ts:28` validator: `Joi.string().valid(...Object.values(FAVORITE_SORTS))`.
`favorite/types` (`ListFavoritesQuery.sort`) → `sort?: FavoriteSort;`.

- [ ] **Step 3: Verify + commit**

Run: `yarn type-check` → PASS.
```bash
git add -A && git commit -m "refactor(favorite): derive favorite sort values from const"
```

---

## Task 6: Email Dependency Inversion — interface Mailer (B-6)

**Files:**
- Modify: `src/types/services/email.ts` (thêm interface `Mailer`)
- Modify: `src/services/email/email.service.ts` (`implements Mailer`)
- Modify: `src/services/email/email.dispatcher.ts` (consume `Mailer` thay `SendEmailService`)

- [ ] **Step 1: Định nghĩa interface Mailer**

Cuối `src/types/services/email.ts` thêm:
```ts
export interface Mailer {
  send<T extends EmailType>(type: T, options: SendEmailOptions<T>): void;
  executeSend(
    type: EmailType,
    options: { email: string; data: Record<string, unknown>; locale?: string }
  ): Promise<void>;
}
```

- [ ] **Step 2: SendEmailService implements Mailer**

`email.service.ts`: import `type { Mailer }` từ `@/types/services/email`; đổi
`export class SendEmailService implements Mailer {`. (Signatures `send`/`executeSend` đã khớp.)

- [ ] **Step 3: EmailDispatcher phụ thuộc Mailer**

`email.dispatcher.ts`: đổi import `import type { SendEmailService }` → `import type { Mailer }`
từ `@/types/services/email`; constructor param `private readonly emailService: Mailer`.
(`emailService.send(...)` vẫn hợp lệ qua interface.)

- [ ] **Step 4: Verify + commit**

Run: `yarn type-check` → PASS (loaders truyền `SendEmailService` instance vẫn thoả `Mailer`).
```bash
git add -A && git commit -m "refactor(email): introduce Mailer interface, depend on abstraction"
```

---

## Task 7: Refactor loader notification destructure (B-7)

**Files:**
- Modify: `src/loaders/modules.loader.ts:149,166`

- [ ] **Step 1: Destructure inline như module khác**

Đổi dòng 149:
```ts
const { notificationService, notificationUserRouter } =
  createNotificationModule();
```
Và mọi tham chiếu `notificationModule.notificationUserRouter` (dòng 166) →
`notificationUserRouter`. Nếu `notificationService` được dùng nơi khác trong loader, tham
chiếu trực tiếp biến đã destructure.

- [ ] **Step 2: Verify + commit**

Run: `yarn type-check` → PASS.
```bash
git add -A && git commit -m "refactor(loader): destructure notification module inline for consistency"
```

---

## Task 8: Rename contactAdminQueryAdminRouter → adminContactsRouter (B-8)

**Files:**
- Modify: `src/modules/contact-admin/contact-admin.routes.ts` (factory name)
- Modify: `src/modules/contact-admin/contact-admin.module.ts:9,21`
- Modify: `src/loaders/modules.loader.ts:144,169`

- [ ] **Step 1: Rename factory**

`contact-admin.routes.ts`: `createContactAdminRoutes` → `createAdminContactsRoutes` (giữ nội
dung, route path `/admin/contacts` không đổi).

- [ ] **Step 2: Rename export trong module**

`contact-admin.module.ts`: import `createAdminContactsRoutes`; đổi key trả về
`contactAdminQueryAdminRouter` → `adminContactsRouter`:
```ts
return {
  contactAdminRouter: createContactRoutes(controller, rateLimiter),
  adminContactsRouter: createAdminContactsRoutes(controller)
};
```

- [ ] **Step 3: Cập nhật loader**

`modules.loader.ts:144`: `const { contactAdminRouter, adminContactsRouter } = ...`; dòng 169:
`contactAdmin: adminContactsRouter,`.

- [ ] **Step 4: Grep sót + verify + commit**

Run:
```bash
grep -rn "contactAdminQueryAdminRouter\|createContactAdminRoutes" src && echo "STILL PRESENT" || echo "clean"
yarn type-check
```
Expected: "clean" + type-check PASS.
```bash
git add -A && git commit -m "refactor(contact-admin): rename router to adminContactsRouter"
```

---

## Task 9: Bỏ stripUnknown thừa ở schema (B-9)

**Files:**
- Modify: 6 file trong `src/validators/schemas/` (contact-admin, favorite, login-history,
  notification, user, web-app)

- [ ] **Step 1: Xác nhận pipe đã global (đã verify)**

`validation.pipe.ts:13-16` set `stripUnknown: true` cho mọi body/params/query; không schema
nào `.validate()` trực tiếp ngoài pipe (đã grep). → an toàn xoá.

- [ ] **Step 2: Xoá `.options({ stripUnknown: true })`**

Trong 6 file schema, bỏ `.options({ stripUnknown: true })` ở cuối các schema. Nếu chuỗi
`.options(...)` chứa cả option khác (vd `.options({ stripUnknown: true, convert: ... })`) thì
chỉ xoá key `stripUnknown`, giữ phần còn lại.

- [ ] **Step 3: Verify + commit**

Run:
```bash
grep -rn "stripUnknown" src/validators/schemas && echo "STILL PRESENT" || echo "clean"
yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts"
```
Expected: "clean" + PASS.
```bash
git add -A && git commit -m "refactor(validators): drop redundant per-schema stripUnknown (pipe handles it)"
```

---

## Task 10: Quét comment "what" + return-shorthand (B-10)

**Files:** toàn bộ `src/**` (sweep — làm cuối, review riêng).

- [ ] **Step 1: Rà comment "what"**

Run: `grep -rn "//" src --include=*.ts | grep -v ".spec.ts"` → duyệt từng comment:
- Comment chỉ lặp lại code (vd `// increment counter`, `// loop users`) → xoá.
- Comment giải thích ý đồ/edge-case/why (vd circuit-breaker, role-scoping web-app) → **GIỮ**.
- Comment kiểu section header (`// types`, `// libs`, `// others`) là convention import của
  dự án → **GIỮ**.

- [ ] **Step 2: Return-shorthand**

Tìm arrow function `=> { return X; }` đơn giản → đổi `=> X` khi rõ ràng (không ép nếu giảm độ
đọc, không đụng function có nhiều statement).

- [ ] **Step 3: Verify + commit**

Run: `yarn lint && yarn type-check` → PASS (lint bắt unused/format sau khi xoá comment).
```bash
git add -A && git commit -m "chore: remove what-comments, prefer return shorthand where clear"
```

---

## Task 11: Green gate + CLAUDE.md drift audit (§4.6, §4.7)

**Files:** có thể `server/.claude/CLAUDE.md` (nếu struct/convention đổi).

- [ ] **Step 1: Full green gate**

Run trong worktree:
```bash
yarn lint && yarn type-check && npx jest --testMatch "**/?(*.)+(spec).ts" && yarn build
```
Expected: tất cả PASS. Fail → systematic-debugging, fix, chạy lại.

- [ ] **Step 2: CLAUDE.md drift audit**

Dùng skill `claude-md-management:claude-md-improver` cho `server/.claude/CLAUDE.md`: đã thêm
`src/common/pagination/`, `src/common/sort/` → nếu CLAUDE.md/rules mô tả struct `src/common`,
cập nhật. Non-blocking; thay đổi đi kèm PR server.

- [ ] **Step 3: Commit audit (nếu có)**
```bash
git add -A && git commit -m "docs(server): update CLAUDE.md for new src/common modules"
```

---

## Self-Review (đã chạy)

- **Spec coverage:** B-1→Task1, B-2→Task2, B-3→Task3, B-4→Task4, B-5→Task5, B-6→Task6,
  B-7→Task7, B-8→Task8, B-9→Task9, B-10→Task10. Phần A (Q&A) là tài liệu, không sinh task. ✅
- **Placeholder scan:** không TBD/TODO; new file có full code; edit có before/after cụ thể. ✅
- **Type consistency:** `SortOrder`, `SORT_ORDERS`, `resolveSortDirection`, `buildSort`,
  `PAGINATION`, `WEB_APP_PAGINATION`, `ADMIN_USER_STATUS_FILTERS`, `FAVORITE_SORTS`, `Mailer`,
  `adminContactsRouter`/`createAdminContactsRoutes` dùng nhất quán xuyên task. ✅
- **Cycle guard:** Task 3 ghi rõ đặt const array ở `constants/` nếu import valid↔types gây
  cycle. ✅
