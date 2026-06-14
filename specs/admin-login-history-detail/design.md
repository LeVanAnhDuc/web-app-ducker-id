# Admin Login History — Detail Page & Detail API

## Context

Trang admin `/admin/login-history` hiện hiển thị một bảng **10 cột** (User ID · Username · Method · Status · IP · Country · Device · Browser · Anomaly · Time) — quá rộng, khó quét nhanh. List API `GET /admin/login-history` đã trả về **toàn bộ record** (`AllHistoryItemDto`), nên dữ liệu chi tiết đã có sẵn trong payload list.

Mục tiêu:

1. Rút gọn bảng admin xuống bộ cột "thông tin quan trọng" (Balanced).
2. Thêm cột **Action** cuối mỗi dòng với nút **View** điều hướng sang trang detail.
3. Xây trang detail FE `/admin/login-history/[id]`.
4. Xây API detail BE `GET /admin/login-history/:id`.

Đây là feature **read-only** (chỉ xem, không mutation). Có analog sẵn trong codebase: **AdminContact** (list → `admin/contact/[id]` → `GET /admin/contacts/:id` + `contact-detail-item.dto.ts` + `contactIdParamSchema`). Thiết kế mirror chính xác pattern này.

## Approach

**A — Dedicated detail endpoint (đã chọn).** `GET /admin/login-history/:id` trả về full detail DTO; FE detail page tại `/admin/login-history/[id]`, mirror AdminContact. Deep-linkable, refresh-safe, RESTful, nhất quán codebase.

**B — Không thêm endpoint, reuse list payload** (truyền row qua client cache/router state). Ít code hơn nhưng F5/deep-link = trắng trang, không RESTful, lệch pattern contact. ❌

**C — Generalized shared admin-detail abstraction** cho cả contact + login-history. YAGNI cho 2 feature. ❌

## Backend — `server/` (module `login-history`)

| Layer | Thay đổi |
| --- | --- |
| **Route** (`login-history.routes.ts`) | Thêm `adminLoginHistory.get("/:id", paramsPipe(loginHistoryIdParamSchema), asyncHandler(controller.getHistoryDetail))` vào `createLoginHistoryAdminRoutes` (đã có `authGuard, adminGuard`). |
| **Validator** (`validators/schemas/login-history.ts`) | `loginHistoryIdParamSchema = Joi.object({ id: Joi.string().pattern(OBJECTID_PATTERN)... })` với message i18n key — mirror `contactIdParamSchema`. Named export. |
| **Repository** (`login-history.repository.ts`) | Thêm `findById(id): Promise<LoginHistoryDocument \| null>` vào type contract + `MongoLoginHistoryRepository` (dùng `LoginHistoryModel.findById(id).lean().exec()`, wrap `asyncDatabaseHandler`). |
| **Service** (`login-history.service.ts`) | `getLoginHistoryDetail(id)` → `findById` → nếu null: `throw new NotFoundError({ i18nMessage: (t) => t("loginHistory:errors.notFound"), code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND })`. Trả `toHistoryDetailItemDto(doc)`. |
| **DTO** (`dtos/history-detail-item.dto.ts`) | `interface HistoryDetailItemDto` + `toHistoryDetailItemDto(doc)` — full record (cùng field set với `AllHistoryItemDto`). Thêm export vào `dtos/index.ts` barrel. |
| **Controller** (`login-history.controller.ts`) | `getHistoryDetail = async (req: HistoryIdParamRequest, res) => { const data = await this.service.getLoginHistoryDetail(req.params.id); new OkSuccess({ data, message: "loginHistory:success.getHistoryDetail" }).send(req, res); }`. |
| **Types** (`types/index.ts`) | `HistoryIdParamRequest` (typed request với `params.id`). |
| **Constants** | `ERROR_CODES.LOGIN_HISTORY_NOT_FOUND` (reuse nếu đã có; nếu chưa, thêm vào nhóm phù hợp trong `error-code.ts`). |
| **i18n BE** (`@/i18n/locales/.../login-history`) | Thêm `errors.notFound` + `success.getHistoryDetail`. |

**Swagger:** module `login-history` hiện **chưa có** folder `swagger/`. Giữ parity → bỏ qua Swagger cho lần này; OpenAPI/Postman doc là follow-up tùy chọn (không introduce doc infra mới ở feature này).

## Frontend — `client/`

### Table (sửa) — `views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`

- Rút xuống bộ **Balanced**: **Username · Method · Status · IP & Location · Anomaly · Time · Action**.
- Bỏ render các cột **User ID · Device · Browser** (dữ liệu vẫn còn, xem ở detail).
- `TABLE_COLUMN_COUNT` → **7** (cập nhật cả `colSpan` empty state).
- Cột Action cuối: nút/link điều hướng `/admin/login-history/{_id}`. Dùng i18n `<Link>` từ `@/i18n/navigation` (hoặc `CustomButton` + `router.push`); giữ `useAnnounce` khi navigate (pattern có sẵn).

### Page (mới) — `app/[locale]/(private)/(admin)/admin/login-history/[id]/page.tsx`

- Async server component, `params: Promise<{ locale; id }>`, `generateMetadata` (namespace `loginHistory.admin.detail`), render `<AdminLoginHistoryDetail id={id} />`. Mirror `admin/contact/[id]/page.tsx`.

### View (mới) — `views/AdminLoginHistoryDetail/`

```
index.tsx                                  # compose Header + DetailCard
mains/AdminLoginHistoryDetailHeader/       # server: CustomBreadcrumb + title
mains/LoginHistoryDetailCard/              # client: useQuery hook + <dl> sections + skeleton + not-found + announce
components/LoginHistoryDetailSkeleton/
hooks/useAdminLoginHistoryDetail.ts        # useQuery, QUERY_KEYS.ADMIN_LOGIN_HISTORY_DETAIL
```

`LoginHistoryDetailCard` render `<dl>` nhóm theo section (labels qua i18n, enum qua `tMethod`/`tStatus`, date qua `formatDateTimeMedium`):

- **Identity**: userId (ẩn nếu null) · usernameAttempted
- **Authentication**: method · status (badge) · failReason (ẩn nếu null)
- **Network & Location**: ip · country · city
- **Device & Client**: deviceType · os · browser · clientType · userAgent · timezoneOffset
- **Anomaly**: isAnomaly (Yes/No) · anomalyReasons (list, "none" nếu rỗng)
- createdAt

`isLoading` → `<LoginHistoryDetailSkeleton />`; `!data` (404/null) → not-found UI (i18n). Announce on load.

### Plumbing

| File | Thay đổi |
| --- | --- |
| `requests/loginHistory.ts` | `getAdminLoginHistoryDetail(id)` → `GET ${END_POINTS.ADMIN_LOGIN_HISTORY}/${id}` → `ResponsePattern<LoginHistoryAdminDetailItem>`. |
| `types/LoginHistory/index.ts` | `LoginHistoryAdminDetailItem` (mirror BE `HistoryDetailItemDto` — cùng field set với `LoginHistoryAdminItem`). |
| `constants/queryKeys.ts` | `ADMIN_LOGIN_HISTORY_DETAIL`. |
| `dataSources/AdminLoginHistoryDetail/` | Breadcrumb items (mirror `AdminContactDetail`). |
| `locales/{en,vi}/loginHistory.json` | `loginHistory.admin.detail.*` (title, breadcrumb, fields.*, sections, notFound) + `loginHistory.table.action` (header) + label nút View. Cả 2 locale. |

## API Contract (BE DTO ↔ FE type)

`HistoryDetailItemDto` ≡ `LoginHistoryAdminDetailItem` — field set **giống hệt** admin list item hiện tại (`_id, method, status, failReason, ip, country, city, deviceType, os, browser, clientType, createdAt, userId, usernameAttempted, userAgent, timezoneOffset, isAnomaly, anomalyReasons`). Không có drift.

## E2E Scenario Matrix (admin login-history list + detail)

Trạng thái phản ánh **coverage thực tế** trong `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts` (đã reconcile — một số cell trước đây overstate so với assertion thật trong test). `✅` = đã có test assert; `✅ NEW` = scenario hợp lệ nhưng test hiện **chưa** cover (cần ADD); `N/A` = không áp dụng + lý do.

| # | Category | Status | Scenario + expected + [technique] + values | Gate |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ | Admin mở `/admin/login-history` → bảng 7 cột; click **View** → URL khớp `/admin/login-history/{24-hex}` → heading "Login Attempt Detail" + field "IP Address" hiển thị. Deep-link trực tiếp tới id hợp lệ render lại detail (goto url sau khi rời trang). **[EP]** id hợp lệ = ObjectID 24-hex của record tồn tại. | A+B |
| 2 | AuthN | ✅ | Context không cookie (`storageState: { cookies: [], origins: [] }`) → goto `/admin/login-history/000000000000000000000000` → redirect `…/login`. **[State Transition]** unauth → guard → /login. | A+B |
| 3 | AuthZ | ✅ NEW | User thường (non-admin) đăng nhập → `GET /admin/login-history/{validId}` → `adminGuard` chặn (403 hoặc redirect) → **detail card KHÔNG render** (không lộ record). Cần **non-admin storageState fixture** (hiện deferred — xem "Known code fixes prereq"). **[Decision Table]** role=admin→allow · role=user→deny. | A+B |
| 4 | Validation | ✅ | Detail với id không phải ObjectID (`/admin/login-history/not-a-valid-id`) → not-found UI ("Login history record not found"). FE map **cả 400 lẫn 404 → `notFound`** (`isMissing = status === 404 || status === 400`, nhất quán). **[BVA]** "abc"/"not-a-valid-id" (fail pattern) vs 24-hex valid. | A+B |
| 5 | Empty / null | ✅ NEW | `page.route` detail API → `fulfill 200 { userId: null, failReason: "INVALID_CREDENTIALS", timezoneOffset: null, anomalyReasons: [], status: "failed" }` → field **userId & timezoneOffset ẩn** (conditional render `data.userId &&` / `data.timezoneOffset &&`), **failReason hiển thị**, anomaly = **"None"** (`anomalyNone`), status badge = **warning**. **[Decision Table]** null→hide · present→show · empty[]→"None". | A+B |
| 6 | Boundary / pagination | N/A | Detail page không phân trang. List pagination (page/limit, totalPages) đã được cover bởi **suite `admin-login-history` riêng** — không lặp ở đây. | — |
| 7 | Filter / search | N/A | Detail không có filter/search. List filter (status/method/country/date/userId/ip) không đổi bởi việc rút cột — không động tới filter logic. | — |
| 8 | Data rendering | ✅ NEW (was overstated) | **[DT]** assert giá trị đã localize/format, KHÔNG raw: status badge text = nhãn i18n (vd "Success"/"Failed", **không** raw `"success"`); method = nhãn (`tMethod`, không raw enum `"PASSWORD"`); `isAnomaly` → "Yes"/"No" (không bool `true/false`); `createdAt` qua `formatDateTimeMedium` (không chứa ISO `T…Z`). Trước đây cell ✅ nhưng test chỉ assert sự hiện diện của label "IP Address", **chưa** assert localization/format của value. | A+B |
| 9 | **i18n** | ✅ (+depth) | **Đã có**: vi locale render action label ("Xem") + field label ("Địa chỉ IP"). **ADD depth**: assert chuỗi vi cho **not-found** + **error** state (`t("notFound")` / `t("error")` ở `loginHistory.admin.detail`) render đúng tiếng Việt, không lộ key thô. Cả en + vi. | A+B |
| 10 | Error / loading | ✅ NEW (error có, loading thiếu) | **Đã có**: detail API 500 → error UI ("Could not load this login record"). **ADD**: (a) **loading skeleton** `LoginHistoryDetailSkeleton` qua route delay → skeleton hiển thị trước khi data về; (b) **network abort** (`route.abort()`) → error UI, **phân biệt với 5xx** — kiểm chứng React Query `retry chỉ 5xx (max 2)`: abort không phải HTTP-5xx nên hành vi retry khác. **[Error Guessing]** delayed-response, abort, 500. | A+B |
| 11 | Mutation safety | N/A | Feature read-only — không có write/mutation nào để bảo vệ. | — |
| 12 | Accessibility | ✅ NEW (was overstated) | **Đã có**: View là `<button>` có accessible name. **ADD**: (a) **keyboard activation** — focus View + `Enter` → điều hướng sang detail; (b) **back-preserves-filter** — list `?status=failed&page=2` → View → `navigate_back` → URL **giữ nguyên query** (`status=failed&page=2`); (c) **#announcer announce-on-load** detail (yêu cầu **CF-4** — hiện code chưa có `useAnnounce` ở detail card). **Note a11y follow-up**: View là `<CustomButton>` (render `<button>`) + `router.push`, **không phải `<a href>`** → mất right-click/open-in-new-tab/middle-click; flag follow-up (KHÔNG sửa app code trong test). | B |

Feature-specific: deep-link load detail (không qua table click) ✅ (row 1, đã có); back-from-detail giữ list URL/filter — **row 12 ADD** (chưa có test).

## Known code fixes prereq

Hai scenario ✅ NEW phụ thuộc code-fix/fixture chưa có — phải close trước khi test tương ứng pass được:

- **CF-4 — `useAnnounce` announce-on-load ở detail** (cho **row 12** announce-on-load): `LoginHistoryDetailCard` hiện **KHÔNG** gọi `useAnnounce` khi data về (kiểm chứng trong `views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`). Design ghi "Announce on load" nhưng code chưa implement → `#announcer` im lặng khi detail load. CF-4 = thêm `useAnnounce` announce-on-load (theo `client/.claude/rules/accessibility.md`: "Loading → Data về" bắt buộc announce) + i18n `announce.*` cho cả en/vi. Đây là điểm đóng gap design ↔ code.
- **Non-admin fixture — `row 3 AuthZ`**: chưa có non-admin `storageState`. `auth.setup.ts` hiện chỉ seed **admin** (`E2E_USER_EMAIL=admin`). Cần thêm setup/fixture đăng nhập user thường để gate A có thể assert `adminGuard` chặn non-admin. Hiện **deferred** cho tới khi fixture sẵn sàng.

## Out of scope

- Mutation trên login-history (read-only).
- Swagger/OpenAPI doc cho module (follow-up tùy chọn).
- Thay đổi list filter / pagination hiện có.
- User-side login-history page (`/login-history`) — chỉ đụng admin side.
