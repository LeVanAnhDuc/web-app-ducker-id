# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Login History là một service-only module (không có controller/routes) được sử dụng nội bộ bởi các module khác (login, unlock-account) để ghi lại mọi sự kiện đăng nhập. Module sử dụng UAParser để parse User-Agent, geoip-lite để tra cứu vị trí địa lý từ IP, và lưu trữ vào MongoDB collection `login_histories` với TTL 90 ngày. Mọi thao tác ghi đều async và non-blocking.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
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
```

---

## 3.3. Data Model

### Collection: `login_histories`

```typescript
{
  userId:              ObjectId | null,  // ref: auths (null nếu email không tồn tại)
  usernameAttempted:   String,           // email attempted, lowercase, trimmed
  method:              String,           // enum: 'password' | 'otp' | 'magic-link'
  status:              String,           // enum: 'success' | 'failed'
  failReason:          String | null,    // enum of fail reasons
  ip:                  String,           // maxlength 45 (IPv6 support)
  country:             String,           // default: "Unknown"
  city:                String,           // default: "Unknown"
  deviceType:          String,           // enum: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os:                  String,           // e.g. "Windows 10", "iOS 17.2"
  browser:             String,           // e.g. "Chrome 120", "Safari 17.2"
  userAgent:           String,           // raw User-Agent string
  clientType:          String,           // enum: 'web' | 'mobile_ios' | 'mobile_android'
  timezoneOffset:      String | null,    // timezone offset
  isAnomaly:           Boolean,          // default: false (reserved for future)
  anomalyReasons:      String[],         // default: [] (reserved for future)
  createdAt:           Date              // auto, timestamps option
}
```

### Indexes

```javascript
// Query performance indexes
{ userId: 1, createdAt: -1 }             // Lịch sử theo user
{ userId: 1, status: 1, createdAt: -1 }  // Filter theo status
{ ip: 1, createdAt: -1 }                 // Tra cứu theo IP
{ usernameAttempted: 1, createdAt: -1 }   // Tra cứu theo email
{ createdAt: -1 }                         // Sort mới nhất

// TTL index - tự động xóa sau 90 ngày
{ createdAt: 1 }, { expireAfterSeconds: 7776000 }  // 90 * 24 * 60 * 60
```

---

## 3.4. API Design

**Không có API endpoint.** Module này là service-only, được gọi nội bộ bởi các module khác.

### Public Methods

```typescript
// Ghi login thành công
recordSuccessfulLogin({
  userId: ObjectId | string,
  usernameAttempted: string,
  loginMethod: LoginMethod,
  req: Request
}): void  // fire-and-forget, non-blocking

// Ghi login thất bại
recordFailedLogin({
  userId?: ObjectId | string | null,
  usernameAttempted: string,
  loginMethod: LoginMethod,
  failReason: LoginFailReason,
  req: Request
}): void  // fire-and-forget, non-blocking
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Module caller gọi recordSuccessfulLogin() hoặc recordFailedLogin()
2. Method gọi private logLoginAttempt() (async, không await)
3. logLoginAttempt():
   a. extractIp(req) — lấy IP từ x-forwarded-for hoặc socket.remoteAddress
   b. parseUserAgent(userAgent) — parse device type, OS, browser bằng UAParser
   c. geoipLookup(ip) — tra country, city bằng geoip-lite
      - Private IP / localhost → return "Unknown"
   d. determineClientType(header) — từ x-client-type header
      - "ios" | "mobile_ios" → mobile_ios
      - "android" | "mobile_android" → mobile_android
      - default → web
   e. Tạo loginHistoryData object
   f. Gọi loginHistoryRepo.create(data) — lưu vào MongoDB
   g. Logger.info nếu thành công
4. Nếu bất kỳ bước nào lỗi → Logger.error, KHÔNG throw (try-catch bọc toàn bộ)
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/login-history/
│   ├── login-history.module.ts      # DI setup, export service instance
│   ├── login-history.service.ts     # Business logic (record login events)
│   └── internals/
│       └── helpers.ts               # extractIp, parseUserAgent, geoipLookup, determineClientType
├── models/
│   └── login-history.ts             # Mongoose schema + indexes + TTL
├── repositories/
│   └── login-history/
│       └── index.ts                 # CRUD operations (create)
└── types/modules/
    └── login-history.ts             # TypeScript types (LoginHistoryDocument, LoginEventPayload, etc.)
```

---

## 3.7. Dependencies & Integrations

| Dependency | Loại     | Mô tả                                               | Ghi chú                |
| ---------- | -------- | ---------------------------------------------------- | ---------------------- |
| MongoDB    | Internal | Lưu login history records                            | Mongoose ODM           |
| ua-parser-js | Library | Parse User-Agent string → device, OS, browser      | NPM package            |
| geoip-lite | Library  | IP → country, city lookup (offline database)         | Không cần API key      |
| Logger     | Internal | Ghi log success/error cho monitoring                 | Custom logger utility  |

**Modules sử dụng login-history:**

| Module          | Gọi method nào         | Khi nào                              |
| --------------- | ---------------------- | ------------------------------------ |
| login           | recordSuccessfulLogin  | Đăng nhập password/OTP/magic-link OK |
| login           | recordFailedLogin      | Đăng nhập thất bại                   |
| unlock-account  | recordSuccessfulLogin  | Mở khóa tài khoản thành công         |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment, các module caller sẽ gọi vào void — không ảnh hưởng login flow
- Dữ liệu đã ghi vẫn nằm trong MongoDB, tự xóa sau 90 ngày
- Không cần migration script
