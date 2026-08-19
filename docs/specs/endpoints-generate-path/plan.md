# Static endpoints + `generatePath` util — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi API endpoint là chuỗi tĩnh với placeholder `:param`; một util `generatePath` (kiểu react-router) chịu trách nhiệm thay tham số.

**Architecture:** Thêm `generatePath` vào `src/utils/index.ts`; đổi 2 function endpoint + chuẩn hoá 6 chỗ nối chuỗi inline thành endpoint placeholder khai báo sẵn trong `src/constants/endpoints.ts`; cập nhật call site trong `src/requests/*`.

**Tech Stack:** TypeScript 5, Next.js 15. FE **không có** unit test runner (jest/vitest) — verify bằng `yarn lint` + `yarn build` (next build type-check) + sanity check node.

## Global Constraints

- URL gửi lên BE phải **byte-identical** với hiện tại (refactor thuần, không đổi behavior).
- Endpoint/path luôn qua `CONSTANTS.END_POINTS` — không hard-code (client CLAUDE.md §Core Patterns).
- `:param` syntax giống react-router; params `string | number`; encode từng giá trị; throw khi thiếu param.
- Chạy 3 check sau khi đổi code: `yarn format`, `yarn lint`, `npx tsc --noEmit` (hoặc `yarn build`).

---

### Task 1: Util `generatePath`

**Files:**
- Modify: `client/src/utils/index.ts` (thêm export)

**Interfaces:**
- Produces: `export const generatePath = (template: string, params?: Record<string, string | number>) => string`

- [ ] **Step 1: Thêm hàm vào cuối `src/utils/index.ts`**

```ts
export const generatePath = (
  template: string,
  params: Record<string, string | number> = {}
): string =>
  template.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`generatePath: missing param "${key}" for "${template}"`);
    }
    return encodeURIComponent(String(value));
  });
```

- [ ] **Step 2: Sanity check nhanh (throwaway, không commit)**

Run (từ `client/`):
```bash
node -e "const t='/posts/:id/comments/:commentId'; const f=(template,params={})=>template.replace(/:([A-Za-z0-9_]+)/g,(_,k)=>{const v=params[k]; if(v==null) throw new Error('missing '+k); return encodeURIComponent(String(v));}); console.log(f(t,{id:123,commentId:456}))"
```
Expected: `/posts/123/comments/456`

---

### Task 2: Đổi `END_POINTS` sang chuỗi tĩnh + cập nhật mọi call site

Gộp chung 1 task vì đổi endpoint sẽ break call site cho tới khi update xong (build phải xanh ở cuối task).

**Files:**
- Modify: `client/src/constants/endpoints.ts`
- Modify: `client/src/requests/favorites.ts`
- Modify: `client/src/requests/notification.ts`
- Modify: `client/src/requests/user.ts`
- Modify: `client/src/requests/signup.ts`
- Modify: `client/src/requests/adminApps.ts`
- Modify: `client/src/requests/loginHistory.ts`
- Modify: `client/src/requests/contactAdmin.ts`

**Interfaces:**
- Consumes: `generatePath` từ `@/utils` (Task 1)
- Produces: `END_POINTS` keys mới — `FAVORITE_BY_APP_ID`, `USER_BY_ID`, `ADMIN_APP_BY_ID`, `ADMIN_CONTACT_BY_ID`, `ADMIN_CONTACT_STATUS`, `ADMIN_LOGIN_HISTORY_BY_ID`; sửa `NOTIFICATION_READ`, `AUTH_SIGNUP_CHECK_EMAIL` thành chuỗi placeholder; xoá `FAVORITE_TOGGLE`, `USERS_BY_ID`.

- [ ] **Step 1: Sửa `endpoints.ts`**

```ts
  // Users
  USERS_ME: "/users/me",
  USER_BY_ID: "/users/:id",
  ...
  AUTH_SIGNUP_CHECK_EMAIL: "/auth/signup/check-email/:email",
  ...
  ADMIN_APPS: "/admin/apps",
  ADMIN_APP_BY_ID: "/admin/apps/:id",
  ...
  ADMIN_CONTACTS: "/admin/contacts",
  ADMIN_CONTACT_BY_ID: "/admin/contacts/:id",
  ADMIN_CONTACT_STATUS: "/admin/contacts/:id/status",
  ...
  ADMIN_LOGIN_HISTORY: "/admin/login-history",
  ADMIN_LOGIN_HISTORY_BY_ID: "/admin/login-history/:id",
  ...
  FAVORITES: "/users/me/favorites",
  FAVORITE_BY_APP_ID: "/users/me/favorites/:appId",
  ...
  NOTIFICATION_READ: "/notifications/:id/read"
```
(Giữ nguyên các key khác. Xoá `FAVORITE_TOGGLE` và `USERS_BY_ID`.)

- [ ] **Step 2: Cập nhật call site** — import `generatePath` từ `@/utils` ở mỗi file, thay:
  - `favorites.ts`: `END_POINTS.FAVORITE_TOGGLE(appId)` → `generatePath(END_POINTS.FAVORITE_BY_APP_ID, { appId })` (x2)
  - `notification.ts`: `END_POINTS.NOTIFICATION_READ(id)` → `generatePath(END_POINTS.NOTIFICATION_READ, { id })`
  - `user.ts`: `` `${END_POINTS.USERS_BY_ID}/${id}` `` → `generatePath(END_POINTS.USER_BY_ID, { id })`
  - `signup.ts`: `` `${END_POINTS.AUTH_SIGNUP_CHECK_EMAIL}/${encodeURIComponent(email)}` `` → `generatePath(END_POINTS.AUTH_SIGNUP_CHECK_EMAIL, { email })`
  - `adminApps.ts`: `` `${END_POINTS.ADMIN_APPS}/${id}` `` → `generatePath(END_POINTS.ADMIN_APP_BY_ID, { id })` (x2)
  - `loginHistory.ts`: `` `${END_POINTS.ADMIN_LOGIN_HISTORY}/${id}` `` → `generatePath(END_POINTS.ADMIN_LOGIN_HISTORY_BY_ID, { id })`
  - `contactAdmin.ts`: `` `${END_POINTS.ADMIN_CONTACTS}/${id}` `` → `generatePath(END_POINTS.ADMIN_CONTACT_BY_ID, { id })`; `` `${END_POINTS.ADMIN_CONTACTS}/${id}/status` `` → `generatePath(END_POINTS.ADMIN_CONTACT_STATUS, { id })`

- [ ] **Step 3: Verify không còn sót** — grep phải trống:

```bash
grep -rn "FAVORITE_TOGGLE\|USERS_BY_ID\|\${END_POINTS" client/src
```
Expected: 0 dòng.

---

### Task 3: Green-checks gate

- [ ] **Step 1:** `cd client && yarn format`
- [ ] **Step 2:** `cd client && yarn lint` → 0 error
- [ ] **Step 3:** `cd client && yarn build` → build pass (type-check xanh)
- [ ] **Step 4:** Commit (sau khi user duyệt diff — §7 commit gate)

## Self-Review

- **Spec coverage:** Task 1 = util; Task 2 = endpoints + call site (đủ 7 file requests + 8 vị trí); Task 3 = green checks. Khớp design §1–3.
- **Placeholder scan:** không có TBD/TODO.
- **Type consistency:** tên key mới dùng nhất quán giữa endpoints.ts và call site.
