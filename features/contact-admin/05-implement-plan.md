# IMPLEMENTATION PLAN: Contact Admin

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục           | Giá trị    |
| ------------- | ---------- |
| Tổng số task  | 16         |
| Hoàn thành    | 0/16       |
| Tiến độ       | 0%         |
| Ngày bắt đầu | 04/03/2026 |

---

## Thứ tự implement

### Phase 1: Setup & Foundation

#### TASK-001: Cài đặt dependencies

- **Tham chiếu:** TL3 - Mục 3.8
- **Ước lượng:** 15m
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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
- **Trạng thái:** ⬜ Todo
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

## Dependency Graph

```
TASK-001 (dependencies) ──────────────────► TASK-006 (multer middleware)
                                                          │
TASK-002 (constants) ──┬──► TASK-003 (types) ──► TASK-004 (model) ──► TASK-009 (repo) ──► TASK-010 (service)
                       │                                                                        │
                       ├──► TASK-007 (validation)                                               │
                       │                                                                        │
                       └──► TASK-008 (rate limiter)                                             │
                                                                                                │
TASK-005 (optional auth) ──────────────────────────────────────────────────────────────────┐     │
                                                                                           ▼     ▼
                                                                                    TASK-011 (controller + module + mount)
                                                                                           │
                                                                    ┌──────────────┬───────┼────────────┐
                                                                    ▼              ▼       ▼            ▼
                                                              TASK-012 (i18n) TASK-013 (swagger) TASK-014 (frontend) TASK-015 (unit tests)
                                                                                                                          │
                                                                                                                          ▼
                                                                                                                    TASK-016 (integration tests)
```
