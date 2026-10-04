# Design — Bổ sung unit test cho 5 service chưa có test

> Việc số 3 để lại sau migration layout module (`docs/specs/module-struct-batch5/design.md` §7).
> Ngày: 2026-10-04. Branch: `test/untested-services`.

## 1. Phạm vi

Năm module có service nhưng không có một unit test nào: `logout`, `token`, `session`, `signup`, `forgot-password`.

| Spec mới | Test | Đối tượng |
| --- | --- | --- |
| `logout/services/spec/logout.spec.ts` | 3 | `LogoutService.logout` |
| `token/services/spec/refresh-access-token.spec.ts` | 9 | `TokenService.refreshAccessToken` |
| `session/services/spec/session.spec.ts` | 12 | cả 5 method của `SessionService` |
| `signup/services/spec/otp-flow.spec.ts` | 14 | `sendOtp`, `verifyOtp`, `resendOtp`, `checkEmail` |
| `signup/services/spec/complete-signup.spec.ts` | 10 | `completeSignup` (có transaction) |
| `forgot-password/services/forgot-password/spec/reset-password.spec.ts` | 6 | `resetPassword` |
| `forgot-password/services/forgot-password-audit/spec/…` | 3 | 3 method audit |
| `forgot-password/strategies/otp-forgot-password/spec/…` | 11 | `sendCode`, `verifyCode` |
| `forgot-password/strategies/magic-link-forgot-password/spec/…` | 8 | `sendLink`, `verifyLink` |

**50 suite / 323 test → 59 suite / 398 test.**

Không đụng một dòng code sản phẩm nào.

## 2. Nguyên tắc: dùng guard thật, chỉ mock ranh giới

Guard trong dự án này gần như luôn là "một lần đọc repo rồi throw". Mock chúng đi thì nhánh cooldown, nhánh lockout, nhánh email-đã-tồn-tại không còn được kiểm — test chỉ còn xác nhận service có gọi mock hay không.

Nên ở các spec này **guard được khởi tạo thật**, chỉ mock repository đứng sau nó. Ví dụ `TokenService` chạy với 4 guard thật (`RefreshTokenPresentGuard`, `AuthActiveGuard`, `PasswordNotChangedGuard`, `UserExistsGuard`); chỉ `RefreshTokenValidGuard` bị stub vì nó verify JWT thật.

Những thứ **phải** mock, vì là ranh giới hạ tầng:

| Mock | Lý do |
| --- | --- |
| `@/modules/authentication/helpers` | `generateAuthTokensResponse` ký access/id token bằng **RS256** qua `getSigningKey()` của `@/libs/jwks`, mà key chỉ được nạp bởi `loadSigningKeys()` lúc boot. Trong test chưa nạp → sẽ throw |
| `mongoose` | `completeSignup` mở transaction thật |
| `@/utils/crypto/bcrypt` | hash chậm và không phải thứ đang kiểm |
| `@/utils/request-context` | AsyncLocalStorage, không có request thật trong unit test |

## 3. Một cái bẫy đã vấp phải

`jest.config.ts` đặt `resetMocks: true`. Nó **xoá cả implementation mà factory của `jest.mock` đã dựng**, không chỉ lịch sử gọi. Kết quả: mock mongoose khai như dưới đây chạy đúng ở test đầu tiên rồi trả `undefined` ở mọi test sau.

```ts
// ❌ implementation bị resetMocks xoá sau test đầu tiên
jest.mock("mongoose", () => ({
  __esModule: true,
  default: { startSession: jest.fn(() => Promise.resolve(session)) }
}));
```

Cách đúng: factory chỉ tham chiếu tới `jest.fn()` trần, còn implementation dựng lại trong `beforeEach`.

```ts
const startSession = jest.fn();
jest.mock("mongoose", () => ({ __esModule: true, default: { startSession } }));

beforeEach(() => {
  startSession.mockResolvedValue({ withTransaction, endSession });
});
```

## 4. Hành vi mà test này khoá lại

Những thứ dễ vỡ âm thầm nếu ai đó sửa sau này:

- **Chống dò email**: `sendCode` / `sendLink` của forgot-password trả **đúng cùng một response** cho email không tồn tại và cho tài khoản bị khoá, và không gửi mail. `verifyCode` / `verifyLink` thì ngược lại — từ chối thẳng. Khác biệt này là cố ý và giờ đã có test giữ.
- **Refresh token không bump `tokenVersion`** — nó mang version hiện tại đi tiếp. Bump nhầm sẽ vô hiệu hoá mọi thiết bị khác.
- **Token phát trước khi đổi mật khẩu bị từ chối** (`tokenVersion` cũ hơn của auth).
- **`completeSignup` ghi auth và profile trong cùng một mongo session**, và `endSession()` luôn chạy kể cả khi write hỏng.
- **Đụng độ email trong transaction thành 409**, không phải 500.
- **`session.start` đóng dấu `authTime` theo giây**, không phải milli — OIDC `auth_time` sai đơn vị sẽ phá `max_age`.
- **`session.end` luôn xoá cookie**, kể cả khi không có phiên nào để huỷ.
- **Thứ tự guard**: cooldown kiểm trước khi tra email (signup), reset token kiểm trước khi tra tài khoản (forgot-password). Đảo thứ tự là tạo ra kênh dò thông tin.

## 5. Chưa làm

Service còn một ít nhánh chưa phủ (ví dụ `resendOtp` của signup khi `incrementResendCount` lỗi). Mục tiêu đợt này là phủ **đường chính và các nhánh bảo mật** của từng method, không phải 100% line coverage.

## 6. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **59 suite / 398 test pass**.
- `pnpm lint` — sạch.
