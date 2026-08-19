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

## E2E Scenario Matrix

> Backfill coverage cho **edit-apps** (admin sửa app + hide/unhide) theo skill `e2e-scenario-coverage` — rubric 12 nhóm, mỗi nhóm ✅ scenario hoặc N/A (no silent gaps).
> **Hiện trạng (audit)**: suite `client/e2e/admin-apps/edit-apps.e2e.ts` mới có **T1** (sửa Display Name → toast + giá trị mới) + **T2** (hide/unhide status toggle), `afterAll` `restoreApp` idempotent. 10/12 nhóm còn thiếu hoặc chỉ partial.
> **Cột `Gate`**: `A+B` = chạy cả gate A (`yarn e2e`) lẫn gate B (MCP walk); `A only` = mutation-heavy / không xác định bằng MCP read-only (xem §4.3 dual-gate). Case `[technique]` mang tag test-design + giá trị cụ thể inline (forcing-function cấp case).

| #   | Category               | Status | Scenario(s) + expected + [technique] + values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Gate                       |
| --- | ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Happy path             | ✅ (exists — T1) | Mở row menu app `blog` → **Edit** → đổi **Display Name** = `"Blog (edited e2e)"` → **Save Changes** → toast `"App updated."` + giá trị mới hiện trong bảng. `afterAll` revert về `"Blog"` + `status=active`.                                                                                                                                                                                                                                                                                                                                                                                                                                       | A+B                        |
| 2   | AuthN                  | ✅ NEW  | (a) Context **không storageState** (clearCookies + storageState undefined) → `goto /admin/apps` → redirect về trang login (không render heading "App Registry"). (b) `PATCH /api/v1/admin/apps/:id` **không Bearer** → `401`. **[Error Guessing]** request trực tiếp không token.                                                                                                                                                                                                                                                                                                                                                            | A+B                        |
| 3   | AuthZ                  | ✅ NEW  | Context auth = **non-admin** (user role storageState) → `PATCH /api/v1/admin/apps/:id` body `{displayName:"x"}` → `403`; FE: route admin registry **unreachable** (redirect/forbidden, không thấy heading + không thấy row action menu). **[Error Guessing]** privilege escalation qua API trực tiếp.                                                                                                                                                                                                                                                                                                                                          | A+B                        |
| 4   | Validation             | ✅ NEW (biggest gap) | **[EP]** Display Name rỗng → inline `"Please enter a display name."`; Name = `"Blog!"` (ký tự cấm) → `"Use lowercase letters, numbers, and hyphens only."`; Home URL = `"ftp://x"` → `"Must start with http:// or https://"`. **[DT] anti-OFAT combined**: Display Name rỗng **+** Name invalid cùng lúc → hiển thị **CẢ HAI** inline error (không OFAT 1 lỗi che lỗi kia). **409 name conflict**: đổi Name → tên app khác đã tồn tại (vd `"dashboard"`) → field error `"An app with this name already exists."` (map từ `WEB_APP_NAME_EXISTS` về field `name`). **Select-reset regression**: mở Edit, đổi **chỉ** Display Name, Save → **Category giữ nguyên giá trị** (không bị blank — guard `if(value) field.onChange(value)` đã có ở CategorySelect). | A+B (409 + select-reset A only) |
| 5   | Empty/null             | ✅ NEW  | Edit app có `description=null`, `iconUrl=null` (seed) → input Description + Icon URL **rỗng** (không render chuỗi `"null"`) → Save thành công → toast `"App updated."`. **[Error Guessing]** null prefill không leak literal.                                                                                                                                                                                                                                                                                                                                                                                                              | A+B                        |
| 6   | Boundary/pagination    | ✅ NEW  | **[BVA] Name** length: `1` (min-1, 1 ký tự) → `"Name must be at least 2 characters."`; `2` (min, vd `"ab"`) → pass; `64` (max) → pass; `65` (max+1) → `"Name must not exceed 64 characters."`. **[BVA] Display Name**: `2` pass / `80` pass / `81` → `"Display name must not exceed 80 characters."`. **[BVA] redirectUris** count: `20` (ok) → Save pass; `21` → cần CF-3 (FE `.max(20)` + locale key) — chưa fix thì BE trả `400` generic toast `"Something went wrong. Please try again."`.                                                                                                                                                  | A+B (redirectUris A only)  |
| 7   | Filter/search          | N/A    | Toolbar filter (search / status / category dropdown) thuộc feature **list-apps** (`AdminAppsToolbar`), không phải edit sheet. Edit-apps chỉ test cover hành vi sửa/hide trong sheet + row → ngoài scope feature này. (No silent gap: cố ý loại trừ.)                                                                                                                                                                                                                                                                                                                                                                                          | —                          |
| 8   | Data rendering         | ✅ NEW (partial exists) | Mở Edit của 1 app seed → **full prefill** đúng: Name (`input[name=name]`), Home URL, Description, **Required Roles** chips đúng (User/Admin), **Status switch** state khớp `status`, **redirect URI count** khớp số lượng URI, **Category** hiển thị **human label** (vd `"Content"`, không phải ObjectId — CategorySelect render `cat.name` trong SelectValue). T1 mới verify Category contains "Content" → mở rộng full-field. **[Decision Table]** prefill = function(app fields).                                                                                                                                                          | A+B                        |
| 9   | i18n (en+vi)           | ✅ NEW — MANDATORY | `goto /vi/admin/apps` → mở Edit → verify VI: `editTitle` = `"Chỉnh sửa ứng dụng"`, nút Save = `"Lưu thay đổi"`, Display Name rỗng → `"Vui lòng nhập tên hiển thị."`, Save thành công → toast `"Đã cập nhật ứng dụng."`, status badge VI (`"Đang hoạt động"` / `"Tạm dừng"`). **[EP]** locale = {en, vi} mỗi locale render đúng bộ string.                                                                                                                                                                                                                                                                                       | A+B                        |
| 10  | Error/loading          | ✅ NEW  | (a) **Error**: route intercept `PATCH /admin/apps/:id` → `500` (hoặc abort) → toast generic `"Something went wrong. Please try again."` (KHÔNG field error vì không phải 409). **[Error Guessing]** server 5xx. (b) **Loading**: trong lúc submitting → nút Save ở trạng thái **loading** + các field form **disabled** (`disabled={isPending}`). **[State Transition]** idle → submitting → settled.                                                                                                                                                                                                                                          | A+B (loading lean B)       |
| 11  | Mutation safety        | ✅ NEW (partial — afterAll restoreApp idempotent ✅) | **[ST] double-submit**: click Save 2 lần nhanh → đúng **1** `PATCH` request (button disabled khi pending chặn submit thứ 2). **Navigate-away unsaved**: mở Edit, đổi field, **Cancel** / click overlay đóng sheet → **không** có `PATCH`; mở lại Edit → form hiện **giá trị gốc** (FormResetEffect reset on open). **[Error Guessing] trailing-space**: Name = `"blog "` (space cuối) → BE **trim** → lưu `"blog"`, không tạo tên rác.                                                                                                                                                                                       | A only                     |
| 12  | Accessibility          | ✅ NEW (partial — role selectors exist) | **Keyboard-only flow**: Tab tới row action → Enter mở menu → Edit → Tab qua field → Save bằng keyboard. **Focus management**: submit với Display Name rỗng → focus chuyển tới **field invalid đầu tiên**. **Announcer**: sau Save thành công → `#announcer` (`aria-live=polite`) đọc `"App {name} updated."` (vd `"App Blog updated."`). Selector ưu tiên role/label (đã dùng `getByRole("textbox", {name})`, `getByRole("combobox", {name:"Category"})`). **[Error Guessing]** silent update với screen reader.                                                                                                                              | A+B                        |

## Known code fixes prereq

- **CF-3 (cho row #6 — redirectUris boundary)**: FE validation chưa có `.max(20)` cho `redirectUris` (hiện chỉ `.min(1)` ở `client/src/forms/AdminApp/validations.ts`). Để case `21` URI fail ở **FE inline error** (thay vì rơi xuống BE `400` generic), cần: (1) thêm `.max(20, { message: "max" })` vào schema `redirectUris`; (2) thêm locale key `adminApps.form.validation.redirectUris.max` (en + vi). Trước khi fix CF-3, case `21` chỉ assert được BE `400` → toast generic (gate A only). Sau CF-3 → assert inline error tại field (gate A+B).
- **Drift note (cosmetic, không test)**: có **FE↔BE drift** về `redirectUris` max (BE cap vs FE chưa cap — cần xác nhận BE limit thật khi làm CF-3). Ngoài ra `AppStatusBadge` variant (màu badge `inactive`) thuần cosmetic → KHÔNG có scenario E2E (theo §4.3 skip cosmetic-only).
