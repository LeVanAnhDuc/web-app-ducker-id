# Kế hoạch test

Một lượt regression được chạy, ghi lại và giữ cập nhật như thế nào.

## 1. Trước khi chạy

**Chạy trên một database seed riêng — không bao giờ trên dữ liệu bạn quan tâm.** Suite tạo và xoá tài khoản, app,
liên hệ; khoá và reset tài khoản; ghi lịch sử đăng nhập. `DB_NAME` trong `server/.env` thường là dữ liệu làm việc của
developer, nên hãy cho suite database riêng và cổng riêng (biến môi trường thắng `.env` ở cả hai app):

```bash
# một lần cho mỗi database mới
cd server && DB_NAME=ducker-id-e2e pnpm seed

# API và client trên database đó (hai terminal riêng)
cd server && DB_NAME=ducker-id-e2e APP_PORT=5600 CLIENT_URL=http://localhost:3600 OIDC_ISSUER=http://localhost:3600 pnpm dev
cd client && API_SERVER_URL=http://localhost:5600 pnpm exec next build            && API_SERVER_URL=http://localhost:5600 pnpm exec next start --port 3600

# một lần cho mỗi bản clone
cd automation-test
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env   # chỉ override: E2E_BASE_URL=http://localhost:3600, E2E_API_URL=http://localhost:5600,
                       # DB_NAME=ducker-id-e2e — REDIS_URL / DB_URL lấy từ server/.env
pnpm test:unit         # kiểm config đọc được từ client + server, chưa cần stack
```

URL, API prefix, Redis, MongoDB và tài khoản seed **không khai trong `automation-test/.env`**: `src/config/env.ts`
đọc chúng từ `client/.env(.local)`, `server/.env` (hoặc `.env.example` của chúng ở worktree mới) và seeder
`server/src/database/seeders/data/users.ts`. Redis và MongoDB vì vậy luôn là đúng cái server đang dùng (`REDIS_URL`,
`DB_URL`), còn `DB_NAME` bị override sang database e2e.

`user.setup.ts` dừng lượt chạy trước khi ghi bất cứ gì nếu database không phải seed (không có category `content` /
app `blog`) hoặc không phải database mà API đang test đọc (`assertSeededDatabase`). **Dùng bản production build của
client cho một lượt chạy đầy đủ.** `next dev` giữ mọi route đã compile trong bộ nhớ và vượt 3 GB chỉ trong một lô UI;
trên máy 16 GB, cả stack bị kill. `next dev` vẫn ổn khi chạy một module. Hiện không còn hành vi nào chỉ có ở dev mà
suite phải phân biệt: effect chạy hai lần của React StrictMode từng làm trang reset verify magic link hai lần
(BUG-PASSWORD-03, đã sửa 2026-10-15). Helper `isDevBuild` trong `src/tests/e2e/password/helpers.ts` vẫn còn cho
trường hợp cần phân biệt dev / production build về sau.

Thêm hai quy tắc, đều học được qua thực tế:

- **Không server Ducker ID nào khác được dùng chung Redis** trong lúc chạy. Queue BullMQ (`bull:email`,
  `bull:notification`) được key theo Redis, không theo database, nên worker của server khác có thể nhận job và ghi
  notification vào database _của nó_ — test notification khi đó hỏng ngẫu nhiên.
- **Mỗi thư mục `client/` chỉ một `next dev`.** Hai tiến trình dùng chung `.next/` và làm hỏng nó (500 "Cannot find
  module './vendor-chunks/…'"). Chạy client test từ một worktree, hoặc tắt tiến trình kia. `OIDC_ISSUER` phải là URL
  của client test, nếu không `iss` của mọi token trỏ sai origin.

## 2. Chạy

Playwright có bốn project: `session` (đăng nhập user và admin một lần) → `app` (toàn bộ e2e + api) → `teardown` (xoá tài
khoản throwaway của lượt chạy), cùng `unit` chạy riêng, không cần app.

| Lệnh                                  | Chạy gì                                                                                       | Khi nào                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm test`                           | session → toàn bộ e2e + api → teardown, trừ `@e2e-full`                                       | regression đầy đủ                         |
| `pnpm test:smoke`                     | chỉ case `@smoke` (mọi case P0)                                                               | "app còn dùng được không?" trong vài phút |
| `pnpm test:full`                      | tất cả, kể cả luồng xuyên module `@e2e-full`                                                  | trước release                             |
| `pnpm test:api` / `pnpm test:e2e`     | một tầng                                                                                      | thay đổi chỉ backend hoặc chỉ UI          |
| `pnpm test src/tests/e2e/admin-users` | một module, một tầng                                                                          | sau khi chạm vào khu vực đó               |
| `pnpm test -g "@TC-AUTH-014"`         | một test case                                                                                 | tái hiện một lỗi                          |
| `pnpm test:headed` / `pnpm test:ui`   | trình duyệt hiện / UI mode của Playwright                                                     | debug                                     |
| `pnpm test:unit`                      | unit test `src/config/`, `src/utils/`                                                         | sau khi sửa code của suite                |
| `pnpm report`                         | mở HTML report của lượt gần nhất (`playwright-report/`)                                       | sau một lượt chạy                         |
| `pnpm coverage:check [--write]`       | REQ ↔ TC ↔ spec ↔ bug, `@smoke` ⇔ P0; `--write` sinh lại `src/docs/traceability-matrix.md` | trước khi commit thay đổi test            |
| `pnpm typecheck`                      | TypeScript                                                                                    | trước khi commit thay đổi test            |

Các lượt chạy là tuần tự (`workers: 1`) vì mọi spec dùng chung một database.

## 3. Sau khi chạy

1. Mở report: `pnpm report`. Mỗi lỗi có trace, screenshot và error context trong `test-results/`.
2. Phân loại từng lỗi:
   - **Test sai** (selector lệch, text cũ, timing) → sửa test.
   - **App sai** (so với `src/docs/requirements/<module>.md` + `src/docs/decisions/<module>.md`) → thêm mục
     `BUG-<MODULE>-NN` vào `src/defects/<module>.md`; đánh dấu test `test.fail()` với comment
     `// BUG: defects/<module>.md#bug-<module>-nn` **ngay trên**, để lượt chạy vẫn dễ đọc và bug vẫn hiện rõ. Không
     sửa kỳ vọng cho khớp bug. Khi app được sửa, Playwright báo test "pass ngoài dự kiến" — đó là lời nhắc bỏ comment
     và `test.fail()`, rồi chuyển bug xuống mục `## Đã sửa`.
   - **Môi trường** (server chết, thiếu seed) → sửa môi trường, chạy lại.
3. Viết tóm tắt vào `src/docs/runs/run-YYYY-MM-DD.md` từ `src/docs/runs/TEMPLATE.md` và commit cùng các bản sửa test.

## 4. Giữ bộ test luôn cập nhật

Bộ test được cập nhật trong **cùng branch** với code làm đổi hành vi. Skill `/write-tests <module>` (mở Claude Code
trong `automation-test/`) đi qua đủ các bước dưới đây.

### Tính năng mới

1. Thêm requirement vào `src/docs/requirements/<module>.md` (mã mới nối tiếp cuối module, hoặc file module mới), ghi
   nguồn và quyết định vào `src/docs/decisions/<module>.md`.
2. Viết test case trong `src/test-cases/<module>.md` theo rubric và kỹ thuật trong `test-design-techniques.md`. Việc
   này thay cho file `docs/specs/<feature>/e2e.md` theo từng feature trước đây; `design.md` của feature trỏ tới mã TC.
3. Viết spec dưới `src/tests/e2e/<module>/` và `src/tests/api/<module>/`, gắn tag mã TC (và `@smoke` cho mọi case P0).
4. `pnpm test src/tests/e2e/<module> src/tests/api/<module>` xanh, rồi `pnpm coverage:check --write`.

### Requirement thay đổi

Đối chiếu cả ba thứ cùng lúc — nội dung requirement, test case, spec: thêm case cho hành vi mới, **sửa** case có kết
quả mong đợi thay đổi, **bỏ** case cho hành vi không còn (gạch requirement / test case kèm `Bỏ (YYYY-MM-DD)` thay vì
xoá mã — mã không bao giờ dùng lại). Rồi `pnpm coverage:check --write`.

### Tính năng bị gỡ

Gạch requirement và test case của nó, xoá spec, sinh lại matrix.

## 5. Defect

`src/defects/<module>.md` giữ mọi defect của app mà suite tìm thấy cho module đó, chia mục `## Đang mở` / `## Đã sửa`,
mỗi bug có mã `BUG-<MODULE>-NN`, TC bị hỏng, bằng chứng và mức (Cao / Trung bình / Thấp). Định dạng: `src/defects/README.md`.
Các file `e2e-bugs.md` theo feature có trước bộ này được gộp vào `src/docs/bug-history.md`; mã bug cũ (`BUG-NNN`)
tra qua `src/docs/id-migration.md`.
