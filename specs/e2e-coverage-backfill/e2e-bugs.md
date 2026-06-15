# E2E Bugs Log — e2e-coverage-backfill (dual-gate §4.3)

Append-only. 1 entry per fail round.

## Round 1 — 2026-06-14 — Gate A (`yarn e2e` against worktree FE :3100)

**Gate fail:** A (Gate B chưa chạy — chạy tuần tự sau A để tránh contamination shared account).
**Context:** Tests Phase 1 viết tĩnh (app chưa chạy lúc viết) → round này là lần execute thật đầu tiên. ~33 fail, gom thành 6 cluster + 1 sự cố seed.

### SEED-0 (đã xử lý) — change-password revert thất bại → seed user hỏng
- **Triệu chứng:** sau khi chạy change-password subset, `user@test.com` còn password `NewPass@123` (revert về `User@123` không chạy/không hiệu lực) → mọi chromium suite sau đó 401.
- **Root cause:** (a) chạy change-password ở dạng subset/out-of-order làm gãy chuỗi `afterAll` của serial describe; (b) `ensureDefaultPassword(currentGuess)` chỉ thử DEFAULT rồi 1 `currentGuess` — nếu nhiều test đổi sang password khác nhau, guess sai → revert fail.
- **Fix đã làm:** main loop khôi phục thủ công qua API (login `NewPass@123` → change về `User@123`). Verify login `User@123` OK.
- **Follow-up fix (test):** làm `afterAll` revert robust hơn (thử lần lượt TẤT CẢ password mà suite có thể đặt: NewPass@123, Ab@3xyzz, 8-char...), và đảm bảo chạy change-password như 1 khối (không subset).

### R1 (TEST bug) — `page.request.get()` API-level tests trả 401
- **Triệu chứng:** apps-list:258/271/367, admin-users-list:101/147, admin-apps:119 — expect 400/200, **got 401**.
- **Root cause:** login set **refreshToken cookie**; **accessToken nằm trong response body** và app gửi qua `Authorization: Bearer` (axios). Playwright `page.request` chỉ gửi cookie, KHÔNG có Bearer → BE 401. (Probe xác nhận: BE 200 với Bearer, 401 với chỉ cookie.)
- **Fix:** các test API-level phải tự lấy accessToken (login qua `request` lấy `data.accessToken`) rồi set `Authorization: Bearer` header; hoặc chuyển sang test qua UI. (Reviewer tĩnh đã nhận định sai rằng cookie đủ — đây là phát hiện runtime.)

### R2 (CẦN QUYẾT ĐỊNH behavior) — 403 → FE hiện generic error, không phải permission toast
- **Triệu chứng:** admin-authz:53 (×3 route), admin-login-history-detail:343 — expect toast "You do not have permission to perform this action."; FE thực tế hiện generic "Could not load …" (chính là CF-2 isError UI). BE trả **403 `AUTH_ADMIN_ONLY`** đúng (probe xác nhận).
- **Phân tích:** `query-client.ts` map 403 → toast permission. CF-2 thêm isError branch → render "Could not load users." Cả 2 cùng xảy ra; test assert toast nhưng (khả năng) toast đã auto-dismiss khi assert, hoặc surface mong đợi nên là isError UI.
- **Cần quyết:** (a) test sai → assert hành vi thật (BE 403 + admin data vắng mặt + isError UI), hay (b) app cần đảm bảo permission toast hiển thị ổn định cho 403. Mặc định đề xuất: (a) — vì 403→toast là hành vi global đã có, test chỉ cần robust (chờ toast ngay sau navigate, hoặc assert isError UI).

### R3 (TEST bug) — strict-mode locator khớp 2 phần tử
- **Triệu chứng:** admin-users-list:257 (`getByRole('alert')` ×2), :292/:322 (`getByRole('textbox',{name:'Search'})` ×2 — header global search "Search apps..." + toolbar "Search"), admin-login-history-detail:170/:235 (error text ×2), notifications:548 (title trùng ở list + dialog).
- **Root cause:** locator chưa scope; AppHeader có global search aria-label chứa "Search".
- **Fix:** scope locator (`.first()` hoặc trong container cụ thể; dùng `exact`/region). Đây thuần test fix.

### R4 (CẦN ĐIỀU TRA) — login-history detail render/abort
- **Triệu chứng:** admin-login-history-detail:95 (`getByText('Password',exact)` không thấy — detail body content vắng), :209 (network abort → error UI không thấy).
- **Phân tích:** có thể (a) detail render gap thật, (b) seed (record không có method=PASSWORD), hoặc (c) abort path không surface error UI (RQ retry-only-5xx → abort xử lý khác). Cần Gate B / điều tra DOM thật.

### R5 (TEST/seed bug) — assertion vs seed thực tế
- **Triệu chứng:** notifications:706 — title thật `"Unusual sign-in detected (#8)"` (có hậu tố `(#N)`), test assert `{exact:true}` "Unusual sign-in detected"; admin-login-history-detail:279 — không có record `status=failed` ở page 2 → nút View không thấy.
- **Fix:** dùng partial match / điều chỉnh giả định seed (hoặc seed tham số hoá).

### R6 (TEST, low-signal) — loading skeleton
- **Triệu chứng:** apps-list:465 — `[data-slot="skeleton"]` count = 0 (response quá nhanh hoặc selector sai).
- **Fix:** dùng route-delay gate đã có nhưng tăng/đảm bảo intercept giữ pending; hoặc nới timing.

### CP-VI (TEST bug) — change-password vi-route dùng label tiếng Anh
- **Triệu chứng:** change-password:223 — timeout `getByLabel("Current Password")` trên `/vi` (page render "Mật khẩu hiện tại").
- **Fix:** helper/test locale-aware (đọc label theo locale đang test).

**Trạng thái:** chưa fix (trừ SEED-0). Round 2 sẽ fix các TEST cluster + chốt R2/R4 theo quyết định user, rồi re-run cả 2 gate.

## Round 2 — 2026-06-14 — fix + re-run (Gate A round 2 + Gate B)

**Quyết định user:** fix hết (đều test-side, không app bug) + re-run cả 2 gate.

**Fix đã làm (test-only, không sửa `src/**`):**
- **R1 (Bearer):** API-level test tự login lấy `data.accessToken` → set `Authorization: Bearer`. Fix ở admin-users-list, edit-apps, web-app-user-list (+ admin-authz, admin-login-history-detail dùng cho BE-403 contract). Xác nhận BE bound `limit` 1–100.
- **R2 (403 surface):** assert robust thay vì transient toast — URL giữ nguyên (không có FE role guard), deny UI theo từng route (users→isError "Could not load users", apps→empty registry, login-history→empty), admin data vắng mặt, + BE 403 `AUTH_ADMIN_ONLY` per route. (Không đổi app — generic error + global toast là hành vi hiện có.)
- **R3 (strict-mode locator):** scope locator (`.first()` / trong `dialog` / `exact:true`). Phát hiện AppHeader có global search "Open search" trùng "Search" toolbar.
- **R4:** :279 page2→page1 (14 record failed gọn page 1); :95 test-data `PASSWORD`→`password` (enum lowercase); :209 network-abort thực tế hiện blocking confirm-toast (axios `confirmErrorToast` chờ OK) → test assert đúng flow (không phải app bug).
- **R5 (seed drift):** notifications `SEED_UNREAD_TITLE`→`"Unusual sign-in detected (#22)"` (padded row không bị mutation consume); login-history page fix.
- **R6:** skeleton selector `[data-slot="skeleton"]`→`.animate-pulse` (Skeleton primitive không có data-slot).
- **CP-VI:** change-password vi-route dùng label vi thật; `ensureDefaultPassword` robust (thử nhiều candidate password); revert chắc về `User@123`.
- **CP-RATE-LIMIT (structural):** BE change-password limit 5/IP+user/15min < ~11 PATCH suite → redesign: giữ ≤4 real PATCH (happy + token-revoke real), mock phần còn lại bằng `page.route` (giữ intent FE), rate-limit test vẫn `test.skip`. Clear Redis bucket trước verify.

**App findings (KHÔNG sửa — flag follow-up):**
- **double-submit không có in-flight guard cứng:** edit-apps form dựa `disabled={isPending}` (flip sau re-render) → 2 click cùng tick có thể fire 2 PATCH (idempotent, không hỏng data). Test edit-apps `test.fixme`; notifications :446 verify được guard hoạt động (disabled swallow click) nên pass. Khuyến nghị: thêm in-flight ref guard ở mutation submit.
- **password-not-changed.guard iat 1-giây resolution:** token issued cùng giây với đổi mật khẩu không bị revoke (strict `iat < passwordChangedAtSec`). Test workaround chờ 1.1s. Follow-up: dùng `<=` hoặc mốc mili-giây.

**Kết quả re-verify:**
- **Gate A round 2 = PASS:** admin-users-list 24, edit-apps 20 (+2 skip: null-prefill, double-submit fixme), admin-login-history 18, admin-authz 4, web-app-user-list 23, notifications 29, change-password 28 (+1 skip rate-limit). Chạy theo thứ tự contamination-safe (admin → user-read → change-password cuối), clear Redis bucket. Password `User@123` verify 200.
- **Gate B (MCP walk) = PASS:** 6 feature render đúng en+vi, không console error, không failed network. CF-2/CF-4 (Category prefill human label) confirmed. Minor follow-up: vài label vi chưa dịch (Role header/filter, Category enum, vài label detail) — không block.

**Side effect (dev DB):** notifications mutation test (D9 persistence, mark-single) đánh dấu read vĩnh viễn vài notification unread (không có mark-unread API). Minor; reseed nếu cần: `cd server && yarn seed --clear && yarn seed`.

**Kết luận:** Dual-gate §4.3 PASS sau round 2 (≤3 vòng). Teardown: worktree FE :3100 đã tắt, BE :5000/FE :3000 của user giữ nguyên.

## Follow-up fixes (post-merge, branch `fix/e2e-followups`)

Xử lý các app finding theo thứ tự, mỗi issue 1 commit để review dễ.

- **Issue #1 — double-submit guard (FE) [DONE]**: hook dùng chung `src/hooks/useSubmitGuard.ts` (`run`/`release` + in-flight `useRef`, chặn đồng bộ trước re-render); áp 7 form mutate-BE-thật (AdminAppsFormSheet, ChangePasswordCard, Profile PersonalInfoForm, ForgotPasswordReset, LoginPassword, Signup InfoStep, Login EmailStep) — `onSubmit` bọc `run(...)` + `onSettled: release`. Un-fixme test double-submit edit-apps (pass, 1 PATCH, self-revert). Refactor onError ChangePasswordCard → object-mapping `FIELD_ERROR_MAP`.
- **Issue #2 — vi label + Category localize (FE+BE) [DONE]**: vi Role header/filter → "Vai trò". Category localize theo **Approach A** (FE i18n by slug, explicit map): BE `UserCategoryDto` +`slug`, `UserAppDto` +`categorySlug`, repo populate `select: "displayName name"`; FE `common.categories` (en+vi) + `dataSources/Categories` map `CATEGORY_LABEL_KEY` + `resolveCategoryLabel(t,slug,fallback)`; localize 4 render site (CategoryFilter pill, app card + announce ở AppsBoard, CategorySelect, AdminAppsTable). E2E thêm assertion vi "Năng suất". en giữ "Content" (không regression). KHÔNG đổi schema (slug = field `name` sẵn có).
- **Issue #3 — password-not-changed.guard iat resolution (BE) [DONE]**: fix bằng **tokenVersion discriminator** (không sửa toán tử — `<=` sẽ revoke nhầm phiên hiện tại; iat giây không tách được same-second). Auth `+tokenVersion`; refresh payload mang version; `updatePassword` `$inc tokenVersion` (atomic, return version mới) → change-password issue token với version mới; guard reject `(payload.tokenVersion ?? 0) < auth.tokenVersion` (`?? 0` migration mượt). forgot-password cũng bump. Bỏ `1.1s wait` trong e2e. Verify: curl chứng minh OLD token reuse **cùng giây** → 403, NEW token → 200; change-password e2e 28 pass/1 skip.
  - **Env note**: phát hiện server+client `node_modules` bị prune devDeps (ts-node/eslint/playwright) → `yarn install` khôi phục (tắt BE :5000 + FE :3000 tạm để gỡ EPERM bcrypt, đã bật lại). Xem [[reference_e2e_auth_ratelimit_gotchas]].

### Finding mới — double error-notification (global toast trùng form onError) [FOLLOW-UP, làm sau]

`query-client.ts` đặt `MutationCache.onError: queryErrorHandler` → toast cho MỌI mutation 4xx. RQ chạy CẢ global cache onError LẪN `onError` per-call form. Form có bespoke onError (AdminAppsFormSheet, ChangePasswordCard) làm `setError`/`toast.error` → **chồng global toast = 2 thông báo** (sai mật khẩu / 409: field error + toast; else: 2 toast). Form chỉ-dựa-global thì OK (1 toast).

**Fix đề xuất:** `meta: { skipGlobalErrorToast: true }` (augment `MutationMeta`); `MutationCache.onError` đọc `mutation.meta` → skip khi set; hook tự xử lý (`useUpdateAdminApp`/`useCreateAdminApp`/`useChangePassword`) opt-out → form là chủ duy nhất (1 thông báo). E2E assert no-double. Pre-existing, scope riêng — user chọn làm sau.
