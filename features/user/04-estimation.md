# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị             |
| ---------------------------- | ------------------- |
| **Tổng thời gian ước lượng** | ~4 ngày             |
| **Số developer**             | 1 người             |
| **Ngày bắt đầu dự kiến**     | 04/03/2026          |
| **Ngày hoàn thành dự kiến**  | 09/03/2026          |
| **Hệ số buffer**             | 1.3x (thêm 30%)     |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task                                                                 | Tham chiếu        | Ước lượng | Ghi chú                                            |
| -------------------------------------------------------------------- | ----------------- | --------- | -------------------------------------------------- |
| Thêm `USER_CONFIG` + `RATE_LIMIT_CONFIG.USER` vào `config.ts`        | TL3 - Mục 3.7     | 0.5h      |                                                    |
| Thêm `REDIS_KEYS.RATE_LIMIT.USER` vào `infrastructure.ts`            | TL3 - Mục 3.7     | 0.5h      |                                                    |
| Thêm `uploadAvatar` multer middleware vào `file-upload.ts`           | TL3 - Mục 3.7     | 1h        | MIME + extension validate, disk storage            |
| Thêm `updateProfileByIp` + `uploadAvatarByIp` vào `rate-limiter.ts` | TL3 - Mục 3.7     | 1h        |                                                    |
| Kiểm tra + bổ sung `express.static` serve `uploads/` trong app setup | TL3 - Mục 3.7     | 0.5h      |                                                    |

### Phase 2: Backend Development

| Task                                                                        | Tham chiếu            | Ước lượng | Ghi chú                                      |
| --------------------------------------------------------------------------- | --------------------- | --------- | -------------------------------------------- |
| Thêm types mới vào `types/modules/user.ts`                                  | TL3 - Mục 3.6         | 1h        | Request types, response shapes               |
| Thêm 4 methods vào `UserRepository`                                         | TL3 - Mục 3.7         | 1.5h      | `findById`, `updateById`, `updateAvatar`, `findPublicById` |
| Tạo Joi schemas: `updateProfileSchema`, `getPublicProfileSchema`            | TL2 - Mục 2.3, TL3    | 1.5h      | Partial update, dateOfBirth validation, ObjectId regex |
| Tạo `UserService` — 4 methods: getMyProfile, updateMyProfile, updateAvatar, getPublicProfile | TL3 - Mục 3.5 | 2h | Avatar URL construction, email merge         |
| Tạo `UserController` — 4 routes + middleware chain                          | TL3 - Mục 3.4         | 1.5h      | AuthGuard, rate limiter, multer, validate, asyncHandler |
| Tạo `user.module.ts` — factory function `createUserModule()`                | TL3 - Mục 3.6         | 0.5h      |                                              |
| Mount user router trong `modules.loader.ts` tại `/users`                    | TL3 - Mục 3.6         | 0.5h      |                                              |
| Tạo `locales/en/user.json` + `locales/vi/user.json` (server)                | TL2 - NF-06           | 1h        | success + error messages, 2 ngôn ngữ         |
| **Doc standard API** _(bắt buộc)_                                           | Skill: doc-standards-api | 2h     | Swagger/OpenAPI + Postman collection         |
| **Review code** _(bắt buộc)_                                                | Skill: review-code    | 1h        | Code quality, maintainability                |
| **Review performance** _(bắt buộc)_                                         | Skill: review-performance | 1h    | Query optimization (.lean(), .select())      |
| **Review security** _(bắt buộc)_                                            | Skill: review-security | 1h       | OWASP: file upload, path traversal, data exposure |

### Phase 3: Frontend Development

| Task                                                                    | Tham chiếu         | Ước lượng | Ghi chú                                                  |
| ----------------------------------------------------------------------- | ------------------ | --------- | -------------------------------------------------------- |
| Tạo `dataSources/User/index.ts` — 4 API functions                       | TL3 - Mục 3.6      | 1h        | getMyProfile, updateMyProfile, uploadAvatar, getPublicProfile |
| Tạo Zod schema + form props trong `forms/UpdateProfile/`                | TL2 - Mục 2.3      | 1h        | Partial validation, date handling                        |
| Tạo `locales/en/user.json` + `locales/vi/user.json` (client)            | TL2 - NF-06        | 0.5h      |                                                          |
| Tạo page `/profile` + `views/UserProfile/` — xem profile                | TL1 - US-01        | 2h        | Server component, SSR fetch, display fields              |
| Tạo `views/UserProfile/mains/ProfileCard/` — edit mode + PATCH          | TL1 - US-02        | 2.5h      | React Hook Form + Zod, toast on success/fail             |
| Tạo `views/UserProfile/mains/AvatarUpload/` — upload avatar             | TL1 - US-03        | 2h        | File input, preview, POST multipart, toast               |
| Tạo page `/profile/:id` + `views/UserPublicProfile/` — public profile   | TL1 - US-04        | 1.5h      | Server component, read-only, show fullName/avatar/gender |
| **Review code** _(bắt buộc)_                                            | Skill: review-code | 1h        | Component quality, patterns                              |
| **Review performance** _(bắt buộc)_                                     | Skill: review-performance | 0.5h | Core Web Vitals, rendering                        |
| **Review security** _(bắt buộc)_                                        | Skill: review-security | 0.5h  | XSS, sensitive data exposure                             |

### Phase 4: Testing & QA

| Task                                                                    | Tham chiếu        | Ước lượng | Ghi chú                                             |
| ----------------------------------------------------------------------- | ----------------- | --------- | --------------------------------------------------- |
| Test TC-01.x — GET /users/me (6 cases)                                  | TL2 - US-01       | 1h        |                                                     |
| Test TC-02.x — PATCH /users/me (12 cases)                               | TL2 - US-02       | 1.5h      | Tập trung edge cases validation                     |
| Test TC-03.x — POST /users/me/avatar (10 cases)                         | TL2 - US-03       | 1.5h      | MIME type fake test, size limit test                |
| Test TC-04.x — GET /users/:id (7 cases)                                 | TL2 - US-04       | 1h        |                                                     |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | 3.5h                     | ~4.5h                      |
| 2. Backend Development  | 13.5h                    | ~17.5h                     |
| 3. Frontend Development | 12.5h                    | ~16h                       |
| 4. Testing & QA         | 5h                       | ~6.5h                      |
| **TỔNG**                | **34.5h (~4.3 ngày)**    | **~44.5h (~5.5 ngày)**     |
