# Design — MyContacts (user's own contact tickets)

> Feature: user xem danh sách contact **của chính mình** đã gửi (list + detail read-only). Thay empty-state hiện tại của `/contacts/me`.
> Ngày: 2026-07-24. Repos: `server/`, `client/`, `docs/`. Branch: `feat/my-contacts`.

## 1. Bối cảnh & phạm vi

Backlog #6 (`docs/unfinished-features.md`). Hiện `views/MyContacts` chỉ render empty-state + nút mở `SupportDialog`. BE `contact-admin` có submit (public, ẩn danh) + admin CRUD, **nhưng contact không gắn với user** (collection `contacts` không có owner field). Feature này:

1. Gắn contact với user (owner field `userId`) khi user đăng nhập lúc submit.
2. Endpoint user list + detail contact của chính mình (owner-scoped).
3. FE: list (unified-list) + detail read-only.

**Quyết định đã chốt với user:**
- Owner = field `userId` trên contact (KHÔNG match theo email).
- UI = **List + detail read-only**.
- Endpoint `GET /contacts` + `GET /contacts/:id` (authGuard, owner-scoped; detail sai owner → 404).
- List có **search subject + filter status**.

**SuperDesign 1.5 — SKIP (có chủ đích):** user yêu cầu autonomous đến merge (gate 1.5 blocking mâu thuẫn). List tái dùng unified-list (`PageContainer`+`CustomTable`), detail tái dùng pattern admin contact detail — không có visual mới lạ. Visual đảm bảo bằng design system `.claude/uiux/` + E2E gate B (MCP visual walk).

### Ngoài scope (YAGNI)
- User sửa/xoá/đổi status contact của mình (đổi status chỉ admin).
- Gộp contact guest cũ theo email vào tài khoản.
- Reply/threading; attachment cho user (attachment chỉ ở admin detail).

## 2. Ownership model

- Thêm `userId` (ObjectId, ref `User`, **nullable**, indexed) vào `contacts`. Tham chiếu `users._id` — nhất quán `favorites`/`entitlements` (dùng `user_id`); JWT `sub` = userId.
- **Submit** đổi `POST /contact/submit`: `rl.contactByIp` → **thêm `optionalAuthGuard`** (đứng trước rl hoặc sau, miễn set RequestContext). Service `submitContact`:
  - Đăng nhập → `userId = RequestContext.getUserId()` (nullable helper).
  - Guest → `userId = null` (luồng contact công khai giữ nguyên).
- Contact cũ + guest: `userId = null` → không thuộc MyContacts của ai (chấp nhận). **Không cần migration** (field nullable, default null).

## 3. Backend (`server/src/modules/contact-admin`)

### 3.1 Model + ERD
- `models/contact.ts`: thêm
  ```ts
  userId: { type: Schema.Types.ObjectId, ref: MODEL_NAMES.USER, default: null }
  ```
  + index `ContactSchema.index({ userId: 1, createdAt: -1 })` (list owner-scoped sort theo createdAt).
- `contact-admin/types`: `ContactDocument` thêm `userId?: ObjectId | null`.
- ERD (`docs/erd.md`): CONTACT thêm `ObjectId user_id FK "nullable"` (Decision Record §7).

### 3.2 Submit (owner attach)
- `contact-admin.routes.ts` `createContactRoutes`: `/submit` thêm `optionalAuthGuard` (stateless, import trực tiếp).
- `submitContact(body)`: đọc `RequestContext.getUserId()` (nullable), truyền `userId` vào `contactRepo.create({...})`. (Giữ sanitize + validate hiện có.)

### 3.3 User routes (MỚI) — group authGuard, owner-scoped
Factory mới `createMyContactsRoutes(controller)` mount `/contacts`:
```
GET /contacts       → controller.getMyContacts   (authGuard, queryPipe(myContactsQuerySchema))
GET /contacts/:id   → controller.getMyContactDetail (authGuard, paramsPipe(contactIdParamSchema))
```
Wire vào `modules.loader` cùng public + admin routes.

### 3.4 Controller + service
- `getMyContacts(req)`: `service.getMyContacts(RequestContext.requireUserId(), req.query)` → `OkSuccess` + meta pagination.
- `getMyContactDetail(req)`: `service.getMyContactDetail(req.params.id, RequestContext.requireUserId())` → `OkSuccess`.
- Service:
  - `getMyContacts(userId, query)`: filter `{ userId }` + status/search (reuse `buildContactFilter` mở rộng), pagination/sort như `getContactList`. Trả `ContactListItemDto[]` + meta.
  - `getMyContactDetail(id, userId)`: `repo.findByIdForUser(id, userId)`; null → `NotFoundError CONTACT_NOT_FOUND` (404 — **không lộ** contact người khác). Trả `ContactDetailItemDto` (read-only).

### 3.5 Repository
- `findByUser(userId, filter, opts)`: `find({ userId, ...filter })` + skip/limit/sort + count. (Hoặc mở rộng `findAll` nhận userId — tách method riêng cho rõ owner-scope.)
- `findByIdForUser(id, userId)`: `findOne({ _id: id, userId })`.

### 3.6 Validators / DTO / Swagger
- `myContactsQuerySchema` (page/limit/sortBy/sortOrder/status/search) — reuse base + `adminListContactsQuerySchema` shape (bỏ field admin-only nếu có).
- Reuse `ContactListItemDto` + `ContactDetailItemDto` (đã có; kèm ticket-id theo convention `contact-ticket-id-display`).
- Swagger: thêm 2 path `/contacts`, `/contacts/:id`; cập nhật submit doc (optionalAuth). Postman.

## 4. Frontend (`client/src`)

### 4.1 Constants
- `endpoints.ts`: `MY_CONTACTS: "/contacts"`, `MY_CONTACT_BY_ID: "/contacts/:id"`.
- `routes.ts`: `MY_CONTACTS: "/contacts/me"` (đã có route folder) + `MY_CONTACT_DETAIL: "/contacts/me/:id"`.

### 4.2 Requests + types
- `requests/myContacts.ts`: `getMyContacts(params) → PaginatedResult<MyContact>`, `getMyContactById(id) → MyContactDetail`.
- `types/MyContacts/index.ts`: entity types (derive status từ `CONSTANTS.CONTACT_STATUS` đã có; không viết union tay).

### 4.3 View list (`views/MyContacts`)
- Thay `MyContactsTable` empty-state bằng unified-list: `useListQuery(filterDefs)` + `PageShell`→`PageHeader`→`PageToolbar`→`PageContent` + `CustomTable` + `CustomPagination`. Cột `CustomTableColumn<MyContact>`: **ticket id · subject · status badge · priority · createdAt**. Toolbar: SearchInput (subject) + Filters popover (status: new/processing/resolved). Empty-state (chưa có contact) → component riêng + nút "Submit new" (mở `SupportDialog`). Row click → `router.push(MY_CONTACT_DETAIL)`.
- `dataSources/MyContacts/`: cột + filterDefs (status options) — dùng `CONSTANTS.ROUTES`/`CONTACT_STATUS`, i18n qua `LeafKeyOf`.
- Hooks: `hooks/useMyContacts.ts` (query, export `MY_CONTACTS_QUERY_KEY`) + `useMyContactById.ts`. Submit (SupportDialog) success → invalidate `MY_CONTACTS_QUERY_KEY`.

### 4.4 Detail read-only (`app/(dashboard)/contacts/me/[id]` + `views/MyContactDetail`)
- Page RSC → view client. Orchestrator: `useMyContactById(id)` → loading/error(404→not-found)/content (rule "1 markup block/component" → tách `MyContactDetailLoading/Error/Content`).
- Content: subject, message (full), priority, status badge, ngày; **không** control đổi status. Breadcrumb về `/contacts/me`.

### 4.5 i18n
- Reuse namespace `contactAdmin.myContacts.*` (đã có 1 phần) + bổ sung list/detail/announce keys (en + vi). Status/priority labels reuse của contact.

## 5. API contract (BE ↔ FE)

| BE | FE |
|----|----|
| `POST /contact/submit` (optionalAuth) → `{ _id }` (owner gắn nếu login) | `submitContact` (đã có) |
| `GET /contacts?page&limit&status&search&sortBy&sortOrder` → `{ items: ContactListItem[], meta }` | `getMyContacts(params)` |
| `GET /contacts/:id` (owner-scoped, 404 nếu không phải của mình) → `ContactDetailItem` | `getMyContactById(id)` |

## 6. Env / seed
- Không env mới.
- Seeder `database/seeders`: gắn `userId` cho vài contact mẫu thuộc user seed (idempotent) → MyContacts + E2E có data 2 trạng thái.

## 7. Decision Record — ERD update
CONTACT thiếu liên kết user (spec gap). **DR**: thêm `user_id ObjectId FK "nullable"` vào CONTACT trong `docs/erd.md` — nullable để giữ tương thích contact ẩn danh (guest submit). Cập nhật trong PR docs của feature này.

## 8. Bảo mật (chuẩn bị §4.5 security review)
- **AuthZ owner-scope**: list + detail filter cứng theo `RequestContext.requireUserId()`; detail sai owner → 404 (không lộ tồn tại). Đây là bề mặt chính.
- `optionalAuthGuard` trên submit: không được vỡ khi thiếu token (guest vẫn submit); token có → gắn đúng userId, không cho client tự truyền userId trong body (server đọc từ RequestContext).
- Input: `:id` validateObjectId; query pipe; sanitize message/subject giữ nguyên.
- Không lộ contact của user khác qua list (filter userId) hay detail (owner check).

---

## E2E Scenario Matrix

Suite: `client/e2e/my-contacts/*.e2e.ts` (project user — cần user thường có contact seed). Cột `Gate`: `A+B` cả 2 gate; `A only` mutation-heavy.

| # | Nhóm | Scenario + expected | Kỹ thuật | Gate |
| - | ---- | ------------------- | -------- | ---- |
| 1 | Happy path | User đăng nhập vào `/contacts/me` → thấy **list contact của mình** (ticket id, subject, status badge, priority, ngày). Click row → detail read-only hiển thị full message + status, không có control đổi status. | — | A+B |
| 2 | AuthN | Chưa login vào `/contacts/me` (và `/contacts/me/:id`) → redirect `/login`. Gọi `GET /contacts` không token → 401. | — | A+B |
| 3 | AuthZ | **[DT]** owner-scope: user A mở detail contact của user B (`GET /contacts/:idB`) → **404** (không lộ). List chỉ trả contact `userId=me` (contact ẩn danh/guest & của người khác không xuất hiện). | [DT] owner×resource | A+B |
| 4 | Validation / expected-error | `GET /contacts/:id` với id không phải ObjectId → 400; id 24-hex không tồn tại → 404. Query `status` ngoài enum → 400 (pipe); `page=abc` → 400/ў default. | [EP] id{malformed,valid-absent,valid-mine} · [DT] | A+B |
| 5 | Empty / null | User chưa gửi contact nào → **empty state** + nút "Submit new" (mở SupportDialog). Search không khớp → empty result state. Contact `email=null` (guest cũ) không thuộc list user. | [EP] list{rỗng,có} | A+B |
| 6 | Boundary / pagination | Nhiều contact → phân trang (page 1 / last / beyond-range → clamp/empty), limit min/max, sort theo createdAt toggle. | [BVA] page{1, last, last+1} | A+B |
| 7 | Filter / search | Filter status=new/processing/resolved → chỉ hiện đúng; search subject match/no-match; combine filter+search; params persist ở URL (useListQuery). | [DT] status×search | A+B |
| 8 | Data rendering | Status **badge** (không raw "new"), priority label, ticket-id (không raw ObjectId), ngày format (không ISO/null). | — | A+B |
| 9 | **i18n (en + vi)** | List (header cột, toolbar, empty, status/priority labels) + detail + announce render đúng **en VÀ vi**; không thiếu key `[myContacts.*]`/`[contactAdmin.myContacts.*]`. | — | A+B |
| 10 | Error / loading | `GET /contacts` 5xx → error state/toast; skeleton khi loading list + detail. Detail 404 → not-found state (không crash). | Error Guessing | A+B |
| 11 | Mutation safety | **[ST]** submit contact mới (login) qua SupportDialog → success → list **refetch** hiện contact mới (owner=me). Guest submit (logout) → không gắn owner (verify qua API riêng, không ảnh hưởng list user). Double-submit dialog → 1 request. **Revert**: contact tạo ra là dữ liệu test của user seed; không cần xoá (append-only, hoặc seed riêng). | [ST] | A only |
| 12 | Accessibility | Table role/label, row click keyboard-reachable, badge có text (không chỉ màu), detail heading order, breadcrumb; `useAnnounce` cho load/search/filter/pagination/route. | — | A+B |

### Follow-up / defer (no silent gap)
- **Guest-submit không gắn owner** (#11): verify ở tầng BE contract test (submit không token → contact.userId null) — ổn định hơn drive browser logout/login.
- **Beyond-range page** (#6): nếu seed < 1 trang thì defer case pagination sâu, ghi rõ ở e2e.md.

### BE contract tests
- `submitContact`: login → contact.userId = sub; guest → userId null.
- `getMyContacts`: chỉ trả contact userId=me; không trả của user khác/guest.
- `getMyContactDetail`: của mình → ok; của người khác/không tồn tại → 404.

### Dual-gate (§4.3)
- Gate A: `cd client && yarn e2e --project=user -g "My Contacts"` (hoặc project phù hợp) trên app thật.
- Gate B: MCP browser walk cùng matrix (auth context user riêng); row `A only` (submit) chỉ verify read/render, không mutate song song.
- Fail → systematic-debugging → `e2e-bugs.md` → fix → re-run (max 3).

## 9. Artifact & vị trí
- BE: `models/contact.ts`, `modules/contact-admin/{routes,controller,service,repository,dtos,types,swagger}`, `validators/schemas/contact-admin`, `modules.loader`, seeders.
- FE: `constants/{endpoints,routes}.ts`, `requests/myContacts.ts`, `types/MyContacts`, `dataSources/MyContacts`, `views/MyContacts` (list) + `views/MyContactDetail`, `app/[locale]/(private)/(dashboard)/contacts/me/{page.tsx,[id]/page.tsx}`, locales.
- docs: `docs/specs/my-contacts/{design.md, e2e.md}` (+ security-report), `erd.md` (DR).
- E2E: `client/e2e/my-contacts/*.e2e.ts`.
