# Design — Migrate `login` và `forgot-password` (đợt 4)

> Tiếp nối PR #5, #6, #8, #10, #12. Ngày: 2026-10-04. Branch: `refactor/module-struct-batch4`.

## 1. Phạm vi

Hai module cuối cùng ngoài `login-history`:

| Module | Service | Strategy | Repository | Guard | Spec |
| --- | --- | --- | --- | --- | --- |
| `login` | 3 | 3 | 3 | 7 | 21 |
| `forgot-password` | 2 | 2 | 3 | 7 | 0 |

Đây là hai module duy nhất đã có sẵn `services/` số nhiều và `strategies/`, nên cũng là hai module duy nhất chạm tới layout sub-folder.

## 2. Layout sub-folder cho module nhiều service

Chủ dự án chốt: folder là **`services/`** (số nhiều) ở mọi module; module có **2+ service** thì mỗi service là một sub-folder mang tên nó, và `strategies/` bày y hệt. **Không có barrel** ở gốc `services/` hay `strategies/` — chỉ `index.ts` bên trong từng sub-folder, và `index.ts` đó là **class**, không phải barrel.

```
login/
  services/
    login/            index.ts (façade)
    login-audit/      index.ts + 7 file method
    login-completion/ index.ts (1 method → inline)
  strategies/
    password-login/     index.ts (1 method → inline)
    otp-login/          index.ts + deps.ts + send-code.ts + verify-code.ts
    magic-link-login/   index.ts + deps.ts + send-link.ts + verify-link.ts
  repositories/
    failed-attempts.repository.ts    interface
    magic-link-login.repository.ts   interface
    otp-login.repository.ts          interface
    impl/   redis-*.repository.ts
    spec/   *.repository.spec.ts
```

`forgot-password` cùng khuôn: `services/{forgot-password,forgot-password-audit}/`, `strategies/{otp-forgot-password,magic-link-forgot-password}/`.

Việc đổi `service/` số ít đã làm ở 13 module trước sang `services/` nằm ở **PR riêng (#12)**, tách khỏi PR này để diff của nó đọc được như một phép đổi tên thuần.

## 3. Quyết định: không tách file method cho delegate thuần

`LoginService` có 7 method và **cả 7 đều là một dòng** dispatch sang strategy hoặc repo. `ForgotPasswordService` có 5, trong đó 4 là delegate.

Tách chúng thành file method sẽ sinh ra 11 file mà nội dung chỉ là `return deps.otpStrategy.sendCode(req)` — **thêm một chặng khi truy vết chứ không bớt**. Strategy vốn đã đóng đúng vai trò mà file method nhắm tới: một use case, một file.

Quy tắc: **tách file method cho method có logic; delegate thuần ở lại façade.** Ở đây đúng một method có logic — `ForgotPasswordService.resetPassword` → `services/forgot-password/reset-password.ts`.

Điều này nhất quán với quy tắc đã chốt ở đợt 1 cho service một method: không tách thứ mà cấu trúc đã làm cho truy vết được.

## 4. Những gì đã tách

| Class | Method | Xử lý |
| --- | --- | --- |
| `LoginAuditService` | 7 | 7 file method; 1 dep nên truyền `historyService` thẳng, không cần `deps.ts` |
| `ForgotPasswordAuditService` | 3 | 3 file method, cùng kiểu |
| `OtpLoginStrategy` | 2 + 1 private | `send-code.ts`, `verify-code.ts`; `handleInvalidOtp` vào `verify-code.ts` (chạm Redis, chỉ một method dùng) |
| `MagicLinkLoginStrategy` | 2 | `send-link.ts`, `verify-link.ts` |
| `OtpForgotPasswordStrategy` | 2 + 1 private | như trên |
| `MagicLinkForgotPasswordStrategy` | 2 + 1 private | `sendMagicLinkEmail` vào `send-link.ts` |
| `PasswordLoginStrategy` | 1 + 1 private | **không tách** — một method công khai, class và logic ở `index.ts`, constructor giữ param vị trí |
| `LoginCompletionService` | 1 | **không tách**, cùng lý do |

Strategy 2 method đều có 8–9 dependency → `deps.ts` + constructor nhận object. Strategy/service một method giữ nguyên constructor vị trí, vì không có file method nào cần `deps`.

Decorator `@LogMethod` giữ nguyên trên façade ở cả 6 class có nó.

## 5. Barrel bị xoá và hệ quả

Xoá 4 barrel: `login/{services,strategies,repositories}/index.ts` và `forgot-password/{services,strategies,repositories}/index.ts`.

30 file đổi import, phần lớn là guard và spec đang lấy interface repository qua barrel. Một script chuyển từng tên export sang đúng file nó thuộc về (interface ở gốc folder, class ở `impl/`), kể cả import gộp nhiều tên — mỗi tên thành một câu `import` riêng.

Ngoài module: `unlock-account` lấy `LoginService` từ `@/modules/login/services/login`, và hai mock trong `test/mocks/` trỏ sang `services/login-audit` và `services/login-completion`.

## 6. Spec phải sửa

| Vấn đề | Xử lý |
| --- | --- |
| 6 spec chuyển xuống sâu 2 cấp (`strategies/otp-login/spec/`) | Mọi đường dẫn tương đối `../x` thành `../../../x` |
| `jest.mock("../helpers")` trong `failed-attempts.repository.spec.ts` | `jest.mock` nhận chuỗi, không phải import — sed đổi `from "…"` không chạm tới nó. Jest fail ở runtime dù tsc xanh. Đổi tay thành `../../helpers` |
| 2 spec strategy dựng bằng param vị trí | Chuyển sang object, không đổi assertion nào |

Điểm thứ hai là loại lỗi mà type-check **không** bắt được — chỉ chạy test mới thấy.

## 7. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **50 suite / 323 test pass**, đúng bằng trước PR. Riêng `login`: 21 suite / 142 test.
- `pnpm lint` — sạch (5 lỗi format do generate, đã `lint:fix`).

## 8. Còn lại

Chỉ `login-history`. Để cuối cùng vì nhánh `feat/login-history-app-source` vừa merge (PR #7) và có thể còn việc tiếp trên module đó.
