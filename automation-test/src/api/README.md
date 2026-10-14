# api/

**Trả lời câu hỏi:** gọi backend thế nào (không qua UI)?

```
api/
├── base.client.ts      createBaseClient: call(method, path) ghép API prefix của client; Session, bearerHeaders, newContext
├── response.ts         đọc envelope chung: dataOf, errorOf, sessionOf (response login → Session), setCookie(s)
├── session.ts          apiAs(email, password) → request context mang Bearer token (cho beforeAll / tài khoản riêng);
│                       loginOverApi (status + token + cookie refresh), bearerContext, refreshStatus, loginInBrowser
├── index.ts            createApiClient: gộp client theo namespace
├── web-app.client.ts   GET /apps (catalogue của user) — CatalogApp, CatalogPage
├── category.client.ts  GET /apps/categories (công khai) — CatalogCategory
├── admin-categories.client.ts  /admin/categories (list, create, update, move, deleteImpact, remove) — AdminCategory, DeleteImpact
├── recent-app.client.ts  /users/me/recent-apps (list, record, hide, restore, clear, stats) — RecentAppItem, RecentAppsPage
├── favorite.client.ts  /users/me/favorites (list, add, remove)
├── login-history.client.ts  /login-history (list, stats) — LoginStats, loginStatsRoute; admin router ở admin-login-history.client.ts
├── user.client.ts      /users/me (GET, PATCH), /users/:id (hồ sơ công khai) — MyProfile, PublicProfile
├── contact.client.ts   POST /contact/submit (public), /contacts(/:id) của chính user — SubmittedContact, MyContactItem;
│                       contactRoutes (regex cho page.route), submittedOf; /admin/contacts* (adminList, adminGet,
│                       adminUpdateStatus) — AdminContactItem, AdminContactDetail
├── ops.client.ts       /health/*, /api-docs*, /admin/queues, preflight CORS — trên API origin (API_URL), context riêng,
│                       không API prefix; fixture `ops`, không có namespace trong index.ts
├── oauth.client.ts     /oauth/* + /.well-known/* ở gốc origin (không API_PREFIX): discovery, jwks, authorize,
│                       token / exchangeCode, userinfo, logout — namespace `api.oauth`
└── auth.client.ts      ┐ một file một resource, đặt tên theo module của server
                        ┘ (server/src/modules/<name>)
```

Mọi request đi qua origin của client như axios của trình duyệt: `${baseURL}${API_PREFIX}/…`, `next.config.ts` rewrite
sang Express. `API_PREFIX` là `NEXT_PUBLIC_API_PREFIX` của client (`config/urls.ts`) — không hardcode `/api/v1`.
Endpoint OIDC (`/oauth/*`, `/.well-known/*`) không nằm dưới prefix: client của chúng gọi `request` với đường dẫn gốc.
Endpoint vận hành (`/health/*`, `/api-docs*`, `/admin/queues`) client **không** proxy: `ops.client.ts` mở context riêng
trên `API_URL` (`newOpsContext`), spec nhận qua fixture `ops`.

## `index.ts`: một namespace mỗi resource

```ts
export function createApiClient(request: APIRequestContext) {
  const base = createBaseClient(request);
  return {
    call: base.call, // endpoint chưa có client
    auth: createAuthClient(base), // endpoint ẩn danh: cấp ngoài
    as(session: Session) {
      // endpoint cần đăng nhập: Bearer
      const authed = createBaseClient(request, {
        headers: bearerHeaders(session)
      });
      return { users: createUsersClient(authed) };
    }
  };
}
```

Trong test:

```ts
const res = await api.auth.login(email, password); // kiểm chính việc login → đọc response
await api.as(session).users.me(); // chỉ cần đã đăng nhập
```

**Không trải phẳng** (`...createAuthClient(base)`): hai resource cùng có `list()` sẽ đè nhau mà TypeScript không báo.

## Quy tắc

| Tình huống                      | Làm gì                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Endpoint mới của resource đã có | Thêm method vào đúng `<resource>.client.ts`. Tên method không lặp tên resource |
| Resource mới                    | File `<resource>.client.ts` + một dòng namespace trong `index.ts`              |
| Endpoint không cần đăng nhập    | Cấp ngoài: `api.<resource>`                                                    |
| Endpoint cần đăng nhập          | Trong `as(session)`, hoặc dùng fixture `userApi` / `adminApi` (đã mang Bearer) |
| Logic đọc response dùng chung   | `response.ts`, không lặp trong client hay spec                                 |

- **Chỉ HTTP.** Không import `pages/`, `components/`, `fixtures/`. Không `expect`: method trả `APIResponse`
  thô để spec tự kiểm status, header, body. Helper như `sessionOf` được ném lỗi rõ ràng khi tiền điều kiện hỏng.
- Fixture: `api` (client trên `request` của test, mang cookie theo role), `newApi()` (client với cookie jar riêng,
  `Accept-Language: en`, tự dispose), `userApi` / `adminApi` / `guestApi` (request context thô theo role).
- Server trả message theo locale, mặc định **tiếng Việt** khi không có header — test API gửi `Accept-Language: en`
  trừ khi kiểm tiếng Việt.
