# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị          |
| ---------------------------- | ---------------- |
| **Tổng thời gian ước lượng** | ~2 ngày          |
| **Số developer**             | 1 người          |
| **Ngày bắt đầu dự kiến**     | 05/03/2026       |
| **Ngày hoàn thành dự kiến**  | 06/03/2026       |
| **Hệ số buffer**             | 1.3x (+30%)      |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation (Server)

| Task                                                                 | Tham chiếu         | Ước lượng | Ghi chú                                         |
| -------------------------------------------------------------------- | ------------------ | --------- | ----------------------------------------------- |
| Tạo `admin.guard.ts` — check `req.user.roles === 'admin'`, 403 error | TL3 - Mục 3.7      | 1h        | Theo pattern `auth.guard.ts`                    |
| Tạo `validators/schemas/login-history.ts` — Joi schemas cho query params (User + Admin) | TL3 - Mục 3.7 / TL2 - Mục 2.3 | 1.5h | 14 params, enum validations, date range check |
| Tạo `internals/query-builder.ts` — build Mongoose FilterQuery từ query params | TL3 - Mục 3.7  | 1.5h      | Partial match (regex) cho string fields, date range cho createdAt |
| Thêm `maskIp()` vào `internals/helpers.ts`                          | TL3 - Mục 3.6      | 0.5h      | IPv4 + IPv6 masking logic                       |
| Cập nhật `types/modules/login-history.ts` — thêm types mới          | TL3 - Mục 3.8      | 1h        | PaginatedResult, LoginHistoryQuery, LoginHistoryItem, ... |

### Phase 2: Backend Development (Server)

| Task                                                                          | Tham chiếu         | Ước lượng | Ghi chú                                                  |
| ----------------------------------------------------------------------------- | ------------------ | --------- | -------------------------------------------------------- |
| Cập nhật `login-history.repository.ts` — thêm `findByUser()` và `findAll()`  | TL3 - Mục 3.7      | 2h        | Dùng `db.find()` + `db.countDocuments()` từ MongoDBRepository |
| Cập nhật `login-history.service.ts` — thêm `getMyLoginHistory()` và `getAllLoginHistory()` | TL3 - Mục 3.5 | 2h   | Cap limit, gọi repo, apply maskIp(), format response     |
| Tạo `login-history.controller.ts` — `userRouter` và `adminRouter`            | TL3 - Mục 3.7      | 2h        | 2 routers, auth + adminGuard middlewares, validate query |
| Cập nhật `login-history.module.ts` — inject auth, adminGuard, rateLimiter; export routers | TL3 - Mục 3.7 | 0.5h | Theo pattern `user.module.ts`                          |
| Cập nhật `modules.loader.ts` — mount 2 routes mới                           | TL3 - Mục 3.7      | 0.5h      | `v1Router.use('/auth/login-history', ...)` và `/admin/login-history` |
| **Review code** _(bắt buộc)_                                                 | Skill: review-code | 1h        | Code quality, maintainability, pattern consistency       |
| **Review security** _(bắt buộc)_                                             | Skill: review-security | 1h    | OWASP: authZ isolation (user chỉ thấy data mình), IP masking, input validation |
| **Review performance** _(bắt buộc)_                                          | Skill: review-performance | 1h | Index usage, query efficiency, lean() optimization  |
| **Doc API** _(bắt buộc)_                                                     | Skill: doc-standards-api | 1.5h | Swagger/OpenAPI cho 2 endpoints + Postman collection |

### Phase 3: Frontend Development (Client)

| Task                                                                                  | Tham chiếu    | Ước lượng | Ghi chú                                                       |
| ------------------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------------------------------- |
| Tạo `dataSources/LoginHistory/index.ts` — API call functions (`getMyLoginHistory`, `getAdminLoginHistory`) | TL1 - US-04, US-05 | 1h | Axios calls với query params                   |
| Tạo page + view User: `app/[locale]/(dashboard)/login-history/page.tsx` + `views/LoginHistory/` | TL1 - US-04 | 3h  | Server component page, view structure (index, mains, components) |
| Tạo page + view Admin: `app/[locale]/(dashboard)/admin/login-history/page.tsx` + `views/AdminLoginHistory/` | TL1 - US-05 | 3h | Admin-only page với filter/sort controls + bảng hiển thị full data |
| Tạo filter/sort UI component — form inputs, dropdowns, date range picker dùng chung | TL2 - TC-04.x | 2h        | shadcn/ui components, React Hook Form                         |
| Tích hợp pagination component                                                         | TL2 - TC-04.6 | 1h        | Offset-based, shadcn Pagination                               |
| **Review code** _(bắt buộc)_                                                         | Skill: review-code | 1h   | React patterns, component structure, hook usage               |
| **Review security** _(bắt buộc)_                                                     | Skill: review-security | 0.5h | XSS, sensitive data exposure trong UI                    |

### Phase 4: Testing & QA

| Task                                                                        | Tham chiếu       | Ước lượng | Ghi chú                                              |
| --------------------------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------------- |
| Unit test: `admin.guard.ts` — happy path + 401/403 scenarios                | TL2 - TC-05.9/10 | 1h        |                                                      |
| Unit test: `query-builder.ts` — tất cả filter combinations                  | TL2 - Mục 2.3    | 1h        | Test từng filter riêng + combination                 |
| Unit test: `maskIp()` — IPv4, IPv6, UNKNOWN, edge cases                     | TL2 - NF-04      | 0.5h      |                                                      |
| Unit test: service `getMyLoginHistory()` — happy, empty, cap limit          | TL2 - TC-04.x    | 1h        | Mock repo, verify maskIp applied                     |
| Unit test: service `getAllLoginHistory()` — happy, userId filter, admin check | TL2 - TC-05.x  | 1h        | Mock repo, verify NO masking                         |
| Integration test: GET /auth/login-history — pagination, filter, sort, masking | TL2 - TC-04.x  | 1.5h      | Supertest, seeded data                               |
| Integration test: GET /admin/login-history — authZ 403, userId filter, full IP | TL2 - TC-05.x | 1.5h      | Supertest, verify role check                         |

---

## 4.3. Tổng hợp theo Phase

| Phase                        | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ---------------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation        | 5.5h                     | ~7h                        |
| 2. Backend Development       | 11.5h                    | ~15h                       |
| 3. Frontend Development      | 11.5h                    | ~15h                       |
| 4. Testing & QA              | 7.5h                     | ~10h                       |
| **TỔNG**                     | **36h (~4.5 ngày)**      | **~47h (~6 ngày)**         |

> Với 1 developer làm full-time, ước lượng **4–5 ngày làm việc** (không buffer) hoặc **~6 ngày** (có buffer).
