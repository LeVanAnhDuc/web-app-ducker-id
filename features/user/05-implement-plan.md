# IMPLEMENTATION PLAN: User Profile

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 24         |
| Hoàn thành   | 0/24       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 04/03/2026 |

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

---

### Phase 1: Setup & Foundation

#### TASK-001: Thêm USER_CONFIG và RATE_LIMIT_CONFIG.USER vào config.ts

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `USER_CONFIG` với `AVATAR_MAX_SIZE_BYTES` (10MB), `AVATAR_UPLOAD_DIR`, `BASE_URL`
  - [ ] Thêm `RATE_LIMIT_CONFIG.USER.UPDATE_PROFILE.PER_IP` (10 req / 900s)
  - [ ] Thêm `RATE_LIMIT_CONFIG.USER.UPLOAD_AVATAR.PER_IP` (5 req / 900s)
- **Files sẽ tạo/sửa:**
  - `server/src/constants/config.ts` (sửa)

---

#### TASK-002: Thêm REDIS_KEYS.RATE_LIMIT.USER vào infrastructure.ts

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `REDIS_KEYS.RATE_LIMIT.USER.UPDATE_IP = "rate-limit:user-update:ip:"`
  - [ ] Thêm `REDIS_KEYS.RATE_LIMIT.USER.AVATAR_IP = "rate-limit:user-avatar:ip:"`
- **Files sẽ tạo/sửa:**
  - `server/src/constants/infrastructure.ts` (sửa)

---

#### TASK-003: Thêm uploadAvatar multer middleware vào file-upload.ts

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Định nghĩa `AVATAR_ALLOWED_MIME_TYPES` (image/jpeg, png, webp, gif, avif)
  - [ ] Định nghĩa `AVATAR_ALLOWED_EXTENSIONS` (.jpg, .jpeg, .png, .webp, .gif, .avif)
  - [ ] Tạo `avatarStorage` — disk storage, lưu vào `uploads/avatars/{uuid}{ext}`, `fs.mkdirSync` recursive
  - [ ] Tạo `avatarFileFilter` — validate cả MIME type VÀ extension, throw `BadRequestError` nếu không hợp lệ
  - [ ] Export `uploadAvatar: RequestHandler` — wrap `upload.single("avatar")`, handle `LIMIT_FILE_SIZE` → 400
  - [ ] Handle trường hợp không có file (req.file undefined) — xử lý ở controller
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/file-upload.ts` (sửa)
- **Test cần pass:** TC-03.3, TC-03.4, TC-03.5, TC-03.6, TC-03.7, TC-03.8

---

#### TASK-004: Thêm updateProfileByIp và uploadAvatarByIp vào RateLimiterMiddleware

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001, TASK-002
- **Checklist:**
  - [ ] Khai báo `public readonly updateProfileByIp: RateLimitRequestHandler`
  - [ ] Khai báo `public readonly uploadAvatarByIp: RateLimitRequestHandler`
  - [ ] Khởi tạo trong constructor: `RATE_LIMIT_CONFIG.USER.UPDATE_PROFILE.PER_IP`, Redis key `USER.UPDATE_IP`
  - [ ] Khởi tạo trong constructor: `RATE_LIMIT_CONFIG.USER.UPLOAD_AVATAR.PER_IP`, Redis key `USER.AVATAR_IP`
  - [ ] i18n handler key: `"user:errors.rateLimitExceeded"`
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/rate-limiter.ts` (sửa)
- **Test cần pass:** TL2 - Mục 2.5 (rate limit rows)

---

#### TASK-005: Kiểm tra và bổ sung express.static serve uploads/

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tìm kiếm trong `server/src/` xem `express.static` đã được setup chưa
  - [ ] Nếu chưa: thêm `app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))` vào app setup
  - [ ] Verify: upload 1 file test, truy cập URL → file được serve đúng
- **Files sẽ tạo/sửa:**
  - `server/src/loaders/app.loader.ts` hoặc `server/src/app.ts` (sửa nếu cần)

---

### Phase 2: Backend Development

#### TASK-006: Thêm types mới vào types/modules/user.ts

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `GetMyProfileRequest` (extends AuthRequest)
  - [ ] Thêm `UpdateProfileRequest` (extends AuthRequest, body: UpdateProfileData)
  - [ ] Thêm `UploadAvatarRequest` (extends AuthRequest, file: Express.Multer.File)
  - [ ] Thêm `GetPublicProfileRequest` (extends Request, params: { id: string })
  - [ ] Thêm `UpdateProfileData` type (partial của các field có thể update)
  - [ ] Thêm `MyProfileResponse` (full profile fields + email)
  - [ ] Thêm `PublicProfileResponse` (_id, fullName, avatar, gender)
  - [ ] Thêm `UploadAvatarResponse` ({ avatarUrl: string })
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/user.ts` (sửa)

---

#### TASK-007: Thêm 4 methods vào UserRepository

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-006
- **Checklist:**
  - [ ] `findById(userId: string): Promise<UserDocument | null>` — `.findById().lean()`
  - [ ] `updateById(userId: string, data: Partial<UpdateProfileData>): Promise<UserDocument | null>` — `.findByIdAndUpdate({ $set: data }, { new: true }).lean()`
  - [ ] `updateAvatar(userId: string, avatarPath: string): Promise<void>` — `.findByIdAndUpdate({ $set: { avatar: avatarPath } })`
  - [ ] `findPublicById(userId: string): Promise<PublicUserRecord | null>` — `.findById().select("fullName avatar gender").lean()`
  - [ ] Verify: tất cả methods dùng `.lean()` để tối ưu performance
- **Files sẽ tạo/sửa:**
  - `server/src/repositories/user.repository.ts` (sửa)
- **Test cần pass:** TC-01.6, TC-02.12, TC-04.7

---

#### TASK-008: Tạo Joi validation schemas cho user

- **Tham chiếu:** TL2 - Mục 2.3, TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] `updateProfileSchema`:
    - `fullName`: optional string, min 2, max 100, pattern `SAFE_FULLNAME_PATTERN`
    - `phone`: optional string, không được empty (`min(1)`), regex format
    - `address`: optional string, max 500, pattern `SAFE_ADDRESS_PATTERN`
    - `dateOfBirth`: optional ISO string, custom validate: không tương lai + tuổi <= 100 năm
    - `gender`: optional enum (`male|female|other|prefer_not_to_say`)
    - `stripUnknown: true` để ignore unknown fields (TC-02.10)
  - [ ] `getPublicProfileSchema` (params):
    - `id`: string, regex `/^[a-fA-F0-9]{24}$/`, required
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/user.ts` (tạo mới)
- **Test cần pass:** TC-02.4, TC-02.6, TC-02.7, TC-02.8, TC-02.9, TC-02.10, TC-04.6

---

#### TASK-009: Tạo server i18n files user.json (en + vi)

- **Tham chiếu:** TL2 - NF-06
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] `locales/en/user.json`: success messages (getProfile, updateProfile, uploadAvatar, getPublicProfile) + error messages (rateLimitExceeded, notFound, invalidId, noFileUploaded)
  - [ ] `locales/vi/user.json`: tương tự bằng tiếng Việt
  - [ ] Đăng ký namespace `user` trong i18n config server (nếu cần)
- **Files sẽ tạo/sửa:**
  - `server/src/locales/en/user.json` (tạo mới)
  - `server/src/locales/vi/user.json` (tạo mới)

---

#### TASK-010: Tạo UserService

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-006, TASK-007, TASK-009
- **Checklist:**
  - [ ] `getMyProfile(userId, email)`: gọi `userRepo.findById()`, throw `NotFoundError` nếu null, build `avatarUrl` từ `BASE_URL`, merge `email`
  - [ ] `updateMyProfile(userId, email, data)`: gọi `userRepo.updateById()`, throw `NotFoundError` nếu null, return updated profile với full URL
  - [ ] `updateAvatar(userId, filePath)`: gọi `userRepo.updateAvatar()`, build + return full `avatarUrl`
  - [ ] `getPublicProfile(userId)`: gọi `userRepo.findPublicById()`, throw `NotFoundError` nếu null, build `avatarUrl`
  - [ ] Helper private `buildAvatarUrl(path: string | null): string | null`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/user/user.service.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-02.1, TC-02.2, TC-02.3, TC-03.1, TC-03.2, TC-04.1, TC-04.4, TC-04.5

---

#### TASK-011: Tạo UserController

- **Tham chiếu:** TL3 - Mục 3.4, 3.5
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003, TASK-004, TASK-008, TASK-010
- **Checklist:**
  - [ ] `GET /me` — middleware chain: `auth.middleware`, `asyncHandler(getMyProfile)`
  - [ ] `PATCH /me` — chain: `rl.updateProfileByIp`, `auth.middleware`, `validate(updateProfileSchema, "body")`, `asyncHandler(updateMyProfile)`
  - [ ] `POST /me/avatar` — chain: `rl.uploadAvatarByIp`, `auth.middleware`, `uploadAvatar`, `asyncHandler(uploadAvatar)`
  - [ ] `GET /:id` — chain: `validate(getPublicProfileSchema, "params")`, `asyncHandler(getPublicProfile)`
  - [ ] Handler `getMyProfile`: gọi service, return `HandlerResult` với `STATUS_CODES.OK`
  - [ ] Handler `updateMyProfile`: gọi service, return `HandlerResult` với `STATUS_CODES.OK`
  - [ ] Handler `uploadAvatarHandler`: check `req.file` — nếu không có → throw `BadRequestError("user:errors.noFileUploaded")`; gọi service, return `HandlerResult`
  - [ ] Handler `getPublicProfile`: gọi service, return `HandlerResult` với `STATUS_CODES.OK`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/user/user.controller.ts` (tạo mới)
- **Test cần pass:** TC-01.4, TC-01.5, TC-02.11, TC-03.7, TC-03.9, TC-04.2, TC-04.3

---

#### TASK-012: Tạo user.module.ts và mount router

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 0.5h + 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Tạo `createUserModule(auth, rateLimiter)` — wire DI: UserRepository → UserService → UserController
  - [ ] Return `{ userRouter: controller.router }`
  - [ ] Import `createUserModule` trong `modules.loader.ts`
  - [ ] Khởi tạo và mount: `v1Router.use("/users", userRouter)`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/user/user.module.ts` (tạo mới)
  - `server/src/loaders/modules.loader.ts` (sửa)

---

#### TASK-013: API Documentation (Swagger + Postman)

- **Tham chiếu:** Skill: doc-standards-api, TL3 - Mục 3.4
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-012
- **Checklist:**
  - [ ] Tạo Swagger spec cho cả 4 endpoints
  - [ ] Document tất cả response codes (200, 400, 401, 404, 422, 429, 500)
  - [ ] Tạo Postman collection với test scenarios từ TL2
- **Files sẽ tạo/sửa:**
  - `server/src/modules/user/swagger/` (tạo mới)

---

#### TASK-014: Review Backend (code + performance + security)

- **Tham chiếu:** Skill: review-code, review-performance, review-security
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Review code: naming, structure, dead code, reusability
  - [ ] Review performance: `.lean()` trên tất cả queries, `.select()` chỉ lấy field cần thiết
  - [ ] Review security: MIME type validation thực tế, path traversal safe, public profile không lộ nhạy cảm, rate limit đúng chỗ
  - [ ] Fix tất cả issues tìm được

---

### Phase 3: Frontend Development

#### TASK-015: Tạo dataSources/User/index.ts

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có (có thể làm song song với backend)
- **Checklist:**
  - [ ] `getMyProfile()` — GET `/api/v1/users/me`, return `MyProfileResponse`
  - [ ] `updateMyProfile(data)` — PATCH `/api/v1/users/me`, body JSON, return `MyProfileResponse`
  - [ ] `uploadAvatar(file)` — POST `/api/v1/users/me/avatar`, FormData `avatar`, return `{ avatarUrl }`
  - [ ] `getPublicProfile(id)` — GET `/api/v1/users/${id}`, return `PublicProfileResponse`
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/User/index.ts` (tạo mới)

---

#### TASK-016: Tạo Zod schema và form props UpdateProfile

- **Tham chiếu:** TL2 - Mục 2.3, TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] `forms/UpdateProfile/validations.ts`: Zod schema partial, `fullName` min2/max100/pattern, `phone` no-empty, `dateOfBirth` no-future/age<=100, `gender` enum, `address` max500
  - [ ] `forms/UpdateProfile/index.ts`: field props (label, name, placeholder, type)
  - [ ] `forms/UpdateProfile/data.ts`: default values (empty strings / undefined)
- **Files sẽ tạo/sửa:**
  - `client/src/forms/UpdateProfile/validations.ts` (tạo mới)
  - `client/src/forms/UpdateProfile/index.ts` (tạo mới)
  - `client/src/forms/UpdateProfile/data.ts` (tạo mới)

---

#### TASK-017: Tạo client i18n files user.json (en + vi)

- **Tham chiếu:** TL2 - NF-06
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] `locales/en/user.json`: labels, placeholders, success/error toasts, field validation messages
  - [ ] `locales/vi/user.json`: tương tự bằng tiếng Việt
- **Files sẽ tạo/sửa:**
  - `client/src/locales/en/user.json` (tạo mới)
  - `client/src/locales/vi/user.json` (tạo mới)

---

#### TASK-018: Tạo trang /profile — xem profile bản thân

- **Tham chiếu:** TL1 - US-01, TL3 - Mục 3.6
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-015, TASK-017
- **Checklist:**
  - [ ] Tạo `app/[locale]/(dashboard)/profile/page.tsx` — server component, redirect nếu chưa login
  - [ ] Tạo `views/UserProfile/index.tsx` — server component, gọi `getMyProfile()`, pass data xuống client
  - [ ] Tạo `views/UserProfile/mains/ProfileCard/index.tsx` — hiển thị avatar, fullName, phone, address, dateOfBirth, gender, email, createdAt
  - [ ] Avatar hiển thị với fallback (nếu null hiển thị placeholder)
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(dashboard)/profile/page.tsx` (tạo mới)
  - `client/src/views/UserProfile/index.tsx` (tạo mới)
  - `client/src/views/UserProfile/mains/ProfileCard/index.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2

---

#### TASK-019: Tạo edit mode và PATCH profile

- **Tham chiếu:** TL1 - US-02, TL3 - Mục 3.6
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016, TASK-018
- **Checklist:**
  - [ ] Thêm "Edit" toggle vào `ProfileCard` — switch giữa view mode và edit mode
  - [ ] Edit mode: React Hook Form + Zod schema, pre-fill từ current profile data
  - [ ] Submit: gọi `updateMyProfile()`, toast success hoặc error
  - [ ] Optimistic update hoặc refetch sau khi PATCH thành công
  - [ ] Disable submit khi form không dirty
- **Files sẽ tạo/sửa:**
  - `client/src/views/UserProfile/mains/ProfileCard/index.tsx` (sửa)
- **Test cần pass:** TC-02.1, TC-02.2, TC-02.3, TC-02.4, TC-02.5, TC-02.8, TC-02.9, TC-02.10

---

#### TASK-020: Tạo AvatarUpload section

- **Tham chiếu:** TL1 - US-03, TL3 - Mục 3.6
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-015, TASK-018
- **Checklist:**
  - [ ] Tạo `views/UserProfile/mains/AvatarUpload/index.tsx`
  - [ ] File input ẩn, trigger bằng click vào avatar/button
  - [ ] Client-side validate: MIME type + size trước khi upload
  - [ ] Preview ảnh mới trước khi submit (URL.createObjectURL)
  - [ ] Gọi `uploadAvatar(file)`, toast success/error
  - [ ] Cập nhật avatar hiển thị sau khi upload thành công
- **Files sẽ tạo/sửa:**
  - `client/src/views/UserProfile/mains/AvatarUpload/index.tsx` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.2, TC-03.3, TC-03.5, TC-03.6, TC-03.7

---

#### TASK-021: Tạo trang /profile/:id — public profile

- **Tham chiếu:** TL1 - US-04, TL3 - Mục 3.6
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-015, TASK-017
- **Checklist:**
  - [ ] Tạo `app/[locale]/(public)/profile/[id]/page.tsx` — server component, public (không cần auth)
  - [ ] Tạo `views/UserPublicProfile/index.tsx` — gọi `getPublicProfile(id)`, handle 404
  - [ ] Tạo `views/UserPublicProfile/mains/PublicProfileCard/index.tsx` — hiển thị chỉ fullName, avatar (với fallback), gender
  - [ ] Nếu `id` không hợp lệ hoặc user không tồn tại → redirect hoặc show error page
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(public)/profile/[id]/page.tsx` (tạo mới)
  - `client/src/views/UserPublicProfile/index.tsx` (tạo mới)
  - `client/src/views/UserPublicProfile/mains/PublicProfileCard/index.tsx` (tạo mới)
- **Test cần pass:** TC-04.1, TC-04.2, TC-04.3, TC-04.4

---

#### TASK-022: Review Frontend (code + performance + security)

- **Tham chiếu:** Skill: review-code, review-performance, review-security
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-021
- **Checklist:**
  - [ ] Review code: component structure, prop types, reusability
  - [ ] Review performance: không fetch không cần thiết, image optimization, bundle size
  - [ ] Review security: không expose sensitive data trong client, XSS safe, avatar URL validated
  - [ ] Fix tất cả issues tìm được

---

### Phase 4: Testing & QA

#### TASK-023: Test server API (35 test cases từ TL2)

- **Tham chiếu:** TL2 - Mục 2.2
- **Ước lượng:** 5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-014
- **Checklist:**
  - [ ] TC-01.x (6 cases): GET /users/me — happy, edge, error
  - [ ] TC-02.x (12 cases): PATCH /users/me — tập trung validation edge cases
  - [ ] TC-03.x (10 cases): POST /users/me/avatar — MIME fake test, size limit
  - [ ] TC-04.x (7 cases): GET /users/:id — invalid ObjectId, not found
  - [ ] Cập nhật trạng thái trong `02-acceptance-criteria.md`

---

#### TASK-024: Test client UI và integration

- **Tham chiếu:** TL2 - Mục 2.2, 2.7 (DoD)
- **Ước lượng:** Included trong TASK-023
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-022, TASK-023
- **Checklist:**
  - [ ] Test trang `/profile`: xem đúng data, edit thành công, toast hiện đúng
  - [ ] Test avatar upload: preview đúng, upload thành công, avatar cập nhật
  - [ ] Test trang `/profile/:id`: public access, chỉ hiện 3 fields
  - [ ] Verify DoD: tất cả criteria trong TL2 - Mục 2.7

---

## Dependency Graph

```
TASK-001 ──→ TASK-003 ──→ TASK-011 ──┐
TASK-002 ──→ TASK-004 ──→ TASK-011 ──┤
                                      ├──→ TASK-012 ──→ TASK-013 ──→ TASK-014 ──→ TASK-023
TASK-006 ──→ TASK-007 ──→ TASK-010 ──┤
TASK-008 ──→ TASK-011                 │
TASK-009 ──→ TASK-010                 │
TASK-005 (độc lập)                    │
                                      └──→ TASK-024
TASK-015 ──→ TASK-018 ──→ TASK-019 ──┐
TASK-016 ──→ TASK-019                 ├──→ TASK-022 ──→ TASK-024
TASK-017 ──→ TASK-018                 │
TASK-015 ──→ TASK-020 ──→ TASK-022 ──┤
TASK-015 ──→ TASK-021 ──→ TASK-022 ──┘
```
