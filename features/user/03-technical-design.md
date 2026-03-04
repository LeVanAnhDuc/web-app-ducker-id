# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature User Profile bổ sung 4 API endpoints vào module `user` mới: xem full profile (authenticated), cập nhật profile (authenticated, partial update), upload avatar (authenticated, multipart/form-data), và xem public profile (public). Server dùng Express + Mongoose + Joi validation theo đúng kiến trúc Controller → Service → Repository hiện có. Avatar được lưu local disk với multer (tương tự pattern `uploadContactFiles`), MIME type được validate thực tế. Client có 2 trang Next.js: `/profile` (authenticated, xem + edit) và `/profile/:id` (public, read-only).

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
  UserController
    → AuthGuard (me endpoints)
    → RateLimiterMiddleware (update + avatar)
    → uploadAvatar (multer middleware)
    → validate (Joi schema)
    → UserService
        → UserRepository (MongoDB)
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
2. Controller gọi service.getMyProfile(userId)
3. Service gọi userRepo.findById(userId)
4. Repository query MongoDB: UserModel.findById(userId).lean()
5. Service build response:
   - Map avatar path → full URL (BASE_URL + "/" + avatar)
   - Merge email từ req.user.email
6. Trả 200 với full profile data
```

### Flow 2: PATCH /users/me

```
1. AuthGuard verify idToken
2. RateLimiterMiddleware.updateProfileByIp check rate limit (10 req/15min)
3. Joi validate body (partial — chỉ validate field có trong body)
4. Controller gọi service.updateMyProfile(userId, validatedBody)
5. Service gọi userRepo.updateById(userId, updateData)
6. Repository: UserModel.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean()
7. Service build response với full profile (bao gồm email từ req.user)
8. Trả 200 với updated profile
```

### Flow 3: POST /users/me/avatar

```
1. AuthGuard verify idToken
2. RateLimiterMiddleware.uploadAvatarByIp check rate limit (5 req/15min)
3. uploadAvatar middleware (multer):
   - Validate MIME type thực tế (image/jpeg|png|webp|gif|avif)
   - Validate extension (.jpg|.jpeg|.png|.webp|.gif|.avif)
   - Lưu file vào uploads/avatars/{uuid}{ext}
4. Controller check req.file — nếu null → 400 No file uploaded
5. Controller gọi service.updateAvatar(userId, req.file.path)
6. Service gọi userRepo.updateAvatar(userId, relativePath)
7. Repository: UserModel.findByIdAndUpdate(userId, { avatar: path }).lean()
8. Service build full URL từ path
9. Trả 200 với { avatarUrl: fullUrl }
```

### Flow 4: GET /users/:id

```
1. Validate :id là ObjectId hợp lệ (Joi schema)
2. Controller gọi service.getPublicProfile(id)
3. Service gọi userRepo.findPublicById(id)
4. Repository query: UserModel.findById(id).select("fullName avatar gender").lean()
5. Nếu không tìm thấy → NotFoundError
6. Service build response: map avatar → full URL
7. Trả 200 với { _id, fullName, avatar, gender }
```

---

## 3.6. Cấu trúc file (File Structure)

### Server — Files MỚI cần tạo

```
server/src/
├── modules/
│   └── user/
│       ├── user.module.ts          — factory function createUserModule()
│       ├── user.controller.ts      — UserController class, initRoutes()
│       └── user.service.ts         — UserService class
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
├── repositories/
│   └── user.repository.ts          — THÊM: findById(), updateById(), updateAvatar(), findPublicById()
│
├── middlewares/
│   ├── file-upload.ts              — THÊM: uploadAvatar export (multer for avatars)
│   └── rate-limiter.ts             — THÊM: updateProfileByIp, uploadAvatarByIp properties
│
├── constants/
│   ├── config.ts                   — THÊM: USER_CONFIG (avatar max size), RATE_LIMIT_CONFIG.USER
│   └── infrastructure.ts          — THÊM: REDIS_KEYS.RATE_LIMIT.USER
│
├── types/
│   └── modules/
│       └── user.ts                 — THÊM: GetMyProfileRequest, UpdateProfileRequest, UploadAvatarRequest, GetPublicProfileRequest, type aliases cho response shapes
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

Tạo `uploadAvatar` riêng trong `file-upload.ts`, tương tự `uploadContactFiles`:

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

Thêm vào `RateLimiterMiddleware` class:
- `public readonly updateProfileByIp` — 10 req / IP / 15 phút
- `public readonly uploadAvatarByIp` — 5 req / IP / 15 phút

Redis keys:
- `REDIS_KEYS.RATE_LIMIT.USER.UPDATE_IP` = `"rate-limit:user-update:ip:"`
- `REDIS_KEYS.RATE_LIMIT.USER.AVATAR_IP` = `"rate-limit:user-avatar:ip:"`

Config:
```typescript
RATE_LIMIT_CONFIG.USER = {
  UPDATE_PROFILE: { PER_IP: { MAX_REQUESTS: 10, WINDOW_SECONDS: 900 } },
  UPLOAD_AVATAR:  { PER_IP: { MAX_REQUESTS: 5,  WINDOW_SECONDS: 900 } }
}
```

### Avatar URL Construction

```typescript
// server/src/constants/config.ts (thêm vào)
export const USER_CONFIG = {
  AVATAR_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  AVATAR_UPLOAD_DIR: "uploads/avatars",
  BASE_URL: process.env.BASE_URL ?? "http://localhost:3000"
} as const;
```

Service sẽ build full URL:
```
avatarUrl = USER_CONFIG.BASE_URL + "/" + relativePath
// VD: "http://localhost:3000/uploads/avatars/uuid.jpg"
```

### Joi Validation Schemas

**updateProfileSchema** (partial update, tất cả optional):
- `fullName`: string, min 2, max 100, pattern SAFE_FULLNAME_PATTERN
- `phone`: string, không được empty, regex format
- `address`: string, max 500, pattern SAFE_ADDRESS_PATTERN
- `dateOfBirth`: ISO date string, không tương lai, tuổi <= 100 năm
- `gender`: enum `male | female | other | prefer_not_to_say`
- Keys không thuộc danh sách trên: strip (Joi `stripUnknown: true`)

**getPublicProfileSchema** (params):
- `id`: string, MongoDB ObjectId (24 hex chars), regex `/^[a-fA-F0-9]{24}$/`

### UserRepository — Methods mới

```typescript
// Thêm vào user.repository.ts
findById(userId: string): Promise<UserDocument | null>
updateById(userId: string, data: Partial<UpdateUserData>): Promise<UserDocument | null>
updateAvatar(userId: string, avatarPath: string): Promise<void>
findPublicById(userId: string): Promise<PublicUserRecord | null>
```

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
