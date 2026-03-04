# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị          |
| ---------------------------- | ---------------- |
| **Tổng thời gian ước lượng** | ~3.5 ngày        |
| **Số developer**             | 1 người          |
| **Ngày bắt đầu dự kiến**    | 04/03/2026       |
| **Ngày hoàn thành dự kiến**  | 07/03/2026       |
| **Hệ số buffer**             | 1.3x (thêm 30%) |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Cài đặt dependencies (multer, @types/multer, uuid nếu cần) | TL3 - Mục 3.8 | 15m | yarn add |
| Thêm constants: enums, models, infrastructure, config | TL3 - Mục 3.6 | 30m | CONTACT_CATEGORIES, CONTACT_PRIORITIES, CONTACT_STATUSES, MODEL_NAMES, REDIS_KEYS, RATE_LIMIT_CONFIG |
| Tạo TypeScript types cho contact-admin module | TL3 - Mục 3.6 | 30m | SubmitContactRequest, ContactDocument, etc. |
| Tạo Mongoose model (contact.ts) + indexes | TL3 - Mục 3.3 | 45m | Schema, indexes, model export |

### Phase 2: Backend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo OptionalAuthGuard middleware | TL3 - Mục 3.7.1 | 45m | Extends/tương tự AuthGuard, không throw khi không có token |
| Tạo File Upload middleware (multer config) | TL3 - Mục 3.7.2 | 1h | Disk storage, file filter, MIME validation, limits |
| Tạo Joi validation schema (contact-admin.ts) | TL3 - Mục 3.4 | 30m | email, subject, category, priority, message |
| Cập nhật RateLimiterMiddleware: thêm contactByIp | TL3 - Mục 3.7.6 | 15m | public readonly + constructor init |
| Tạo ContactRepository (MongoDBRepository) | TL3 - Mục 3.6 | 30m | CRUD cho contacts collection |
| Tạo ContactAdminService (business logic) | TL3 - Mục 3.5 | 1.5h | Ticket generation, sanitization, build document, save |
| Tạo ContactAdminController | TL3 - Mục 3.7.3 | 45m | Router, middleware chain, handler |
| Tạo ContactAdminModule (DI setup) | TL3 - Mục 3.7.4 | 15m | createContactAdminModule function |
| Cập nhật modules.loader.ts | TL3 - Mục 3.7.5 | 15m | Import, init, mount route |
| Tạo i18n translation keys | TL3 - Mục 3.4 | 30m | Success/error messages |
| **Doc standard API** _(bắt buộc)_ | Skill: doc-standards-api | 1h | Swagger/OpenAPI specs |
| **Review code** _(bắt buộc)_ | Skill: review-code | 30m | Code quality, maintainability |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 30m | Query optimization |
| **Review security** _(bắt buộc)_ | Skill: review-security | 30m | OWASP Top 10, file upload security |

### Phase 3: Frontend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Kết nối ContactAdmin form với API (Axios call) | TL1 - US-01 | 1h | Thay TODO bằng actual API call, multipart/form-data |
| Thêm file upload UI component (nếu chưa có) | TL1 - US-03 | 1.5h | File input, preview, validation client-side |
| Xử lý response: success page, error handling | TL1 - US-01 | 45m | Toast notifications, redirect |
| **Review code** _(bắt buộc)_ | Skill: review-code | 30m | Code quality |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 15m | Bundle size, rendering |
| **Review security** _(bắt buộc)_ | Skill: review-security | 15m | XSS, input sanitization |

### Phase 4: Testing & QA

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Unit tests: Service (ticket generation, sanitization) | TL2 - TC-01, TC-02 | 1.5h | Happy path + edge cases |
| Unit tests: Validation schema | TL2 - Mục 2.3 | 45m | All validation rules |
| Unit tests: Controller (route + middleware chain) | TL2 - TC-01 ~ TC-04 | 1h | Mock service, test responses |
| Integration test: full API flow | TL2 - TC-01.1, TC-01.2 | 1h | Guest + authenticated user |
| Test file upload scenarios | TL2 - TC-03 | 45m | Valid/invalid files, size limit, count limit |
| Test rate limiting | TL2 - Mục 2.5 | 30m | Exceed limit → 429 |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | 2h                       | 2.5h                       |
| 2. Backend Development  | 7.5h                     | 10h                        |
| 3. Frontend Development | 4h                       | 5h                         |
| 4. Testing & QA         | 5.5h                     | 7h                         |
| **TỔNG**                | **19h**                  | **~24.5h (~3.5 ngày)**     |
