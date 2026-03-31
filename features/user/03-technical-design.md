# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature User Profile bổ sung 4 API endpoints vào module `user` mới: xem full profile (authenticated), cập nhật profile (authenticated, partial update), upload avatar (authenticated, multipart/form-data), và xem public profile (public). Server dùng Express + Mongoose + Joi validation theo kiến trúc Module Factory → Routes → Controller → Service → Repository. Module có đầy đủ DTOs (mapper pattern), helper (pure functions), swagger docs, và Postman collection. Avatar được lưu local disk với multer (`file-upload.interceptor.ts`), MIME type được validate thực tế. Client có 2 trang Next.js: `/profile` (authenticated, xem + edit) và `/profile/:id` (public, read-only).

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
[Client: /profile]
  → UserProfile view (authenticated)
  → dataSources/User/index.ts
  → PATCH /api/v1/users/me  (update profile)
  → POST  /api/v1/users/me/avatar  (upload avatar)
  → GET   /api/v1/users/me  (get own profile)

[Client: /profile/:id]
  → UserPublicProfile view (public)
  → dataSources/User/index.ts
  → GET /api/v1/users/:id  (get public profile)

[Server]
  user.routes.ts (createUserRoutes)
    → RateLimiterMiddleware (update + avatar, trước authGuard)
    → AuthGuard (me endpoints)
    → bodyPipe / paramsPipe (Joi validation)
    → uploadAvatar (multer middleware, avatar endpoint)
    → UserController
        → UserService
            → UserHelper (buildAvatarUrl)
            → DTOs (toMyProfileDto, toPublicProfileDto, toUploadAvatarDto)
            → MongoUserRepository (MongoDB)
```

---

## 3.3. Data Model

### Thay đổi collection hiện tại

Collection `users` **không thay đổi schema** — tất cả field cần thiết đã tồn tại:

```
users {
  _id: ObjectId
  authId: ObjectId (ref: authentications)
  fullName: String (required, min:2, max:100)
  phone: String (optional)
  avatar: String (optional) — lưu path tương đối, VD: "uploads/avatars/uuid.jpg"
  address: String (optional, max:500)
  dateOfBirth: Date (optional)
  gender: String (optional, enum: male|female|other|prefer_not_to_say)
  createdAt: Date
  updatedAt: Date
}
```

> Lưu ý: `avatar` field hiện lưu path. Khi trả response, service sẽ build full URL từ `BASE_URL + avatar`.

---

## 3.4. API Design

### Endpoint 1: GET /api/v1/users/me — Lấy full profile

```
GET /api/v1/users/me

Headers:
  Authorization: Bearer {idToken}

Response 200:
{
  "message": "user:success.getProfile",
  "data": {
    "_id": "string",
    "fullName": "string",
    "phone": "string | null",
    "avatar": "http://localhost:3000/uploads/avatars/uuid.jpg | null",
    "address": "string | null",
    "dateOfBirth": "2000-01-01T00:00:00.000Z | null",
    "gender": "male | female | other | prefer_not_to_say | null",
    "email": "string",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}

Response 401: Unauthorized (no/invalid token)
Response 500: Internal Server Error (DB unreachable)
```

> `email` lấy từ `req.user.email` (đã có trong AuthGuard) — không cần join collection.

### Endpoint 2: PATCH /api/v1/users/me — Cập nhật profile

```
PATCH /api/v1/users/me

Headers:
  Authorization: Bearer {idToken}
  Content-Type: application/json

Request Body (tất cả optional, partial update):
{
  "fullName": "string",       — min 2, max 100, chỉ chứa chữ cái/space/-.'/
  "phone": "string",          — không được là empty string, format hợp lệ
  "address": "string",        — max 500, chỉ chứa chữ cái/số/,.-.'/#
  "dateOfBirth": "ISO 8601",  — không tương lai, tuổi <= 100
  "gender": "male|female|other|prefer_not_to_say"
}

Response 200:
{
  "message": "user:success.updateProfile",
  "data": {
    "_id": "string",
    "fullName": "string",
    "phone": "string | null",
    "avatar": "full URL | null",
    "address": "string | null",
    "dateOfBirth": "ISO string | null",
    "gender": "string | null",
    "email": "string",
    "createdAt": "ISO string"
  }
}

Response 401: Unauthorized
Response 422: Validation Error (invalid field values)
Response 429: Too Many Requests (rate limit)
Response 500: Internal Server Error
```

### Endpoint 3: POST /api/v1/users/me/avatar — Upload avatar

```
POST /api/v1/users/me/avatar

Headers:
  Authorization: Bearer {idToken}
  Content-Type: multipart/form-data

Request Body (multipart):
  avatar: File  — max 10MB, MIME: image/jpeg|png|webp|gif|avif

Response 200:
{
  "message": "user:success.uploadAvatar",
  "data": {
    "avatarUrl": "http://localhost:3000/uploads/avatars/uuid.jpg"
  }
}

Response 400: Bad Request (no file / file too large / unsupported type)
Response 401: Unauthorized
Response 429: Too Many Requests (rate limit)
Response 500: Internal Server Error (disk write fail)
```

### Endpoint 4: GET /api/v1/users/:id — Public profile

```
GET /api/v1/users/:id

(Không cần Authorization header)

Params:
  id: MongoDB ObjectId (24 hex chars)

Response 200:
{
  "message": "user:success.getPublicProfile",
  "data": {
    "_id": "string",
    "fullName": "string",
    "avatar": "full URL | null",
    "gender": "string | null"
  }
}

Response 400: Bad Request (invalid ObjectId format)
Response 404: Not Found (valid ObjectId nhưng không tồn tại)
Response 500: Internal Server Error
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Flow 1: GET /users/me

```
1. AuthGuard verify idToken → set req.user = { userId, authId, email, roles }
2. Controller gọi service.getMyProfile(userId, email)
3. Service gọi userRepo.findById(userId)
4. Repository query MongoDB: UserModel.findById(userId).select("fullName phone avatar address dateOfBirth gender createdAt").lean()
5. Nếu không tìm thấy → NotFoundError("user:errors.notFound")
6. Service build response qua toMyProfileDto(user, email, buildAvatarUrl(user.avatar))
7. Trả 200 với MyProfileDto
```

### Flow 2: PATCH /users/me

```
1. RateLimiterMiddleware.updateProfileByIp check rate limit (10 req/15min)
2. AuthGuard verify idToken
3. bodyPipe(updateProfileSchema) — Joi validate body (partial, stripUnknown: true)
4. Controller gọi service.updateMyProfile(userId, email, validatedBody)
5. Service gọi userRepo.updateById(userId, updateData)
6. Repository: UserModel.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean()
7. Service build response qua toMyProfileDto() (bao gồm email từ req.user, avatar URL từ buildAvatarUrl())
8. Trả 200 với MyProfileDto
```

### Flow 3: POST /users/me/avatar

```
1. RateLimiterMiddleware.uploadAvatarByIp check rate limit (5 req/15min)
2. AuthGuard verify idToken
3. uploadAvatar middleware (multer):
   - Validate MIME type thực tế (image/jpeg|png|webp|gif|avif)
   - Validate extension (.jpg|.jpeg|.png|.webp|.gif|.avif)
   - Lưu file vào uploads/avatars/{uuid}{ext}
4. Controller gọi service.updateAvatar(userId, req.file?.path)
5. Service check filePath — nếu falsy → 400 BadRequestError("user:errors.noFileUploaded")
6. Service normalize path (relative, forward slashes)
7. Service gọi userRepo.updateAvatar(userId, normalizedPath)
8. Repository: UserModel.updateOne({ _id: userId }, { $set: { avatar: path } })
9. Service build full URL từ path qua buildAvatarUrl()
10. Trả 200 với UploadAvatarDto { avatarUrl: fullUrl }
```

### Flow 4: GET /users/:id

```
1. paramsPipe(getPublicProfileSchema) — Validate :id là ObjectId hợp lệ (24 hex chars)
2. Controller gọi service.getPublicProfile(id)
3. Service gọi userRepo.findPublicById(id)
4. Repository query: UserModel.findById(id).select("fullName avatar gender").lean()
5. Nếu không tìm thấy → NotFoundError("user:errors.notFound")
6. Service build response qua toPublicProfileDto(user, buildAvatarUrl(user.avatar))
7. Trả 200 với PublicProfileDto { _id, fullName, avatar, gender }
```

---

## 3.6. Cấu trúc file (File Structure)

### Server — Files MỚI cần tạo

```
server/src/
├── modules/
│   └── user/
│       ├── user.module.ts          — factory function createUserModule()
│       ├── user.controller.ts      — UserController class, handler methods only
│       ├── user.routes.ts          — createUserRoutes() factory, route wiring + middleware stack
│       ├── user.service.ts         — UserService class, business logic
│       ├── user.helper.ts          — pure functions (buildAvatarUrl)
│       ├── repositories/
│       │   └── user.repository.ts  — UserRepository type contract + MongoUserRepository class
│       ├── dtos/
│       │   ├── index.ts            — barrel export (types + mappers)
│       │   ├── my-profile.dto.ts   — MyProfileDto interface + toMyProfileDto() mapper
│       │   ├── public-profile.dto.ts — PublicProfileDto interface + toPublicProfileDto() mapper
│       │   └── upload-avatar.dto.ts — UploadAvatarDto interface + toUploadAvatarDto() mapper
│       └── swagger/
│           ├── index.ts            — barrel export (userPaths, userSwaggerSchemas)
│           ├── paths.ts            — OpenAPI paths cho 4 endpoints
│           ├── schemas.ts          — OpenAPI schema definitions
│           └── user.postman_collection.json — Postman collection
│
├── validators/
│   └── schemas/
│       └── user.ts                 — updateProfileSchema, getPublicProfileSchema
│
└── locales/
    ├── en/
    │   └── user.json               — success + error messages (EN)
    └── vi/
        └── user.json               — success + error messages (VI)
```

### Server — Files CẦN SỬA

```
server/src/
├── middlewares/
│   ├── guards/
│   │   └── auth.guard.ts           — AuthGuard verify idToken (đã có)
│   ├── interceptors/
│   │   └── file-upload.interceptor.ts — THÊM: uploadAvatar export (multer for avatars)
│   └── common/
│       └── rate-limiter.middleware.ts — THÊM: updateProfileByIp, uploadAvatarByIp properties
│
├── constants/
│   ├── modules/
│   │   └── user/
│   │       └── index.ts            — GENDERS enum, USER_CONFIG (avatar max size, upload dir, base URL)
│   └── redis/
│       └── rate-limit/
│           └── index.ts            — THÊM: RATE_LIMIT_CONFIG.USER (UPDATE_PROFILE, UPLOAD_AVATAR)
│
├── types/
│   └── modules/
│       └── user.ts                 — THÊM: GetMyProfileRequest, UpdateProfileRequest, UploadAvatarRequest, GetPublicProfileRequest, UpdateProfileData, PublicUserRecord
│
└── loaders/
    └── modules.loader.ts           — THÊM: import + mount createUserModule() tại /users
```

### Client — Files MỚI cần tạo

```
client/src/
├── app/[locale]/
│   ├── (dashboard)/
│   │   └── profile/
│   │       └── page.tsx            — /profile (authenticated, own profile)
│   └── (public)/
│       └── profile/
│           └── [id]/
│               └── page.tsx        — /profile/:id (public profile)
│
├── views/
│   ├── UserProfile/                — Own profile view (xem + edit)
│   │   ├── index.tsx               — Server component, fetch data SSR
│   │   ├── mains/
│   │   │   ├── ProfileCard/        — Hiển thị thông tin + edit mode toggle
│   │   │   └── AvatarUpload/       — Avatar upload section
│   │   └── ghosts/
│   │       └── UpdateProfileEffect/ — Toast sau khi update thành công
│   │
│   └── UserPublicProfile/          — Public profile view (read-only)
│       ├── index.tsx
│       └── mains/
│           └── PublicProfileCard/  — Chỉ hiện fullName, avatar, gender
│
├── dataSources/
│   └── User/
│       └── index.ts                — getMyProfile, updateMyProfile, uploadAvatar, getPublicProfile
│
├── forms/
│   └── UpdateProfile/
│       ├── index.ts                — form field props
│       ├── data.ts                 — default values
│       └── validations.ts          — Zod schema
│
└── locales/
    ├── en/
    │   └── user.json               — client-side i18n
    └── vi/
        └── user.json
```

---

## 3.7. Chi tiết kỹ thuật (Technical Details)

### Avatar Upload Middleware

`uploadAvatar` được export từ `middlewares/interceptors/file-upload.interceptor.ts`, re-export qua `middlewares/index.ts`:

```typescript
// MIME types được phép
const AVATAR_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"
]);

const AVATAR_ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"
]);

// Disk storage: uploads/avatars/{uuid}{ext}
// Max size: USER_CONFIG.AVATAR_MAX_SIZE_BYTES (10MB)
// Field name: "avatar" (single file)
```

### Rate Limiters mới

Thêm vào `RateLimiterMiddleware` class (`middlewares/common/rate-limiter.middleware.ts`):
- `public readonly updateProfileByIp` — 10 req / IP / 15 phút
- `public readonly uploadAvatarByIp` — 5 req / IP / 15 phút

Config trong `constants/redis/rate-limit/index.ts`:
```typescript
RATE_LIMIT_CONFIG.USER = {
  UPDATE_PROFILE: {
    PER_IP: { KEY: "rate-limit:user-update:ip:", MAX_REQUESTS: 10, WINDOW_SECONDS: 900 }
  },
  UPLOAD_AVATAR: {
    PER_IP: { KEY: "rate-limit:user-avatar:ip:", MAX_REQUESTS: 5, WINDOW_SECONDS: 900 }
  }
}
```

### Avatar URL Construction

```typescript
// server/src/constants/modules/user/index.ts
export const USER_CONFIG = {
  AVATAR_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  AVATAR_UPLOAD_DIR: "uploads/avatars",
  BASE_URL: ENV.BASE_URL
} as const;
```

Helper function `buildAvatarUrl` trong `user.helper.ts` build full URL:
```typescript
// server/src/modules/user/user.helper.ts
export function buildAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  return `${USER_CONFIG.BASE_URL}/${avatarPath}`;
}
```

### Joi Validation Schemas

File: `validators/schemas/user.ts`

**updateProfileSchema** (partial update, tất cả optional):
- `fullName`: string, min `FULLNAME_VALIDATION.MIN_LENGTH`, max `FULLNAME_VALIDATION.MAX_LENGTH`, pattern `SAFE_FULLNAME_PATTERN`
- `phone`: string, min 1, max 20, pattern `/^[\d\s()+-]+$/`
- `address`: string, max 500, pattern `SAFE_ADDRESS_PATTERN`
- `dateOfBirth`: ISO date string (`.isoDate()`), custom validator: không tương lai, tuổi <= 100 năm
- `gender`: enum `male | female | other | prefer_not_to_say` (lấy từ `GENDERS` constant)
- Keys không thuộc danh sách trên: strip (Joi `stripUnknown: true`)

**getPublicProfileSchema** (params):
- `id`: string, required, MongoDB ObjectId (24 hex chars), regex `/^[a-fA-F0-9]{24}$/`

### UserRepository

File: `modules/user/repositories/user.repository.ts`

Khai báo `UserRepository` type contract + `MongoUserRepository` class implementing nó. Dùng `asyncDatabaseHandler` để wrap Mongoose queries.

```typescript
type UserRepository = {
  createProfile(data: CreateUserData): Promise<UserRecord>;
  findById(userId: string): Promise<UserDocument | null>;
  updateById(userId: string, data: Partial<UpdateProfileData>): Promise<UserDocument | null>;
  updateAvatar(userId: string, avatarPath: string): Promise<void>;
  findPublicById(userId: string): Promise<PublicUserRecord | null>;
};
```

- `findById()`: select `fullName phone avatar address dateOfBirth gender createdAt`, `.lean()`
- `updateById()`: `findByIdAndUpdate` với `{ $set: data }`, `{ new: true }`, cùng select fields, `.lean()`
- `updateAvatar()`: `updateOne` với `{ $set: { avatar: avatarPath } }`
- `findPublicById()`: select `fullName avatar gender`, `.lean()`
- `createProfile()`: tạo user mới, trả `{ _id, fullName }`

### DTOs

File: `modules/user/dtos/`

Mỗi handler có 1 DTO file riêng với interface + mapper function:

- **`my-profile.dto.ts`**: `MyProfileDto` — chứa `_id, fullName, phone, avatar, address, dateOfBirth, gender, email, createdAt`. Mapper `toMyProfileDto(user, email, avatarUrl)` convert `UserDocument` sang DTO.
- **`public-profile.dto.ts`**: `PublicProfileDto` — chứa `_id, fullName, avatar, gender`. Mapper `toPublicProfileDto(user, avatarUrl)`.
- **`upload-avatar.dto.ts`**: `UploadAvatarDto` — chứa `avatarUrl`. Mapper `toUploadAvatarDto(avatarUrl)`.
- **`index.ts`**: barrel export tất cả types và mappers.

### Module Factory

File: `modules/user/user.module.ts`

```typescript
export const createUserModule = (authGuard: RequestHandler, rateLimiter: RateLimiterMiddleware) => {
  const userRepo = new MongoUserRepository();
  const userService = new UserService(userRepo);
  const userController = new UserController(userService);

  return {
    userRouter: createUserRoutes(userController, authGuard, rateLimiter),
    userService  // exported để signup module dùng createProfile()
  };
};
```

`userService` được export ra ngoài để module `signup` gọi `userService.createProfile()` khi tạo user mới.

### Routes

File: `modules/user/user.routes.ts`

```typescript
createUserRoutes(controller, authGuard, rl): Router
```

Thứ tự middleware trong từng route:
- `GET /me`: `authGuard` → `asyncHandler(controller.getMyProfile)`
- `PATCH /me`: `rl.updateProfileByIp` → `authGuard` → `bodyPipe(updateProfileSchema)` → `asyncHandler(controller.updateMyProfile)`
- `POST /me/avatar`: `rl.uploadAvatarByIp` → `authGuard` → `uploadAvatar` → `asyncHandler(controller.uploadAvatarHandler)`
- `GET /:id`: `paramsPipe(getPublicProfileSchema)` → `asyncHandler(controller.getPublicProfile)`

### Swagger / OpenAPI

File: `modules/user/swagger/`

- `paths.ts`: export `userPaths` — OpenAPI paths cho 4 endpoints (`/users/me`, `/users/me/avatar`, `/users/{id}`)
- `schemas.ts`: export `userSwaggerSchemas` — 5 schema definitions: `UserProfileResponse`, `PublicUserProfileResponse`, `UpdateProfileRequest`, `UploadAvatarRequest`, `UploadAvatarResponse`
- `index.ts`: barrel export
- `user.postman_collection.json`: Postman collection cho testing

### Static files

Server cần serve thư mục `uploads/` dưới dạng static:
```typescript
// Đã có hoặc cần thêm vào app setup:
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
```

Kiểm tra xem `uploads/` đã được serve chưa trong `server/src/loaders/` hoặc `app.ts`.

---

## 3.8. Dependencies & Integrations

| Dependency                    | Loại     | Mô tả                                                |
| ----------------------------- | -------- | ---------------------------------------------------- |
| `UserRepository`              | Internal | Query MongoDB collection `users`                     |
| `AuthGuard`                   | Internal | Verify idToken, cung cấp `req.user.userId` và `email` |
| `RateLimiterMiddleware`       | Internal | Giới hạn request update/upload                       |
| `multer`                      | Internal | File upload middleware (disk storage) — đã có        |
| `uuid`                        | Internal | Generate unique filename cho avatar — đã có          |
| `express.static`              | Internal | Serve uploaded files                                 |
| MongoDB `users` collection    | Internal | Read/write user data                                 |

---

## 3.9. Migration & Deployment Strategy

**Feature flag:** Không cần — schema không thay đổi, chỉ thêm endpoints mới.

**Rollback plan:** Xóa route mount trong `modules.loader.ts` để disable toàn bộ module. Không có DB migration → rollback ngay lập tức.

**Thư mục uploads:** Cần tạo `server/uploads/avatars/` và đảm bảo Express serve static. Thư mục tự tạo khi upload lần đầu (`fs.mkdirSync({ recursive: true })`).
