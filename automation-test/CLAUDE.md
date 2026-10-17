# web-app-ducker-id-automation-test

Bộ test E2E Playwright cho **Ducker ID**: test UI trên trình duyệt thật và test API qua HTTP, chạy với stack thật
(client Next.js, API Express, MongoDB, Redis) trên một **database seed riêng**. Package pnpm độc lập ở gốc repo app;
toàn bộ code và tài liệu test nằm trong `src/`. Mỗi thư mục trong `src/` có `README.md` nói rõ chứa gì, không chứa gì
và được import gì. Đọc README đó trước khi thêm file.

Bố cục và quy ước lấy từ skill workspace `scaffold-automation-testing`; khác biệt có chủ đích được ghi ở
[Khác với skill](#khác-với-skill).

## Cấu trúc

```
automation-test/
├── scripts/coverage-check.ts      REQ ↔ TC ↔ spec ↔ bug, @smoke ⇔ P0, sinh traceability matrix
├── playwright.config.ts           project session → app* → teardown, unit
├── .claude/skills/write-tests/    skill /write-tests <module>
└── src/
    ├── docs/
    │   ├── requirements/<module>.md   REQ-<MODULE>-NN — điều phải chứng minh
    │   ├── decisions/<module>.md      nguồn, quyết định chốt, tài khoản, dữ kiện server, ngoài phạm vi
    │   ├── traceability-matrix.md     sinh tự động, không sửa tay
    │   ├── test-strategy.md · test-plan.md · test-design-techniques.md · test-data.md
    │   ├── requirement-sources.md     nơi /write-tests đọc requirement (docs + code của app)
    │   ├── migrated-tests.md          module nào đã chuẩn hóa theo skill, chỗ nào còn trỏ về nơi cũ
    │   ├── id-migration.md            ánh xạ ID cũ → mới (đổi quy ước 2026-10-13)
    │   ├── bug-history.md             bug log theo feature trước khi có bộ regression
    │   └── runs/                      tóm tắt từng lượt chạy (TEMPLATE.md)
    ├── test-cases/<module>.md         TC-<MODULE>-NNN — kiểm thế nào
    ├── defects/<module>.md            BUG-<MODULE>-NN — app đang sai ở đâu, đang mở / đã sửa
    ├── config/                        env (đọc từ client + server), urls, accounts, datastores, auth-state
    ├── utils/                         tiện ích không biết UI, kèm *.test.ts; cả hạ tầng dùng chung: redis.ts (plant OTP, xoá
    │                                  rate limit), accounts.ts (tài khoản throwaway, dọn DB), jwt.ts…
    ├── data/                          copy.ts (import thẳng locale JSON của client + server), test-data.ts
    ├── api/                           client REST theo resource, gộp ở api/index.ts; session.ts (apiAs)
    ├── components/                    UI lặp lại giữa nhiều trang
    ├── pages/                         Page Object, kế thừa pages/base.page.ts
    ├── fixtures/                      *.fixture.ts gộp bằng mergeTests ở index.ts
    └── tests/
        ├── seed.spec.ts               seed cho agent planner/generator
        ├── setup/                     user.setup.ts, admin.setup.ts, cleanup.teardown.ts
        ├── e2e/<module>/<topic>.e2e.ts · e2e/infra/
        └── api/<module>/<topic>.api.ts
```

`<module>` là tên thư mục viết thường (`auth`, `admin-users`…); mã trong ID là bản viết HOA bỏ gạch (`ADMINUSERS`).
Tên file spec là **chủ đề** (`lock-unlock`, `rate-limit`), không phải tên ticket hay branch.

### Vì sao chia như vậy

| Câu hỏi                                              | Thư mục                                 |
| ---------------------------------------------------- | --------------------------------------- |
| Phải chứng minh điều gì? Vì sao?                     | `docs/requirements/`, `docs/decisions/` |
| Kiểm thế nào?                                        | `test-cases/`                           |
| App đang sai ở đâu?                                  | `defects/`                              |
| Chạy ở đâu, URL nào, tài khoản nào, Redis/Mongo nào? | `config/`                               |
| Tiện ích kỹ thuật dùng lại, không biết UI?           | `utils/`                                |
| Dùng giá trị gì (text, dữ liệu)?                     | `data/`                                 |
| Gọi backend thế nào?                                 | `api/`                                  |
| Phần tử nằm đâu, người dùng làm được gì?             | `pages/`, `components/`                 |
| Test nhận sẵn những gì?                              | `fixtures/`                             |
| Kịch bản và kỳ vọng?                                 | `tests/`                                |

## Cấu hình: đọc từ client và server

Suite không khai lại giá trị app đã có. `src/config/env.ts` tra mỗi key theo thứ tự, gặp trước thắng:

1. `process.env` (shell, CI)
2. `automation-test/.env` — **chỉ override** cho stack e2e (`.env.example` liệt kê)
3. `client/.env.local`, `client/.env` / `server/.env` của checkout này
4. cùng các file đó ở **checkout chính** khi đang ở git worktree (worktree không có `.env` thật — chúng bị gitignore)
5. `client/.env.example` / `server/.env.example` — chỉ lấp key mà không file thật nào khai

| Giá trị           | Nguồn                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| web URL (baseURL) | `E2E_BASE_URL` → `.worktree-state.json` → client `NEXT_PUBLIC_SITE_URL`                         |
| API prefix        | client `NEXT_PUBLIC_API_PREFIX`                                                                 |
| API origin        | `E2E_API_URL` → client `API_SERVER_URL` → server `APP_PORT`                                     |
| Redis / Mongo     | server `REDIS_URL`, `DB_URL`, `DB_NAME` (override `DB_NAME=ducker-id-e2e`)                      |
| tài khoản seed    | `E2E_USER_*` / `E2E_ADMIN_*` → parse `server/src/database/seeders/data/users.ts`                |
| text để assert    | `client/src/locales/en/*.json`, `server/src/i18n/locales/en/*.json` (import qua `data/copy.ts`) |

`server/.env` trỏ vào dữ liệu làm việc thật — luôn override `DB_NAME`. Redis là Redis cloud của server: suite plant OTP và
xoá `rate-limit:*` trên chính nó, nên không chạy khi một server Ducker ID khác (vd dev `:5000`) đang dùng cùng Redis. `user.setup.ts` từ chối mọi database không
phải seed (`assertSeededDatabase`).

## Quy tắc phân lớp

Phụ thuộc chỉ đi xuống: `tests → fixtures → pages / components / api → config / utils / data`.

- `tests/`: kịch bản + `expect`. Không viết locator thô cho phần đã có page object/component.
- `pages/`, `components/`: locator (method trả `Locator`, lazy) + hành động người dùng. **Không assertion nghiệp vụ.**
  Được chờ trạng thái sẵn sàng của chính nó (heading hiện trong `goto()`, `waitForURL` sau submit).
- `api/`: chỉ HTTP, không `expect`. Không import `pages/`, `components/`.
- `utils/` hạ tầng (`redis.ts`, `accounts.ts`, `auth.ts`) ghi thẳng vào Redis / MongoDB của server; URL lấy qua
  `config/datastores.ts`. `accounts.ts` đăng ký tài khoản throwaway qua `api/` — ngoại lệ duy nhất của luật import.
- `config/`, `utils/`, `data/`: không import `pages/`, `components/`, `fixtures/`.
- Spec import `test`, `expect` từ `@/fixtures`; type từ `@playwright/test`. Được import thêm `@/utils/*`, `@/data/*`
  phiên ngoài fixture từ `@/api/session` (`apiAs`, `loginOverApi`, `bearerContext`, `refreshStatus`, `loginInBrowser`,
  `userContext` / `adminContext` — cho `beforeAll` hoặc tài khoản riêng), `createApiClient` từ `@/api` để bọc
  `userApi` / `adminApi` (`createApiClient(adminApi).adminUsers.lock(…)`), và page object khi cần instance thứ hai
  (`new AdminUsersPage(page, copyVi, "/vi")`). Đây là ngoại lệ so với skill (skill chỉ cho `test`, `expect`).
- Alias duy nhất `@/*` = `src/*`. Trong cùng thư mục dùng đường dẫn tương đối (`./env`).

**Page object:** một class mỗi trang, `<Name>Page` trong `kebab-case.page.ts`, constructor nhận `Page`, có `goto()` nếu
trang có URL riêng (đường dẫn tương đối). Dialog riêng của trang là class con trong cùng file. Page object mới thì thêm
vào `fixtures/pages.fixture.ts`; tab/vai trò thứ hai thì `new XxxPage(adminPage)`.

**Text:** assert text lấy từ `copy` / `serverMessage` trong `data/copy.ts` — đó là chính file locale app render, không
phải bản chép. Mã lỗi (`LOGIN_INVALID_CREDENTIALS`) là hợp đồng API, viết literal.

## Phiên đăng nhập (role)

Không project nào quyết định role. Mỗi spec tự khai:

```ts
import { test, expect } from "@/fixtures";

test.use({ role: "admin" }); // file / describe — mặc định "user"; "guest" = không phiên

test("…", async ({ page }) => {}); // page theo role đã khai
test("…", async ({ adminPage, userPage, guestPage }) => {}); // nhiều role một lúc
test("…", async ({ adminApi, userApi, guestApi }) => {}); // API với Bearer token
test("…", async ({ api, newApi }) => {}); // client REST: api trên request của test, newApi() = phiên ẩn danh mới
```

Không chọn phiên theo tên thư mục, không hardcode `.auth/*.json`.

## Dữ liệu test

- **Tài khoản seed chỉ đọc.** `user@test.com`, `admin@test.com` dùng chung cho mọi spec: chỉ gửi đúng mật khẩu của
  chúng — không nhập sai, không khoá, không đổi/reset mật khẩu, không dùng cho sign-up. Test đổi trạng thái tài khoản dùng `createAccount()` từ `@/utils/accounts` (`…@e2e.example.com`),
  project `teardown` xoá sau mỗi lượt.
- **Mã một lần được plant, không đọc.** Gọi endpoint _send_ thật, rồi `plantCode(kind, email, KNOWN_OTP)` từ
  `@/utils/redis` (server chỉ lưu hash bcrypt).
- Rate-limit counter bị xoá trước mỗi test. Test kiểm chính rate limit đặt `test.use({ keepRateLimits: true })`.
- Test đổi trạng thái dùng chung (app, category, notification seed) trả lại trong `afterEach` / `afterAll`.
- Không hardcode host/cổng — URL tương đối (`baseURL` đã đặt).
- Chi tiết: `src/docs/test-data.md`.

## Tag

Gắn qua `{ tag: [...] }`, không viết trong tên test.

| Tag                | Khi nào gắn                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `@TC-<MODULE>-NNN` | mọi test chứng minh một test case (bắt buộc, `coverage:check` kiểm) |
| `@smoke`           | mọi case P0, và chỉ case P0 (`coverage:check` kiểm cả hai chiều)    |
| `@e2e-full`        | luồng xuyên module, chỉ chạy với `pnpm test:full`                   |

Một `describe` được mang tag `@TC-…` khi mọi test bên trong cùng chứng minh một test case.

Không có `@email` (mã được plant qua Redis, không đọc hộp thư) và không có `@creates-data` (không có stg/prd: mọi lượt
chạy trên database seed riêng).

## Tư duy tester: 6 lăng kính (theo thứ tự)

1. **Truy vết requirement**: mỗi REQ trong `docs/requirements/<module>.md` có ít nhất 1 test case.
2. **Phân vùng tương đương**: chia input thành nhóm hành xử giống nhau, mỗi nhóm lấy 1 đại diện.
3. **Giá trị biên**: test đúng biên, ngay dưới và ngay trên biên.
4. **Chuyển trạng thái**: liệt kê trạng thái; thử nhảy cóc (vào thẳng URL bước sau) và quay lui.
5. **Đoán lỗi / negative**: khoảng trắng, viết HOA, double-click submit, back giữa chừng, resend liên tục, 2 tab.
6. **Bảo mật & ngoài lề**: message không lộ việc tài khoản tồn tại hay không, brute-force, token sau logout, không có
   lỗi console / 5xx.

Bảng kỹ thuật chi tiết: `src/docs/test-design-techniques.md`.

**Chọn tầng:** API (`tests/api`) cho mọi tổ hợp input, biên, bảo mật, rate limit, giao thức (OIDC, PKCE, refresh).
UI (`tests/e2e`) cho luồng người dùng thật, message, điều hướng, trạng thái nút. Mỗi luồng UI 1 case, không lặp tổ hợp
đã phủ ở API.

**Ưu tiên:** P0 = hỏng là chặn người dùng hoặc rò dữ liệu (gắn `@smoke`). P1 = luồng phụ quan trọng. P2 = biên hiếm.

## Format

Mẫu đầy đủ trong README của từng thư mục: `src/docs/requirements/`, `src/docs/decisions/`, `src/test-cases/`,
`src/defects/`. `Automated` trong test case là đường dẫn tính từ `src/` (vd `tests/e2e/auth/lockout.e2e.ts`) hoặc
`manual — <lý do>` — case manual vẫn tính là phủ requirement, nên lý do phải nói rõ vì sao không tự động được.

`pnpm coverage:check` báo lỗi khi: REQ không có TC; TC trỏ REQ không tồn tại; TC thiếu Priority; file `Automated` không
tồn tại hoặc không có test gắn tag của TC; spec gắn `@TC-…` mà không TC nào định nghĩa; TC P0 không có test `@smoke`
hoặc TC không phải P0 lại có; comment `// BUG:` trỏ bug không tồn tại, trỏ bug đã sửa, hoặc không có `test.fail()`
ngay dưới; bug đang mở mà không spec nào đánh dấu; bug trỏ TC không tồn tại.
Thêm/sửa TC xong chạy `pnpm coverage:check --write` để sinh lại matrix.

## Luật cứng

- Kỳ vọng bám `docs/requirements/<module>.md` + `docs/decisions/<module>.md`. App sai so với đó là **bug**:
  `test.fail()` kèm comment `// BUG: defects/<module>.md#bug-<module>-nn` **ngay trên**, ghi bug vào
  `defects/<module>.md`. Không sửa kỳ vọng cho khớp bug.
- Selector ưu tiên `getByRole` / `getByLabel` / `getByText`; `data-testid` chỉ khi markup không cho gì tốt hơn; không
  dùng CSS class của thư viện UI. Selector nằm trong page object/component.
- Không `waitForTimeout`. Chờ bằng `expect(...).toBeVisible()`, `waitForResponse`, `page.clock`.
- Mỗi test độc lập: không phụ thuộc thứ tự, không dùng chung dữ liệu tạo ở test khác (trừ `@e2e-full`).
  Chạy riêng được: `pnpm test -g "@TC-AUTH-014"`.
- Không ghi secret vào file nào ngoài `.env`.
- Request API đi qua client trong `api/` (fixture `api` / `newApi`), không gọi `request` trần, không hardcode
  `/api/v1` (prefix lấy từ client). Resource mới = file `<resource>.client.ts` + một namespace trong `api/index.ts`.
- Tên test = tiêu đề TC trong `test-cases/<module>.md` (tiếng Anh). Test case viết trước 2026-10-13 có tên test lệch
  tiêu đề TC — đồng bộ khi chuyển module đó (xem dưới).

## Khác với skill

| Skill                                              | Ở đây                                              | Vì sao                                                                    |
| -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm`                                              | `pnpm 10`                                          | mọi project JS trong workspace dùng pnpm                                  |
| `.env` khai URL + tài khoản theo `ENV` dev/stg/prd | đọc từ client + server, `ENV` chỉ có `dev`         | không có stg/prd; tránh lệch giá trị với app                              |
| `data/copy.ts` chép text kèm nguồn                 | import thẳng locale JSON                           | cùng repo, không cần chép                                                 |
| `project app` + `provision`                        | `session` → `app*` → `teardown`, không `provision` | phiên user/admin đăng nhập một lần; dữ liệu seed bằng `server: pnpm seed` |
| `globalSetup`                                      | project `session` → `app*` → `teardown`            | theo bảng gom của skill                                                   |

### Trạng thái chuẩn hóa

Cả 20 module đã theo đủ quy tắc (2026-10-14): page object, api client, copy import, tên test = tiêu đề TC; `src/helpers/`
đã xoá. Phần trộn nhiều vai chỉ một module dùng nằm ở `src/tests/<e2e|api>/<module>/helpers.ts` (theo skill). Bảng từng
module và chỗ còn trỏ về nơi cũ: `src/docs/migrated-tests.md`.

## Chạy

Stack e2e (DB riêng, cổng 3600/5600) — các bước ở `src/docs/test-plan.md` §1.

| Lệnh                                | Chạy gì                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm test`                         | session → toàn bộ e2e + api → teardown, trừ `@e2e-full`                        |
| `pnpm test:smoke`                   | chỉ `@smoke`                                                                   |
| `pnpm test:full`                    | tất cả, kể cả `@e2e-full`                                                      |
| `pnpm test:e2e` / `pnpm test:api`   | một tầng                                                                       |
| `pnpm test src/tests/e2e/auth`      | một module, một tầng                                                           |
| `pnpm test -g "@TC-AUTH-014"`       | một test case                                                                  |
| `pnpm test:headed` / `pnpm test:ui` | trình duyệt hiện / UI mode                                                     |
| `pnpm test:unit`                    | unit test `config/`, `utils/` (không cần app)                                  |
| `pnpm coverage:check [--write]`     | REQ ↔ TC ↔ spec ↔ bug; `--write` sinh lại `src/docs/traceability-matrix.md` |
| `pnpm typecheck`                    | TypeScript                                                                     |
| `pnpm report`                       | mở HTML report                                                                 |
