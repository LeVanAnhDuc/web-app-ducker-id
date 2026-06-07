# Design — Web-App Create (Đăng ký ứng dụng)

> **Feature**: `web-app-create`
> **Status**: Design approved (brainstorming) — input for `superpowers:writing-plans`
> **Date**: 2026-06-07
> **Type**: Cross-stack (BE chính + FE nhẹ)
> **Sibling**: `web-app-list` (read slice — đã làm). Round này là **Create** slice đã defer ở đó.

---

## 1. Scope & Goal

End-to-end **create** slice cho admin app registry:

- BE: build `POST /admin/apps` (admin-guarded) — nhận form, sinh OAuth credentials, lưu app mới.
- FE: nối `createAdminApp` từ mock → API thật + thêm UI **hiện client secret một lần** sau khi tạo.

Mục đích nghiệp vụ: admin đăng ký một **app vệ tinh** vào IDMS như một OAuth client (clientId + clientSecret + redirectUris + requiredRoles), sẵn sàng cho IdP core build sau.

**Quyết định thiết kế đã chốt:**
- **Scope = Create only.** Update/Delete vẫn ở mock (đúng pattern `web-app-list` — mỗi round 1 slice).
- **Secret = Option A (reveal-once).** BE sinh + hash + lưu `clientSecretHash`, trả **plaintext secret đúng một lần** trong response create; FE hiện panel "copy now". Đây là chuẩn OAuth (GitHub/Stripe/Google) — admin chuyển secret cho dev app vệ tinh để cấu hình `/oauth/token`. Secret không bao giờ hiện lại, DB chỉ giữ hash.

**Out of scope**: Update/Delete API (vẫn mock), `/oauth/authorize` & `/oauth/token` (IdP core chưa tồn tại), reset/regenerate secret, pagination, entitlements, `views/Apps/` user-facing.

---

## 2. Background — clientId vs clientSecret (vì sao sinh 2 key)

Mỗi app vệ tinh đăng ký vào IDMS như OAuth client. Hai key phục vụ 2 mục đích bảo mật khác nhau trong luồng `/oauth/authorize` → `/oauth/token` (sẽ build sau):

| | clientId | clientSecret |
|---|---|---|
| Vai trò | Định danh app (public) | Mật khẩu app (private) |
| Ai thấy | Mọi người (trên URL authorize) | Chỉ app vệ tinh + IDMS |
| DB lưu | Plaintext | **Hash** (bcrypt) |
| Dùng ở bước | `/oauth/authorize` (nhận diện app + validate redirect_uri) | `/oauth/token` (chứng minh "đúng là app đó", chống mạo danh) |
| Tương tự | Username của app | Password của app |

Vì secret đã hash thì không đọc ngược được → phải trả plaintext một lần lúc tạo, nếu không dev app vệ tinh không có gì để cấu hình.

---

## 3. BE — `server/src/modules/web-app/`

### 3.1 Service flow — `createApp(body)`

1. **Name uniqueness**: nếu `name` đã tồn tại → `ConflictRequestError` (`name` là unique index trên model).
2. **Category exists**: `categoryId` phải tồn tại trong `web_app_categories` → lỗi nếu không.
3. **Sinh credentials**:
   - `clientId` = `client_<random hex>` — retry nếu trùng (unique index).
   - `clientSecret` = random entropy cao (`node:crypto` `randomBytes`).
4. **Hash**: `clientSecretHash = hashValue(clientSecret)` (bcrypt — y hệt password user & seed).
5. **Map form → doc** + áp **default OAuth confidential** (khớp seed):
   - `tokenEndpointAuthMethod = client_secret_basic`
   - `grantTypes = [authorization_code, refresh_token]`
   - `responseTypes = [code]`
   - `scopes = [openid, profile, email]`
   - `postLogoutRedirectUris = []`, `backchannelLogoutUri = null`
   - status: public (`active/inactive`) → internal (`ACTIVE/INACTIVE`) qua `PUBLIC_TO_STATUS` (đã có trong `helpers/index.ts`)
   - `description`/`iconUrl`: `"" → null`
   - `sortOrder`: append cuối (max hiện tại + 1, hoặc 0 — plan quyết)
6. **Lưu** → trả `AdminAppCreatedDto = AdminAppDto + { clientSecret }` (plaintext secret **chỉ** ở response này).

### 3.2 Files đụng

| File | Thay đổi |
|---|---|
| `repositories/web-app.repository.ts` | + `create(data)`, `existsByName(name)` |
| `repositories/web-app-category.repository.ts` | + `existsById(id)` (hoặc `findById`) |
| `validators/schemas/web-app.ts` | + `adminCreateAppBodySchema` (Joi) |
| `helpers/index.ts` | + `generateClientId()`, `generateClientSecret()` |
| `dtos/admin-app.dto.ts` | + `AdminAppCreatedDto` + `toAdminAppCreatedDto(doc, secret)` |
| `web-app.service.ts` | + `createApp(body)` |
| `web-app.controller.ts` | + `createApp` handler → `CreatedSuccess` (201) |
| `web-app.routes.ts` | + `POST /` (`bodyPipe(adminCreateAppBodySchema)` → handler) |
| `types/index.ts` | + `AdminAppCreateBody`, `AdminCreateAppRequest` |
| server i18n locales | + `webApp:success.createApp` + error keys (conflict name, category not found) |
| Swagger | + POST `/admin/apps` path (dev tự thêm theo `standard-doc-api`) |
| Tests (TDD) | service spec + dto spec |

### 3.3 Validator — `adminCreateAppBodySchema` (mirror zod FE)

| Field | Rule |
|---|---|
| `name` | required, pattern `^[a-z0-9][a-z0-9-]*$`, 2–64 |
| `displayName` | required, 2–80 |
| `description` | optional, ≤500, allow `""` |
| `iconUrl` | optional, http(s) URL, allow `""` |
| `homeUrl` | required, http(s) URL |
| `categoryId` | required, ObjectId pattern |
| `status` | enum `active`/`inactive` |
| `requiredRoles` | array `user`/`admin`, min 1 |
| `redirectUris` | array http(s) URL, min 1, max 20 |

`.options({ stripUnknown: true })`. Routes order: `authGuard → adminGuard` (router-level) → `bodyPipe` → `asyncHandler(controller.createApp)`.

---

## 4. FE — `client/src/`

| File | Thay đổi |
|---|---|
| `requests/adminApps.ts` | + `createAdminApp(input) → axiosInstance.post(ADMIN_APPS, input)`, trả `AdminAppCreateResult` |
| `types/AdminApps/index.ts` | + `AdminAppCreateResult = WebApp & { clientSecret: string }` |
| `views/AdminApps/hooks/useCreateAdminApp.ts` | **mới** — chuyển create mutation (đang inline FormSheet) ra hook đúng `views.md`; lo toast + invalidate `["adminApps"]`; export `ADMIN_APPS_QUERY_KEY` |
| `mains/AdminAppsFormSheet/index.tsx` | đổi create từ `@/mocks/AdminApps` → `useCreateAdminApp`; + prop `onCreated(result)`. **Update giữ inline mock** (out of scope, nợ kỹ thuật) |
| `views/AdminApps/index.tsx` | + state `createdApp`, callback `onCreated` → mở secret dialog |
| `mains/AdminAppsSecretDialog/index.tsx` | **mới** — dialog hiện `clientId` + `clientSecret`, cảnh báo "chỉ hiện một lần", nút Done; `announce` khi mở |
| `components/SecretField/index.tsx` | **mới** — field read-only + nút copy (dùng cho cả clientId & secret); `announce` khi copy (a11y rule) |
| FE i18n `locales/{en,vi}/adminApps.json` | + `secretDialog.*` + `announce` keys |

**Luồng FE**: submit create → `useCreateAdminApp.mutate` → onSuccess(result): hook invalidate + toast; consumer (FormSheet) gọi `onCreated(result)` + `onClose()` → `index` set `createdApp` → render `AdminAppsSecretDialog`. Admin copy secret → Done → clear state.

**Convention bắt buộc** (CLAUDE.md client + rules):
- Mọi `useMutation` của view → `views/<Page>/hooks/` (`views.md`).
- Copy/clipboard, mở dialog → `useAnnounce` (a11y rule).
- Nút bấm → `CustomButton`; field → `CustomInput`/shadcn — không raw `<button>`/`<input>`.
- i18n keys vào cả `en` + `vi`; không hardcode string.
- Mỗi component 1 folder `index.tsx`; file `views/**` ≤ 200 lines.

---

## 5. API Contract & Drift Mapping (cross-stack)

| FE gửi (`AdminAppCreateInput`) | BE nhận (`AdminAppCreateBody`) | Transform |
|---|---|---|
| `name`, `displayName`, `homeUrl`, `categoryId`, `requiredRoles`, `redirectUris` | giống | 1:1 |
| `status: "active" \| "inactive"` | giống | → internal `ACTIVE/INACTIVE` qua `PUBLIC_TO_STATUS` |
| `description: string` (`""`) | allow `""` | `"" → null` khi lưu |
| `iconUrl: string` (`""`) | allow `""` | `"" → null` khi lưu |
| ← `AdminAppCreateResult = WebApp & { clientSecret }` | `AdminAppCreatedDto = AdminAppDto + { clientSecret }` | secret plaintext **chỉ** ở response create; GET không bao giờ trả |

BE trả `ResponsePattern<AdminAppCreatedDto>` với HTTP 201. FE `createAdminApp` đọc `response.data.data`.

---

## 6. Security notes (cho `security-auditor` sau)

- clientSecret: random entropy cao (`crypto.randomBytes`), hash bcrypt trước khi lưu, plaintext **không log**, **không lưu**, chỉ trả 1 lần.
- Endpoint admin-guarded (`authGuard → adminGuard`).
- Validate redirectUris (http/https) — nền tảng chống open-redirect cho IdP core sau.
- Name/clientId unique — tránh chiếm chỗ định danh.

---

## 7. Out of scope (nhắc lại)
Update/Delete API · IdP core (`/oauth/authorize`, `/oauth/token`) · reset/regenerate secret · pagination · entitlements · user-facing `GET /apps`.
