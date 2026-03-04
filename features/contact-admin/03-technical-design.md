# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Contact Admin sử dụng kiến trúc module hiện tại của server (Controller → Service → Repository) với MongoDB để lưu trữ yêu cầu liên hệ. File upload sử dụng `multer` lưu trữ local disk. Rate limiting dùng `RateLimiterMiddleware` class (khởi tạo trong constructor, truyền qua DI). Endpoint cho phép cả guest (không cần auth) và user đã đăng nhập gửi yêu cầu. Client (Next.js) gọi API qua Axios instance hiện tại.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client (Next.js)
  │
  ├─ ContactAdmin Form (đã có UI)
  │   └─ POST /api/v1/contact/submit  (multipart/form-data)
  │
  ▼
Server (Express)
  │
  ├─ RateLimiterMiddleware.contactByIp (public readonly, khởi tạo trong constructor)
  │   └─ 5 req / 15 phút / IP
  │
  ├─ OptionalAuthGuard (extends AuthGuard, không throw nếu không có token)
  │
  ├─ Multer Middleware (file upload → local disk)
  │
  ├─ Validation Middleware (Joi schema)
  │
  ├─ ContactAdmin Controller
  │   └─ POST /submit → returns HandlerResult
  │
  ├─ ContactAdmin Service
  │   ├─ Generate ticket number
  │   ├─ Sanitize input
  │   └─ Save to MongoDB
  │
  └─ ContactAdmin Repository (MongoDBRepository)
      └─ MongoDB: contacts collection
```

---

## 3.3. Data Model

### Collection mới: `contacts`

```typescript
// server/src/models/contact.ts
{
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
    // Format: "TK-{timestamp}-{random4chars}" VD: "TK-20260303-A1B2"
  },
  userId: {
    type: ObjectId,
    ref: "User",
    required: false,
    index: true
    // null nếu guest, có giá trị nếu user đã đăng nhập
  },
  email: {
    type: String,
    required: false,
    trim: true, lowercase: true
    // Optional - guest có thể không cung cấp
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    minlength: 5, maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: ["account", "technical", "feature", "billing", "security", "other"]
  },
  priority: {
    type: String,
    required: true,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 20, maxlength: 5000
  },
  attachments: [{
    originalName: String,    // Tên file gốc
    fileName: String,        // Tên file sau khi lưu (unique)
    mimeType: String,        // MIME type
    size: Number,            // Kích thước (bytes)
    path: String             // Đường dẫn file trên disk
  }],
  status: {
    type: String,
    enum: ["new", "processing", "resolved"],
    default: "new",
    index: true
  },
  ipAddress: {
    type: String
    // Lưu IP của người gửi để phục vụ audit
  }
}
// timestamps: true → createdAt, updatedAt
// collection: "contacts"
```

### Indexes

```
1. ticketNumber: unique index (đảm bảo không trùng)
2. userId: sparse index (chỉ index khi có giá trị)
3. status: regular index (phục vụ query admin sau này)
4. createdAt: -1 (sắp xếp mới nhất trước)
5. Compound: { status: 1, createdAt: -1 } (admin filter theo status)
```

---

## 3.4. API Design

### Endpoint: Submit Contact Request

```
POST /api/v1/contact/submit

Headers (optional):
  Authorization: Bearer {token}    // Optional - nếu user đã đăng nhập
  Content-Type: multipart/form-data

Request Body (form-data):
  email:       string (optional) — Email liên hệ
  subject:     string (required) — Tiêu đề, min 5, max 200 ký tự
  category:    string (required) — Enum: account|technical|feature|billing|security|other
  priority:    string (optional) — Enum: low|medium|high. Default: "medium"
  message:     string (required) — Nội dung, min 20, max 5000 ký tự
  attachments: File[] (optional) — Tối đa 5 files, mỗi file max 5MB
                                    Accepted: jpg, jpeg, png, gif, pdf, doc, docx

Response 201 (Created):
{
  "timestamp": "2026-03-03T10:00:00.000Z",
  "route": "/api/v1/contact/submit",
  "message": "contactAdmin:success.submitted",
  "data": {
    "ticketNumber": "TK-20260303-A1B2"
  }
}

Response 400 (Validation Error):
{
  "timestamp": "...",
  "route": "/api/v1/contact/submit",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": [
      { "field": "subject", "message": "Subject is required" },
      { "field": "message", "message": "Message must be at least 20 characters" }
    ]
  }
}

Response 400 (File Error):
{
  "timestamp": "...",
  "route": "/api/v1/contact/submit",
  "error": {
    "code": "FILE_UPLOAD_ERROR",
    "message": "File size exceeds 5MB limit"
  }
}

Response 429 (Rate Limited):
{
  "timestamp": "...",
  "route": "/api/v1/contact/submit",
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many contact requests. Please try again later."
  }
}
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Client gửi POST /api/v1/contact/submit (multipart/form-data)
2. RateLimiterMiddleware.contactByIp kiểm tra IP → vượt 5 req/15 phút → trả 429
3. OptionalAuthGuard middleware:
   - Nếu có Authorization header → verify token → set req.user
   - Nếu không có header hoặc token invalid → req.user = undefined, gọi next()
4. Multer middleware xử lý file upload:
   - Validate MIME type, kích thước, số lượng
   - Lưu file vào /uploads/contacts/{date}/
   - Nếu lỗi → trả 400 (file error)
5. Joi Validation middleware validate body fields
   - Nếu lỗi → trả 400 (validation error)
6. Controller handler gọi Service.submitContact(data, files, user?)
7. Service:
   a. Generate ticket number duy nhất
   b. Sanitize text fields (chống XSS)
   c. Build contact document:
      - Nếu req.user có → gắn userId, lấy email từ auth nếu không cung cấp
      - Nếu guest → userId = null
   d. Gọi Repository.create(document)
8. Repository lưu vào MongoDB
9. Controller trả HandlerResult { data: { ticketNumber }, message, statusCode: 201 }
```

---

## 3.6. Cấu trúc files mới

```
server/src/
├── models/
│   └── contact.ts                          // Mongoose schema
│
├── modules/
│   └── contact-admin/
│       ├── contact-admin.controller.ts     // Route handlers
│       ├── contact-admin.service.ts        // Business logic
│       ├── contact-admin.module.ts         // DI setup
│       └── repositories/
│           └── contact.repository.ts       // MongoDB repository
│
├── middlewares/
│   ├── optional-auth.guard.ts              // OptionalAuthGuard class
│   └── file-upload.ts                      // Multer config
│
├── validators/
│   └── schemas/
│       └── contact-admin.ts                // Joi validation
│
├── constants/
│   ├── enums.ts                            // Thêm CONTACT_CATEGORIES, CONTACT_PRIORITIES, CONTACT_STATUSES
│   ├── models.ts                           // Thêm CONTACT: "Contact"
│   ├── infrastructure.ts                   // Thêm REDIS_KEYS.RATE_LIMIT.CONTACT
│   └── config.ts                           // Thêm RATE_LIMIT_CONFIG.CONTACT, CONTACT_CONFIG
│
├── types/
│   └── modules/
│       └── contact-admin.ts                // TypeScript types
│
└── loaders/
    └── modules.loader.ts                   // createContactAdminModule + v1Router.use("/contact", contactAdminRouter)
```

### Files chỉnh sửa (EDIT):

| File                          | Thay đổi                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `constants/enums.ts`          | Thêm `CONTACT_CATEGORIES`, `CONTACT_PRIORITIES`, `CONTACT_STATUSES`                                |
| `constants/models.ts`         | Thêm `CONTACT: "Contact"`                                                                          |
| `constants/infrastructure.ts` | Thêm `REDIS_KEYS.RATE_LIMIT.CONTACT`                                                               |
| `constants/config.ts`         | Thêm `RATE_LIMIT_CONFIG.CONTACT`, `CONTACT_CONFIG`                                                 |
| `middlewares/rate-limiter.ts` | Thêm `public readonly contactByIp` property + khởi tạo trong constructor                           |
| `loaders/modules.loader.ts`   | Import `createContactAdminModule`, `OptionalAuthGuard`, tạo module, thêm `v1Router.use("/contact", contactAdminRouter)` |
| `server/package.json`         | Thêm dependency `multer`, `@types/multer`                                                          |

---

## 3.7. Chi tiết thiết kế từng component

### 3.7.1. OptionalAuthGuard

```typescript
// server/src/middlewares/optional-auth.guard.ts
// Extends AuthGuard hoặc implement CanActivate tương tự
// Khác với AuthGuard: KHÔNG throw error nếu không có token hoặc token invalid
// - Nếu có valid token → set req.user (giống AuthGuard)
// - Nếu không có token hoặc invalid → req.user = undefined, gọi next()
// Expose middleware getter giống AuthGuard pattern
```

### 3.7.2. File Upload Middleware (Multer)

```typescript
// server/src/middlewares/file-upload.ts
// - Storage: disk storage tại /uploads/contacts/{YYYY-MM-DD}/
// - File naming: {uuid}.{ext}
// - File filter: chỉ cho phép jpg, jpeg, png, gif, pdf, doc, docx
// - Limits: maxFileSize 5MB, maxCount 5
// - MIME type validation thực sự (không chỉ extension)
```

### 3.7.3. Ticket Number Generation

```typescript
// Format: "TK-{YYYYMMDD}-{RANDOM}"
// RANDOM: 4 ký tự uppercase alphanumeric
// Collision handling: kiểm tra unique trong DB, retry nếu trùng (tối đa 3 lần)
```

### 3.7.4. Input Sanitization

```typescript
// Sanitize fields: subject, message
// Strip HTML tags
// Encode special characters
// Sử dụng thư viện sanitize-html hoặc xử lý thủ công bằng regex
```

---

## 3.8. Dependencies & Integrations

| Dependency | Loại     | Mô tả                                 | Cần cài đặt                        |
| ---------- | -------- | ------------------------------------- | ---------------------------------- |
| `multer`   | npm      | Xử lý multipart/form-data file upload | Có (yarn add multer @types/multer) |
| `uuid`     | npm      | Generate unique file names            | Kiểm tra nếu đã có                 |
| MongoDB    | Internal | Lưu trữ contact documents             | Không                              |
| Redis      | Internal | Rate limiting store                   | Không                              |

---

## 3.9. Migration & Deployment Strategy

**Feature flag:** Không cần. API endpoint mới, không ảnh hưởng feature hiện có.

**Rollback plan:**

- Xóa route `/api/v1/contact` khỏi v1Router trong modules.loader.ts
- Collection `contacts` vẫn giữ lại (không mất data)
- Xóa thư mục uploads/contacts nếu cần

**Deployment steps:**

1. Tạo thư mục `uploads/contacts/` trên server (nếu chưa có)
2. Deploy code mới
3. MongoDB tự tạo collection và indexes khi có document đầu tiên
