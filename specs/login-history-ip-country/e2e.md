# E2E — login-history-ip-country

Reconcile (không rebuild) từ Scenario Matrix trong `design.md`. Feature là **fix** cho views login-history đã có — delta chỉ nằm ở cách render **IP** (normalize) và **country/location** (`LOCAL`/`UNKNOWN`/ISO) ở 3 view: user list (`/login-history`), admin list (`/admin/login-history`), admin detail (`/admin/login-history/[id]`).

Cả 2 gate (§4.3): **Gate A** `cd client && yarn e2e` (suite committed) + **Gate B** MCP Playwright walk (browser thật, auth context riêng). Chưa chạy ở bước này — dual-gate chạy sau, khi app đã up.

## Covered scenarios

| Matrix # | Category                | Test file                                                                        | Test name                                                                                        |
| -------- | ------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1        | Happy path               | `e2e/login-history/my-login-history.e2e.ts`                                       | "row shows normalized loopback IP and the localized Local label (en)"                              |
| 1        | Happy path (admin, đã có trước fix, vẫn giữ) | `e2e/admin-login-history/admin-login-history-detail.e2e.ts`         | "admin opens the list, clicks View, and the detail page renders" (existing, unchanged)             |
| 4        | Validation/EP — country=LOCAL (en) | `e2e/admin-login-history/admin-login-history-detail.e2e.ts`            | "country=LOCAL renders the localized Local label, not the raw sentinel (en)"                       |
| 4        | Validation/EP — country=UNKNOWN (en) | `e2e/admin-login-history/admin-login-history-detail.e2e.ts`          | "country=UNKNOWN renders the localized Unknown label, not the raw sentinel (en)"                   |
| 4        | Validation/EP — country=LOCAL (vi) | `e2e/admin-login-history/admin-login-history-detail.e2e.ts`            | "country=LOCAL renders the vi label 'Nội bộ (Local)', not the raw sentinel"                        |
| 4        | Validation/EP — ip loopback normalize (user view) | `e2e/login-history/my-login-history.e2e.ts`               | "row shows normalized loopback IP and the localized Local label (en)" (asserts `127.0.0.1`, no `::1`/`::ffff:`) |
| 8        | Data rendering — composition (city, country) | `e2e/admin-login-history/admin-login-history-detail.e2e.ts` (existing) | "detail renders localized/formatted values, not raw enums" (Vietnam/Hanoi → "Hanoi, Vietnam" still valid, unchanged by fix) |
| 8        | Data rendering — sentinel city → country-label only | `e2e/admin-login-history/admin-login-history-detail.e2e.ts` (3 new LOCAL/UNKNOWN tests above) | city="LOCAL"/"UNKNOWN" → only country label shows, no `"<city>, <country>"` concat |
| 9        | i18n — en labels ("Local"/"Unknown") | `e2e/admin-login-history/admin-login-history-detail.e2e.ts`          | "country=LOCAL renders the localized Local label..." + "country=UNKNOWN renders the localized Unknown label..." |
| 9        | i18n — vi labels ("Nội bộ (Local)"/"Không xác định") | `e2e/admin-login-history/admin-login-history-detail.e2e.ts` + `e2e/login-history/my-login-history.e2e.ts` | "country=LOCAL renders the vi label 'Nội bộ (Local)'..." (admin detail) + "row shows the vi label 'Nội bộ (Local)'..." (user list) |

Existing suite tests (Row 2/3/5/6/7/10/11/12 admin coverage) are **unchanged** — kept as-is per the reconcile rule (không remove/weaken); the `Vietnam`/`Hanoi` `FAILED_RECORD` stub still renders `"Hanoi, Vietnam"` unaffected by the fix (real ISO country + real city bypasses the new sentinel branch).

## N/A rows (unchanged from design.md, reasons repeated here for traceability)

| # | Category | Reason |
| - | -------- | ------ |
| 2 | AuthN | Delta không đổi luồng auth; các trang login-history đã yêu cầu đăng nhập, cover ở suite hiện có (`auth.setup.ts` / admin-authz). |
| 3 | AuthZ | Admin views chặn role qua BE 403 (không đổi bởi delta); cover ở `admin-authz.e2e.ts` + authZ test trong `admin-login-history-detail.e2e.ts`. |
| 5 | Empty/null | Empty state login-history không đổi bởi delta; cover sẵn ở suite hiện có (null userId/timezoneOffset test). |
| 6 | Boundary/paging | Pagination/sort không đổi bởi delta. Ranh giới mask (`maskIp` min/max octet, IPv4-mapped) là bound của pure function → cover ở **BE unit test** (`server/src/modules/login-history/helpers/*.spec.ts`), không phải E2E. |
| 7 | Filter/search | UI filter hiện chỉ có status/method/date; delta không thêm filter theo country. |
| 10 | Error/loading | Error/loading UI không đổi bởi delta; cover sẵn (500 test + skeleton test + abort test trong suite admin detail hiện có). |
| 11 | Mutation safety | Feature read-only, không có mutation ở cả 3 view. |
| 12 | Accessibility | Location/IP là text thuần trong cell có sẵn, không thêm element tương tác; selector role/label giữ nguyên (cover sẵn: keyboard-activation + back-preserves-filter + announce-on-load trong suite admin detail). |

## Deferred / uncertain cases

Không có `test.fixme`. Route (`/login-history`, page tại `src/app/[locale]/(private)/(dashboard)/login-history/page.tsx` → view `LoginHistory`) và endpoint (`GET /api/v1/login-history`, hằng số `CONSTANTS.END_POINTS.LOGIN_HISTORY = "/login-history"`, hook `useMyLoginHistory` → `getMyLoginHistory`) được xác nhận trực tiếp từ code — đủ tin cậy để viết test quyết đoán, không cần đánh dấu `fixme` để xác nhận lại ở dual-gate.

Lưu ý cho dual-gate: `my-login-history.e2e.ts` chỉ stub endpoint list (`/api/v1/login-history`), KHÔNG stub `/api/v1/login-history/stats` (StatsRow) — gate chạy trên app thật nên stats vẫn gọi API thật; không ảnh hưởng assertion (assertion chỉ nhắm bảng, không nhắm StatsRow).

## Test files touched

- `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts` — ADD 3 tests (LOCAL en, UNKNOWN en, LOCAL vi); không sửa/xóa test cũ.
- `client/e2e/login-history/my-login-history.e2e.ts` — NEW file, 2 tests (LOCAL en, LOCAL vi), chạy dưới project `chromium` (storageState `user.json`) nhờ glob `testIgnore` hiện tại của `playwright.config.ts` không loại trừ folder `login-history/`.

## Pure-function coverage note (from design.md)

`maskIp`/`extractIp`/`geoipLookup` là pure function → EP/BVA đầy đủ cover ở **BE unit test**, không lặp lại ở E2E. E2E ở đây chỉ assert **kết quả render cuối** (nhãn i18n + IP đã normalize) trên UI, đúng như design.md đã note ở mục "Lưu ý phân tầng test".
