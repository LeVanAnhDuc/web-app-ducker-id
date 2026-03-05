# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                    |
| ---------------------------- | -------------------------- |
| **Tổng thời gian ước lượng** | v1.0: ~3.5 ngày + v2.0: ~2 ngày |
| **Số developer**             | 1 người                    |
| **Ngày bắt đầu dự kiến**    | 04/03/2026                 |
| **Ngày hoàn thành dự kiến**  | 11/03/2026                 |
| **Hệ số buffer**             | 1.3x (thêm 30%)            |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation _(v1.0 — đã hoàn thành)_

| Task | Tham chiếu | Ước lượng | Trạng thái |
| ---- | ---------- | --------- | ---------- |
| Cài đặt dependencies (multer, @types/multer, uuid) | TL3 - Mục 3.9 | 15m | ✅ Done |
| Thêm constants: enums, models, infrastructure, config | TL3 - Mục 3.7 | 30m | ✅ Done |
| Tạo TypeScript types cho contact-admin module | TL3 - Mục 3.7 | 30m | ✅ Done |
| Tạo Mongoose model (contact.ts) + indexes | TL3 - Mục 3.3 | 45m | ✅ Done |

### Phase 2: Backend Development _(v1.0 — đã hoàn thành)_

| Task | Tham chiếu | Ước lượng | Trạng thái |
| ---- | ---------- | --------- | ---------- |
| Tạo OptionalAuthGuard middleware | TL3 - Mục 3.9 | 45m | ✅ Done |
| Tạo File Upload middleware (multer config) | TL3 - Mục 3.9 | 1h | ✅ Done |
| Tạo Joi validation schema (submitContactSchema) | TL3 - Mục 3.4 | 30m | ✅ Done |
| Cập nhật RateLimiterMiddleware: thêm contactByIp | TL3 - Mục 3.9 | 15m | ✅ Done |
| Tạo ContactRepository: create(), ticketExists() | TL3 - Mục 3.7 | 30m | ✅ Done |
| Tạo ContactAdminService: submitContact() | TL3 - Mục 3.5 | 1.5h | ✅ Done |
| Tạo ContactAdminController: POST /submit | TL3 - Mục 3.7 | 45m | ✅ Done |
| Tạo ContactAdminModule + mount route /contact | TL3 - Mục 3.7 | 30m | ✅ Done |
| Tạo i18n translation keys | TL3 - Mục 3.4 | 30m | ✅ Done |
| Doc standard API (Swagger: POST /contact/submit) | Skill: doc-standards-api | 1h | ✅ Done |
| Review code (v1.0) | Skill: review-code | 30m | ✅ Done |
| Review performance (v1.0) | Skill: review-performance | 30m | ✅ Done |
| Review security (v1.0) | Skill: review-security | 30m | ✅ Done |

### Phase 3: Frontend Development _(v1.0 — còn lại)_

| Task | Tham chiếu | Ước lượng | Trạng thái |
| ---- | ---------- | --------- | ---------- |
| Kết nối ContactAdmin form với API + file upload UI | TL1 - US-01, US-03 | 3.25h | ⬜ Todo |
| **Review code** _(bắt buộc)_ | Skill: review-code | 30m | ⬜ Todo |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 15m | ⬜ Todo |
| **Review security** _(bắt buộc)_ | Skill: review-security | 15m | ⬜ Todo |

### Phase 4: Testing & QA _(v1.0 — còn lại)_

| Task | Tham chiếu | Ước lượng | Trạng thái |
| ---- | ---------- | --------- | ---------- |
| Unit tests: Service (ticket generation, sanitization) | TL2 - TC-01, TC-02 | 1.5h | ⬜ Todo |
| Unit tests: Validation schema | TL2 - Mục 2.3 | 45m | ⬜ Todo |
| Unit tests: Controller (route + middleware chain) | TL2 - TC-01 ~ TC-04 | 1h | ⬜ Todo |
| Integration test: full API flow + file upload + rate limiting | TL2 - TC-01, TC-03, Mục 2.5 | 1.75h | ⬜ Todo |

---

### Phase 5: Setup & Foundation — v2.0 (Query API)

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Thêm types mới vào `contact-admin.ts`: `AdminContactsQuery`, `MyContactsQuery`, `ContactListItem`, `ContactDetailItem`, `UserContactItem`, `ContactAttachmentResponse`, `PaginatedResult<T>` | TL3 - Mục 3.8 | 1h | |
| Thêm Joi schemas mới vào `validators/schemas/contact-admin.ts`: `adminListContactsQuerySchema`, `myContactsQuerySchema`, `updateContactStatusSchema`, `contactIdParamSchema` | TL3 - Mục 3.7, TL2 - Mục 2.3 | 1h | |
| Tạo `modules/contact-admin/internals/query-builder.ts`: `buildContactFilter()` | TL3 - Mục 3.5 | 1.5h | search ($or regex), partial match, date range |

### Phase 6: Backend Development — v2.0 (Query API)

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Cập nhật `contact.repository.ts`: thêm `findAll()`, `findById()`, `updateStatus()`, `findByUser()` | TL3 - Mục 3.7 | 2h | Promise.all cho count+find, lean() |
| Cập nhật `contact-admin.service.ts`: thêm `getContactList()`, `getContactDetail()`, `updateContactStatus()`, `getMyContacts()` | TL3 - Mục 3.5 | 2h | previewUrl logic, field mapping |
| Cập nhật `contact-admin.controller.ts`: thêm `adminRouter` (3 routes) + `userContactRouter` (1 route) | TL3 - Mục 3.7 | 2h | AuthGuard + AdminGuard cho admin routes |
| Cập nhật `contact-admin.module.ts` + `modules.loader.ts` | TL3 - Mục 3.7 | 0.5h | Inject auth, adminGuard; mount 2 routes mới |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | Pattern consistency, naming |
| **Review security** _(bắt buộc)_ | Skill: review-security | 1h | Admin authZ, user isolation, input validation |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 1h | lean(), Promise.all, index usage |
| Doc standard API: Swagger cho 4 endpoints mới | Skill: doc-standards-api | 1.5h | List/detail/update status/user own |

### Phase 7: Frontend Development — v2.0

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo `dataSources/ContactAdmin/index.ts`: thêm `getAdminContacts()`, `getAdminContactDetail()`, `updateContactStatus()`, `getMyContacts()` | TL1 - US-05~08 | 1h | |
| Tạo Admin Contact List page: `app/[locale]/(admin)/admin/contacts/page.tsx` + `views/AdminContacts/` (table + filter + pagination) | TL1 - US-05 | 3h | shadcn Table, filter form, pagination |
| Tạo Admin Contact Detail page: `app/[locale]/(admin)/admin/contacts/[id]/page.tsx` + `views/AdminContactDetail/` (full info + image preview + status update) | TL1 - US-06, US-07 | 3h | Image preview component, status badge + update dropdown |
| Tạo User My Contacts page: `app/[locale]/(dashboard)/contacts/me/page.tsx` + `views/MyContacts/` (table + pagination) | TL1 - US-08 | 2h | Limited fields, status badge |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | React patterns, component reuse |
| **Review security** _(bắt buộc)_ | Skill: review-security | 0.5h | Admin page protection, data exposure |

### Phase 8: Testing & QA — v2.0

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Unit test: `query-builder.ts` — tất cả filter/search combinations | TL2 - Mục 2.3 | 1h | |
| Unit test: `buildPreviewUrl()` — image/non-image/edge cases | TL2 - NF-09 | 0.5h | |
| Unit test: service methods (getContactList, getContactDetail, updateContactStatus, getMyContacts) | TL2 - TC-05~08 | 2h | Mock repo |
| Integration test: GET /admin/contacts — pagination, filter, search, sort, 401/403 | TL2 - TC-05.x | 1.5h | Supertest, seeded data |
| Integration test: GET /admin/contacts/:id — detail, previewUrl, 404/400/403 | TL2 - TC-06.x | 1h | |
| Integration test: PATCH /admin/contacts/:id/status — update, 404/400/403 | TL2 - TC-07.x | 1h | |
| Integration test: GET /auth/contacts/me — own contacts, isolation, 401 | TL2 - TC-08.x | 1h | |

---

## 4.3. Tổng hợp theo Phase

| Phase                                    | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) | Trạng thái |
| ---------------------------------------- | ------------------------ | -------------------------- | ---------- |
| 1. Setup & Foundation (v1.0)             | 2h                       | 2.5h                       | ✅ Done    |
| 2. Backend Development (v1.0)            | 7.5h                     | 10h                        | ✅ Done    |
| 3. Frontend Development (v1.0)           | 4h                       | 5h                         | ⬜ Todo    |
| 4. Testing & QA (v1.0)                   | 5h                       | 6.5h                       | ⬜ Todo    |
| 5. Setup & Foundation (v2.0)             | 3.5h                     | ~4.5h                      | ⬜ Todo    |
| 6. Backend Development (v2.0)            | 11h                      | ~14h                       | ⬜ Todo    |
| 7. Frontend Development (v2.0)           | 10.5h                    | ~14h                       | ⬜ Todo    |
| 8. Testing & QA (v2.0)                   | 8h                       | ~10h                       | ⬜ Todo    |
| **TỔNG v1.0**                            | **~19h**                 | **~24.5h (~3.5 ngày)**     | 81% done   |
| **TỔNG v2.0 (mới)**                      | **~33h**                 | **~42.5h (~5.5 ngày)**     | 0%         |
| **TỔNG toàn bộ**                         | **~52h**                 | **~67h (~8.5 ngày)**       |            |
