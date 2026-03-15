# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT — Feature Flag

---

## 3.1. Tổng quan kỹ thuật

Feature Flag được xây dựng theo kiến trúc module chuẩn của project (cùng pattern với Blog module). Server lưu danh sách flag trong MongoDB collection `feature_flags`, expose một public endpoint `GET /api/v1/apps/feature-flags` và các admin endpoint để CRUD. Client fetch flags khi app khởi động, lưu vào Zustand store, sau đó các component truy cập qua hook `useFeatureFlag(key)` hoặc wrapper component `<FeatureFlag name="...">`. Mỗi lần server trả về flag đang OFF, một bản ghi log được ghi vào collection `feature_flag_logs` (fire-and-forget, không block response).

---

## 3.2. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Next.js 15 App Router)                                 │
│                                                                 │
│  locale/layout.tsx                                              │
│    └── <FeatureFlagProvider>       ← client component, on mount │
│           │  fetch GET /api/v1/apps/feature-flags               │
│           ▼                                                     │
│       useFeatureFlagStore (Zustand)                             │
│         state: { flags: Record<string, boolean> }               │
│           │                                                     │
│           ├── useFeatureFlag('blog')  → boolean                 │
│           │                                                     │
│           └── <FeatureFlag name="blog">                         │
│                 <BlogMenuItem />      ← ẩn nếu flag OFF         │
│               </FeatureFlag>                                    │
└─────────────────────────────────────────────────────────────────┘
                         │ HTTP GET
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER (Express + MongoDB)                                     │
│                                                                 │
│  FeatureFlagController                                          │
│    GET  /apps/feature-flags         (public)                    │
│    GET  /apps/feature-flags/manage  (admin)                     │
│    POST /apps/feature-flags         (admin)                     │
│    PATCH /apps/feature-flags/:key   (admin)                     │
│    DELETE /apps/feature-flags/:key  (admin)                     │
│           │                                                     │
│           ▼                                                     │
│  FeatureFlagService                                             │
│    ├── FeatureFlagRepository  → MongoDB: feature_flags          │
│    └── FeatureFlagLogRepository → MongoDB: feature_flag_logs    │
│         (fire-and-forget, async, không block response)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.3. Data Model

### Collection mới: `feature_flags`

```typescript
{
  _id:         ObjectId
  key:         String     // unique, required, pattern: /^[a-z0-9_-]+$/
  enabled:     Boolean    // required, default: false
  description: String     // optional, max 500 chars
  createdAt:   Date       // auto (timestamps)
  updatedAt:   Date       // auto (timestamps)
}
```

**Indexes:**
```
{ key: 1 }  unique: true     ← lookup by key, enforce uniqueness
```

### Collection mới: `feature_flag_logs`

```typescript
{
  _id:       ObjectId
  flagKey:   String    // required — key của flag bị tắt
  ip:        String    // optional — IP của request
  userAgent: String    // optional — User-Agent header
  createdAt: Date      // auto (timestamps: true, updatedAt: false)
}
```

**Indexes:**
```
{ flagKey: 1, createdAt: -1 }   ← query logs theo flagKey có sort
{ createdAt: -1 }               ← query logs mới nhất
```

> Log KHÔNG có `updatedAt` — bản ghi log là immutable, chỉ insert, không update.

---

## 3.4. API Design

### Endpoint 1: Get all flags (public)

```
GET /api/v1/apps/feature-flags

Headers: (không cần Authorization)

Response 200:
{
  "data": {
    "flags": [
      { "key": "blog", "enabled": false },
      { "key": "chat", "enabled": true }
    ]
  },
  "message": "featureFlag:success.listed",
  "status": 200,
  "reasonStatusCode": "OK"
}
```

> Chỉ trả về `key` và `enabled` — không lộ `description` hay metadata nội bộ.
> Server ghi log (fire-and-forget) cho mỗi flag có `enabled: false` trong response.

---

### Endpoint 2: Get all flags — Admin view

```
GET /api/v1/apps/feature-flags/manage

Headers:
  Authorization: Bearer {idToken}   (admin only)

Response 200:
{
  "data": {
    "flags": [
      {
        "key": "blog",
        "enabled": false,
        "description": "Blog module — chưa sẵn sàng",
        "createdAt": "2026-03-15T00:00:00.000Z",
        "updatedAt": "2026-03-15T00:00:00.000Z"
      }
    ]
  },
  "message": "featureFlag:success.listed",
  "status": 200,
  "reasonStatusCode": "OK"
}
```

---

### Endpoint 3: Create flag

```
POST /api/v1/apps/feature-flags

Headers:
  Authorization: Bearer {idToken}   (admin only)

Request Body:
{
  "key":         "blog",                          // required, string, /^[a-z0-9_-]+$/, max 100
  "enabled":     false,                           // required, boolean
  "description": "Blog module — chưa sẵn sàng"   // optional, string, max 500
}

Response 201:
{
  "data": {
    "key": "blog",
    "enabled": false,
    "description": "Blog module — chưa sẵn sàng",
    "createdAt": "2026-03-15T00:00:00.000Z",
    "updatedAt": "2026-03-15T00:00:00.000Z"
  },
  "message": "featureFlag:success.created",
  "status": 201,
  "reasonStatusCode": "CREATED"
}

Response 409 (key trùng):
{
  "message": "featureFlag:errors.keyExists",
  "status": 409,
  "reasonStatusCode": "CONFLICT"
}

Response 422 (validation fail):
{
  "message": "featureFlag:errors.validation",
  "status": 422,
  "reasonStatusCode": "UNPROCESSABLE_ENTITY"
}
```

---

### Endpoint 4: Update flag

```
PATCH /api/v1/apps/feature-flags/:key

Headers:
  Authorization: Bearer {idToken}   (admin only)

Params:
  key: string   (flag key)

Request Body: (ít nhất 1 field bắt buộc)
{
  "enabled":     true,          // optional, boolean
  "description": "Mô tả mới"   // optional, string, max 500
}

Response 200:
{
  "data": {
    "key": "blog",
    "enabled": true,
    "description": "Mô tả mới",
    "createdAt": "2026-03-15T00:00:00.000Z",
    "updatedAt": "2026-03-15T01:00:00.000Z"
  },
  "message": "featureFlag:success.updated",
  "status": 200,
  "reasonStatusCode": "OK"
}

Response 404 (key không tồn tại):
{
  "message": "featureFlag:errors.notFound",
  "status": 404,
  "reasonStatusCode": "NOT_FOUND"
}
```

---

### Endpoint 5: Delete flag

```
DELETE /api/v1/apps/feature-flags/:key

Headers:
  Authorization: Bearer {idToken}   (admin only)

Params:
  key: string   (flag key)

Response 200:
{
  "data": { "key": "blog" },
  "message": "featureFlag:success.deleted",
  "status": 200,
  "reasonStatusCode": "OK"
}

Response 404 (key không tồn tại):
{
  "message": "featureFlag:errors.notFound",
  "status": 404,
  "reasonStatusCode": "NOT_FOUND"
}
```

---

## 3.5. Luồng xử lý chính

### Luồng 1: App load — Client fetch flags

```
1. Next.js render locale/layout.tsx (server component)
2. Layout render <FeatureFlagProvider> (client component, "use client")
3. FeatureFlagProvider.useEffect() → gọi getFeatureFlags() từ dataSources/FeatureFlag/
4. Axios GET /api/v1/apps/feature-flags
5. Server: FeatureFlagController.getPublicFlags()
6. Server: FeatureFlagService.getPublicFlags()
   a. FeatureFlagRepository.findAll() → query MongoDB feature_flags
   b. Map kết quả thành { key, enabled }[]
   c. Lọc ra các flag có enabled: false
   d. Với mỗi flag OFF: FeatureFlagLogRepository.create({ flagKey, ip, userAgent })
      (fire-and-forget: không await, lỗi chỉ log ra logger)
   e. Return tất cả flags
7. Client: useFeatureFlagStore.setFlags(Record<string, boolean>)
   → VD: { blog: false, chat: true }
8. FeatureFlagProvider render children
9. Mọi component dùng useFeatureFlag('blog') hoặc <FeatureFlag name="blog">
   đều đọc từ store → render hoặc không render
```

### Luồng 2: Admin toggle flag

```
1. Admin nhấn toggle trên dashboard
2. Client gọi PATCH /api/v1/apps/feature-flags/:key với { enabled: true/false }
3. Server: AdminGuard validate token + role
4. Server: FeatureFlagService.updateFlag(key, { enabled })
   a. FeatureFlagRepository.findByKey(key) → kiểm tra tồn tại
   b. FeatureFlagRepository.updateByKey(key, { enabled }) → MongoDB $set
   c. Return flag đã update
5. Client nhận response, cập nhật UI (optimistic update hoặc re-fetch)
6. Người dùng cuối thấy thay đổi sau khi reload trang
```

---

## 3.6. Cấu trúc file

### Server — Files mới

```
server/src/
├── models/
│   ├── feature-flag.ts                              (new)
│   └── feature-flag-log.ts                          (new)
├── validators/schemas/
│   └── feature-flag.ts                              (new)
└── modules/apps/feature-flag/
    ├── feature-flag.module.ts                       (new)
    ├── feature-flag.service.ts                      (new)
    ├── feature-flag.controller.ts                   (new)
    └── repositories/
        ├── feature-flag.repository.ts               (new)
        └── feature-flag-log.repository.ts           (new)
```

### Server — Files sửa

```
server/src/
├── constants/models.ts          (thêm FEATURE_FLAG, FEATURE_FLAG_LOG vào MODEL_NAMES)
└── loaders/modules.loader.ts    (import + khởi tạo + mount featureFlagRouter)
```

### Client — Files mới

```
client/src/
├── types/stores/featureFlag.ts             (new — FeatureFlagState, FeatureFlagActions, FeatureFlagStore)
├── dataSources/FeatureFlag/index.ts        (new — getFeatureFlags())
├── stores/slices/featureFlag.ts            (new — Zustand slice)
├── hooks/useFeatureFlag.ts                 (new — hook)
└── components/FeatureFlag/
    └── index.tsx                           (new — wrapper component)
```

> `FeatureFlagProvider` đặt trong `components/FeatureFlag/Provider.tsx` hoặc `components/FeatureFlagProvider/index.tsx` — là client component, mount vào `app/[locale]/layout.tsx`.

### Client — Files sửa

```
client/src/
├── types/stores/index.ts          (export FeatureFlagStore)
├── stores/index.ts                (thêm useFeatureFlagStore)
├── hooks/index.ts                 (export useFeatureFlag)
└── app/[locale]/layout.tsx        (wrap children với <FeatureFlagProvider>)
```

---

## 3.7. Chi tiết thiết kế Client

### Zustand Store — State shape

```typescript
// types/stores/featureFlag.ts
type FeatureFlagState = {
  flags: Record<string, boolean>  // { blog: false, chat: true }
  isLoaded: boolean               // true sau khi fetch xong (dù thành công hay thất bại)
}

type FeatureFlagActions = {
  setFlags: (flags: Record<string, boolean>) => void
  isEnabled: (key: string) => boolean   // selector, mặc định false nếu key không tồn tại
}
```

### Hook — useFeatureFlag

```typescript
// hooks/useFeatureFlag.ts
// Trả về false nếu:
// - Flag không tồn tại trong store
// - Fetch flags thất bại (isLoaded: true nhưng flags rỗng)
// - Flag đang tắt
useFeatureFlag(key: string): boolean
```

### Wrapper Component — FeatureFlag

```tsx
// components/FeatureFlag/index.tsx
// Không render children nếu flag OFF
// Không hiện loading state — nếu chưa loaded thì ẩn (giống OFF)
<FeatureFlag name="blog">
  <BlogMenuItem />
</FeatureFlag>
```

### Provider — FeatureFlagProvider

```tsx
// components/FeatureFlag/Provider.tsx  (hoặc FeatureFlagProvider/index.tsx)
"use client"
// useEffect on mount → gọi getFeatureFlags()
// Nếu API lỗi → setFlags({}) + setIsLoaded(true) → fail-safe (tất cả OFF)
// Không block render — children vẫn mount, flags load async
```

---

## 3.8. Dependencies & Integrations

| Dependency | Loại | Mô tả |
| ---------- | ---- | ------ |
| MongoDB (`feature_flags`) | Internal DB | Lưu trạng thái flag |
| MongoDB (`feature_flag_logs`) | Internal DB | Lưu log access vào flag tắt |
| `AdminGuard` (`server/src/middlewares/admin.guard.ts`) | Internal | Bảo vệ CRUD endpoints |
| `AuthGuard` (`server/src/middlewares/auth.guard.ts`) | Internal | Xác thực token cho admin endpoints |
| Zustand (`client/src/stores/`) | Internal | Client state management |
| Axios instance (`client/src/libs/axios.ts`) | Internal | HTTP client có interceptors |

---

## 3.9. Migration & Deployment Strategy

**Feature flag:** Không áp dụng (feature này chính là cơ sở hạ tầng cho feature flag).

**Rollback plan:**
- Nếu phát hiện lỗi nghiêm trọng: xóa route mount khỏi `modules.loader.ts` và revert `layout.tsx` — toàn bộ tính năng bị vô hiệu hóa ngay lập tức mà không cần drop collection.
- Các component đang dùng `useFeatureFlag` sẽ fallback về `false` (ẩn tính năng) khi store rỗng.

**Thứ tự deploy:**
1. Deploy server trước (tạo collections, mount routes)
2. Deploy client sau (FeatureFlagProvider, hook, component)
