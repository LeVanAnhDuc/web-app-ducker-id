# Chiến lược test

## Mục đích

Một bộ regression chứng minh mọi tính năng Ducker ID đã ship vẫn chạy đúng, chạy **khi có người gọi** — trước một
bản release, sau một lần merge lớn, hoặc bất cứ lúc nào cần biết tình trạng của app. Bộ này không gắn vào CI và không
chạy khi commit.

Đây cũng là nơi công việc feature đặt test của mình: branch feature thêm requirement, test case và spec vào đây, trong
cùng PR với code (xem `test-plan.md` → "Giữ bộ test luôn cập nhật").

## Các tầng test

| Tầng          | Ở đâu                                    | Công cụ                                                   | Phụ trách                                                                                    |
| ------------- | ---------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit (server) | `server/src/**/*.spec.ts`                | Jest (`cd server && pnpm test`)                           | logic service / repository tách biệt, không database. **Không thuộc bộ này.**                |
| Unit (suite)  | `src/**/*.test.ts` (`config/`, `utils/`) | Playwright, project `unit` (`pnpm test:unit`)             | chính code của suite: đọc env, URL, tài khoản seed, tiện ích — không cần app                 |
| API           | `src/tests/api/<module>/`                | Playwright request context, qua client trong `src/api/`   | hợp đồng HTTP, validation, phân quyền, rate limit, giao thức OIDC — nhanh, không trình duyệt |
| UI end-to-end | `src/tests/e2e/<module>/`                | Playwright + Chromium, qua page object trong `src/pages/` | người dùng thấy gì và làm được gì trên từng màn hình, ở cả `en` lẫn `vi`                     |

Test API và UI chạy với stack thật — client Next.js, API Express, MongoDB, Redis — trên dữ liệu seed. Không mock gì
trong server. Test trình duyệt chỉ mock một response API khi cần đạt trạng thái mà seed không tạo ra được (5xx,
response chậm, một claim trong token); mỗi chỗ mock như vậy có comment giải thích lý do.

## Phạm vi

Trong phạm vi: mọi thứ liệt kê dưới `## Features` trong `README.md` ở gốc repo app, được lập danh mục thành
requirement trong `src/docs/requirements/<module>.md`.

### Không phủ

| Cái gì                             | Vì sao                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Tính năng chưa build               | ghi ở mục "Ngoài phạm vi" của `src/docs/decisions/<module>.md`; có test case khi ship |
| Gửi email thật                     | queue là ranh giới; mã được plant thẳng vào Redis (`src/utils/redis.ts`)              |
| Hiệu năng / tải                    | chưa có mục tiêu                                                                      |
| Visual regression                  | design system còn đang ổn định; screenshot sẽ đổi liên tục                            |
| Quét a11y tự động (axe)            | a11y được kiểm qua locator theo role/label và các case bàn phím                       |
| Trình duyệt ngoài Chromium, mobile | công cụ nội bộ dùng trên Chrome desktop                                               |

## Môi trường và dữ liệu

Bộ test chạy với một stack trên **database seed riêng** (quy ước `ducker-id-e2e`, client `:3600`, API `:5600` —
`test-plan.md` §1), không bao giờ trên dữ liệu làm việc của developer; `user.setup.ts` từ chối chạy nếu không phải
database seed (`assertSeededDatabase`).

Suite không khai lại cấu hình app đã có: `src/config/env.ts` đọc URL, API prefix, Redis và MongoDB từ chính
`client/.env(.local)` và `server/.env` (hoặc `.env.example` của chúng), tài khoản seed từ seeder của server.
`automation-test/.env` chỉ chứa override cho stack e2e (`E2E_BASE_URL`, `E2E_API_URL`, `DB_NAME`). Suite cần truy
cập thẳng vào đúng Redis và MongoDB mà API dùng (`REDIS_URL`, `DB_URL`, `DB_NAME` của server) để plant mã một lần,
xoá rate-limit counter và xoá tài khoản throwaway nó tạo ra. Xem `test-data.md`.

## Tiêu chí vào và ra

**Vào** — client và API đang chạy, MongoDB và Redis truy cập được, đã chạy `pnpm seed` trên database e2e.

**Ra** — một lượt chạy đạt khi:

- mọi test xanh, hoặc là `test.fail()` có comment `// BUG: defects/<module>.md#bug-<module>-nn` ngay trên, trỏ tới
  một bug đang mở trong `src/defects/<module>.md`,
- `pnpm coverage:check` không báo thiếu sót nào (kể cả `@smoke` ⇔ P0),
- lượt chạy được tóm tắt trong `src/docs/runs/` (xem `test-plan.md`).

## Vai trò và tài khoản

| Vai trò | Tài khoản                        | Dùng cho                                 |
| ------- | -------------------------------- | ---------------------------------------- |
| guest   | không có                         | trang công khai, kiểm 401                |
| user    | `user@test.com` (seed, chỉ đọc)  | mọi thứ người dùng đã đăng nhập làm      |
| admin   | `admin@test.com` (seed, chỉ đọc) | admin console, kiểm 403 cho vai trò user |
| —       | throwaway `…@e2e.example.com`    | mọi thứ làm đổi trạng thái tài khoản     |

Mỗi spec tự khai phiên bằng `test.use({ role: … })` từ `@/fixtures`; không project nào quyết định role.

## Rủi ro

| Rủi ro                                                        | Cách giảm                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Một lượt chạy làm đổi dữ liệu seed và lượt sau hỏng           | test đổi trạng thái dùng tài khoản throwaway hoặc trả lại trong `afterEach` / `afterAll`; project `teardown` xoá tài khoản throwaway |
| Rate limit theo IP bị chạm trong lượt chạy dài                | counter được xoá trước mỗi test (fixture auto trong `src/fixtures/core.fixture.ts`)                                                  |
| Server chỉ lưu hash của mã, không đọc được                    | plant một mã đã biết sau lời gọi send thật                                                                                           |
| Layout key Redis của server thay đổi                          | `src/utils/redis.ts` ghi rõ file server nó phản chiếu; test hỏng rõ ràng kèm tên key                                                 |
| Chạy từ worktree mà lặng lẽ đánh vào checkout chính ở `:3000` | đặt `E2E_BASE_URL` trong `automation-test/.env` về cổng client của stack e2e                                                         |
| `server/.env` trỏ vào dữ liệu thật                            | luôn override `DB_NAME=ducker-id-e2e`; `user.setup.ts` chặn database không phải seed                                                 |
