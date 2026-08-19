# Design — Static endpoints + `generatePath` util

## Bối cảnh / Vấn đề

`client/src/constants/endpoints.ts` đang trộn 2 kiểu khai báo endpoint động:

1. **Function endpoint** (2 chỗ): `FAVORITE_TOGGLE: (appId) => ...`, `NOTIFICATION_READ: (id) => ...` — endpoint không còn là dữ liệu tĩnh, khó tra cứu/đọc, không thống nhất với phần còn lại.
2. **Nối chuỗi inline** trong `src/requests/*` (6 chỗ): `` `${END_POINTS.ADMIN_APPS}/${id}` ``, `` `${END_POINTS.ADMIN_CONTACTS}/${id}/status` ``, `` `${END_POINTS.AUTH_SIGNUP_CHECK_EMAIL}/${encodeURIComponent(email)}` ``, v.v. — path động bị build rải rác, bỏ qua hằng số.

Mục tiêu: **mọi endpoint là chuỗi tĩnh** với placeholder `:param` (kiểu react-router), và một util `generatePath` duy nhất chịu trách nhiệm thay tham số.

## Giải pháp

### 1. Util `generatePath` (`client/src/utils/index.ts`)

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

- Cú pháp `:param` giống react-router; `generatePath("/posts/:id/comments/:commentId", { id: 123, commentId: 456 })` → `/posts/123/comments/456`.
- Params nhận `string | number`.
- **Throw** khi thiếu param (fail-fast giống react-router) — tránh sinh path `/.../undefined`.
- **encodeURIComponent từng giá trị**: khớp react-router + bảo toàn hành vi encode hiện tại của signup `check-email`. Với ObjectId (hex) / number thì không có ký tự đặc biệt nên vô hại.

### 2. `END_POINTS` — chuyển sang chuỗi tĩnh

**Quy tắc**: base endpoint còn dùng standalone → **giữ base + thêm** endpoint placeholder; base chỉ dùng để nối path động → **thay thế**.

| Hiện tại | Sau |
|---|---|
| `FAVORITE_TOGGLE: (appId) => ...` | thay → `FAVORITE_BY_APP_ID: "/users/me/favorites/:appId"` |
| `NOTIFICATION_READ: (id) => ...` | thay → `NOTIFICATION_READ: "/notifications/:id/read"` |
| `USERS_BY_ID: "/users"` (chỉ nối) | thay → `USER_BY_ID: "/users/:id"` |
| `AUTH_SIGNUP_CHECK_EMAIL: "/auth/signup/check-email"` (chỉ nối) | thay → `AUTH_SIGNUP_CHECK_EMAIL: "/auth/signup/check-email/:email"` |
| `ADMIN_APPS` (còn standalone) | giữ + thêm `ADMIN_APP_BY_ID: "/admin/apps/:id"` |
| `ADMIN_CONTACTS` (còn standalone) | giữ + thêm `ADMIN_CONTACT_BY_ID: "/admin/contacts/:id"` + `ADMIN_CONTACT_STATUS: "/admin/contacts/:id/status"` |
| `ADMIN_LOGIN_HISTORY` (còn standalone) | giữ + thêm `ADMIN_LOGIN_HISTORY_BY_ID: "/admin/login-history/:id"` |

### 3. Cập nhật `src/requests/*` dùng `generatePath`

| File | Trước | Sau |
|---|---|---|
| `favorites.ts` | `END_POINTS.FAVORITE_TOGGLE(appId)` (x2) | `generatePath(END_POINTS.FAVORITE_BY_APP_ID, { appId })` |
| `notification.ts` | `END_POINTS.NOTIFICATION_READ(id)` | `generatePath(END_POINTS.NOTIFICATION_READ, { id })` |
| `user.ts` | `` `${END_POINTS.USERS_BY_ID}/${id}` `` | `generatePath(END_POINTS.USER_BY_ID, { id })` |
| `signup.ts` | `` `${END_POINTS.AUTH_SIGNUP_CHECK_EMAIL}/${encodeURIComponent(email)}` `` | `generatePath(END_POINTS.AUTH_SIGNUP_CHECK_EMAIL, { email })` |
| `adminApps.ts` | `` `${END_POINTS.ADMIN_APPS}/${id}` `` (x2) | `generatePath(END_POINTS.ADMIN_APP_BY_ID, { id })` |
| `loginHistory.ts` | `` `${END_POINTS.ADMIN_LOGIN_HISTORY}/${id}` `` | `generatePath(END_POINTS.ADMIN_LOGIN_HISTORY_BY_ID, { id })` |
| `contactAdmin.ts` | `` `${END_POINTS.ADMIN_CONTACTS}/${id}` `` + `` `${...}/${id}/status` `` | `generatePath(END_POINTS.ADMIN_CONTACT_BY_ID, { id })` + `generatePath(END_POINTS.ADMIN_CONTACT_STATUS, { id })` |

## Phạm vi & rủi ro

- **Không đổi URL gửi lên BE** — path sinh ra byte-identical với hiện tại → refactor thuần, không đổi behavior người dùng.
- **E2E (§4.3)**: SKIP — không có outcome người dùng mới để assert.
- **Pencil (§1.5)**: SKIP — không đụng UI.
- **Green-checks gate (§4.7)**: `cd client && yarn lint && yarn build` phải xanh.
- **Security review (§4.5)**: SKIP — không mở rộng bề mặt tấn công (encodeURIComponent giữ nguyên/tăng độ an toàn).
- **CLAUDE.md drift (§4.6)**: không đổi command/struct/deps → không cần audit.

## Repos đụng tới

- `client/` — code (util + constants + requests)
- `docs/` — spec này
