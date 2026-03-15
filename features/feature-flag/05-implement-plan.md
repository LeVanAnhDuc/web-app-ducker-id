# IMPLEMENTATION PLAN: Feature Flag

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 19         |
| Hoàn thành   | 0/19       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | —          |

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

---

### Phase 1: Setup & Foundation

#### TASK-001: Tạo Mongoose model `feature_flags`

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo file `server/src/models/feature-flag.ts`
  - [ ] Định nghĩa schema: `key` (String, unique, required, trim), `enabled` (Boolean, required, default: false), `description` (String, optional, maxlength: 500)
  - [ ] Thêm `{ timestamps: true }` vào schema options
  - [ ] Thêm unique index `{ key: 1 }`
  - [ ] Export `FeatureFlagModel` và `FeatureFlagDocument` type
- **Files sẽ tạo/sửa:**
  - `server/src/models/feature-flag.ts` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.4

---

#### TASK-002: Tạo Mongoose model `feature_flag_logs`

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo file `server/src/models/feature-flag-log.ts`
  - [ ] Định nghĩa schema: `flagKey` (String, required), `ip` (String, optional), `userAgent` (String, optional)
  - [ ] Dùng `{ timestamps: { createdAt: true, updatedAt: false } }` — log là immutable
  - [ ] Thêm compound index `{ flagKey: 1, createdAt: -1 }` và `{ createdAt: -1 }`
  - [ ] Export `FeatureFlagLogModel` và `FeatureFlagLogDocument` type
- **Files sẽ tạo/sửa:**
  - `server/src/models/feature-flag-log.ts` (tạo mới)
- **Test cần pass:** TC-05.1, TC-05.3

---

#### TASK-003: Đăng ký MODEL_NAMES + tạo Joi validation schemas

- **Tham chiếu:** TL3 - Mục 3.6, TL2 - Mục 2.3
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001, TASK-002
- **Checklist:**
  - [ ] Thêm `FEATURE_FLAG` và `FEATURE_FLAG_LOG` vào `server/src/constants/models.ts`
  - [ ] Cập nhật `TASK-001` và `TASK-002` để dùng `MODEL_NAMES.FEATURE_FLAG` và `MODEL_NAMES.FEATURE_FLAG_LOG`
  - [ ] Tạo file `server/src/validators/schemas/feature-flag.ts` với 4 schemas:
    - `createFlagSchema`: `key` (required, `/^[a-z0-9_-]+$/`, max 100), `enabled` (required boolean), `description` (optional, max 500)
    - `updateFlagSchema`: `enabled` (optional boolean), `description` (optional, max 500) — ít nhất 1 field
    - `flagKeyParamSchema`: `key` (required string)
    - `listFlagsQuerySchema`: (không có field đặc biệt trong v1)
- **Files sẽ tạo/sửa:**
  - `server/src/constants/models.ts` (sửa)
  - `server/src/validators/schemas/feature-flag.ts` (tạo mới)
- **Test cần pass:** TC-03.4, TC-03.6

---

### Phase 2: Backend Development

#### TASK-004: Tạo `FeatureFlagRepository`

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo thư mục `server/src/modules/apps/feature-flag/repositories/`
  - [ ] Tạo file `feature-flag.repository.ts` với các methods:
    - `findAll(): Promise<FeatureFlagDocument[]>` — trả về tất cả flags
    - `findByKey(key: string): Promise<FeatureFlagDocument | null>`
    - `create(data): Promise<FeatureFlagDocument>` — throw nếu key trùng (duplicate key error)
    - `updateByKey(key: string, data): Promise<FeatureFlagDocument | null>` — dùng `findOneAndUpdate` với `{ new: true }`
    - `deleteByKey(key: string): Promise<boolean>` — trả về false nếu không tìm thấy
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/feature-flag/repositories/feature-flag.repository.ts` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.4, TC-03.5

---

#### TASK-005: Tạo `FeatureFlagLogRepository`

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Tạo file `feature-flag-log.repository.ts`
  - [ ] Method duy nhất: `create(data: { flagKey: string; ip?: string; userAgent?: string }): Promise<void>` — insert only, không return document
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/feature-flag/repositories/feature-flag-log.repository.ts` (tạo mới)
- **Test cần pass:** TC-05.1, TC-05.4

---

#### TASK-006: Tạo `FeatureFlagService`

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-005
- **Checklist:**
  - [ ] Tạo file `server/src/modules/apps/feature-flag/feature-flag.service.ts`
  - [ ] Method `getPublicFlags(req)`: fetch all → map thành `{ key, enabled }[]` → fire-and-forget log cho mỗi flag OFF
  - [ ] Fire-and-forget pattern: `this.logRepo.create(...).catch(err => Logger.error(err))` — KHÔNG dùng `await`, KHÔNG throw
  - [ ] Method `getAdminFlags()`: fetch all → trả về full object (key, enabled, description, timestamps)
  - [ ] Method `createFlag(dto)`: tạo mới, bắt duplicate key error từ MongoDB và throw `ConflictError`
  - [ ] Method `updateFlag(key, dto)`: tìm theo key → throw `NotFoundError` nếu không có → update
  - [ ] Method `deleteFlag(key)`: tìm theo key → throw `NotFoundError` nếu không có → delete
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/feature-flag/feature-flag.service.ts` (tạo mới)
- **Test cần pass:** TC-01.7, TC-02.5, TC-03.1, TC-03.4, TC-04.1, TC-04.2, TC-05.1, TC-05.2, TC-05.4

---

#### TASK-007: Tạo `FeatureFlagController` + `FeatureFlagModule`

- **Tham chiếu:** TL3 - Mục 3.4, TL3 - Mục 3.6
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003, TASK-006
- **Checklist:**
  - [ ] Tạo `feature-flag.controller.ts` với 5 routes:
    - `GET /` → `getPublicFlags` (không có auth middleware)
    - `GET /manage` → `getAdminFlags` (`auth.middleware` + `adminGuard.middleware`)
    - `POST /` → `createFlag` (`auth.middleware` + `adminGuard.middleware` + validate body)
    - `PATCH /:key` → `updateFlag` (`auth.middleware` + `adminGuard.middleware` + validate params + validate body)
    - `DELETE /:key` → `deleteFlag` (`auth.middleware` + `adminGuard.middleware` + validate params)
  - [ ] Tạo `feature-flag.module.ts` — factory function `createFeatureFlagModule(auth, adminGuard)` → return `{ featureFlagRouter }`
  - [ ] Cập nhật `server/src/loaders/modules.loader.ts`: import + khởi tạo + mount `v1Router.use("/apps/feature-flags", featureFlagRouter)`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/feature-flag/feature-flag.controller.ts` (tạo mới)
  - `server/src/modules/apps/feature-flag/feature-flag.module.ts` (tạo mới)
  - `server/src/loaders/modules.loader.ts` (sửa)
- **Test cần pass:** TC-02.1, TC-02.2, TC-02.6, TC-03.1, TC-03.6, TC-04.1

---

#### TASK-008: Review code Backend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-007
- **Checklist:**
  - [ ] Chạy skill `review-code` cho toàn bộ module `server/src/modules/apps/feature-flag/`
  - [ ] Fix tất cả issues được phát hiện
- **Files sẽ tạo/sửa:** tuỳ theo kết quả review

---

#### TASK-009: Review performance Backend

- **Tham chiếu:** Skill: review-performance
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-008
- **Checklist:**
  - [ ] Chạy skill `review-performance` cho service và repository
  - [ ] Kiểm tra query `findAll()` có dùng `.lean()` không
  - [ ] Kiểm tra fire-and-forget không gây memory leak
  - [ ] Fix tất cả issues được phát hiện
- **Files sẽ tạo/sửa:** tuỳ theo kết quả review

---

#### TASK-010: Review security Backend

- **Tham chiếu:** Skill: review-security
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-008
- **Checklist:**
  - [ ] Chạy skill `review-security` cho controller và service
  - [ ] Verify `GET /` không lộ `description` hay internal metadata
  - [ ] Verify admin endpoints đều có `AdminGuard` (không bị bypass)
  - [ ] Verify `key` param được sanitize trước khi query DB
  - [ ] Fix tất cả issues được phát hiện
- **Files sẽ tạo/sửa:** tuỳ theo kết quả review

---

#### TASK-011: API Documentation (Swagger + Postman)

- **Tham chiếu:** Skill: doc-standards-api
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-010
- **Checklist:**
  - [ ] Chạy skill `doc-standards-api` cho 5 endpoints feature-flag
  - [ ] Viết OpenAPI/Swagger spec cho tất cả request/response/error schemas
  - [ ] Tạo Postman collection với đủ test scenarios từ TL2
- **Files sẽ tạo/sửa:** tuỳ theo cấu trúc swagger hiện tại của project

---

### Phase 3: Frontend Development

#### TASK-012: Tạo types + dataSources + Zustand store

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-007 (server phải running để test)
- **Checklist:**
  - [ ] Tạo `client/src/types/stores/featureFlag.ts`: `FeatureFlagState`, `FeatureFlagActions`, `FeatureFlagStore`
  - [ ] Cập nhật `client/src/types/stores/index.ts`: export `FeatureFlagStore`
  - [ ] Tạo `client/src/dataSources/FeatureFlag/index.ts`: function `getFeatureFlags()` gọi `GET /api/v1/apps/feature-flags`
  - [ ] Tạo `client/src/stores/slices/featureFlag.ts`: state `{ flags: Record<string, boolean>, isLoaded: boolean }`, actions `setFlags`, `isEnabled`
  - [ ] Cập nhật `client/src/stores/index.ts`: thêm `useFeatureFlagStore`
- **Files sẽ tạo/sửa:**
  - `client/src/types/stores/featureFlag.ts` (tạo mới)
  - `client/src/types/stores/index.ts` (sửa)
  - `client/src/dataSources/FeatureFlag/index.ts` (tạo mới)
  - `client/src/stores/slices/featureFlag.ts` (tạo mới)
  - `client/src/stores/index.ts` (sửa)
- **Test cần pass:** TC-01.7, TC-03.2, TC-03.5

---

#### TASK-013: Tạo `useFeatureFlag` hook

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-012
- **Checklist:**
  - [ ] Tạo `client/src/hooks/useFeatureFlag.ts`
  - [ ] Hook đọc từ `useFeatureFlagStore` — trả về `boolean`
  - [ ] Trả về `false` nếu key không tồn tại (mặc định OFF)
  - [ ] Trả về `false` nếu `isLoaded: false` (chưa fetch xong)
  - [ ] Cập nhật `client/src/hooks/index.ts`: export `useFeatureFlag`
- **Files sẽ tạo/sửa:**
  - `client/src/hooks/useFeatureFlag.ts` (tạo mới)
  - `client/src/hooks/index.ts` (sửa)
- **Test cần pass:** TC-03.2, TC-03.5, TC-01.7

---

#### TASK-014: Tạo `<FeatureFlag>` wrapper component

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Tạo `client/src/components/FeatureFlag/index.tsx`
  - [ ] Props: `name: string`, `children: React.ReactNode`
  - [ ] Dùng `useFeatureFlag(name)` — nếu `false` thì `return null`
  - [ ] Không render loading skeleton hay placeholder (ẩn hoàn toàn theo US-01)
  - [ ] Component là `"use client"` (vì dùng hook Zustand)
- **Files sẽ tạo/sửa:**
  - `client/src/components/FeatureFlag/index.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.4, TC-03.3

---

#### TASK-015: Tạo `FeatureFlagProvider` + tích hợp layout

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-012
- **Checklist:**
  - [ ] Tạo `client/src/components/FeatureFlag/Provider.tsx` (`"use client"`)
  - [ ] `useEffect` on mount → gọi `getFeatureFlags()` → `setFlags(result)` → `setIsLoaded(true)`
  - [ ] Nếu API lỗi: `setFlags({})` + `setIsLoaded(true)` — fail-safe, không throw lên UI
  - [ ] Provider render `children` ngay lập tức (không block render trong khi đang fetch)
  - [ ] Tích hợp vào `client/src/app/[locale]/layout.tsx`: wrap `{children}` với `<FeatureFlagProvider>`
- **Files sẽ tạo/sửa:**
  - `client/src/components/FeatureFlag/Provider.tsx` (tạo mới)
  - `client/src/app/[locale]/layout.tsx` (sửa)
- **Test cần pass:** TC-01.5, TC-01.6, TC-01.7, TC-05.1

---

#### TASK-016: Review code Frontend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-015
- **Checklist:**
  - [ ] Chạy skill `review-code` cho toàn bộ client files của feature này
  - [ ] Fix tất cả issues được phát hiện
- **Files sẽ tạo/sửa:** tuỳ theo kết quả review

---

#### TASK-017: Review performance + security Frontend

- **Tham chiếu:** Skill: review-performance, review-security
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Chạy skill `review-performance`: verify Provider không block render, không gây re-render không cần thiết
  - [ ] Chạy skill `review-security`: verify không có sensitive flag data bị log ra console, không XSS
  - [ ] Fix tất cả issues được phát hiện
- **Files sẽ tạo/sửa:** tuỳ theo kết quả review

---

### Phase 4: Testing & QA

#### TASK-018: Viết unit tests + integration tests

- **Tham chiếu:** TL2 - Mục 2.2, TL2 - Mục 2.7
- **Ước lượng:** 4.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-017
- **Checklist:**
  - [ ] Unit test `FeatureFlagService.getPublicFlags`: mock repo → verify chỉ trả về `{ key, enabled }`, verify log được gọi với flag OFF, verify log lỗi không throw
  - [ ] Unit test `FeatureFlagService.createFlag`: mock repo → verify 409 khi key trùng, verify 201 khi hợp lệ
  - [ ] Unit test `FeatureFlagService.updateFlag` + `deleteFlag`: verify 404 khi key không tồn tại
  - [ ] Unit test `useFeatureFlag` hook: key tồn tại → đúng value, key không tồn tại → false, store chưa loaded → false
  - [ ] Unit test `<FeatureFlag>` component: flag OFF → null, flag ON → render children
  - [ ] Integration test `GET /api/v1/apps/feature-flags`: server running → trả về đúng format, DB lỗi → fail-safe
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/feature-flag/__tests__/feature-flag.service.test.ts` (tạo mới)
  - `client/src/__tests__/hooks/useFeatureFlag.test.ts` (tạo mới)
  - `client/src/__tests__/components/FeatureFlag.test.tsx` (tạo mới)
- **Test cần pass:** Tất cả TC trong TL2

---

#### TASK-019: Manual QA theo TL2

- **Tham chiếu:** TL2 - Mục 2.2 (26 test cases)
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-018
- **Checklist:**
  - [ ] Chạy qua tất cả 26 test cases trong TL2 trên môi trường local
  - [ ] Ưu tiên: TC-01 (end user không thấy flag OFF), TC-02 (admin toggle), TC-05 (logging)
  - [ ] Cập nhật trạng thái từng TC trong `02-acceptance-criteria.md` (⚪ → ✅/❌)
  - [ ] Cập nhật tiến độ trong file này (mục Tổng quan)
- **Files sẽ tạo/sửa:**
  - `docs/features/feature-flag/02-acceptance-criteria.md` (cập nhật trạng thái test)
  - `docs/features/feature-flag/05-implement-plan.md` (cập nhật tiến độ)
- **Test cần pass:** Tất cả 26 TC — đạt DoD ở TL2 Mục 2.7

---

## Dependency Graph

```
TASK-001 (model feature_flags)
    └──► TASK-004 (FlagRepository)
    │        └──► TASK-006 (FlagService)
    │                  └──► TASK-007 (Controller + Module)
    │                            └──► TASK-008 (review code BE)
    │                                      └──► TASK-009 (review perf)
    │                                      └──► TASK-010 (review security)
    │                                                └──► TASK-011 (API docs)
    │                                                └──► TASK-012 (FE: types + store)
    │                                                          └──► TASK-013 (hook)
    │                                                          │        └──► TASK-014 (<FeatureFlag>)
    │                                                          └──► TASK-015 (Provider + layout)
    │                                                                    └──► TASK-016 (review code FE)
    │                                                                              └──► TASK-017 (review perf+sec FE)
    │                                                                                        └──► TASK-018 (unit tests)
    │                                                                                                  └──► TASK-019 (manual QA)
TASK-002 (model feature_flag_logs)
    └──► TASK-005 (LogRepository)
    │        └──► TASK-006 ↑ (đã liên kết)

TASK-001 + TASK-002
    └──► TASK-003 (MODEL_NAMES + Joi schemas)
              └──► TASK-007 ↑ (đã liên kết)
```
