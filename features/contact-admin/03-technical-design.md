# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Contact Admin module gồm hai phần:

- **v1.0 (đã implement):** `POST /contact/submit` — Guest/User gửi yêu cầu liên hệ (fields: email?, subject, message), lưu vào MongoDB collection `contacts`. Priority được server tự gán (default: "medium").
- **v2.0 (đã implement):** Query & Update API — thêm routes cho Admin xem danh sách, xem chi tiết, cập nhật status. Reuse `AdminGuard` đã tạo từ login-history v2.0.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== SUBMIT FLOW (v1.0 - không đổi) ===

Client (Next.js)
  └─ POST /api/v1/contact/submit  (application/json)
       │
   RateLimiterMiddleware.contactByIp → bodyPipe(Joi) → Controller → Service → Repository
       │
   MongoDB: contacts collection

=== QUERY & UPDATE FLOW (v2.0) ===

Admin Client
    │
    ├── GET /api/v1/admin/contacts?page=1&status=new
    │       │
    │   AuthGuard → AdminGuard → queryPipe(adminListContactsQuerySchema) → ContactAdminController.getContactList()
    │       │                                             │
    │       │                               ContactAdminService.getContactList(query)
    │       │                                             │
    │       │                               buildContactFilter(query) → ContactRepository.findAll(filter, pagination)
    │       │                                             │
    │       │                               toContactListItemDto() → ContactListItemDto[]
    │       │
    ├── GET /api/v1/admin/contacts/:id
    │       │
    │   AuthGuard → AdminGuard → paramsPipe(contactIdParamSchema) → ContactAdminController.getContactDetail()
    │       │                                              │
    │       │                                ContactAdminService.getContactDetail(id)
    │       │                                              │
    │       │                                ContactRepository.findById(id) → toContactDetailItemDto()
    │       │
    └── PATCH /api/v1/admin/contacts/:id/status
            │
        AuthGuard → AdminGuard → paramsPipe + bodyPipe → ContactAdminController.updateContactStatus()
                                                               │
                                                 ContactAdminService.updateContactStatus(id, status)
                                                               │
                                                 ContactRepository.updateStatus(id, status)
                                                               │
                                                 toUpdateContactStatusDto() → UpdateContactStatusDto
```

---

## 3.3. Data Model

### Collection: `contacts`

```typescript
{
  email:         String | null,      // optional, trim, lowercase, default: null
  subject:       String,             // required, trim, minlength/maxlength từ CONTACT_CONFIG
  priority:      String,             // low|medium|high — default: "medium"
  message:       String,             // required, trim, minlength/maxlength từ CONTACT_CONFIG
  status:        String,             // new|processing|resolved — default: "new"
  createdAt:     Date,               // auto via timestamps: true
  updatedAt:     Date                // auto via timestamps: true
}
```

### Indexes

```
status: 1
createdAt: -1
{ status: 1, createdAt: -1 } compound
```

---

## 3.4. API Design

### Submit — POST gửi contact

```
POST /api/v1/contact/submit
```

**Request Body (application/json):**

```json
{
  "email": "user@example.com",
  "subject": "Cannot access my account",
  "message": "I have been unable to log in to my account for the past 2 days."
}
```

**Response 201:**

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "subject": "Cannot access my account",
    "message": "I have been unable to log in...",
    "priority": "medium",
    "status": "new",
    "createdAt": "2026-03-05T08:00:00.000Z"
  },
  "message": "contactAdmin:success.submitted",
  "status": "success",
  "reasonStatusCode": "CREATED"
}
```

---

### Admin — GET danh sách contacts

```
GET /api/v1/admin/contacts
Authorization: Bearer {idToken}   (role = admin)
```

**Query Parameters:**

| Param     | Type   | Default   | Mô tả                                                   |
| --------- | ------ | --------- | -------------------------------------------------------- |
| page      | number | 1         | Trang hiện tại (>= 1)                                   |
| limit     | number | 20        | Số records/trang (1–100)                                 |
| status    | string | -         | `new` \| `processing` \| `resolved`                     |
| priority  | string | -         | `low` \| `medium` \| `high`                              |
| email     | string | -         | Partial match, case-insensitive                          |
| search    | string | -         | Text search trên `subject`, `email` (OR logic, regex)    |
| fromDate  | string | -         | ISO 8601 date                                            |
| toDate    | string | -         | ISO 8601 date, phải >= fromDate                          |
| sortBy    | string | createdAt | `createdAt` \| `priority` \| `status`                   |
| sortOrder | string | desc      | `asc` \| `desc`                                          |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "_id": "abc123",
        "email": "user@example.com",
        "subject": "Cannot login to my account",
        "priority": "medium",
        "status": "new",
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
    "email": "user@example.com",
    "subject": "Cannot login to my account",
    "message": "I have been trying to login for 3 days but keep getting an error...",
    "priority": "medium",
    "status": "new",
    "createdAt": "2026-03-05T08:00:00.000Z",
    "updatedAt": "2026-03-05T08:00:00.000Z"
  },
  "message": "contactAdmin:success.getContactDetail",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

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

**Response 200:** Trả về `UpdateContactStatusDto` đã được cập nhật (cùng shape với GET list item).

```json
{
  "data": {
    "_id": "abc123",
    "email": "user@example.com",
    "subject": "Cannot login to my account",
    "priority": "medium",
    "status": "processing",
    "createdAt": "2026-03-05T08:00:00.000Z",
    "updatedAt": "2026-03-05T09:00:00.000Z"
  },
  "message": "contactAdmin:success.updateContactStatus",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

**Response 404:** Contact không tồn tại.

---

## 3.5. Luồng xử lý chính (Main Flow)

### Submit Flow (v1.0)
```
1. POST /contact/submit
2. RateLimiterMiddleware.contactByIp (rate limit theo IP)
3. bodyPipe(submitContactSchema) → 400 nếu invalid
4. Service.submitContact(body):
   a. sanitizeText(subject), sanitizeText(message)
   b. validateStringLength cho subject và message
   c. Repo.create({ email, subject, message, status: "new" })
   d. toSubmitContactResponseDto(contact)
5. Return 201 CreatedSuccess
```

### Admin List Flow (v2.0)
```
1. GET /admin/contacts + query params
2. AuthGuard → AdminGuard (403 nếu không phải admin)
3. queryPipe(adminListContactsQuerySchema) → 400 nếu invalid (stripUnknown: true)
4. Service.getContactList(query):
   a. Cap limit tại MAX_LIMIT (100), tính skip = (page - 1) * limit
   b. buildContactFilter(query) → Mongoose FilterQuery:
      - status: exact match
      - priority: exact match
      - email: $regex case-insensitive
      - search: $or [ subject, email ] regex
      - createdAt range: $gte/$lte
   c. Repo.findAll(filter, { skip, limit, sort })
      - Promise.all([find(), countDocuments()])
   d. Map → toContactListItemDto() cho từng document
   e. Return { items, meta: { total, page, limit, totalPages } }
```

### Admin Detail Flow (v2.0)
```
1. GET /admin/contacts/:id
2. AuthGuard → AdminGuard
3. paramsPipe(contactIdParamSchema) → 400 nếu invalid ObjectId
4. Service.getContactDetail(id):
   a. Repo.findById(id) → 404 nếu không tìm thấy
   b. toContactDetailItemDto(doc) — thêm field message so với list item
   c. Return ContactDetailItemDto
```

### Admin Update Status Flow (v2.0)
```
1. PATCH /admin/contacts/:id/status
2. AuthGuard → AdminGuard
3. paramsPipe(contactIdParamSchema) + bodyPipe(updateContactStatusSchema)
4. Service.updateContactStatus(id, status):
   a. Repo.updateStatus(id, status) → findByIdAndUpdate với { new: true }
   b. 404 nếu không tìm thấy
   c. toUpdateContactStatusDto(updated)
   d. Return UpdateContactStatusDto
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/contact-admin/
│   ├── contact-admin.module.ts        # Factory: inject authGuard, adminGuard, rateLimiter; export contactAdminRouter + contactAdminQueryAdminRouter
│   ├── contact-admin.controller.ts    # Handlers: submit, getContactList, getContactDetail, updateContactStatus
│   ├── contact-admin.routes.ts        # Route wiring: createContactRoutes() + createContactAdminRoutes()
│   ├── contact-admin.service.ts       # Business logic: submitContact, getContactList, getContactDetail, updateContactStatus
│   ├── contact-admin.helper.ts        # Pure function: buildContactFilter(query) → FilterQuery<ContactDocument>
│   ├── repositories/
│   │   └── contact.repository.ts      # Type contract ContactRepository + MongoContactRepository: create, findAll, findById, updateStatus
│   ├── dtos/
│   │   ├── index.ts                   # Barrel export tất cả DTOs
│   │   ├── submit-contact.dto.ts      # SubmitContactResponseDto + toSubmitContactResponseDto()
│   │   ├── contact-list-item.dto.ts   # ContactListItemDto + toContactListItemDto()
│   │   ├── contact-detail-item.dto.ts # ContactDetailItemDto + toContactDetailItemDto()
│   │   └── update-contact-status.dto.ts # UpdateContactStatusDto + toUpdateContactStatusDto()
│   └── swagger/
│       ├── index.ts                   # Barrel export paths + schemas
│       ├── paths.ts                   # OpenAPI path definitions
│       └── schemas.ts                 # OpenAPI schema definitions
│
├── models/
│   └── contact.ts                     # Mongoose schema + model cho collection "contacts"
│
├── types/modules/
│   └── contact-admin.ts               # ContactDocument, SubmitContactBody, SubmitContactRequest, AdminContactsQuery, AdminContactsQueryRequest, ContactIdParamRequest, UpdateContactStatusRequest, ContactListItem, ContactDetailItem, PaginatedResult<T>
│
├── constants/modules/
│   └── contact-admin/index.ts         # CONTACT_PRIORITIES, CONTACT_STATUSES
│
└── validators/schemas/
    └── contact-admin.ts               # submitContactSchema, contactIdParamSchema, updateContactStatusSchema, adminListContactsQuerySchema
```

**modules.loader.ts — wiring:**
```typescript
const { contactAdminRouter, contactAdminQueryAdminRouter } =
  createContactAdminModule(auth, adminGuard, rateLimiter);

// Routes
v1Router.use('/contact', contactAdminRouter);
v1Router.use('/admin/contacts', contactAdminQueryAdminRouter);
```

---

## 3.7. TypeScript Types

```typescript
// === Enums / Utility Types ===
export type ContactPriority = (typeof CONTACT_PRIORITIES)[keyof typeof CONTACT_PRIORITIES];
// → "low" | "medium" | "high"

export type ContactStatus = (typeof CONTACT_STATUSES)[keyof typeof CONTACT_STATUSES];
// → "new" | "processing" | "resolved"

// === Document ===
export interface ContactDocument extends Document {
  email?: string;
  subject: string;
  priority: ContactPriority;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

// === Request Types ===
export interface SubmitContactBody {
  email?: string;
  subject: string;
  message: string;
}

export interface SubmitContactRequest extends Omit<Request, "user"> {
  body: SubmitContactBody;
}

export interface AdminContactsQuery {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  priority?: ContactPriority;
  email?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: "createdAt" | "priority" | "status";
  sortOrder?: "asc" | "desc";
}

export interface AdminContactsQueryRequest extends Omit<Request, "query"> {
  query: AdminContactsQuery;
}

export interface ContactIdParamRequest extends Omit<Request, "params"> {
  params: { id: string };
}

export interface UpdateContactStatusRequest extends Omit<Request, "params" | "body"> {
  params: { id: string };
  body: { status: ContactStatus };
}

// === Response Types ===
export interface ContactListItem {
  _id: string;
  email: string | null;
  subject: string;
  priority: ContactPriority;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetailItem extends ContactListItem {
  message: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
```

---

## 3.8. DTOs

| DTO File                      | Interface                  | Mapper Function              | Mô tả                            |
| ----------------------------- | -------------------------- | ---------------------------- | --------------------------------- |
| `submit-contact.dto.ts`       | `SubmitContactResponseDto` | `toSubmitContactResponseDto` | Response cho POST /contact/submit |
| `contact-list-item.dto.ts`    | `ContactListItemDto`       | `toContactListItemDto`       | Item trong GET list response      |
| `contact-detail-item.dto.ts`  | `ContactDetailItemDto`     | `toContactDetailItemDto`     | Response cho GET detail (thêm message) |
| `update-contact-status.dto.ts`| `UpdateContactStatusDto`   | `toUpdateContactStatusDto`   | Response cho PATCH status         |

---

## 3.9. Dependencies & Integrations

| Dependency  | Loại     | Mô tả                                           | Ghi chú                     |
| ----------- | -------- | ------------------------------------------------ | ---------------------------- |
| MongoDB     | Internal | Query, update contacts collection                | Mongoose ODM, indexes đã có  |
| AuthGuard   | Internal | Verify idToken, set req.user                     | Existing                     |
| AdminGuard  | Internal | Check req.user.roles === 'admin', throw 403      | Reuse từ login-history v2.0  |
| Joi         | Library  | Validate query params, body, params              | Existing pattern             |

---

## 3.10. Migration & Deployment Strategy

**Không cần migration:** Collection `contacts` và indexes không thay đổi.

**Rollback plan:**
- Revert deployment → 3 routes admin mới bị xóa, submit flow không ảnh hưởng
- Dữ liệu trong MongoDB vẫn nguyên vẹn
