# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN — Feature Flag

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                    |
| ---------------------------- | -------------------------- |
| **Tổng thời gian ước lượng** | ~3.5 ngày (có buffer)      |
| **Số developer**             | 1 người                    |
| **Ngày bắt đầu dự kiến**     | Chưa xác định              |
| **Ngày hoàn thành dự kiến**  | Chưa xác định              |
| **Hệ số buffer**             | 1.3x (thêm 30% cho rủi ro) |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task | Tham chiếu | Ước lượng | Assignee | Ghi chú |
| ---- | ---------- | --------- | -------- | ------- |
| Tạo Mongoose model `feature_flags` (schema, index) | TL3 - Mục 3.3 | 1h | — | Có `key` unique index |
| Tạo Mongoose model `feature_flag_logs` (schema, index) | TL3 - Mục 3.3 | 1h | — | Chỉ có `createdAt`, không có `updatedAt` |
| Thêm `FEATURE_FLAG`, `FEATURE_FLAG_LOG` vào `constants/models.ts` | TL3 - Mục 3.6 | 0.5h | — | |
| Tạo Joi validation schemas (`validators/schemas/feature-flag.ts`) | TL2 - Mục 2.3 | 1h | — | 4 schemas: create, update, key param, list query |

**Subtotal Phase 1: 3.5h**

---

### Phase 2: Backend Development

| Task | Tham chiếu | Ước lượng | Assignee | Ghi chú |
| ---- | ---------- | --------- | -------- | ------- |
| Tạo `FeatureFlagRepository` (findAll, findByKey, create, updateByKey, deleteByKey) | TL3 - Mục 3.6 | 2h | — | Theo pattern BlogRepository |
| Tạo `FeatureFlagLogRepository` (create — insert only) | TL3 - Mục 3.6 | 0.5h | — | Đơn giản, chỉ insert |
| Tạo `FeatureFlagService` (getPublicFlags, getAdminFlags, createFlag, updateFlag, deleteFlag) | TL3 - Mục 3.5 | 3h | — | Logic log fire-and-forget trong `getPublicFlags` |
| Tạo `FeatureFlagController` (5 endpoints) | TL3 - Mục 3.4 | 2h | — | Public GET + 4 admin endpoints với `AdminGuard` |
| Tạo `FeatureFlagModule` + mount route trong `modules.loader.ts` | TL3 - Mục 3.6 | 0.5h | — | Theo pattern `createBlogModule` |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | — | Code quality, maintainability |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 1h | — | Query optimization, fire-and-forget correctness |
| **Review security** _(bắt buộc)_ | Skill: review-security | 1h | — | OWASP: input validation, auth bypass, key injection |
| **Doc standard API** _(bắt buộc)_ | Skill: doc-standards-api | 1.5h | — | Swagger/OpenAPI cho 5 endpoints + Postman collection |

**Subtotal Phase 2: 12.5h**

---

### Phase 3: Frontend Development

| Task | Tham chiếu | Ước lượng | Assignee | Ghi chú |
| ---- | ---------- | --------- | -------- | ------- |
| Tạo types `types/stores/featureFlag.ts` | TL3 - Mục 3.7 | 0.5h | — | `FeatureFlagState`, `FeatureFlagActions`, `FeatureFlagStore` |
| Tạo `dataSources/FeatureFlag/index.ts` (getFeatureFlags) | TL3 - Mục 3.6 | 0.5h | — | 1 API call function |
| Tạo Zustand slice `stores/slices/featureFlag.ts` | TL3 - Mục 3.7 | 1h | — | state: `flags`, `isLoaded`; actions: `setFlags`, `isEnabled` |
| Cập nhật `stores/index.ts` + `types/stores/index.ts` | TL3 - Mục 3.6 | 0.5h | — | Export `useFeatureFlagStore` |
| Tạo hook `hooks/useFeatureFlag.ts` + cập nhật `hooks/index.ts` | TL3 - Mục 3.7 | 1h | — | Đọc từ Zustand store, default `false` |
| Tạo wrapper component `components/FeatureFlag/index.tsx` | TL3 - Mục 3.7 | 1h | — | `<FeatureFlag name="...">children</FeatureFlag>` |
| Tạo `FeatureFlagProvider` + tích hợp vào `app/[locale]/layout.tsx` | TL3 - Mục 3.7 | 1.5h | — | useEffect fetch on mount, fail-safe khi lỗi |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | — | Code quality, hook patterns |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 0.5h | — | Non-blocking render, bundle size |
| **Review security** _(bắt buộc)_ | Skill: review-security | 0.5h | — | Không lộ sensitive flag info trên client |

**Subtotal Phase 3: 8h**

---

### Phase 4: Testing & QA

| Task | Tham chiếu | Ước lượng | Assignee | Ghi chú |
| ---- | ---------- | --------- | -------- | ------- |
| Unit tests: `FeatureFlagService` (getPublicFlags, CRUD, log fire-and-forget) | TL2 - Mục 2.2 (TC-01~05) | 2h | — | Mock repository, test log failure không crash |
| Unit tests: `useFeatureFlag` hook + `FeatureFlag` component | TL2 - Mục 2.2 (TC-03) | 1.5h | — | Test key không tồn tại → false, test render/hide |
| Integration test: `GET /api/v1/apps/feature-flags` | TL2 - TC-01.7, TC-05.4 | 1h | — | Test fail-safe khi DB lỗi |
| Manual QA theo test scenarios TL2 (26 test cases) | TL2 - Mục 2.2 | 2h | — | Ưu tiên TC-01, TC-02, TC-05 |

**Subtotal Phase 4: 6.5h**

---

## 4.3. Tổng hợp theo Phase

| Phase | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ----- | ------------------------ | -------------------------- |
| 1. Setup & Foundation | 3.5h | ~4.5h |
| 2. Backend Development | 12.5h | ~16h (~2 ngày) |
| 3. Frontend Development | 8h | ~10.5h (~1.5 ngày) |
| 4. Testing & QA | 6.5h | ~8.5h (~1 ngày) |
| **TỔNG** | **30.5h (~4 ngày)** | **~39.5h (~5 ngày)** |

> **Quy ước:** 1 ngày = 8 giờ làm việc.
> Buffer 1.3x dành cho: debug unexpected, chờ review feedback, cấu hình môi trường.
