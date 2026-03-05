# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Contact Admin module gồm hai phần:

- **v1.0 (đã implement):** `POST /contact/submit` — Guest/User gửi yêu cầu liên hệ, lưu vào MongoDB collection `contacts`.
- **v2.0 (scope mới):** Query & Update API — thêm routes cho Admin xem danh sách, xem chi tiết, cập nhật status; và User xem contact của chính mình. Reuse `AdminGuard` đã tạo từ login-history v2.0.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== SUBMIT FLOW (v1.0 - không đổi) ===

Client (Next.js)
  └─ POST /api/v1/contact/submit  (multipart/form-data)
       │
   RateLimiterMiddleware.contactByIp → OptionalAuthGuard → Multer → Joi → Controller → Service → Repository
       │
   MongoDB: contacts collection

=== QUERY & UPDATE FLOW (v2.0 - mới) ===

Admin Client
    │
    ├── GET /api/v1/admin/contacts?page=1&status=new
    │       │
    │   AuthGuard → AdminGuard → validate(query) → ContactAdminController.getContactList()
    │       │                                             │
    │       │                               ContactAdminService.getContactList(query)
    │       │                                             │
    │       │                               ContactRepository.findAll(filter, pagination)
    │       │                                             │
    │       │                               Format → ContactListItem[] (không có message, không có attachments detail)
    │       │
    ├── GET /api/v1/admin/contacts/:id
    │       │
    │   AuthGuard → AdminGuard → validate(params) → ContactAdminController.getContactDetail()
    │       │                                              │
    │       │                                ContactAdminService.getContactDetail(id)
    │       │                                              │
    │       │                                ContactRepository.findById(id)
    │       │                                              │
    │       │                                buildPreviewUrl(attachment) → ContactDetailItem
    │       │
    └── PATCH /api/v1/admin/contacts/:id/status
            │
        AuthGuard → AdminGuard → validate(params+body) → ContactAdminController.updateContactStatus()
                                                               │
                                                 ContactAdminService.updateContactStatus(id, status)
                                                               │
                                                 ContactRepository.updateStatus(id, status)
                                                               │
                                                 Return updated ContactListItem

User Client (đã đăng nhập)
    │
    └── GET /api/v1/auth/contacts/me?page=1&limit=10
            │
        AuthGuard → validate(query) → ContactAdminController.getMyContacts()
                                             │
                                 ContactAdminService.getMyContacts(userId, query)
                                             │
                                 ContactRepository.findByUser(userId, filter, pagination)
                                             │
                                 Format → UserContactItem[] (limited fields)
```

---

## 3.3. Data Model

### Collection: `contacts` (không thay đổi schema)

```typescript
{
  ticketNumber:  String (unique, index),
  userId:        ObjectId | undefined,
  email:         String | undefined,
  subject:       String,
  category:      String,   // account|technical|feature|billing|security|other
  priority:      String,   // low|medium|high
  message:       String,
  attachments:   [{ originalName, fileName, mimeType, size, path }],
  status:        String,   // new|processing|resolved
  ipAddress:     String | undefined,
  createdAt:     Date,
  updatedAt:     Date      // auto via timestamps: true
}
```

### Indexes (không thay đổi)

```
ticketNumber: unique index
userId: sparse index
status: index
createdAt: -1
{ status: 1, createdAt: -1 } compound
```

---

## 3.4. API Design

### Admin — GET danh sách contacts

```
GET /api/v1/admin/contacts
Authorization: Bearer {idToken}   (role = admin)
```

**Query Parameters:**

| Param        | Type   | Default   | Mô tả                                                                    |
| ------------ | ------ | --------- | ------------------------------------------------------------------------ |
| page         | number | 1         | Trang hiện tại (>= 1)                                                    |
| limit        | number | 20        | Số records/trang (1–100, tự động cap 100)                               |
| status       | string | -         | `new` \| `processing` \| `resolved`                                      |
| category     | string | -         | `account` \| `technical` \| `feature` \| `billing` \| `security` \| `other` |
| priority     | string | -         | `low` \| `medium` \| `high`                                              |
| email        | string | -         | Partial match, case-insensitive                                           |
| ticketNumber | string | -         | Partial match, case-insensitive                                           |
| userId       | string | -         | ObjectId 24 ký tự — exact match                                          |
| search       | string | -         | Text search trên `subject`, `email`, `ticketNumber` (OR logic)            |
| fromDate     | string | -         | ISO 8601 date                                                             |
| toDate       | string | -         | ISO 8601 date, phải >= fromDate                                          |
| sortBy       | string | createdAt | `createdAt` \| `priority` \| `status` \| `category`                     |
| sortOrder    | string | desc      | `asc` \| `desc`                                                          |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "_id": "abc123",
        "ticketNumber": "TK-20260305-A1B2",
        "email": "user@example.com",
        "subject": "Cannot login to my account",
        "category": "account",
        "priority": "high",
        "status": "new",
        "userId": "def456",
        "attachmentCount": 2,
        "createdAt": "2026-03-05T08:00:00.000Z",
        "updatedAt": "2026-03-05T08:00:00.000Z"
      }
    ],
    "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
  },
  "message": "contactAdmin:success.getContactList",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

---

### Admin — GET chi tiết contact

```
GET /api/v1/admin/contacts/:id
Authorization: Bearer {idToken}   (role = admin)
```

**Response 200:**

```json
{
  "data": {
    "_id": "abc123",
    "ticketNumber": "TK-20260305-A1B2",
    "email": "user@example.com",
    "subject": "Cannot login to my account",
    "category": "account",
    "priority": "high",
    "status": "new",
    "userId": "def456",
    "message": "I have been trying to login for 3 days but keep getting an error...",
    "ipAddress": "192.168.1.100",
    "attachmentCount": 2,
    "attachments": [
      {
        "originalName": "screenshot.png",
        "fileName": "uuid-1.png",
        "mimeType": "image/png",
        "size": 204800,
        "previewUrl": "http://localhost:3000/uploads/contacts/2026-03-05/uuid-1.png"
      },
      {
        "originalName": "report.pdf",
        "fileName": "uuid-2.pdf",
        "mimeType": "application/pdf",
        "size": 512000,
        "previewUrl": null
      }
    ],
    "createdAt": "2026-03-05T08:00:00.000Z",
    "updatedAt": "2026-03-05T08:00:00.000Z"
  },
  "message": "contactAdmin:success.getContactDetail",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

> **Ghi chú:** `previewUrl` chỉ có giá trị với image MIME types (`image/jpeg`, `image/jpg`, `image/png`, `image/gif`). Các loại file khác → `previewUrl: null`.

---

### Admin — PATCH cập nhật status

```
PATCH /api/v1/admin/contacts/:id/status
Authorization: Bearer {idToken}   (role = admin)
Content-Type: application/json
```

**Request Body:**
```json
{ "status": "processing" }
```

**Response 200:** Trả về `ContactListItem` đã được cập nhật (cùng shape với GET list item).

**Response 404:** Contact không tồn tại.

---

### User — GET contact của chính mình

```
GET /api/v1/auth/contacts/me
Authorization: Bearer {idToken}
```

**Query Parameters:** `page`, `limit`, `sortBy` (`createdAt`), `sortOrder` — không có filter theo fields khác.

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "_id": "abc123",
        "ticketNumber": "TK-20260305-A1B2",
        "subject": "Cannot login to my account",
        "category": "account",
        "priority": "high",
        "status": "new",
        "attachmentCount": 2,
        "createdAt": "2026-03-05T08:00:00.000Z"
      }
    ],
    "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
  },
  "message": "contactAdmin:success.getMyContacts",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

> **Ghi chú:** User chỉ thấy contacts của chính mình. Fields bị ẩn: `email`, `ipAddress`, `message`, `attachments`, `userId`.

---

## 3.5. Luồng xử lý chính (Main Flow)

### Submit Flow (không đổi — v1.0)
```
POST /contact/submit → RateLimiter → OptionalAuth → Multer → Joi → Service → Repo → 201
```

### Admin List Flow (v2.0)
```
1. GET /admin/contacts + query params
2. AuthGuard → AdminGuard (403 nếu không phải admin)
3. validate(adminListContactsQuerySchema, 'query') → 400 nếu invalid
4. Service.getContactList(query):
   a. Cap limit tại 100, tính skip
   b. buildContactFilter(query) → Mongoose FilterQuery
      - search: $or [ subject, email, ticketNumber ] regex
      - Các filter khác: exact/partial match
      - createdAt range: $gte/$lte
   c. Repo.findAll(filter, { skip, limit, sort })
      - Promise.all([find(), countDocuments()])
   d. Map → ContactListItem[] (loại bỏ message, attachments detail, ipAddress)
      - attachmentCount = doc.attachments.length
   e. Return { items, meta }
```

### Admin Detail Flow (v2.0)
```
1. GET /admin/contacts/:id
2. AuthGuard → AdminGuard
3. validate(contactIdParamSchema, 'params') → 400 nếu invalid ObjectId
4. Service.getContactDetail(id):
   a. Repo.findById(id) → 404 nếu không tìm thấy
   b. Map → ContactDetailItem:
      - Giữ tất cả fields của ContactListItem
      - Thêm: message, ipAddress
      - Map attachments: thêm previewUrl = buildPreviewUrl(attachment)
        - Image MIME types → `{BASE_URL}/{relativePath}`
        - Others → null
   c. Return ContactDetailItem
```

### Admin Update Status Flow (v2.0)
```
1. PATCH /admin/contacts/:id/status
2. AuthGuard → AdminGuard
3. validate(contactIdParamSchema, 'params') + validate(updateContactStatusSchema, 'body')
4. Service.updateContactStatus(id, status):
   a. Repo.updateStatus(id, status) → 404 nếu không tìm thấy
   b. Return updated ContactListItem
```

### User My Contacts Flow (v2.0)
```
1. GET /auth/contacts/me + query params
2. AuthGuard → lấy userId từ req.user.userId
3. validate(myContactsQuerySchema, 'query')
4. Service.getMyContacts(userId, query):
   a. Cap limit, tính skip
   b. Filter: { userId: new ObjectId(userId) }
   c. Repo.findByUser(userId, { skip, limit, sort })
   d. Map → UserContactItem[] (limited fields)
   e. Return { items, meta }
```

---

## 3.6. Preview URL Logic

```typescript
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);

function buildPreviewUrl(attachment: ContactAttachment): string | null {
  if (!IMAGE_MIME_TYPES.has(attachment.mimeType)) return null;
  // path được lưu dạng: "uploads/contacts/2026-03-05/uuid.png"
  const relativePath = attachment.path.replace(/\\/g, '/');
  const normalizedPath = relativePath.includes('uploads/')
    ? relativePath.substring(relativePath.indexOf('uploads/'))
    : relativePath;
  return `${BASE_URL}/${normalizedPath}`;
}
```

---

## 3.7. Cấu trúc file (File Structure)

```
server/src/
├── modules/contact-admin/
│   ├── contact-admin.module.ts        # Updated: inject auth, adminGuard; export adminRouter + userContactRouter
│   ├── contact-admin.service.ts       # Updated: thêm getContactList(), getContactDetail(), updateContactStatus(), getMyContacts()
│   ├── contact-admin.controller.ts    # Updated: thêm adminRouter + userContactRouter với 4 routes mới
│   └── internals/
│       └── query-builder.ts           # NEW: buildContactFilter(query) → FilterQuery<ContactDocument>
│   └── repositories/
│       └── contact.repository.ts      # Updated: thêm findAll(), findById(), updateStatus(), findByUser()
│
├── types/modules/
│   └── contact-admin.ts               # Updated: thêm query types, response types (ContactListItem, ContactDetailItem, UserContactItem, PaginatedResult<T>)
│
└── validators/schemas/
    └── contact-admin.ts               # Updated: thêm adminListContactsQuerySchema, myContactsQuerySchema, updateContactStatusSchema, contactIdParamSchema
```

**modules.loader.ts — thay đổi:**
```typescript
// createContactAdminModule nhận thêm auth và adminGuard
const { contactAdminRouter, contactAdminQueryAdminRouter, contactAdminQueryUserRouter }
  = createContactAdminModule(auth, adminGuard, rateLimiter, optionalAuth);

// Routes mới
v1Router.use('/admin/contacts', contactAdminQueryAdminRouter);
v1Router.use('/auth/contacts', contactAdminQueryUserRouter);
// Route cũ vẫn giữ nguyên
v1Router.use('/contact', contactAdminRouter);
```

---

## 3.8. TypeScript Types (bổ sung)

```typescript
// Query params cho Admin list
export interface AdminContactsQuery {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  category?: ContactCategory;
  priority?: ContactPriority;
  email?: string;
  ticketNumber?: string;
  userId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'createdAt' | 'priority' | 'status' | 'category';
  sortOrder?: 'asc' | 'desc';
}

// Query params cho User own contacts
export interface MyContactsQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Attachment trong response detail (thêm previewUrl)
export interface ContactAttachmentResponse {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl: string | null;
}

// Response item cho Admin list (table view)
export interface ContactListItem {
  _id: string;
  ticketNumber: string;
  email: string | null;
  subject: string;
  category: ContactCategory;
  priority: ContactPriority;
  status: ContactStatus;
  userId: string | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Response item cho Admin detail (full)
export interface ContactDetailItem extends ContactListItem {
  message: string;
  ipAddress: string | null;
  attachments: ContactAttachmentResponse[];
}

// Response item cho User own contacts (limited fields)
export interface UserContactItem {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: ContactCategory;
  priority: ContactPriority;
  status: ContactStatus;
  attachmentCount: number;
  createdAt: string;
}

// Paginated wrapper (reuse từ login-history nếu extracted to shared types)
export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
```

---

## 3.9. Dependencies & Integrations

| Dependency  | Loại     | Mô tả                                                                 | Ghi chú                              |
| ----------- | -------- | --------------------------------------------------------------------- | ------------------------------------ |
| MongoDB     | Internal | Query, update contacts collection                                     | Mongoose ODM, indexes đã có          |
| AuthGuard   | Internal | Verify idToken, set req.user                                          | Existing                             |
| AdminGuard  | Internal | Check req.user.roles === 'admin', throw 403                           | Reuse từ login-history v2.0          |
| Joi         | Library  | Validate query params, body, params                                   | Existing pattern                     |
| BASE_URL    | Config   | Build previewUrl cho image attachments                                | `USER_CONFIG.BASE_URL` hoặc tương đương |

---

## 3.10. Migration & Deployment Strategy

**Không cần migration:** Collection `contacts` và indexes không thay đổi.

**Rollback plan:**
- Revert deployment → 4 routes mới bị xóa, submit flow không ảnh hưởng
- Dữ liệu trong MongoDB vẫn nguyên vẹn
