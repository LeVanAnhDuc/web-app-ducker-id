# Design — Edit Apps

> **Feature**: Sửa (edit) + Ẩn (hide / tạm dừng) app trong App Registry.
> **Repos chạm**: `docs/` (spec), `server/` (BE update endpoint), `client/` (FE rewire mock → API).
> **Branch**: `feat/edit-apps` (worktree per-repo, tách từ `origin/main`).
> **Phase liên quan**: MVP-2 (App registry + entitlement) — xem [`project-goals.md`](../../project-goals.md) §10.

---

## 1. Bối cảnh & vấn đề

App Registry hiện đã có **create-only**:

- **BE** (`server/src/modules/web-app/`): chỉ có `listApps`, `listCategories`, `createApp`. Repository chỉ có `findAll`, `existsByName`, `create`. **Không có update / delete / findById.**
- **FE** (`client/src/views/AdminApps/`): UI sửa + xoá **đã scaffold đầy đủ** — `AdminAppsFormSheet` hỗ trợ edit mode (đổi title/label, `FormResetEffect` prefill form từ app đang chọn), `AppRowActions` có menu Edit/Delete, `AdminAppsDeleteDialog` tồn tại. **Nhưng**:
  - **Edit** đang wire vào **mock** (`updateAdminApp` từ `@/mocks/AdminApps`).
  - **Delete** cũng wire vào **mock** (`deleteAdminApp`).
  - Chỉ **Create** đã wire API thật.
- FE types đã có sẵn `AdminAppUpdateInput`; `requests/adminApps.ts` chưa có hàm update/delete.

→ Feature này: **build BE update endpoint + chuyển FE từ mock sang API thật**, đồng thời chuyển ngữ nghĩa "xoá" thành "ẩn/tạm dừng".

## 2. Quyết định thiết kế (đã chốt với owner)

| # | Quyết định | Chốt |
| - | ---------- | ---- |
| D1 | **Phạm vi** | Edit **+** Delete (cả hai đang là mock, cùng 1 view nên làm gọn 1 feature) |
| D2 | **Tạo lại client_secret khi edit** | **Không** (YAGNI) — chỉ sửa metadata. Không có UI rotate secret |
| D3 | **Ngữ nghĩa "Delete"** | **KHÔNG xoá thật, KHÔNG soft-delete (`deleted_at`)**. "Delete" = **Ẩn** = đặt `status = INACTIVE`. INACTIVE chính là trạng thái **tạm dừng**. Có thể đảo ngược (Unhide → ACTIVE) |
| D4 | **Status model** | **Tái dùng INACTIVE** làm trạng thái "tạm dừng". Không thêm enum mới, không đổi ERD. Row action thành toggle Hide/Unhide lật `ACTIVE ↔ INACTIVE` |
| D5 | **Visibility khi tạm dừng** | App tạm dừng **vẫn hiện ở admin list** (kèm badge "Tạm dừng"), nhưng **ẩn khỏi user dashboard** (contract note — endpoint user chưa build) |

**Bất biến (không sửa qua feature này)**: các field do OAuth quản lý — `clientId`, `clientSecret`/`clientSecretHash`, `scopes`, `grantTypes`, `responseTypes`, `tokenEndpointAuthMethod`, `postLogoutRedirectUris`, `backchannelLogoutUri`, `sortOrder`. Chỉ field UI form hiện có mới được sửa.

## 3. API Contract (BE)

**Một endpoint mới duy nhất. KHÔNG có endpoint delete** — ẩn chỉ là patch status qua cùng route.

| Method | Path | Body | Trả về | Guard |
| ------ | ---- | ---- | ------ | ----- |
| `PATCH` | `/admin/apps/:id` | partial — tập con bất kỳ của field create | `AdminAppDto` (không có secret) | `authGuard` + `adminGuard` |

- **Field được sửa** (tất cả optional trong PATCH): `name, displayName, description, iconUrl, homeUrl, categoryId, status, requiredRoles, redirectUris` — đúng tập field `adminCreateAppBodySchema` cho phép.
- **Ẩn / Bỏ ẩn** = `PATCH /admin/apps/:id` với body `{ "status": "inactive" }` / `{ "status": "active" }`.
- **Status code**:
  - `200` — update thành công.
  - `400` — validation (id sai format, body rỗng, field sai).
  - `404 WEB_APP_NOT_FOUND` — id không tồn tại.
  - `404 WEB_APP_CATEGORY_NOT_FOUND` — `categoryId` không tồn tại.
  - `409 WEB_APP_NAME_EXISTS` — `name` bị app **khác** chiếm.

### Mapping contract BE ↔ FE

| BE (`AdminAppDto`) | FE (`WebApp`) | Khớp? |
| ------------------ | ------------- | ----- |
| `_id, name, displayName, description, iconUrl, homeUrl, categoryId, status, requiredRoles, redirectUris, clientId, createdAt, updatedAt` | giống hệt | ✅ |

- FE gửi update body **full** (`AdminAppFormValues`) khi sửa qua form; gửi **partial** `{status}` khi hide/unhide. BE `adminUpdateAppBodySchema` chấp nhận cả hai (full là subset hợp lệ của partial).
- Không có drift cần flag.

## 4. BE Implementation — `server/src/modules/web-app/`

Tuân `module-struct`, `standard-restful-api`, `standard-mongodb`, `standard-expressjs`, `standard-doc-api`.

| File | Thay đổi |
| ---- | -------- |
| `types/index.ts` | Thêm `AdminAppUpdateBody` (mọi field optional), `AdminUpdateAppRequest` (`Omit<Request,"body"\|"params">`), `AdminAppIdParams` (`{ id: string }`), `WebAppUpdateInput` (shape repo nhận, status đã map internal) |
| `validators/schemas/web-app.ts` | Thêm `adminAppIdParamSchema` (id theo `OBJECTID_PATTERN`) + `adminUpdateAppBodySchema` — mirror `adminCreateAppBodySchema` nhưng mọi field `.optional()`, object `.min(1)` (yêu cầu ≥1 key). Tái dùng cùng const NAME/URL/regex, **không** khai báo lại |
| `repositories/web-app.repository.ts` | Thêm `findById(id)`, `existsByNameExcludingId(name, id)` (`{ name, _id: { $ne: id } }`), `updateById(id, data)` — `findByIdAndUpdate(..., { new: true, runValidators: true })`, tái dùng catch duplicate-key → `WEB_APP_NAME_EXISTS` |
| `web-app.service.ts` | Thêm `updateApp(id, body)`: (1) `findById` → `NotFoundError` nếu miss; (2) nếu `body.name` có & khác hiện tại → `existsByNameExcludingId` → `ConflictRequestError`; (3) nếu `body.categoryId` có → `categoryRepo.existsById` → `NotFoundError`; (4) map `status` public→internal nếu có (`toInternalStatus`); (5) `updateById`; (6) return `toAdminAppDto` (tái dùng — không DTO mới) |
| `web-app.controller.ts` | Thêm handler `updateApp` → `new OkSuccess({ data, message: "webApp:success.updateApp" }).send(...)` |
| `web-app.routes.ts` | Thêm `adminApps.patch("/:id", paramsPipe(adminAppIdParamSchema), bodyPipe(adminUpdateAppBodySchema), asyncHandler(controller.updateApp))` sau `POST /` |
| `constants/error-code.ts` (root) | Tái dùng `WEB_APP_NAME_EXISTS`, `WEB_APP_CATEGORY_NOT_FOUND`; **thêm `WEB_APP_NOT_FOUND`** nếu chưa có (đúng nhóm) |
| i18n (`@/i18n/locales/**/webApp`) | Thêm `success.updateApp`, `errors.notFound` (en + vi) |
| `swagger/paths.ts` + `schemas.ts` | Thêm doc `PATCH /admin/apps/{id}` + schema update body/param |

## 5. FE Implementation — `client/src/`

Tuân `standard-react`, `standard-react-yourself`, `standard-nextjs`, `standard-tailwind`, `standard-accessibility`, rules `views.md`/`ghosts.md`/`mocks.md`/`imports.md`/`constants.md`.

| File | Thay đổi |
| ---- | -------- |
| `constants/endpoints.ts` | Thêm endpoint app-detail `/admin/apps/:id` theo pattern dynamic-endpoint hiện có (vd hàm `ADMIN_APP_DETAIL: (id) => \`/admin/apps/${id}\``) |
| `requests/adminApps.ts` | Thêm `updateAdminApp(id, input: AdminAppUpdateInput)` (PATCH full) + `setAdminAppStatus(id, status: AppStatus)` (PATCH partial `{status}`). Cả hai gọi `PATCH /admin/apps/:id`. **Xoá hết import từ `@/mocks/AdminApps`** |
| `views/AdminApps/hooks/useUpdateAdminApp.ts` | Mutation sửa: `mutationFn: updateAdminApp`, invalidate `ADMIN_APPS_QUERY_KEY`, toast `updateSuccess`. Side-effect ngoài (announce, đóng sheet) qua per-call `onSuccess` |
| `views/AdminApps/hooks/useSetAdminAppStatus.ts` | Mutation hide/unhide: `mutationFn: ({id,status}) => setAdminAppStatus(id,status)`, invalidate, toast `hidden`/`reactivated` |
| `views/AdminApps/mains/AdminAppsFormSheet/index.tsx` | Thay `updateMutation` inline (đang gọi mock) bằng `useUpdateAdminApp`. Bỏ import `updateAdminApp` từ mock |
| `views/AdminApps/components/AppRowActions/index.tsx` | Đổi item "Delete" → **conditional Hide/Unhide**: `status==="active"` → "Ẩn" (icon `EyeOff`, variant destructive nhẹ) → mở confirm dialog; `status==="inactive"` → "Bỏ ẩn" (icon `Eye`) → gọi set active trực tiếp (an toàn, không confirm). Prop đổi `onDelete` → `onHide`/`onUnhide` (hoặc 1 `onToggleStatus`) |
| `views/AdminApps/mains/AdminAppsDeleteDialog/` → `AdminAppsHideDialog/` | Đổi tên + ngữ nghĩa: confirm **Ẩn** (chỉ khi đang active). `mutationFn` dùng `useSetAdminAppStatus`. Title/desc/i18n `delete.*`/`confirmDelete` → `hide.*`/`confirmHide` |
| `views/AdminApps/index.tsx` | Đổi state `deleteTarget`→`hideTarget`, handler `handleDelete`→`handleHide`; thêm handler unhide (trực tiếp). Wire xuống Table/RowActions |
| `components/AppStatusBadge` + i18n `adminApps.status` | Đổi **label** của `inactive` → **"Tạm dừng" / "Paused"** (en+vi). Variant có thể đổi `secondary`→ "warning" để phân biệt visual (optional). Giá trị enum giữ nguyên |
| `forms/AdminApp` status switch i18n | Label `inactive` đồng bộ "Tạm dừng/Paused" |
| `locales/{en,vi}/adminApps.json` | **Reuse** (đã có): `toast.updateSuccess`, `announce.updated`. **Thêm**: `toast.hidden`, `toast.reactivated`, `announce.hidden`, `announce.reactivated`, `announce.hideOpened`. **Đổi tên/sửa**: `delete`→`hide` block (`hide.title` "Hide {name}? / Tạm dừng {name}?", `hide.description` "tạm dừng app, ẩn khỏi user, có thể bỏ ẩn sau" — **không** dùng wording "permanently removes"); `actions.delete`→`actions.hide`/`actions.unhide`, `actions.confirmDelete`→`actions.confirmHide`. Gỡ key `announce.deleted`/`deleteOpened` (thay bằng hidden) |
| `mocks/AdminApps.ts` | Sau khi rewire xong → **không còn importer** → **xoá file** |
| `types/AdminApps/index.ts` | `AdminAppUpdateInput` đã có; thêm type cho status-toggle nếu cần (`{ id: string; status: AppStatus }`) |

**Contract note (không build ở feature này)**: khi endpoint user-facing `GET /apps` được build (MVP-2), nó **phải filter `status=ACTIVE`** để app tạm dừng ẩn khỏi dashboard user. Flag ở đây để không quên.

## 6. Xử lý lỗi

- BE throw domain error qua `@/common/exceptions` + `ERROR_CODES` (không `new Error`).
- FE: `updateMutation`/`statusMutation` `onError` → toast lỗi chung; riêng `409 WEB_APP_NAME_EXISTS` map về field `name` trên form (theo pattern map error-code → field error đã dùng ở change-password / create-app).
- A11y: mọi mutation thành công/thất bại + đóng/mở dialog/sheet → `useAnnounce` (rule `accessibility.md`).

## 7. Testing

### BE unit — `web-app.service.spec.ts`
- update happy path (đổi displayName) → trả DTO mới.
- not-found id → `NotFoundError`.
- name đổi sang tên đã bị app khác chiếm → `ConflictRequestError`; name **không đổi** → pass (excluding-self).
- categoryId sai → `NotFoundError`.
- map status `inactive`→INACTIVE (hide), `active`→ACTIVE (unhide).
- body chỉ `{status}` → chỉ update status, field khác giữ nguyên.

### FE E2E — `client/e2e/admin-apps/edit-apps.e2e.ts` (CLAUDE.md §4.3, có chạm FE)
- Đăng nhập admin (qua `auth.setup.ts` storageState).
- Sửa 1 field (vd displayName) của 1 app seed → verify toast + giá trị mới trong bảng.
- Ẩn app (active→tạm dừng) → verify badge "Tạm dừng"; Bỏ ẩn → verify badge "Active".
- **`afterAll` revert**: khôi phục displayName gốc + status gốc (idempotent), không để lại side-effect lên DB seed.
- Selector ưu tiên role/label; KHÔNG sửa app code trong test (gặp a11y/DOM issue → flag follow-up).
- Doc kịch bản: `docs/specs/edit-apps/e2e.md`.

## 8. Đơn vị & ranh giới (isolation)

- **BE update** là 1 use case độc lập trong `WebAppService` — input `(id, body)`, output `AdminAppDto`, phụ thuộc 2 repo (webApp, category). Test được độc lập bằng mock repo.
- **FE edit** vs **FE hide/unhide** là 2 mutation tách biệt (2 hook), chung query key `ADMIN_APPS_QUERY_KEY`. Form sheet không biết về hide; row action không biết về form.
- Hide/unhide tái dùng đúng endpoint update → không nở rộng API surface.

## 9. Task breakdown (đầu vào cho `writing-plans`)

- **BE-1**: types + validators (id param + update body).
- **BE-2**: repository (`findById`, `existsByNameExcludingId`, `updateById`).
- **BE-3**: service `updateApp` + error-code + i18n.
- **BE-4**: controller + route + swagger + unit tests.
- **FE-1**: endpoints const + `requests/adminApps.ts` (update + setStatus), bỏ mock.
- **FE-2**: hooks `useUpdateAdminApp`, `useSetAdminAppStatus`.
- **FE-3**: FormSheet rewire; RowActions Hide/Unhide; DeleteDialog→HideDialog; index state; status label "Tạm dừng".
- **FE-4**: i18n keys (en+vi); xoá `mocks/AdminApps.ts`.
- **E2E**: `edit-apps.e2e.ts` + `docs/specs/edit-apps/e2e.md`.

Task BE chỉ chạm `server/src/**`, FE chỉ chạm `client/src/**`, độc lập qua API contract ở §3.
