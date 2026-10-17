# Dữ liệu test

## Seed (`cd server && DB_NAME=ducker-id-e2e pnpm seed`)

Nguồn: `server/src/database/seeders/data/`. Spec assert trên các giá trị này, nên đổi seed là đổi test.

### Tài khoản

| Email                 | Mật khẩu         | Vai trò | Trạng thái              | Dùng trong test                      |
| --------------------- | ---------------- | ------- | ----------------------- | ------------------------------------ |
| `admin@test.com`      | `Admin@123`      | admin   | active, đã xác minh     | phiên admin dùng chung — **chỉ đọc** |
| `user@test.com`       | `User@123`       | user    | active, đã xác minh     | phiên user dùng chung — **chỉ đọc**  |
| `user2@test.com`      | `User@123`       | user    | active, đã xác minh     | user thứ hai để kiểm cô lập dữ liệu  |
| `inactive@test.com`   | `Inactive@123`   | user    | **inactive**            | đăng nhập bị từ chối                 |
| `unverified@test.com` | `Unverified@123` | user    | **email chưa xác minh** | đăng nhập bị từ chối                 |

Suite **không khai lại** các tài khoản này: `src/config/accounts.ts` đọc email/mật khẩu thẳng từ
`server/src/database/seeders/data/users.ts` (`seedAccount(email)`; `USER`, `ADMIN`). Chỉ khi database e2e được seed
khác seeder mới đặt `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` / `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` trong
`automation-test/.env`. Bảng mật khẩu ở trên chỉ để tra cứu khi thử tay.

"Chỉ đọc" nghĩa là: không bao giờ khoá, nhập sai mật khẩu, reset hay đổi mật khẩu của các tài khoản này. Dữ liệu riêng
của từng user (yêu thích, app dùng gần đây, cờ đã đọc) chỉ được đổi nếu test trả lại như cũ.
Cũng không bao giờ đăng xuất bằng phiên dùng chung (`userPage` / `adminPage`, `userApi` / `adminApi`): từ
2026-10-15 logout đưa refresh token vào denylist Redis (`revoked-refresh-token:<sha256>`), nên phiên do `setup` tạo
chết cho mọi spec chạy sau. Test logout đăng nhập riêng (`loginOverApi`, tài khoản dùng một lần).

### App

| Tên                           | Vai trò yêu cầu | Trạng thái   |
| ----------------------------- | --------------- | ------------ |
| `blog`                        | user            | active       |
| `analytics-dashboard`         | admin           | active       |
| `idms-portal` ("IDMS Portal") | user, admin     | active       |
| `team-calendar`               | user            | **inactive** |
| `notes`                       | user            | active       |
| `ops-console`                 | admin           | active       |

Vì vậy user thường thấy `blog`, `idms-portal`, `notes`; admin thấy thêm `analytics-dashboard` và `ops-console`; không
ai thấy `team-calendar` trong catalogue. `src/tests/e2e/favorites/favorites-page.e2e.ts` dựa vào vị trí của
"IDMS Portal" khi sắp theo bảng chữ cái.

### Category

`content` (Content / Nội dung), `internal-tools` (Internal Tools / Công cụ nội bộ), `identity` (Identity / Định danh),
`productivity` (Productivity / Năng suất) — theo đúng thứ tự đó. `user.setup.ts` dùng category `content` và app `blog`
để nhận ra database seed (`assertSeededDatabase` trong `src/utils/accounts.ts`).

### Khác

- **Notification** — 26 dòng cho mỗi tài khoản `user@test.com` và `admin@test.com`, lưu dạng `type + params + link`
  (không có text). Dòng 1–5 phủ LOGIN_ANOMALY, APP_AVAILABLE, PASSWORD_CHANGED (admin / tự đổi) và ACCOUNT_LOCKED;
  dòng 6–26 là APP_AVAILABLE cho "Seed App N", đã đọc khi N lẻ, nên mỗi dòng render một câu riêng. Suite notifications
  đọc #10 / #11 và tiêu #12 / #14 (đặt lại chưa đọc sau đó). Trước khi đọc seed, spec xoá mọi dòng không phải seed
  của `user@test.com` mà spec khác sinh ra trong lượt (`removeNonSeedNotifications`). Xem `src/utils/notifications.ts`
  và `SEED_NOTIFICATIONS` trong `src/data/test-data.ts`.
- **Entitlement override** — `user2@test.com` (John Doe) bị từ chối Notes và được cấp Operations Console
  (`entitlements.ts`); mọi người khác theo mặc định của vai trò. Test ghi override thì ghi lên tài khoản throwaway —
  mỗi lần cấp / thu hồi đều gửi notification thật cho user.
- **Yêu cầu hỗ trợ** — 10 bản, trạng thái trộn `new` / `processing` / `resolved`, một bản không có email.

## Tài khoản throwaway

`createAccount()` (`@/utils/accounts`) đăng ký một tài khoản mới qua API đăng ký thật:

- địa chỉ `<tag>-r<RUN_ID>-<pid>x<n>@e2e.example.com` (`throwawayEmail()`; `THROWAWAY_DOMAIN` trong
  `src/data/test-data.ts`) — `example.com` được dành riêng (RFC 2606), nên email trong queue không bao giờ tới được ai.
  `RUN_ID` đặt một lần mỗi lượt trong `playwright.config.ts`, nên `teardown` chỉ xoá tài khoản của chính lượt đó, không
  đụng lượt khác đang chạy song song,
- mật khẩu `Throwaway@123` (`THROWAWAY_PASSWORD`), tên "Throwaway Tester", giới tính `other`, sinh 1995-06-15,
- bị xoá — cùng lịch sử đăng nhập, refresh token, yêu thích, lượt dùng app, notification, địa chỉ, entitlement và yêu
  cầu hỗ trợ của nó — bởi project `teardown` sau lượt chạy (`deleteThrowawayAccounts()`, và bởi `user.setup.ts` trước
  lượt chạy, với tài khoản sót lại của lượt đã chết giữa chừng — nhận ra theo tuổi của `RUN_ID`).

## Mã một lần

Mọi mã server phát ra chỉ được lưu dưới dạng hash bcrypt, nên test không đọc được. Cách làm:

1. gọi endpoint send thật (đặt cooldown và counter đúng như với người dùng thật),
2. `plantCode(kind, email, KNOWN_OTP)` từ `@/utils/redis` thay hash đang lưu bằng hash của `424242` (`KNOWN_OTP`
   trong `src/data/test-data.ts`), giữ nguyên TTL,
3. tiếp tục luồng với `424242`.

| `kind`                    | Key Redis                  |
| ------------------------- | -------------------------- |
| `signup`                  | `otp-signup:<email>`       |
| `login`                   | `otp-login:<email>`        |
| `magicLinkLogin`          | `magic-link-login:<email>` |
| `forgotPasswordOtp`       | `otp-forgot-pw:<email>`    |
| `forgotPasswordMagicLink` | `ml-forgot-pw:<email>`     |
| `unlock`                  | `login-unlock-token:<id>`  |

Layout phản chiếu `server/src/constants/redis/store/index.ts`. Redis là đúng cái server dùng: `REDIS_URL` đọc từ
`server/.env` (`src/config/datastores.ts`), không khai trong `automation-test/.env`.

## Rate limit

Mọi test đến từ một IP và cửa sổ theo IP (vd 30 lần đăng nhập bằng mật khẩu mỗi 15 phút) nhỏ hơn một lượt chạy.
Fixture auto `_resetRateLimits` (`src/fixtures/core.fixture.ts`) xoá mọi key `rate-limit:*` trước mỗi test; test kiểm
chính một giới hạn thì tắt bằng `test.use({ keepRateLimits: true })` và dùng email throwaway của riêng nó.
