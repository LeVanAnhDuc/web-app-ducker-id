# Design: Đổi mật khẩu (Change Password)

> **Date**: 2026-05-31
> **Status**: Approved (brainstorm) — đầu vào trực tiếp cho `superpowers:writing-plans`
> **Side**: Cross-stack (BE + FE)
> **Feature**: `change-password`

---

## 0. Bối cảnh

Module `change-password` từng được implement (commit BE-1.6 → 1.8) rồi bị xóa khỏi working tree. Brainstorm này làm **lại từ đầu**, bỏ qua design cũ, bám sát convention hiện có của codebase.

Tham chiếu gần nhất: module `forgot-password/` (đầy đủ guards/services/strategies) và flow login/token (`generateAuthTokensResponse`, refresh cookie).

---

## 1. Quyết định đã chốt

| Khía cạnh       | Quyết định                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Phạm vi         | Cross-stack (BE + FE)                                                                                |
| Actor           | User **đã đăng nhập**, đổi mật khẩu của chính mình từ **Account Settings** page                      |
| Kiến trúc BE    | **Module `change-password/` độc lập** (feature-per-module, như `login`/`signup`/`forgot-password`)   |
| Session sau đổi | **Giữ phiên thiết bị hiện tại** (cấp token pair mới), **kick thiết bị khác** qua `passwordChangedAt` |
| Email           | Gửi cảnh báo "mật khẩu vừa thay đổi" **fire-and-forget qua queue**                                   |
| Audit           | Ghi nhận qua `LoginHistoryService` (fire-and-forget, không phụ thuộc forgot-password)                |

---

## 2. Kiến trúc tổng quan

Module `change-password/` độc lập, nằm sau `authGuard` (JWT đã verify). Luồng:

```
authGuard → validate body → Controller → Service:
  1. load auth record (authService.findById, authId từ RequestContext)
  2. WrongCurrentPasswordGuard: verify currentPassword khớp hash (isValidHashedValue)
  3. SamePasswordGuard: chặn newPassword === currentPassword (plaintext)
  4. hashValue(newPassword) → authService.updatePassword (set password + passwordChangedAt)
  5. generateAuthTokensResponse(...) → token pair MỚI (iat > passwordChangedAt → sống sót)
  6. fire-and-forget: email cảnh báo (queue) + audit (LoginHistoryService)
Controller: set refresh cookie + trả OkSuccess { accessToken, user }
```

**Cơ chế kick thiết bị khác (đã có sẵn)**: `PasswordNotChangedGuard` tại `/auth/token/refresh` từ chối mọi refresh token có `iat < passwordChangedAt`. Token mới cấp ở bước 5 được issue **sau** khi set `passwordChangedAt` nên không bị từ chối; mọi token cũ (các thiết bị khác) bị reject ở lần refresh kế.

---

## 3. API Contract

```
PATCH /api/v1/auth/change-password          (authGuard, rate-limited per IP+user)

Request body:
  { currentPassword: string, newPassword: string, confirmPassword: string }

Response 200:
  Set-Cookie: refreshToken=<...>; HttpOnly        (REFRESH_TOKEN_COOKIE_OPTIONS)
  body: { message, data: { accessToken: string, user: {...} } }
```

Mirror đúng login: refresh token vào cookie `REFRESH_TOKEN`, access token + user info trong body (refreshToken bị strip khỏi body).

---

## 4. Backend — Components (tạo mới trong `server/src/modules/change-password/`)

| Component                                | Trách nhiệm                                                                                   | Tái dùng                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `change-password.module.ts`              | Factory wiring dependency graph + export cho `modules.loader`                                 | pattern `forgot-password.module.ts`                                                                                                                                    |
| `change-password.controller.ts`          | Nhận req (đã qua authGuard + validate), delegate service, set refresh cookie, trả `OkSuccess` | `RequestContext`, `OkSuccess`, `REFRESH_TOKEN`/`REFRESH_TOKEN_COOKIE_OPTIONS` (`@/modules/token/constants`)                                                            |
| `change-password.service.ts`             | Orchestrate: load → verify → guard → hash → update → issue token → audit/email                | `authService.findById/updatePassword`, `hashValue` (`@/utils/crypto/bcrypt`), `generateAuthTokensResponse` (`@/modules/authentication/helpers`), `LoginHistoryService` |
| `guards/wrong-current-password.guard.ts` | Verify `currentPassword` khớp hash; else `BadRequestError`                                    | `isValidHashedValue`                                                                                                                                                   |
| `guards/same-password.guard.ts`          | Chặn `newPassword === currentPassword` (plaintext)                                            | —                                                                                                                                                                      |
| `dtos/`                                  | `ChangePasswordDto` (request), response DTO                                                   | pattern dtos forgot-password                                                                                                                                           |
| `swagger/`                               | `paths.ts` + `schemas.ts` + `index.ts`                                                        | pattern swagger forgot-password                                                                                                                                        |

### Mở rộng file BE sẵn có

- `src/validators/schemas/` — schema `changePassword`: `currentPassword` (required), `newPassword` = **reuse `passwordSchema`** (`@/validators/schemas/base`), `confirmPassword` = `Joi.valid(Joi.ref('newPassword'))`.
- `src/constants/error-code.ts` — thêm `CHANGE_PASSWORD_WRONG_CURRENT`, `CHANGE_PASSWORD_SAME_AS_CURRENT`.
- `src/constants/redis/rate-limit/index.ts` — thêm block `CHANGE_PASSWORD.PER_IP_USER` (key theo IP + authId).
- `src/middlewares/common/rate-limiter.middleware.ts` — method/keyGenerator `changePasswordByIpAndUser`.
- `src/loaders/modules.loader.ts` — register module.
- `src/libs/swagger/openapi.ts` — register swagger.
- i18n BE locales `vi`/`en` — messages `changePassword`.

---

## 5. Error handling (BE)

| Tình huống                      | HTTP                  | Error / Code                      |
| ------------------------------- | --------------------- | --------------------------------- |
| Thiếu / sai định dạng field     | 422                   | validation (`validation:*` i18n)  |
| Sai current password            | 400 `BadRequestError` | `CHANGE_PASSWORD_WRONG_CURRENT`   |
| newPassword === currentPassword | 400 `BadRequestError` | `CHANGE_PASSWORD_SAME_AS_CURRENT` |
| Chưa đăng nhập / token lỗi      | 401 (authGuard)       | `AUTH_*`                          |
| Vượt rate-limit                 | 429                   | (rate-limit middleware)           |

---

## 6. Security (BE)

- Sau `authGuard`; lấy `authId` từ `RequestContext` (**không tin** body cho identity).
- Rate-limit per IP+user chống brute-force `currentPassword`.
- `passwordChangedAt` revoke các phiên khác (cơ chế sẵn có). Token mới issue **sau** set `passwordChangedAt`.
- Email cảnh báo + audit qua fire-and-forget (không block response, không làm fail flow chính nếu lỗi).
- Tuân `standard-security` + `standard-jwt`.

---

## 7. Frontend — Components (convention `forms/` + `views/AccountSettings`)

> **Correction [2026-06-03]:** Change-password FE thuộc **Account Settings** (`views/AccountSettings`), KHÔNG phải Security. Card `AccountSettings/mains/ChangePasswordCard` **đã tồn tại sẵn** (UI + mock submit) → việc cần làm là **wire vào BE API**, không tạo mới. (Bản design gốc nhầm sang Security do kế thừa design cũ + scaffold rỗng; đã sửa.)

| Item                 | Path                                                                       | Tái dùng / Ghi chú                                                                                     |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ChangePasswordCard` | `views/AccountSettings/mains/ChangePasswordCard/index.tsx`                 | **Đã có sẵn** (mock) → wire mutation thật; giữ UX Cancel/Save + dirty-check; mount sẵn trong `AccountSettings/index.tsx` |
| Form schema          | `forms/ChangePassword/` (`data.ts`, `validations.ts`, `index.ts`)          | **Đã có sẵn** → chuẩn hoá dùng `CONSTANTS.FIELD_NAMES`; zod reuse `passwordSchema`, `.refine()` confirm match |
| `useChangePassword`  | `views/AccountSettings/hooks/useChangePassword.ts`                         | `useMutation` + `setTokens` (giữ phiên) + `toast` + `useAnnounce`; namespace i18n `accountSettings.changePassword` |
| Request              | `requests/changePassword.ts`                                               | `axiosInstance.patch(END_POINTS.AUTH_CHANGE_PASSWORD, payload)` → `LoginTokenResponse`                 |

### Mở rộng file FE sẵn có

- `constants/endpoints.ts` — `AUTH_CHANGE_PASSWORD: "/auth/change-password"`.
- `constants/fieldNames/ChangePassword.ts` — `CHANGE_PASSWORD_FIELD_NAMES` (`CURRENT_PASSWORD`, `NEW_PASSWORD`, `CONFIRM_PASSWORD`).
- `locales/{en,vi}/common.json` — thêm `validation.currentPassword.required` (newPassword/confirmPassword đã có).
- i18n `accountSettings.changePassword` — **đã có sẵn** đầy đủ (fields/placeholders/buttons/toast/announce), không cần thêm.

---

## 8. FE flow & validation

- 3 field: `currentPassword`, `newPassword`, `confirmPassword`.
- Validation client: required + policy (`passwordSchema`) + `.refine()` confirm match. (Rule `new ≠ current` để **BE là source of truth**; FE có thể thêm refine cho UX.)
- **Mutation fire trong submit handler (click), KHÔNG auto-fire từ effect** — tuân lesson `no-mutation-in-effect`.
- **onSuccess (quan trọng)**: BE trả `accessToken` mới + set refresh cookie mới → hook phải **cập nhật access token trong auth store** (mirror login completion) để phiên hiện tại tiếp tục sống với token mới; reset form; `toast.success` + `announce` (a11y).
- **onError**: map error code BE (`CHANGE_PASSWORD_WRONG_CURRENT` → field error `currentPassword`; `CHANGE_PASSWORD_SAME_AS_CURRENT` → field error `newPassword`) sang message i18n.
- Tuân `standard-react`, `standard-nextjs`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility`.

---

## 9. API Contract Sync (BE DTO ↔ FE type)

| Field           | BE (`ChangePasswordDto`)             | FE (`ChangePasswordRequest`) | Khớp |
| --------------- | ------------------------------------ | ---------------------------- | ---- |
| currentPassword | `string` required                    | `string`                     | ✅   |
| newPassword     | `string` (passwordSchema)            | `string`                     | ✅   |
| confirmPassword | `string` = `ref(newPassword)`        | `string`                     | ✅   |
| **Response**    | `{ accessToken, user }` + Set-Cookie | `{ accessToken, user }`      | ✅   |

→ Không drift. Nếu lúc impl phát sinh lệch → ghi **Decision Record** + flag user trước `writing-plans`.

---

## 10. Testing

**BE** (pattern `*.spec.ts` sẵn có, vd `login-completion.service.spec.ts`):

- Service: sai current → throw `CHANGE_PASSWORD_WRONG_CURRENT`; same-password → throw `CHANGE_PASSWORD_SAME_AS_CURRENT`; happy path: `updatePassword` gọi đúng args, token mới issue **sau** `updatePassword`, audit + email fire-and-forget không block / không làm fail flow.
- Guard tests: `WrongCurrentPasswordGuard`, `SamePasswordGuard`.

**FE**:

- Validation schema: policy (`passwordSchema`), confirm match.
- Hook `useChangePassword`: onSuccess cập nhật access token + reset form; onError map field error đúng.

---

## 10.5. E2E Scenario Matrix

> **Backfill [2026-06-14]** — matrix soạn theo skill `e2e-scenario-coverage` (rubric 12 nhóm — mỗi nhóm ✅ ≥1 scenario hoặc N/A có lý do; depth dùng test-design `[EP]`/`[BVA]`/`[DT]`/`[ST]`/error-guessing với giá trị cụ thể). Feature **đã có suite** ở `client/e2e/change-password/change-password.e2e.ts` (4 case) → đây là backfill mở rộng coverage, KHÔNG rebuild. `e2e.md` (tài liệu kịch bản chi tiết per-scenario) sẽ được tạo ở bước §4.3 implementation; matrix này là source breadth/depth cho `writing-plans` expand.
>
> **Cột `Gate`**: `A+B` = chạy cả gate A (`yarn e2e`) lẫn gate B (MCP walk). `A only` = mutation-heavy / network-level / rate-limit → chỉ gate A (gate B chỉ verify read/render, không mutate song song — tránh session contamination, xem [[reference_e2e_suite_session_contamination]]). `B` = visual/UX/keyboard → lean gate B.
> **Nhãn `[EXISTS]`** = đã có trong suite hiện tại; **`[NEW]`** = cần thêm khi implement §4.3.
> **Selector thực tế** (từ card): label `Current Password` / `New Password` / `Confirm New Password`; button `Update Password` (Save) + `Cancel`; toast success `Password updated successfully`; inline error qua `aria-invalid="true"`; Save disabled khi `!isDirty` + tooltip `noChanges`; a11y qua `#announcer` (`aria-live=polite`).

| # | Category | Status | Scenario(s) + expected + [technique] + concrete values | Gate |
|---|----------|--------|--------------------------------------------------------|------|
| 1 | **Happy path** | ✅ | **[EXISTS]** điền `current=User@123` + `new=NewPass@123` + `confirm=NewPass@123` → click `Update Password` → toast `Password updated successfully` + vẫn ở `/account-settings`. **[NEW]** sau đổi, assert **phiên sống sót**: gọi authed request (`GET /users/me` / load lại `/account-settings`) → 200 với access token mới (mirror login completion, `setTokens`). | A+B |
| 2 | **AuthN (authentication)** | ✅ **[NEW]** | (a) Unauth: `clearCookies()` + storageState `undefined` → `goto /account-settings` → redirect `/login` (AuthGuardLayout). (b) `PATCH /api/v1/auth/change-password` **không Bearer** → `401` (authGuard). | (a) A+B · (b) A only |
| 3 | **AuthZ (authorization)** | N/A | Endpoint chỉ có `authGuard`, self-service — user đổi mật khẩu của **chính mình** (authId lấy từ JWT qua `RequestContext`, không tin body). Không có role/ownership surface để escalate → không có authZ case. | — |
| 4 | **Validation** | ✅ **[NEW]** (+confirm-mismatch EXISTS) | **[EP]** `newPassword` invalid classes (mỗi cái → `aria-invalid=true`, **no PATCH**): empty · no-upper `newpass@123` · no-lower `NEWPASS@123` · no-digit `NewPass@!!` · no-special `NewPass123` · =current `User@123` (client refine hoặc BE same-as-current) · reused. `currentPassword` empty → required, no PATCH. **confirm-mismatch [EXISTS]**: `confirm=Different@123` → `aria-invalid` trên confirm, no PATCH. **[DT]** precedence: (i) currentWrong+newValid `current=WrongPass@123`,`new=NewPass@123` → **PATCH** → `400 CHANGE_PASSWORD_WRONG_CURRENT` map về field `currentPassword` `[EXISTS-partial]`; (ii) currentOK+newInvalid → client policy chặn (no PATCH); (iii) currentWrong+newInvalid → client policy thắng (no PATCH, BE chưa gọi). | A+B (rows có PATCH thật → A only) |
| 5 | **Empty / null** | ✅ **[NEW]** | Form pristine (3 field rỗng, `isDirty=false`) → nút `Update Password`/`Cancel` **disabled** + tooltip `noChanges` hiện; submit không fire → **no PATCH**. | A+B |
| 6 | **Boundary / pagination** | ✅ **[NEW]** | **[BVA]** `newPassword` length quanh min=8: 7 ký tự `Ab@3xyz` → reject (`aria-invalid`); 8 ký tự `Ab@3xyzz` → accept (PATCH 200); 129 ký tự (> max) → reject. Password-history depth: **N/A** (không có reuse-history policy ngoài rule `new ≠ current`). Pagination: N/A (không list). | A+B (accept-8 row → A only) |
| 7 | **Filter / search** | N/A | Feature là form 3-field, không có list/table/filter/search surface. | — |
| 8 | **Data rendering** | ✅ | **Covered-by-selectors**: render đúng English labels (`Current Password`/`New Password`/`Confirm New Password`) + heading `Change Password` + button `Update Password` — chính là các selector dùng ở case 1/4 (assert visible khi `beforeEach`). Không có date/number/currency/relative-time surface để format-check. | A+B |
| 9 | **i18n (en + vi)** | ✅ **[NEW]** — MANDATORY | `goto /vi/account-settings` → heading/labels/button render **chuỗi vi** (vd `Đổi mật khẩu`, nút save vi); trigger 1 validation/error → assert **chuỗi lỗi vi** (vd wrong-current vi `Mật khẩu hiện tại không đúng` hoặc validation vi). Đối chiếu en case 1/4. | A+B |
| 10 | **Error / loading** | ✅ **[NEW]** | **Error**: `route.fulfill` 500 cho `PATCH /auth/change-password` → `toast.error` hiện, form **không reset** (giá trị giữ nguyên), vẫn authed. **Loading**: intercept PATCH thêm delay → giữa flight nút `Update Password` ở trạng thái loading (`isPending`) + 3 input `disabled`; sau resolve trở lại bình thường. | A+B (loading lean B) |
| 11 | **Mutation safety** | ✅ **[NEW]** | **[ST] valid**: sau đổi, authed request với **token mới** → 200 (phiên hiện tại sống). **[ST] invalid — MANDATORY**: lấy **refresh token từ context #2** (login trước khi đổi) → sau khi context #1 đổi mật khẩu → `POST /auth/token/refresh` với cookie cũ → `401/403` (`PasswordNotChangedGuard` kick thiết bị khác). **Double-submit**: click `Update Password` 2 lần nhanh → **đúng 1 PATCH** (nút disabled khi `isPending`). **Rate-limit [BVA]**: 5 lần trong window OK / lần thứ **6** → `429` (config `MAX_REQUESTS=5`). **Revert**: `afterAll` `ensureDefaultPassword(NEW_PASSWORD)` đưa mật khẩu về default — idempotent **[EXISTS]**. | A only |
| 12 | **Accessibility (a11y)** | ✅ **[NEW]** (+role/label EXISTS) | **[EXISTS-partial]**: selector dùng role/label (`getByLabel("Current Password", exact)`, `getByRole("heading"/"button")`) — chứng tỏ label↔input liên kết. **[NEW]** keyboard tab order: Tab đi `Current → New → Confirm → Update Password` đúng thứ tự DOM. **[NEW]** `#announcer` (aria-live) announce `announce.saving` (vd "Updating password...") lúc submit + `announce.saved` (vd "Password updated.") khi success. | B |

**Error-Guessing note (cross-cutting)**: dán giá trị có **trailing space** vào `new` + `confirm` (vd `"NewPass@123 "` cả 2 field) — document hành vi: confirm có khớp không (zod compare nguyên văn → khớp nếu cả 2 cùng trailing space), policy có pass không, BE trim hay reject. Ghi kết quả quan sát vào `e2e.md`, KHÔNG sửa app code (gặp behavior bất ngờ → flag follow-up).

**Contamination guard**: gate B login bằng auth context **riêng** (KHÔNG share storageState với gate A — cookie localhost không scope theo port). Mọi row `Gate = A only` (case 11 mutation/refresh-revoke/rate-limit, case 4 rows có PATCH thật) gate B **chỉ verify read/render**, không mutate song song.

---

## 11. Out of scope (YAGNI)

- Không buộc re-login toàn bộ (đã chọn giữ phiên hiện tại).
- Không tự suy diễn coupling sang `forgot-password` (audit làm riêng).
- Không thêm policy mật khẩu mới — reuse `passwordSchema` hiện có.

---

## 12. Next steps

1. `superpowers:writing-plans` → chia task theo side (BE / FE), đặt tên rõ side; plan tham chiếu trực tiếp design doc này (gồm API Contract Sync §9).
2. Code theo `subagent-driven-development` + convention theo side (BE đọc `server/.claude/CLAUDE.md`, FE đọc `client/.claude/CLAUDE.md`).
3. `security-auditor` (feature đụng auth) → `specs/change-password/security-report.md`; `readme-maintainer` khi finishing branch (chỉ nếu đổi setup/config/deps).
