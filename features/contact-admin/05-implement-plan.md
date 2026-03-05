# IMPLEMENTATION PLAN: Contact Admin

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục           | Giá trị    |
| ------------- | ---------- |
| Tổng số task  | 33         |
| Hoàn thành    | 20/33      |
| Tiến độ       | 61%        |
| Ngày bắt đầu | 04/03/2026 |

---

## Thứ tự implement

### Phase 1: Setup & Foundation

#### TASK-001: Cài đặt dependencies

- **Tham chiếu:** TL3 - Mục 3.8
- **Ước lượng:** 15m
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] `yarn add multer` trong server/
  - [ ] `yarn add -D @types/multer` trong server/
  - [ ] Kiểm tra uuid đã có chưa, nếu chưa thì `yarn add uuid @types/uuid`
  - [ ] Verify build không lỗi
- **Files sẽ tạo/sửa:**
  - `server/package.json` (sửa)
  - `server/yarn.lock` (auto)

#### TASK-002: Thêm constants (enums, models, infrastructure, config)

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 30m
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `CONTACT_CATEGORIES`, `CONTACT_PRIORITIES`, `CONTACT_STATUSES` vào `enums.ts`
  - [ ] Thêm `CONTACT: "Contact"` vào `models.ts`
  - [ ] Thêm `REDIS_KEYS.RATE_LIMIT.CONTACT.IP` vào `infrastructure.ts`
  - [ ] Thêm `RATE_LIMIT_CONFIG.CONTACT` và `CONTACT_CONFIG` vào `config.ts`
- **Files sẽ tạo/sửa:**
  - `server/src/constants/enums.ts` (sửa)
  - `server/src/constants/models.ts` (sửa)
  - `server/src/constants/infrastructure.ts` (sửa)
  - `server/src/constants/config.ts` (sửa)

#### TASK-003: Tạo TypeScript types

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 30m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Tạo `ContactDocument` interface (Mongoose document type)
  - [ ] Tạo `SubmitContactBody` interface (request body)
  - [ ] Tạo `SubmitContactRequest` type (Express request)
  - [ ] Tạo `ContactAttachment` interface
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/contact-admin.ts` (tạo mới)

#### TASK-004: Tạo Mongoose model + indexes

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 45m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-002, TASK-003
- **Checklist:**
  - [ ] Tạo ContactSchema với tất cả fields từ TL3 Mục 3.3
  - [ ] Thêm indexes: ticketNumber (unique), userId (sparse), status, createdAt, compound {status, createdAt}
  - [ ] Export ContactModel
  - [ ] Verify schema compile không lỗi
- **Files sẽ tạo/sửa:**
  - `server/src/models/contact.ts` (tạo mới)
- **Test cần pass:** TC-04.1, TC-04.2

---

### Phase 2: Backend Development

#### TASK-005: Tạo OptionalAuthGuard middleware

- **Tham chiếu:** TL3 - Mục 3.7.1
- **Ước lượng:** 45m
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `OptionalAuthGuard` class (tương tự AuthGuard)
  - [ ] Override canActivate: nếu không có token hoặc invalid → set req.user = undefined, return true (không throw)
  - [ ] Nếu có valid token → set req.user như AuthGuard
  - [ ] Expose `middleware` getter
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/optional-auth.guard.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.3

#### TASK-006: Tạo File Upload middleware (multer)

- **Tham chiếu:** TL3 - Mục 3.7.2
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Configure disk storage: destination = `/uploads/contacts/{YYYY-MM-DD}/`
  - [ ] File naming: `{uuid}.{ext}`
  - [ ] File filter: chỉ cho phép jpg, jpeg, png, gif, pdf, doc, docx
  - [ ] MIME type validation thực sự (không chỉ dựa vào extension)
  - [ ] Limits: maxFileSize 5MB, maxCount 5
  - [ ] Export upload middleware
  - [ ] Tạo thư mục uploads/ nếu chưa có (auto-create)
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/file-upload.ts` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.2, TC-03.3, TC-03.4, TC-03.5, TC-03.6

#### TASK-007: Tạo Joi validation schema

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - Mục 2.3
- **Ước lượng:** 30m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Tạo `submitContactSchema` với Joi
  - [ ] email: optional, valid email format
  - [ ] subject: required, min 5, max 200
  - [ ] category: required, valid enum values
  - [ ] priority: optional (default medium), valid enum values
  - [ ] message: required, min 20, max 5000
  - [ ] i18n message keys cho tất cả validation errors
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/contact-admin.ts` (tạo mới)
- **Test cần pass:** TC-01.7, TC-02.3, TC-02.4, TC-02.5

#### TASK-008: Cập nhật RateLimiterMiddleware

- **Tham chiếu:** TL3 - Mục 3.7.6
- **Ước lượng:** 15m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Thêm `public readonly contactByIp: RateLimitRequestHandler`
  - [ ] Khởi tạo trong constructor: 5 req / 15 phút / IP
  - [ ] Sử dụng `REDIS_KEYS.RATE_LIMIT.CONTACT.IP` và `RATE_LIMIT_CONFIG.CONTACT`
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/rate-limiter.ts` (sửa)
- **Test cần pass:** TL2 - Mục 2.5 (rate limiting)

#### TASK-009: Tạo ContactRepository

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 30m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-004
- **Checklist:**
  - [ ] Extends MongoDBRepository<ContactDocument>
  - [ ] Constructor nhận ContactModel
  - [ ] Thêm method kiểm tra ticketNumber unique (nếu cần)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/repositories/contact.repository.ts` (tạo mới)

#### TASK-010: Tạo ContactAdminService

- **Tham chiếu:** TL3 - Mục 3.5, 3.7.3, 3.7.7, 3.7.8
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-009
- **Checklist:**
  - [ ] Implement `submitContact(req)` method
  - [ ] Generate ticket number: format "TK-{YYYYMMDD}-{RANDOM4}", retry tối đa 3 lần nếu trùng
  - [ ] Sanitize input: strip HTML tags từ subject, message
  - [ ] Build contact document: gắn userId nếu authenticated, email từ auth nếu không cung cấp
  - [ ] Map uploaded files → attachments array
  - [ ] Gọi repository.create()
  - [ ] Return { data: { ticketNumber }, message }
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/contact-admin.service.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.3, TC-01.4, TC-04.1, TC-04.2, TC-04.3

#### TASK-011: Tạo ContactAdminController + Module + Mount route

- **Tham chiếu:** TL3 - Mục 3.7.3, 3.7.4, 3.7.5
- **Ước lượng:** 1h 15m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-005, TASK-006, TASK-007, TASK-008, TASK-010
- **Checklist:**
  - [ ] Tạo ContactAdminController: constructor(service, rl, optionalAuth)
  - [ ] initRoutes: POST "/submit" → rl.contactByIp → optionalAuth.middleware → uploadMiddleware → validate → asyncHandler
  - [ ] submit handler return HandlerResult { data, message, statusCode: CREATED }
  - [ ] Tạo createContactAdminModule(rateLimiter, optionalAuth) trong contact-admin.module.ts
  - [ ] Cập nhật modules.loader.ts: tạo OptionalAuthGuard, gọi createContactAdminModule, mount v1Router.use("/contact", contactAdminRouter)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/contact-admin.controller.ts` (tạo mới)
  - `server/src/modules/contact-admin/contact-admin.module.ts` (tạo mới)
  - `server/src/loaders/modules.loader.ts` (sửa)
- **Test cần pass:** TC-01.1 ~ TC-01.7, TC-02.1 ~ TC-02.5, TC-03.1 ~ TC-03.7

#### TASK-012: Tạo i18n translation keys

- **Tham chiếu:** TL3 - Mục 3.4
- **Ước lượng:** 30m
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Thêm namespace `contactAdmin` cho server i18n
  - [ ] Keys: success.submitted, errors.rateLimitExceeded, errors.fileUploadFailed, errors.fileTooLarge, errors.fileTypeNotSupported, errors.maxFilesExceeded
  - [ ] Thêm validation keys nếu cần
- **Files sẽ tạo/sửa:**
  - `server/src/i18n/locales/en/contactAdmin.json` (tạo mới)
  - `server/src/i18n/locales/vi/contactAdmin.json` (tạo mới, nếu có thư mục vi)

#### TASK-013: Doc standard API (Swagger)

- **Tham chiếu:** Skill: doc-standards-api
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Tạo swagger schemas: SubmitContactRequest, SubmitContactResponse, ErrorResponse
  - [ ] Tạo swagger paths: POST /api/v1/contact/submit
  - [ ] Export swagger config
  - [ ] Verify Swagger UI hiển thị đúng
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/swagger/schemas.ts` (tạo mới)
  - `server/src/modules/contact-admin/swagger/paths.ts` (tạo mới)
  - `server/src/modules/contact-admin/swagger/index.ts` (tạo mới)

---

### Phase 3: Frontend Development

#### TASK-014: Kết nối ContactAdmin form với API + file upload UI

- **Tham chiếu:** TL1 - US-01, US-03
- **Ước lượng:** 3h 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Thay TODO fake API call bằng actual Axios POST (multipart/form-data)
  - [ ] Thêm file upload input component (nếu chưa có): drag & drop hoặc file picker
  - [ ] Client-side file validation: type, size, count
  - [ ] File preview trước khi submit
  - [ ] Xử lý response success: hiển thị ticketNumber, redirect success page
  - [ ] Xử lý response errors: toast notification, field-level validation errors
  - [ ] Xử lý 429 rate limit: hiển thị thông báo phù hợp
  - [ ] Loading state khi submit
- **Files sẽ tạo/sửa:**
  - `client/src/views/ContactAdmin/` components (sửa)
  - `client/src/dataSources/ContactAdmin/` (sửa, thêm API endpoint)
  - `client/src/forms/ContactAdmin/` (sửa, thêm attachments field nếu cần)

---

### Phase 4: Testing & QA

#### TASK-015: Unit tests (Service, Validation, Controller)

- **Tham chiếu:** TL2 - TC-01 ~ TC-04, Mục 2.3
- **Ước lượng:** 3h 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Test Service: ticket generation (unique, format, retry logic)
  - [ ] Test Service: input sanitization (HTML strip, XSS prevention)
  - [ ] Test Service: guest vs authenticated user document building
  - [ ] Test Validation: all field rules (required, min/max, enum values)
  - [ ] Test Validation: invalid inputs (wrong category, wrong priority, empty body)
  - [ ] Test Controller: middleware chain ordering
  - [ ] Test Controller: 201 response format
  - [ ] Test Controller: 400 validation error format
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/__tests__/contact-admin.service.test.ts` (tạo mới)
  - `server/src/validators/schemas/__tests__/contact-admin.test.ts` (tạo mới)
  - `server/src/modules/contact-admin/__tests__/contact-admin.controller.test.ts` (tạo mới)
- **Test cần pass:** TC-01.1 ~ TC-01.7, TC-02.1 ~ TC-02.5, TC-04.1 ~ TC-04.3

#### TASK-016: Integration tests + file upload + rate limiting

- **Tham chiếu:** TL2 - TC-03, Mục 2.5
- **Ước lượng:** 2h 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-015
- **Checklist:**
  - [ ] Integration test: full API flow (guest gửi yêu cầu → 201 + ticketNumber)
  - [ ] Integration test: authenticated user gửi yêu cầu → 201 + userId linked
  - [ ] Test file upload: valid file → saved to disk + path in DB
  - [ ] Test file upload: oversized file → 400
  - [ ] Test file upload: invalid MIME type → 400
  - [ ] Test file upload: exceed max count → 400
  - [ ] Test file upload: no file → 201 (attachments = [])
  - [ ] Test rate limiting: 6th request within 15 min → 429
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/__tests__/contact-admin.integration.test.ts` (tạo mới)
- **Test cần pass:** TC-03.1 ~ TC-03.7, TL2 Mục 2.5

---

## Review tasks (chạy sau mỗi phase)

Sau khi hoàn thành Phase 2 (Backend) và Phase 3 (Frontend), chạy các skill review:

- **review-code**: Kiểm tra code quality, naming, patterns
- **review-performance**: Kiểm tra query optimization, `.lean()`, `.select()`
- **review-security**: Kiểm tra OWASP Top 10, file upload security, input validation

---

---

### Phase 5: Setup & Foundation — v2.0

#### TASK-017: Thêm types mới vào `contact-admin.ts`

- **Tham chiếu:** TL3 - Mục 3.8
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `AdminContactsQuery` interface (14 filter/sort params)
  - [ ] Thêm `MyContactsQuery` interface (page, limit, sortBy, sortOrder)
  - [ ] Thêm `ContactAttachmentResponse` interface (thêm `previewUrl: string | null`)
  - [ ] Thêm `ContactListItem` interface (table view fields, không có message/ipAddress/attachments detail)
  - [ ] Thêm `ContactDetailItem extends ContactListItem` (full fields + attachments array)
  - [ ] Thêm `UserContactItem` interface (limited fields — không có email, ipAddress, userId)
  - [ ] Thêm `PaginatedResult<T>` interface (`{ items: T[], meta: { total, page, limit, totalPages } }`)
  - [ ] Export tất cả types mới
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/contact-admin.ts` (sửa)

---

#### TASK-018: Thêm Joi schemas mới vào `validators/schemas/contact-admin.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - Mục 2.3
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-017
- **Checklist:**
  - [ ] Thêm `contactIdParamSchema`: `id` required, ObjectId pattern `/^[a-fA-F0-9]{24}$/`
  - [ ] Thêm `updateContactStatusSchema`: `status` required, enum: new|processing|resolved
  - [ ] Thêm `adminListContactsQuerySchema`: tất cả 13 params (page, limit, status, category, priority, email, ticketNumber, userId (ObjectId), search, fromDate, toDate, sortBy, sortOrder) — tất cả optional, `.options({ stripUnknown: true })`
  - [ ] Custom validation: `toDate >= fromDate` khi cả hai đều có
  - [ ] Thêm `myContactsQuerySchema`: page, limit, sortBy (chỉ `createdAt`), sortOrder
  - [ ] Export tất cả schemas mới
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/contact-admin.ts` (sửa)
- **Test cần pass:** TC-05.13, TC-06.6, TC-07.6, TC-07.7

---

#### TASK-019: Tạo `internals/query-builder.ts`

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-017
- **Checklist:**
  - [ ] Tạo function `buildContactFilter(query: AdminContactsQuery): FilterQuery<ContactDocument>`
  - [ ] Exact match: `status`, `category`, `priority`
  - [ ] `userId`: convert thành `new Types.ObjectId(userId)` nếu có
  - [ ] Partial match (case-insensitive regex): `email`, `ticketNumber`
  - [ ] `search`: `$or: [{ subject: regex }, { email: regex }, { ticketNumber: regex }]`
  - [ ] Date range: `createdAt: { $gte: fromDate, $lte: toDate }` — chỉ thêm field nếu có value
  - [ ] Chỉ include field vào filter khi value tồn tại (không undefined)
  - [ ] Export function
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/internals/query-builder.ts` (tạo mới)

---

### Phase 6: Backend Development — v2.0

#### TASK-020: Cập nhật `contact.repository.ts`

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-017, TASK-019
- **Checklist:**
  - [ ] Thêm `findAll(filter, options: { skip, limit, sort }): Promise<{ data: ContactDocument[], total: number }>`
    - [ ] `Promise.all([this.db.find(..., { skip, limit, sort, lean: true }), this.db.countDocuments(filter)])`
  - [ ] Thêm `findById(id: string): Promise<ContactDocument | null>`
    - [ ] `this.db.findById(id)` — trả về null nếu không tìm thấy (không throw)
  - [ ] Thêm `updateStatus(id: string, status: ContactStatus): Promise<ContactDocument | null>`
    - [ ] `this.db.findByIdAndUpdate(id, { $set: { status } }, { new: true })` — trả về updated doc hoặc null
  - [ ] Thêm `findByUser(userId: string, options: { skip, limit, sort }): Promise<{ data: ContactDocument[], total: number }>`
    - [ ] Filter: `{ userId: new Types.ObjectId(userId) }`
    - [ ] `Promise.all([find, count])`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/repositories/contact.repository.ts` (sửa)

---

#### TASK-021: Cập nhật `contact-admin.service.ts`

- **Tham chiếu:** TL3 - Mục 3.5, TL3 - Mục 3.6
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-019, TASK-020
- **Checklist:**
  - [ ] Thêm `getContactList(query: AdminContactsQuery): Promise<PaginatedResult<ContactListItem>>`
    - [ ] Cap limit 100, tính skip, build sort object
    - [ ] `buildContactFilter(query)` → gọi `repo.findAll()`
    - [ ] Map document → `ContactListItem`: bỏ `message`, `ipAddress`, tính `attachmentCount = doc.attachments.length`
    - [ ] Return `{ items, meta }`
  - [ ] Thêm `getContactDetail(id: string): Promise<ContactDetailItem>`
    - [ ] `repo.findById(id)` → throw `NotFoundError` nếu null
    - [ ] Map → `ContactDetailItem`: giữ tất cả fields + map attachments với `buildPreviewUrl()`
  - [ ] Thêm `updateContactStatus(id: string, status: ContactStatus): Promise<ContactListItem>`
    - [ ] `repo.updateStatus(id, status)` → throw `NotFoundError` nếu null
    - [ ] Map updated doc → `ContactListItem`
  - [ ] Thêm `getMyContacts(userId: string, query: MyContactsQuery): Promise<PaginatedResult<UserContactItem>>`
    - [ ] Cap limit 100, tính skip, build sort
    - [ ] `repo.findByUser(userId, { skip, limit, sort })`
    - [ ] Map → `UserContactItem`: chỉ `_id`, `ticketNumber`, `subject`, `category`, `priority`, `status`, `attachmentCount`, `createdAt`
  - [ ] Thêm private `buildPreviewUrl(attachment: ContactAttachment): string | null` (theo TL3 Mục 3.6)
  - [ ] Thêm private `mapToContactListItem(doc: ContactDocument): ContactListItem`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/contact-admin.service.ts` (sửa)
- **Test cần pass:** TC-05.1~09, TC-06.1~04, TC-07.1~04, TC-08.1~05

---

#### TASK-022: Cập nhật `contact-admin.controller.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL3 - Mục 3.4
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-018, TASK-021
- **Checklist:**
  - [ ] Constructor nhận thêm `auth: AuthGuard` và `adminGuard: AdminGuard`
  - [ ] Thêm `public readonly adminRouter = Router()`
  - [ ] Thêm `public readonly userContactRouter = Router()`
  - [ ] `initAdminRoutes()`:
    - [ ] `GET /` → `auth.middleware` → `adminGuard.middleware` → `validate(adminListContactsQuerySchema, 'query')` → `asyncHandler(this.getContactList)`
    - [ ] `GET /:id` → `auth.middleware` → `adminGuard.middleware` → `validate(contactIdParamSchema, 'params')` → `asyncHandler(this.getContactDetail)`
    - [ ] `PATCH /:id/status` → `auth.middleware` → `adminGuard.middleware` → `validate(contactIdParamSchema, 'params')` → `validate(updateContactStatusSchema, 'body')` → `asyncHandler(this.updateContactStatus)`
  - [ ] `initUserRoutes()`:
    - [ ] `GET /me` → `auth.middleware` → `validate(myContactsQuerySchema, 'query')` → `asyncHandler(this.getMyContacts)`
  - [ ] Handler `getContactList`: gọi service, return `HandlerResult` với message `'contactAdmin:success.getContactList'`
  - [ ] Handler `getContactDetail`: lấy `req.params.id`, gọi service, return `HandlerResult`
  - [ ] Handler `updateContactStatus`: lấy `req.params.id` + `req.body.status`, gọi service, return `HandlerResult`
  - [ ] Handler `getMyContacts`: lấy `userId` từ `req.user.userId`, gọi service, return `HandlerResult`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/contact-admin.controller.ts` (sửa)
- **Test cần pass:** TC-05.11 (403), TC-05.12 (401), TC-06.7 (403), TC-07.8 (403), TC-08.6 (401)

---

#### TASK-023: Cập nhật `contact-admin.module.ts` và `modules.loader.ts`

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 0.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-022
- **Checklist:**
  - [ ] `createContactAdminModule()` nhận thêm `auth: AuthGuard`, `adminGuard: AdminGuard`
  - [ ] Truyền vào constructor `ContactAdminController(service, auth, adminGuard, rl, optionalAuth)`
  - [ ] Export thêm `contactAdminQueryAdminRouter` và `contactAdminQueryUserRouter`
  - [ ] `modules.loader.ts`: truyền `auth, adminGuard` vào `createContactAdminModule()`
  - [ ] Mount: `v1Router.use('/admin/contacts', contactAdminQueryAdminRouter)`
  - [ ] Mount: `v1Router.use('/auth/contacts', contactAdminQueryUserRouter)`
  - [ ] Verify server khởi động không lỗi
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/contact-admin.module.ts` (sửa)
  - `server/src/loaders/modules.loader.ts` (sửa)

---

#### TASK-024: Review server v2.0 — Code, Security, Performance

- **Tham chiếu:** Skills: review-code, review-security, review-performance
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-023
- **Checklist:**
  - [ ] **review-code**: pattern consistency với login-history v2.0, naming, no dead code, mapToContactListItem reuse
  - [ ] **review-security**: user isolation (`/auth/contacts/me` chỉ trả data của chính user), admin authZ không bị bypass, input sanitization qua Joi, ObjectId validation trước khi query
  - [ ] **review-performance**: `lean()` trong repo, `Promise.all` cho count+find, index `{ userId: 1 }` và `{ status: 1, createdAt: -1 }` được dùng
  - [ ] Fix tất cả issues tìm được

---

#### TASK-025: Swagger cho 4 endpoints mới

- **Tham chiếu:** Skill: doc-standards-api, TL3 - Mục 3.4
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-023
- **Checklist:**
  - [ ] Thêm vào `swagger/schemas.ts`: `ContactListItem`, `ContactDetailItem`, `ContactAttachmentResponse`, `UserContactItem`, `PaginatedContactsResponse`, `UpdateContactStatusBody`
  - [ ] Thêm vào `swagger/paths.ts`:
    - [ ] `GET /admin/contacts` — tất cả query params, response 200/400/401/403
    - [ ] `GET /admin/contacts/{id}` — params id, response 200/400/401/403/404
    - [ ] `PATCH /admin/contacts/{id}/status` — params + body, response 200/400/401/403/404
    - [ ] `GET /auth/contacts/me` — query params, response 200/401
  - [ ] Register trong swagger config chính
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/swagger/schemas.ts` (sửa)
  - `server/src/modules/contact-admin/swagger/paths.ts` (sửa)

---

### Phase 7: Frontend Development — v2.0

#### TASK-026: Tạo `dataSources/ContactAdmin/index.ts` (bổ sung)

- **Tham chiếu:** TL1 - US-05, US-06, US-07, US-08
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-023
- **Checklist:**
  - [ ] Thêm `getAdminContacts(params: AdminContactsQuery)` → `GET /api/v1/admin/contacts`
  - [ ] Thêm `getAdminContactDetail(id: string)` → `GET /api/v1/admin/contacts/:id`
  - [ ] Thêm `updateContactStatus(id: string, status: string)` → `PATCH /api/v1/admin/contacts/:id/status`
  - [ ] Thêm `getMyContacts(params: MyContactsQuery)` → `GET /api/v1/auth/contacts/me`
  - [ ] Tạo TypeScript types client-side tương ứng
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/ContactAdmin/index.ts` (sửa)

---

#### TASK-027: Tạo Admin Contact List page và view

- **Tham chiếu:** TL1 - US-05, TL2 - TC-05.x
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-026
- **Checklist:**
  - [ ] Tạo `app/[locale]/(admin)/admin/contacts/page.tsx` (Server Component)
    - [ ] Check admin role server-side, redirect nếu không phải admin
    - [ ] `getMessages()`, render `<AdminContactsView />`
  - [ ] Tạo `views/AdminContacts/index.tsx`
  - [ ] Tạo `views/AdminContacts/mains/AdminContactsTable/` (Client Component)
    - [ ] shadcn Table hiển thị: ticketNumber, email, subject, category, priority, status badge, attachmentCount, createdAt
    - [ ] Mỗi row click → navigate đến detail page
    - [ ] Loading skeleton, empty state
  - [ ] Tạo `views/AdminContacts/mains/AdminContactsFilters/` (Client Component)
    - [ ] React Hook Form: status select, category select, priority select, email input, ticketNumber input, search text, date range pickers
    - [ ] Submit → cập nhật query params → trigger refetch
  - [ ] Tạo `views/AdminContacts/mains/AdminContactsPagination/`
    - [ ] shadcn Pagination, offset-based
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(admin)/admin/contacts/page.tsx` (tạo mới)
  - `client/src/views/AdminContacts/index.tsx` (tạo mới)
  - `client/src/views/AdminContacts/mains/AdminContactsTable/index.tsx` (tạo mới)
  - `client/src/views/AdminContacts/mains/AdminContactsFilters/index.tsx` (tạo mới)
  - `client/src/views/AdminContacts/mains/AdminContactsPagination/index.tsx` (tạo mới)
- **Test cần pass:** TC-05.1, TC-05.2, TC-05.3, TC-05.8 (empty state), TC-05.9

---

#### TASK-028: Tạo Admin Contact Detail page và view

- **Tham chiếu:** TL1 - US-06, US-07, TL2 - TC-06.x, TC-07.x
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-026
- **Checklist:**
  - [ ] Tạo `app/[locale]/(admin)/admin/contacts/[id]/page.tsx` (Server Component)
  - [ ] Tạo `views/AdminContactDetail/index.tsx`
  - [ ] Tạo `views/AdminContactDetail/mains/ContactDetailCard/` (Client Component)
    - [ ] Hiển thị: ticketNumber, email, subject, category, priority, ipAddress, createdAt, updatedAt, message (full text)
    - [ ] Status badge + dropdown để thay đổi status (gọi `updateContactStatus()`)
    - [ ] Loading state khi update status
    - [ ] Toast thành công/thất bại khi update
  - [ ] Tạo `views/AdminContactDetail/mains/ContactAttachments/` (Client Component)
    - [ ] Render danh sách attachments
    - [ ] Image files: hiển thị `<img src={previewUrl} />` với lightbox/modal khi click
    - [ ] Non-image files: hiển thị icon + tên file + size (không có preview)
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(admin)/admin/contacts/[id]/page.tsx` (tạo mới)
  - `client/src/views/AdminContactDetail/index.tsx` (tạo mới)
  - `client/src/views/AdminContactDetail/mains/ContactDetailCard/index.tsx` (tạo mới)
  - `client/src/views/AdminContactDetail/mains/ContactAttachments/index.tsx` (tạo mới)
- **Test cần pass:** TC-06.1, TC-06.2, TC-06.3, TC-07.1, TC-07.2, TC-07.3

---

#### TASK-029: Tạo User My Contacts page và view

- **Tham chiếu:** TL1 - US-08, TL2 - TC-08.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-026
- **Checklist:**
  - [ ] Tạo `app/[locale]/(dashboard)/contacts/me/page.tsx` (Server Component)
  - [ ] Tạo `views/MyContacts/index.tsx`
  - [ ] Tạo `views/MyContacts/mains/MyContactsTable/` (Client Component)
    - [ ] Hiển thị: ticketNumber, subject, category, priority, status badge, attachmentCount, createdAt
    - [ ] Loading skeleton, empty state với message khuyến khích liên hệ
  - [ ] Tạo `views/MyContacts/mains/MyContactsPagination/`
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(dashboard)/contacts/me/page.tsx` (tạo mới)
  - `client/src/views/MyContacts/index.tsx` (tạo mới)
  - `client/src/views/MyContacts/mains/MyContactsTable/index.tsx` (tạo mới)
  - `client/src/views/MyContacts/mains/MyContactsPagination/index.tsx` (tạo mới)
- **Test cần pass:** TC-08.1, TC-08.2, TC-08.3, TC-08.4

---

#### TASK-030: Review client v2.0 — Code, Security

- **Tham chiếu:** Skills: review-code, review-security
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-027, TASK-028, TASK-029
- **Checklist:**
  - [ ] **review-code**: component reuse giữa Admin/User views (pagination, table patterns), React Hook Form patterns, tanstack-query usage
  - [ ] **review-security**: Admin pages protected khỏi non-admin, image preview không XSS (dùng `<img>` không dùng `dangerouslySetInnerHTML`), status update không expose raw errors

---

### Phase 8: Testing & QA — v2.0

#### TASK-031: Unit test — `query-builder.ts` và `buildPreviewUrl()`

- **Tham chiếu:** TL2 - Mục 2.3, NF-09
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-019, TASK-021
- **Checklist:**
  - [ ] Test `buildContactFilter()`: từng filter riêng lẻ (status, category, priority, userId, email, ticketNumber)
  - [ ] Test `search` ($or logic với 3 fields)
  - [ ] Test date range: fromDate only, toDate only, cả hai
  - [ ] Test empty query → empty filter `{}`
  - [ ] Test `buildPreviewUrl()`: image/jpeg → URL, image/png → URL, application/pdf → null, text/plain → null, UNKNOWN → null
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/internals/query-builder.test.ts` (tạo mới)
  - `server/src/modules/contact-admin/contact-admin.service.test.ts` (sửa — thêm buildPreviewUrl tests)

---

#### TASK-032: Unit test — service methods v2.0

- **Tham chiếu:** TL2 - TC-05~08
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-021
- **Checklist:**
  - [ ] Mock `ContactRepository`
  - [ ] Test `getContactList()`: happy path, empty result, cap limit=100, attachmentCount tính đúng, message field không trong response
  - [ ] Test `getContactDetail()`: happy path với attachments (image có previewUrl, PDF không có), 404 khi không tìm thấy, guest contact (userId null)
  - [ ] Test `updateContactStatus()`: happy path update, 404 khi không tìm thấy
  - [ ] Test `getMyContacts()`: happy path, chỉ data của userId đó, empty result
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/__tests__/contact-admin.service.test.ts` (sửa)

---

#### TASK-033: Integration tests — 4 endpoints v2.0

- **Tham chiếu:** TL2 - TC-05~08
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-023, TASK-031, TASK-032
- **Checklist:**
  - [ ] Setup: seed contacts (admin user + regular user A + regular user B)
  - [ ] **GET /admin/contacts:**
    - [ ] TC-05.1: 200, trả về list + meta, không có message field
    - [ ] TC-05.2: filter status=new → chỉ contacts đó
    - [ ] TC-05.3: search text → partial match
    - [ ] TC-05.5: pagination page=2 → đúng records
    - [ ] TC-05.11: user thường → 403
    - [ ] TC-05.12: không có token → 401
    - [ ] TC-05.13: status=invalid → 400
  - [ ] **GET /admin/contacts/:id:**
    - [ ] TC-06.1: 200 + full fields + attachments với previewUrl
    - [ ] TC-06.2: image có previewUrl, PDF không có
    - [ ] TC-06.5: id không tồn tại → 404
    - [ ] TC-06.6: id không hợp lệ → 400
  - [ ] **PATCH /admin/contacts/:id/status:**
    - [ ] TC-07.1: 200, status cập nhật, updatedAt thay đổi
    - [ ] TC-07.5: id không tồn tại → 404
    - [ ] TC-07.6: status invalid → 400
    - [ ] TC-07.8: user thường → 403
  - [ ] **GET /auth/contacts/me:**
    - [ ] TC-08.1: 200, chỉ contacts của user đó
    - [ ] TC-08.5: user A không thấy contacts của user B
    - [ ] TC-08.6: không có token → 401
- **Files sẽ tạo/sửa:**
  - `server/src/modules/contact-admin/__tests__/contact-admin.integration.test.ts` (sửa)

---

## Dependency Graph

```
=== v1.0 (Tasks 001–016) ===

TASK-001 ──────────────────────────────────────────────────────► TASK-006 (multer)
                                                                        │
TASK-002 ──┬──► TASK-003 ──► TASK-004 ──► TASK-009 ──► TASK-010 ──────┤
           ├──► TASK-007                                                │
           └──► TASK-008                                                │
                                                                        │
TASK-005 (optional auth) ──────────────────────────────────────────────┤
                                                                        ▼
                                                             TASK-011 (controller + module + mount)
                                                                        │
                                          ┌─────────────┬──────────────┼────────────┐
                                          ▼             ▼              ▼            ▼
                                     TASK-012       TASK-013      TASK-014      TASK-015
                                      (i18n)       (swagger)    (frontend)   (unit tests)
                                                                                    │
                                                                                    ▼
                                                                             TASK-016 (integration)

=== v2.0 (Tasks 017–033) ===

TASK-017 (types) ──┬──► TASK-018 (Joi schemas) ──────────────────────────────┐
                   └──► TASK-019 (query-builder) ──► TASK-020 (repo) ─────────┤
                                                                               ▼
                                                                     TASK-021 (service)
                                                                               │
                                                              ┌────────────────┤
                                                              ▼                ▼
                                                    TASK-018 (schemas)   TASK-022 (controller)
                                                                               │
                                                                          TASK-023 (module+loader)
                                                                               │
                                                            ┌──────────────────┼──────────────────┐
                                                            ▼                  ▼                  ▼
                                                      TASK-024 (review)  TASK-025 (swagger)  TASK-026 (dataSources)
                                                                                                   │
                                                                              ┌────────────────────┼──────────────┐
                                                                              ▼                    ▼              ▼
                                                                        TASK-027 (admin list) TASK-028 (admin detail) TASK-029 (user own)
                                                                              │
                                                                              └──► TASK-030 (review client)

TASK-019 ──► TASK-031 (unit test query-builder + previewUrl)
TASK-021 ──► TASK-032 (unit test service)
TASK-023 + TASK-031 + TASK-032 ──► TASK-033 (integration tests)
```
