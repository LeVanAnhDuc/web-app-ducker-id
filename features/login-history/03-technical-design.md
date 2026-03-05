# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Login History module gồm hai phần:

- **v1.0 (đã implement):** Service-only, ghi lại login events async non-blocking từ các module khác (login, unlock-account).
- **v2.0 (scope mới):** Query API — thêm controller/routes để User xem lịch sử của mình và Admin xem toàn bộ. IP bị mask trong User API response. Admin cần middleware kiểm tra role.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== WRITE FLOW (v1.0 - không đổi) ===

Calling Modules                     Login History Module
┌──────────────┐                    ┌─────────────────────────────────┐
│ LoginService │──recordSuccess──▶  │ LoginHistoryService             │
│              │──recordFailed───▶  │   ├── extractIp(req)            │
├──────────────┤                    │   ├── parseUserAgent(ua)        │
│ UnlockService│──recordSuccess──▶  │   ├── geoipLookup(ip)          │
└──────────────┘                    │   ├── determineClientType(hdr)  │
                                    │   └── loginHistoryRepo.create() │
                                    │         ↓                       │
                                    │   MongoDB: login_histories      │
                                    └─────────────────────────────────┘

=== QUERY FLOW (v2.0 - mới) ===

Client (Web)
    │
    ├── GET /api/v1/auth/login-history?page=1&limit=20&status=failed
    │       │
    │   AuthGuard.middleware (verify idToken → req.user)
    │       │
    │   LoginHistoryController.getMyHistory()
    │       │
    │   LoginHistoryService.getMyLoginHistory(userId, query)
    │       │
    │   LoginHistoryRepository.findByUser(userId, filter, pagination)
    │       │
    │   maskIp() → format response (IP masked)
    │       │
    │   ResponsePattern<{ data, meta }>
    │
    └── GET /api/v1/admin/login-history?userId=xxx&page=1&limit=20
            │
        AuthGuard.middleware (verify idToken → req.user)
            │
        AdminGuard.middleware (check req.user.roles === 'admin')
            │
        LoginHistoryController.getAllHistory()
            │
        LoginHistoryService.getAllLoginHistory(query)
            │
        LoginHistoryRepository.findAll(filter, pagination)
            │
        format response (IP full, không mask)
            │
        ResponsePattern<{ data, meta }>
```

---

## 3.3. Data Model

### Collection: `login_histories` (không thay đổi)

```typescript
{
  userId:              ObjectId | null,
  usernameAttempted:   String,
  method:              String,           // 'password' | 'otp' | 'magic-link' | 'forgot-password'
  status:              String,           // 'success' | 'failed'
  failReason:          String | null,
  ip:                  String,           // maxlength 45 (IPv6)
  country:             String,           // default: "UNKNOWN"
  city:                String,           // default: "UNKNOWN"
  deviceType:          String,           // 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN'
  os:                  String,
  browser:             String,
  userAgent:           String,
  clientType:          String,           // 'WEB' | 'MOBILE_IOS' | 'MOBILE_ANDROID'
  timezoneOffset:      String | null,
  isAnomaly:           Boolean,          // default: false
  anomalyReasons:      String[],         // default: []
  createdAt:           Date
}
```

### Indexes (không thay đổi)

```javascript
{ userId: 1, createdAt: -1 }
{ userId: 1, status: 1, createdAt: -1 }
{ ip: 1, createdAt: -1 }
{ usernameAttempted: 1, createdAt: -1 }
{ createdAt: -1 }
{ createdAt: 1 }, { expireAfterSeconds: 7776000 }  // TTL 90 ngày
```

---

## 3.4. API Design

### User API — Xem lịch sử của chính mình

```
GET /api/v1/auth/login-history
Authorization: Bearer {idToken}
```

**Query Parameters:**

| Param      | Type   | Default    | Mô tả                                                              |
| ---------- | ------ | ---------- | ------------------------------------------------------------------ |
| page       | number | 1          | Trang hiện tại (>= 1)                                              |
| limit      | number | 20         | Số records/trang (1–100, tự động cap 100)                         |
| status     | string | -          | `success` \| `failed`                                              |
| method     | string | -          | `password` \| `otp` \| `magic-link`                               |
| deviceType | string | -          | `DESKTOP` \| `MOBILE` \| `TABLET` \| `UNKNOWN`                    |
| clientType | string | -          | `WEB` \| `MOBILE_IOS` \| `MOBILE_ANDROID`                         |
| country    | string | -          | Tên country (partial match, case-insensitive)                      |
| city       | string | -          | Tên city (partial match, case-insensitive)                         |
| os         | string | -          | OS string (partial match, case-insensitive)                        |
| browser    | string | -          | Browser string (partial match, case-insensitive)                   |
| fromDate   | string | -          | ISO 8601 date (VD: `2026-01-01`)                                   |
| toDate     | string | -          | ISO 8601 date (VD: `2026-01-31`), phải >= fromDate                |
| sortBy     | string | createdAt  | `createdAt` \| `method` \| `status` \| `country`                  |
| sortOrder  | string | desc       | `asc` \| `desc`                                                    |

**Response 200:**

```json
{
  "data": {
    "items": [
      {
        "_id": "abc123",
        "method": "password",
        "status": "success",
        "failReason": null,
        "ip": "192.168.*.*",
        "country": "Vietnam",
        "city": "Ho Chi Minh City",
        "deviceType": "DESKTOP",
        "os": "Windows 10",
        "browser": "Chrome 120",
        "clientType": "WEB",
        "createdAt": "2026-03-05T08:00:00.000Z"
      }
    ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  },
  "message": "loginHistory:success.getMyHistory",
  "status": "success",
  "reasonStatusCode": "OK"
}
```

> **Lưu ý:** Fields bị ẩn khỏi User response: `userId`, `usernameAttempted`, `userAgent`, `timezoneOffset`, `isAnomaly`, `anomalyReasons`.
> IP mask: `x.y.z.w` → `x.y.*.*` (IPv4), IPv6 mask 4 segment cuối.

---

### Admin API — Xem toàn bộ lịch sử

```
GET /api/v1/admin/login-history
Authorization: Bearer {idToken}   (phải có role = 'admin')
```

**Query Parameters:** Tất cả params của User API, cộng thêm:

| Param  | Type   | Mô tả                                       |
| ------ | ------ | ------------------------------------------- |
| userId | string | ObjectId 24 ký tự — filter theo user cụ thể |
| ip     | string | IP partial match                            |
| sortBy | string | Thêm: `ip` \| `usernameAttempted`            |

**Response 200:** Giống User API nhưng:
- Trả về thêm: `userId`, `usernameAttempted`, `userAgent`, `timezoneOffset`, `isAnomaly`, `anomalyReasons`
- IP không bị mask — hiển thị đầy đủ

**Response 403:** Khi user không có role admin
```json
{
  "message": "common:errors.forbidden",
  "status": "error",
  "reasonStatusCode": "FORBIDDEN"
}
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Write Flow (không đổi — v1.0)
```
1. Module caller gọi recordSuccessfulLogin() hoặc recordFailedLogin()
2. Method gọi private logLoginAttempt() (async, không await)
3. logLoginAttempt() → extract IP, parse UA, geoip lookup, determineClientType → create record
4. Nếu lỗi → Logger.error, không throw
```

### Query Flow — User (v2.0)
```
1. GET /api/v1/auth/login-history + query params
2. AuthGuard → verify idToken → set req.user { userId, roles, ... }
3. validate(loginHistoryQuerySchema, 'query') → Joi validation → 400 nếu invalid
4. LoginHistoryController.getMyHistory():
   a. Lấy userId từ req.user.userId
   b. Parse query params (page, limit, filters, sort)
   c. Gọi loginHistoryService.getMyLoginHistory(userId, parsedQuery)
5. LoginHistoryService.getMyLoginHistory():
   a. Cap limit tại 100
   b. Build filter object (chỉ field của user đó, plus các filters từ query)
   c. Gọi loginHistoryRepo.findByUser(userId, filter, { skip, limit, sort })
   d. Apply maskIp() cho từng record trong data
   e. Return { items, meta: { total, page, limit, totalPages } }
6. Controller return HandlerResult → asyncHandler format response
```

### Query Flow — Admin (v2.0)
```
1. GET /api/v1/admin/login-history + query params
2. AuthGuard → verify idToken → set req.user
3. AdminGuard → check req.user.roles === 'admin' → 403 nếu không phải
4. validate(loginHistoryAdminQuerySchema, 'query') → Joi validation
5. LoginHistoryController.getAllHistory():
   a. Parse query params (page, limit, userId, filters, sort)
   b. Gọi loginHistoryService.getAllLoginHistory(parsedQuery)
6. LoginHistoryService.getAllLoginHistory():
   a. Cap limit tại 100
   b. Build filter object (tất cả fields, có thể thêm userId filter)
   c. Gọi loginHistoryRepo.findAll(filter, { skip, limit, sort })
   d. Không mask IP — trả về full data
   e. Return { items, meta }
7. Controller return HandlerResult
```

---

## 3.6. IP Masking Logic

```typescript
// Áp dụng trong service TRƯỚC khi return, CHỈ cho User API
function maskIp(ip: string): string {
  // IPv4: "192.168.1.100" → "192.168.*.*"
  const ipv4Parts = ip.split('.');
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.*.*`;
  }
  // IPv6: mask 5 segment cuối, giữ 3 đầu
  const ipv6Parts = ip.split(':');
  if (ipv6Parts.length > 3) {
    return `${ipv6Parts.slice(0, 3).join(':')}:*:*:*:*:*`;
  }
  return ip; // fallback: "UNKNOWN" hoặc dạng khác
}
```

---

## 3.7. Cấu trúc file (File Structure)

```
server/src/
├── modules/login-history/
│   ├── login-history.module.ts        # Updated: nhận auth/adminGuard/rateLimiter, export userRouter + adminRouter
│   ├── login-history.service.ts       # Updated: thêm getMyLoginHistory(), getAllLoginHistory()
│   ├── login-history.controller.ts    # NEW: userRouter (GET /) + adminRouter (GET /)
│   └── internals/
│       ├── helpers.ts                 # Updated: thêm maskIp()
│       └── query-builder.ts           # NEW: buildLoginHistoryFilter(query) → Mongoose FilterQuery
├── repositories/
│   └── login-history.repository.ts    # Updated: thêm findByUser(), findAll()
├── types/modules/
│   └── login-history.ts               # Updated: thêm LoginHistoryQuery, LoginHistoryAdminQuery, LoginHistoryItem, LoginHistoryAdminItem, PaginatedResult<T>
├── middlewares/
│   └── admin.guard.ts                 # NEW: check req.user.roles === 'admin', throw ForbiddenError
└── validators/schemas/
    └── login-history.ts               # NEW: loginHistoryQuerySchema, loginHistoryAdminQuerySchema (Joi)
```

**modules.loader.ts — thay đổi:**
```typescript
// Thêm AdminGuard import và khởi tạo
const adminGuard = new AdminGuard();

// Thay createLoginHistoryModule() bằng version có args
const { loginHistoryService, loginHistoryUserRouter, loginHistoryAdminRouter }
  = createLoginHistoryModule(auth, adminGuard, rateLimiter);

// Mount routes mới
v1Router.use('/auth/login-history', loginHistoryUserRouter);
v1Router.use('/admin/login-history', loginHistoryAdminRouter);
```

---

## 3.8. TypeScript Types (bổ sung)

```typescript
// Shared pagination params
export interface PaginationParams {
  page: number;      // default 1
  limit: number;     // default 20, max 100
}

// Filter/sort params cho User API
export interface LoginHistoryQuery extends PaginationParams {
  status?: LoginStatus;
  method?: LoginMethod;
  deviceType?: DeviceType;
  clientType?: ClientType;
  country?: string;
  city?: string;
  os?: string;
  browser?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'createdAt' | 'method' | 'status' | 'country';
  sortOrder?: 'asc' | 'desc';
}

// Filter/sort params cho Admin API (extends User)
export interface LoginHistoryAdminQuery extends LoginHistoryQuery {
  userId?: string;
  ip?: string;
  sortBy?: 'createdAt' | 'method' | 'status' | 'country' | 'ip' | 'usernameAttempted';
}

// Response item cho User API (IP masked, fields nhạy cảm bị ẩn)
export interface LoginHistoryItem {
  _id: string;
  method: LoginMethod;
  status: LoginStatus;
  failReason: LoginFailReason | null;
  ip: string;            // masked
  country: string;
  city: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  clientType: ClientType;
  createdAt: string;
}

// Response item cho Admin API (full data)
export interface LoginHistoryAdminItem extends LoginHistoryItem {
  userId: string | null;
  usernameAttempted: string;
  userAgent: string;
  timezoneOffset: string | null;
  isAnomaly: boolean;
  anomalyReasons: string[];
  ip: string;            // NOT masked
}

// Paginated result wrapper
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 3.9. Dependencies & Integrations

| Dependency     | Loại     | Mô tả                                                      | Ghi chú                      |
| -------------- | -------- | ---------------------------------------------------------- | ---------------------------- |
| MongoDB        | Internal | Lưu & query login history records                          | Mongoose ODM                 |
| ua-parser-js   | Library  | Parse User-Agent string (v1.0, không đổi)                  | NPM package                  |
| geoip-lite     | Library  | IP → country, city lookup (v1.0, không đổi)               | Offline database             |
| Logger         | Internal | Ghi log success/error                                      | Custom logger utility        |
| AuthGuard      | Internal | Xác thực idToken, set req.user                             | Existing middleware           |
| AdminGuard     | Internal | Kiểm tra req.user.roles === 'admin', throw 403 nếu không  | **NEW** middleware            |
| Joi            | Library  | Validate query params (page, limit, filters, sort)         | Existing, pattern từ user.ts  |

---

## 3.10. Migration & Deployment Strategy

**Không cần migration:** Collection `login_histories` và indexes không thay đổi.

**Rollback plan:**
- Revert deployment → routes mới bị xóa, write flow không ảnh hưởng
- Dữ liệu trong MongoDB vẫn nguyên vẹn
- Không cần script xử lý data
