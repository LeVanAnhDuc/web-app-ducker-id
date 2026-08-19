# MyContacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Chạm `server/src/**` → đọc `server/.claude/CLAUDE.md` + skills BE; chạm `client/src/**` → đọc `client/.claude/CLAUDE.md` + skills FE. Steps dùng checkbox.

**Goal:** User xem list + detail (read-only) contact của chính mình; contact gắn `userId` khi user đăng nhập lúc submit.

**Architecture:** Thêm owner field `userId` (nullable) vào `contacts`; `POST /contact/submit` dùng `optionalAuthGuard` gắn userId khi login; endpoint user `GET /contacts` + `GET /contacts/:id` owner-scoped (detail sai owner → 404). FE list (unified-list) + detail read-only.

**Tech Stack:** BE Express + Mongoose. FE Next.js 15 + React Query + next-intl + unified-list (`useListQuery` + `PageContainer` + `CustomTable`).

## Global Constraints
- BE: throw `@/common/exceptions` + `ERROR_CODES` + i18n thunk; `OkSuccess`; module-struct; owner-scope đọc từ `RequestContext`, KHÔNG nhận userId từ client body. Model rules (nullable owner default null, index). Không đọc `process.env` trực tiếp.
- FE: file ≤200 dòng; `useEffect`/`useQuery`/`useMutation` → ghosts/hooks; type props inline; string qua i18n en+vi; path/endpoint qua `CONSTANTS` + dynamic `:param`+`generatePath`; navigation từ `@/i18n/navigation`; `Custom*` wrappers; `useAnnounce`; unified-list pattern; domain enum reuse `CONSTANTS.CONTACT_STATUS`.
- Không migration tool (field nullable + seeder). Commit review OFF (autonomous) → commit per-task.

---

## PHẦN A — BACKEND (`server/`, worktree `server/.worktrees/my-contacts`)

### Task A1: Model + type + ERD — `userId` trên contact
**Files:** `src/models/contact.ts`, `src/modules/contact-admin/types/index.ts`, `docs/.worktrees/my-contacts/erd.md`
- [ ] `contact.ts`: thêm field `userId: { type: Schema.Types.ObjectId, ref: MODEL_NAMES.USER, default: null }`; thêm index `ContactSchema.index({ userId: 1, createdAt: -1 })` (sau schema, trước model).
- [ ] `ContactDocument` (types) thêm `userId?: Types.ObjectId | null`.
- [ ] `erd.md`: CONTACT thêm `ObjectId user_id FK "nullable"`.
- [ ] `yarn type-check`; commit `feat(contact): add nullable userId owner field + index`.

### Task A2: Submit attaches owner (optionalAuthGuard)
**Files:** `contact-admin.routes.ts`, `contact-admin.service.ts`, `contact-admin.repository.ts` (create), submit DTO/types nếu cần
- [ ] `createContactRoutes`: `/submit` thêm `optionalAuthGuard` (import trực tiếp từ `@/middlewares`) trong stack (guard → rl → pipe → handler; giữ `rl.contactByIp`).
- [ ] `submitContact(body)`: `const userId = RequestContext.getUserId();` (nullable helper — nếu chưa có, dùng cách optional tương đương RequestContext hiện có) → truyền `userId` vào `contactRepo.create({ email, subject, message, status, userId })`.
- [ ] Repo `create`: nhận + set `userId`.
- [ ] Test: submit có/không token → contact.userId set/null. `yarn lint && yarn type-check && yarn test`. Commit `feat(contact): attach userId on authenticated submit`.

### Task A3: User routes + controller + service + repo (list + detail owner-scoped)
**Files:** `contact-admin.routes.ts` (factory mới), `contact-admin.controller.ts`, `contact-admin.service.ts`, `contact-admin.repository.ts`, `contact-admin.module.ts`, `src/loaders/modules.loader.ts`, `validators/schemas/contact-admin.ts`, `helpers`
**Interfaces:** `getMyContacts(userId, query)`, `getMyContactDetail(id, userId)`; routes `GET /contacts`, `GET /contacts/:id`.
- [ ] Validator `myContactsQuerySchema` (reuse shape của `adminListContactsQuerySchema`: page/limit/sortBy/sortOrder/status/search).
- [ ] Repo: `findByUser(userId, filter, opts): { data, total }` (`find({ userId, ...filter })` + skip/limit/sort + count); `findByIdForUser(id, userId)` (`findOne({ _id: id, userId })`).
- [ ] Service:
```ts
async getMyContacts(userId, query) {
  // pagination/sort như getContactList; filter = { ...buildContactFilter(query) }; repo.findByUser(userId, filter, opts)
  return { items: data.map(toContactListItemDto), meta: {...} };
}
async getMyContactDetail(id, userId) {
  validateObjectId(id, "id");
  const doc = await this.contactRepo.findByIdForUser(id, userId);
  if (!doc) throw new NotFoundError({ i18nMessage: (t) => t("contactAdmin:errors.notFound"), code: ERROR_CODES.CONTACT_NOT_FOUND });
  return toContactDetailItemDto(doc);
}
```
- [ ] Controller `getMyContacts`/`getMyContactDetail` dùng `RequestContext.requireUserId()`; `OkSuccess`.
- [ ] Routes factory `createMyContactsRoutes(controller)`: `router.use("/contacts", c)`; `c.get("/", authGuard, queryPipe(myContactsQuerySchema), asyncHandler(controller.getMyContacts))`; `c.get("/:id", authGuard, paramsPipe(contactIdParamSchema), asyncHandler(controller.getMyContactDetail))`.
- [ ] `module.ts` + `modules.loader`: mount factory mới.
- [ ] Swagger 2 path + submit optionalAuth note; Postman.
- [ ] Tests: `getMyContacts` chỉ trả owner=me; detail của mình ok, của người khác/absent → 404. `yarn lint && yarn type-check && yarn test && yarn build`. Commit `feat(contact): user my-contacts list + detail endpoints (owner-scoped)`.

### Task A4: Seeder
**Files:** `src/database/seeders/...`
- [ ] Gắn `userId` cho vài contact mẫu thuộc user seed (idempotent) + đủ 2 status để test filter. Commit `chore(seed): seed user-owned contacts for my-contacts`.

---

## PHẦN B — FRONTEND (`client/`, worktree `client/.worktrees/my-contacts`)

### Task B1: Constants + types + requests
**Files:** `constants/endpoints.ts`, `constants/routes.ts`, `types/MyContacts/index.ts`, `requests/myContacts.ts`
- [ ] `endpoints`: `MY_CONTACTS: "/contacts"`, `MY_CONTACT_BY_ID: "/contacts/:id"`.
- [ ] `routes`: `MY_CONTACTS: "/contacts/me"`, `MY_CONTACT_DETAIL: "/contacts/me/:id"`.
- [ ] `types/MyContacts`: `MyContact` (list item) + `MyContactDetail`; status type derive từ `CONSTANTS.CONTACT_STATUS`.
- [ ] `requests/myContacts.ts`: `getMyContacts(params): Promise<PaginatedResult<MyContact>>`, `getMyContactById(id): Promise<MyContactDetail>` (axiosInstance + generatePath).
- [ ] `npx tsc --noEmit`. Commit `feat(my-contacts): constants, types, requests`.

### Task B2: List view (unified-list)
**Files:** `views/MyContacts/{index.tsx, mains/*, components/*, hooks/*, ghosts/*}`, `dataSources/MyContacts/*`, locales
- [ ] `hooks/useMyContacts.ts` (query + `MY_CONTACTS_QUERY_KEY`), consumer build params từ `query.appliedSearch`.
- [ ] `dataSources/MyContacts`: cột `CustomTableColumn<MyContact>` (ticketId/subject/status badge/priority/createdAt) + `ListFilterDef` (status options từ `CONSTANTS.CONTACT_STATUS`), i18n qua `LeafKeyOf`.
- [ ] `index.tsx`: `PageShell`→`PageHeader`→`PageToolbar`(search+filter)→`PageContent`(`CustomTable`+`CustomPagination`); empty-state component + nút "Submit new" (mở `SupportDialog`); row click → `router.push(generatePath(MY_CONTACT_DETAIL,{id}))`. Loading/empty tách component (1 markup block/component).
- [ ] SupportDialog submit success → invalidate `MY_CONTACTS_QUERY_KEY` (qua ghost/hook nơi dialog dùng trong view, hoặc onSuccess trong support hook nếu chung — giữ tối thiểu).
- [ ] i18n list + empty + announce (en+vi). `yarn format && yarn lint && npx tsc --noEmit`. Commit `feat(my-contacts): list view with search + status filter`.

### Task B3: Detail view (read-only) + route
**Files:** `app/[locale]/(private)/(dashboard)/contacts/me/[id]/page.tsx`, `views/MyContactDetail/{index.tsx, mains/*, components/*, hooks/*}`, locales
- [ ] `hooks/useMyContactById.ts` (query by id).
- [ ] Orchestrator: loading → `<MyContactDetailLoading/>`; error 404 → `<MyContactDetailNotFound/>`; data → `<MyContactDetailContent/>` (subject, message full, priority, status badge, ngày; breadcrumb về `/contacts/me`; KHÔNG control đổi status).
- [ ] `page.tsx` RSC render view (params là Promise theo Next 15).
- [ ] i18n detail + announce (en+vi). `yarn format && yarn lint && npx tsc --noEmit && yarn build` (copy `.env.local` từ main cho build, xoá sau). Commit `feat(my-contacts): read-only detail page`.

---

## PHẦN C — E2E (`client/`)

### Task C1: Suite `my-contacts` (expand matrix)
**Files:** `client/e2e/my-contacts/{list.e2e.ts, detail.e2e.ts}`, `docs/specs/my-contacts/e2e.md`
- [ ] Expand từng row Applicable (design.md matrix) thành test; row `A only` (submit) gate A own mutation. BE contract cases (owner-scope, submit owner) ghi ở e2e.md là BE test.
- [ ] Reuse helpers/auth (user project). Seed user-owned contacts (Task A4) là tiền đề.
- [ ] `e2e.md` scenario final + follow-up. Commit (client + docs).

## Self-Review (đã chạy)
- Spec coverage: §2 owner → A1/A2; §3 endpoints → A3; seed → A4; §4 FE → B1–B3; matrix → C1. ✅
- Type consistency: `getMyContacts(userId,query)`/`getMyContactDetail(id,userId)` BE khớp; FE `getMyContacts`/`getMyContactById` khớp contract §5. ✅
- Placeholder: `RequestContext.getUserId()` nullable — A2 ghi fallback nếu helper chưa tồn tại (implementer verify). Không TODO khác. ✅
