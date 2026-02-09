# 📋 FEATURE REQUIREMENTS ANALYSIS
## Tính năng: Quên Mật Khẩu (Forgot Password)

**Phiên bản:** 1.0 — Final  
**Ngày tạo:** 08/02/2026  
**Cập nhật lần cuối:** 08/02/2026  
**Trạng thái:** Đã xác nhận yêu cầu — Sẵn sàng Technical Design  
**Tài liệu liên quan:** Sign-in FRA v2.0 · Login History FRA v4.0 · Signup FRA v1.1  

---

## 1. TÓM TẮT (Executive Summary)

Tính năng cho phép user **đặt lại mật khẩu** khi quên, thông qua **2 phương thức** do user tự chọn: Reset Link (token gửi qua email) hoặc OTP 6 số gửi qua email. Sau khi xác thực, user đặt mật khẩu mới và được redirect về trang đăng nhập.

> **Phân biệt với Unlock qua Email (Login History FR-03):** Forgot Password phục vụ user **quên mật khẩu** — tạo mật khẩu mới do user tự chọn. Unlock phục vụ user **bị khoá tài khoản** — nhận mật khẩu tạm tự động. 2 tính năng hoàn toàn **tách biệt**, không overlap.

**Đối tượng:**
- **End User:** Quên mật khẩu, cần đặt lại để đăng nhập.
- **System:** Gửi email, xác thực token/OTP, reset password, ghi log sự kiện.

**Bối cảnh kỹ thuật:**
Node.js + Express · MongoDB · Redis · Nodemailer · Bcrypt · Joi — tất cả đã có sẵn. Tái sử dụng OTP pattern từ Sign-in, password validation từ Signup, Event Emitter từ Login History.

> 📎 Chi tiết tech stack: xem **[System Design](./forgot-password-tdd.md) Section 1**.

---

## 2. USER STORIES

| ID | Role | User Story | Priority |
|---|---|---|---|
| US-01 | End User | Là người dùng, tôi muốn reset mật khẩu bằng cách nhận **Reset Link** qua email để đặt mật khẩu mới. | **Must** |
| US-02 | End User | Là người dùng, tôi muốn reset mật khẩu bằng cách nhận **OTP 6 số** qua email để đặt mật khẩu mới. | **Must** |
| US-03 | End User | Là người dùng, tôi muốn **chọn phương thức reset** (Link hoặc OTP) phù hợp với tình huống của mình. | **Must** |
| US-04 | End User | Là người dùng, tôi muốn gửi lại email reset khi chưa nhận được. | **Should** |
| US-05 | End User | Là người dùng, sau khi đặt mật khẩu mới thành công, tôi muốn được chuyển về trang đăng nhập để đăng nhập lại. | **Must** |

---

## 3. FUNCTIONAL REQUIREMENTS

### FR-01: Yêu cầu Reset Password — Chọn phương thức

User nhập email và chọn phương thức reset (Reset Link hoặc OTP).

**Validation trước khi gửi email:**

| Bước | Kiểm tra | Nếu fail |
|---|---|---|
| 1 | Email format hợp lệ (RFC 5322) | Validation error |
| 2 | Cooldown đã hết (60s kể từ lần gửi trước) | Error: "Please wait X seconds" |
| 3 | Rate limit chưa vượt (max 3 lần / 15 phút) | Error: "Too many requests" |
| 4 | Email tồn tại trong hệ thống | **Response generic** — không tiết lộ email tồn tại hay không |
| 5 | Account không bị DISABLED | Error: "Account suspended. Contact support" |
| 6 | Account không đang bị LOCKED | Error: "Account is locked. Please use Unlock feature or wait for auto-unlock" |
| 7 | Email đã được verify | **Response generic** — nhất quán với bước 4 |

> **Anti-enumeration:** Bước 4 và 7: nếu email không tồn tại hoặc chưa verify → trả response thành công giả (generic) — không tiết lộ thông tin. Bước 5 và 6: account tồn tại nhưng bị khoá → trả error cụ thể vì user cần biết để dùng đúng tính năng.

---

### FR-02: Reset Password qua Reset Link

**Gửi link:**
- Hệ thống generate token **64 bytes** (128 hex characters) bằng crypto-secure random.
- Token được **hash** trước khi lưu vào Redis.
- TTL: **15 phút**.
- Link format: `{BASE_URL}/auth/reset-password?token={TOKEN}&email={EMAIL}`
- Gửi email chứa reset link.
- Set cooldown 60s + increment rate counter.
- Nếu user request lại → **invalidate token cũ**, generate token mới.

**Verify link + Đặt mật khẩu mới:**
- Client gửi request với email, token, và mật khẩu mới.
- Hệ thống verify token bằng cách compare hash.
- Token là **single-use** — xoá ngay sau verify thành công.
- Nếu token invalid/expired → error.
- Nếu valid → validate mật khẩu mới → hash bcrypt → cập nhật DB → xoá token.

---

### FR-03: Reset Password qua OTP

**Gửi OTP:**
- Hệ thống generate OTP **6 số** bằng crypto-secure random — nhất quán với Signup (FR-02 Signup FRA).
- OTP được **hash** trước khi lưu vào Redis.
- TTL: **15 phút** (khác với Signup OTP 5 phút — vì reset password cần thêm thời gian).
- Gửi email chứa OTP.
- Set cooldown 60s + increment rate counter.
- Nếu user request lại → **invalidate OTP cũ**, generate OTP mới.

**Verify OTP:**
- Client gửi request với email và OTP.
- Hệ thống compare OTP với hash trong Redis.
- OTP là **single-use** — xoá sau verify thành công.
- Nếu OTP sai → increment failed attempts. Hiển thị số lần còn lại.
- Sau **5 lần nhập sai** → khoá chức năng reset cho email này trong **15 phút**.
- Nếu đúng → tạo **reset session token** (32 bytes, TTL 15 phút) → dùng cho bước đặt mật khẩu mới.

**Đặt mật khẩu mới (sau verify OTP):**
- Client gửi request với email, reset session token, và mật khẩu mới.
- Hệ thống verify session token.
- Nếu valid → validate mật khẩu mới → hash bcrypt → cập nhật DB → xoá session.

---

### FR-04: Validation mật khẩu mới

**Password policy** — nhất quán với Signup:

| Rule | Requirement |
|---|---|
| Minimum length | 8 ký tự |
| Hashing | Bcrypt (cùng cost factor với Signup) |
| Validation | Joi schema — dùng lại schema từ Signup |

**Ràng buộc bổ sung:**
- Mật khẩu mới **KHÔNG được trùng** mật khẩu hiện tại (compare bcrypt hash).
- Yêu cầu `confirmPassword` khớp với `newPassword`.

---

### FR-05: Hành vi sau khi reset thành công

| Hành động | Mô tả |
|---|---|
| Cập nhật password | Hash mật khẩu mới bằng bcrypt, cập nhật vào DB |
| Xoá temp data | Xoá reset token/OTP/session khỏi Redis |
| Xoá temp password (nếu có) | Nếu user trước đó đã dùng unlock email → clear `tempPasswordHash`, `tempPasswordUsed`, `mustChangePassword` |
| **KHÔNG** reset lockout | Lockout state giữ nguyên — nếu user bị lock, phải dùng Unlock feature |
| **KHÔNG** auto-login | Redirect về trang đăng nhập |
| Ghi log | Ghi sự kiện `PASSWORD_RESET_SUCCESS` vào `login_histories` |

---

### FR-06: Ghi log vào Login History

Các sự kiện cần ghi vào `login_histories` collection:

| Sự kiện | status | loginMethod | failureReason |
|---|---|---|---|
| Yêu cầu reset (Link) — thành công gửi email | — *(không ghi log cho request gửi email)* | — | — |
| Yêu cầu reset (OTP) — thành công gửi email | — *(không ghi log cho request gửi email)* | — | — |
| Verify reset link — thành công | `SUCCESS` | `PASSWORD_RESET` | `null` |
| Verify reset link — token invalid/expired | `FAILED` | `PASSWORD_RESET` | `RESET_LINK_INVALID` |
| Verify OTP reset — thành công | `SUCCESS` | `PASSWORD_RESET` | `null` |
| Verify OTP reset — sai OTP | `FAILED` | `PASSWORD_RESET` | `WRONG_RESET_OTP` |
| Verify OTP reset — OTP expired | `FAILED` | `PASSWORD_RESET` | `RESET_OTP_EXPIRED` |
| Verify OTP reset — bị khoá (5 lần sai) | `FAILED` | `PASSWORD_RESET` | `RESET_TOO_MANY_ATTEMPTS` |
| Đặt mật khẩu mới — thành công | `SUCCESS` | `PASSWORD_RESET` | `null` |
| Đặt mật khẩu mới — mật khẩu trùng cũ | `FAILED` | `PASSWORD_RESET` | `PASSWORD_SAME_AS_CURRENT` |
| Đặt mật khẩu mới — session invalid | `FAILED` | `PASSWORD_RESET` | `RESET_SESSION_INVALID` |

> **Bổ sung vào LoginHistory enum:** Thêm `loginMethod: 'PASSWORD_RESET'` và các `failureReason` mới vào enum đã có trong Login History FRA.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### NFR-01: Hiệu suất
- API response time ≤ **500ms** (p95) — nhất quán với Sign-in (NFR-001).
- Email delivery ≤ **5 giây** — nhất quán với Sign-in (NFR-002, NFR-003).

### NFR-02: Bảo mật
- Token và OTP phải **hash trước khi lưu** — nhất quán với Sign-in (NFR-007).
- Sử dụng **crypto-secure random** — nhất quán với Sign-in (NFR-008).
- Password hash bằng **bcrypt** — nhất quán với Signup (NFR-01).
- Anti-enumeration: response generic khi email không tồn tại — nhất quán với Sign-in (FR-005.6).
- HTTPS bắt buộc — nhất quán với Sign-in (NFR-009).

### NFR-03: Độ tin cậy
- Nếu email gửi fail → retry. Nếu vẫn fail → log error, trả response thông báo rõ ràng.
- Nếu Redis down → trả 503 Service Unavailable (reset password phụ thuộc hoàn toàn vào Redis cho token/OTP).
- Ghi log fail → không block flow chính — nhất quán với Login History (NFR-03).

---

## 5. EDGE CASES & XỬ LÝ LỖI

| # | Tình huống | Hệ quả | Cách xử lý đề xuất |
|---|---|---|---|
| EC-01 | **Email không tồn tại** | Leak thông tin | Response generic "If registered, email sent" — nhất quán với Sign-in anti-enumeration. |
| EC-02 | **Email chưa verify** | Chưa hoàn tất signup | Response generic — nhất quán với EC-01. |
| EC-03 | **Account bị DISABLED** | Không nên cho reset | Error: "Account suspended. Contact support" — nhất quán với Login History (EC-06). |
| EC-04 | **Account đang bị LOCKED** | Nên dùng Unlock thay vì reset | Error: "Account is locked. Please use Unlock feature or wait for auto-unlock" — hướng dẫn user dùng đúng tính năng. |
| EC-05 | **Reset link expired (>15 phút)** | Không reset được | Redis TTL tự xoá. Error: "Reset link expired. Please request a new one". |
| EC-06 | **Reset link đã dùng (click lần 2)** | Replay attack | Token đã bị xoá sau lần 1. Error: "Reset link already used". |
| EC-07 | **Reset link bị sửa (tampered)** | Bảo mật | Hash verification fail. Error: "Invalid reset link". |
| EC-08 | **Reset OTP expired (>15 phút)** | Không reset được | Redis TTL tự xoá. Error: "OTP expired". |
| EC-09 | **Reset OTP sai 5 lần** | Brute force | Khoá tính năng reset cho email này 15 phút. Error: "Too many failed attempts". |
| EC-10 | **Copy-paste OTP có spaces** | Verify fail | Trim whitespace, validate chỉ chứa digits — nhất quán với Signup. |
| EC-11 | **Mật khẩu mới trùng mật khẩu cũ** | Vô nghĩa | Error: "New password must be different from current password". |
| EC-12 | **Mật khẩu mới không đủ mạnh** | Bảo mật | Validation error — dùng Joi schema từ Signup. |
| EC-13 | **confirmPassword không khớp** | Input error | Validation error: "Passwords do not match". |
| EC-14 | **User request reset link nhiều lần** | Nhiều token tồn tại | Invalidate token cũ khi generate token mới. Chỉ token mới nhất có hiệu lực. |
| EC-15 | **User request reset OTP nhiều lần** | Nhiều OTP tồn tại | Invalidate OTP cũ khi generate mới — nhất quán với EC-14. |
| EC-16 | **Cooldown chưa hết (<60s)** | Spam | Error: "Please wait X seconds" — nhất quán với Sign-in. |
| EC-17 | **Vượt quá 3 lần request / 15 phút** | Abuse | Error: "Too many requests. Please try again later". |
| EC-18 | **Email client auto-preview reset link** | Token consumed | Dùng POST verify (không phải GET auto-consume) — client mở trang, user phải nhập mật khẩu mới + submit. Link chỉ chứa token, không tự verify. Nhất quán với Sign-in Magic Link (FR-003.9). |
| EC-19 | **Reset session token expired (OTP flow, >15 phút)** | Không đặt được mật khẩu mới | Error: "Session expired. Please start over". |
| EC-20 | **User đổi password thành công qua reset → đăng nhập lại → bị lock (lockout chưa reset)** | Confusion | Đúng hành vi — forgot password KHÔNG reset lockout. User phải dùng Unlock hoặc chờ auto-unlock. UI nên hiển thị thông báo rõ ràng. |
| EC-21 | **Concurrent reset requests cho cùng email** | Race condition | Redis SET overwrite — token/OTP mới nhất thắng. Acceptable behavior. |
| EC-22 | **Redis down** | Không hoạt động | Return 503 Service Unavailable — forgot password phụ thuộc hoàn toàn vào Redis. |
| EC-23 | **Email service down** | Không gửi được | Return error rõ ràng: "Unable to send email. Please try again later". |
| EC-24 | **User trước đó dùng unlock email → có tempPassword → giờ reset password** | Trạng thái conflict | Reset thành công → clear `tempPasswordHash`, `tempPasswordUsed`, `mustChangePassword` cùng lúc. |

---

## 6. API ENDPOINTS

| # | Method | Endpoint | Mô tả | Auth | Mới/Sửa |
|---|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/forgot-password/send-link` | Gửi reset link qua email | Public | **Mới** |
| 2 | POST | `/api/v1/auth/forgot-password/send-otp` | Gửi reset OTP qua email | Public | **Mới** |
| 3 | POST | `/api/v1/auth/forgot-password/verify-link` | Verify reset link + đặt mật khẩu mới | Public | **Mới** |
| 4 | POST | `/api/v1/auth/forgot-password/verify-otp` | Verify reset OTP | Public | **Mới** |
| 5 | POST | `/api/v1/auth/forgot-password/reset-password` | Đặt mật khẩu mới (sau verify OTP) | Public | **Mới** |

> **Ghi chú luồng:**
> - **Reset Link flow:** API #1 → API #3 (2 bước — verify link + đặt mật khẩu gộp 1 request)
> - **OTP flow:** API #2 → API #4 → API #5 (3 bước — gửi OTP → verify OTP → đặt mật khẩu)

---

## 7. PHÂN PHA TRIỂN KHAI

> 📎 Xem chi tiết tại **[forgot-password-wbs.md](./forgot-password-wbs.md)**

---

## 8. GIẢ ĐỊNH ĐÃ XÁC NHẬN

| # | Giả định | Trạng thái |
|---|---|---|
| A-01 | Mọi account đều có password (signup yêu cầu email + password) — không có passwordless account | ✅ Confirmed |
| A-02 | Forgot Password tách biệt hoàn toàn với Unlock qua Email | ✅ Confirmed |
| A-03 | Sau reset → redirect về trang login, KHÔNG auto-login | ✅ Confirmed |
| A-04 | Account LOCKED → không cho reset, hướng dẫn dùng Unlock | ✅ Confirmed |
| A-05 | Account DISABLED → không cho reset | ✅ Confirmed |
| A-06 | Password validation dùng lại Joi schema từ Signup (min 8 chars) | ✅ Confirmed |
| A-07 | Mật khẩu mới không được trùng mật khẩu hiện tại | ✅ Confirmed |
| A-08 | Ghi log sự kiện vào login_histories collection | ✅ Confirmed |
| A-09 | Redis, MongoDB, Nodemailer đã có sẵn và hoạt động | ✅ Confirmed |
| A-10 | Lockout KHÔNG được reset sau khi đổi mật khẩu qua forgot password | ✅ Confirmed |

---

## 9. RỦI RO TIỀM ẨN

| # | Rủi ro | Mức độ | Giải pháp giảm thiểu |
|---|---|---|---|
| R-01 | Email reset bị lọt spam | 🟡 TB | Cấu hình SPF, DKIM, DMARC — nhất quán với email setup hệ thống |
| R-02 | User forward reset link cho người khác | 🟡 TB | Warning trong email "Do not share". Single-use token. TTL 15 phút. |
| R-03 | Brute force OTP reset | 🟡 TB | Max 5 attempts → lock 15 phút + rate limit 3 requests/15 phút |
| R-04 | User confused giữa Forgot Password vs Unlock | 🟡 TB | UI hiển thị rõ: bị lock → hướng dẫn dùng Unlock. Quên mật khẩu → Forgot Password. |
| R-05 | Redis down → feature không hoạt động | 🔴 Cao | Return 503. Feature phụ thuộc hoàn toàn Redis — không có fallback. |
| R-06 | Email client auto-preview consume link | 🟡 TB | POST verify thay vì GET — nhất quán với Magic Link (Sign-in FR-003.9) |

---

## 10. CROSS-REFERENCE

### Với Sign-in FRA

| Sign-in Item | Forgot Password Coverage |
|---|---|
| US-001 Acceptance Criteria: "Có link Forgot password" | ✅ Feature này implement |
| FR-005.6: Generic error messages | ✅ Áp dụng cho email not found |
| NFR-007: Hash token trước khi lưu | ✅ Áp dụng cho reset token + OTP |
| NFR-008: Crypto-secure random | ✅ Áp dụng |

### Với Login History FRA

| Login History Item | Tương tác |
|---|---|
| FR-03: Unlock qua Email (temp password) | ❌ **Tách biệt** — Forgot Password là flow riêng |
| FR-04: Account DISABLED | ✅ Kiểm tra trước khi cho reset |
| FR-01: Ghi log login_histories | ✅ Thêm `loginMethod: 'PASSWORD_RESET'` + failure reasons mới |
| `failure_reason` enum | ✅ Bổ sung: `RESET_LINK_INVALID`, `WRONG_RESET_OTP`, `RESET_OTP_EXPIRED`, `RESET_TOO_MANY_ATTEMPTS`, `PASSWORD_SAME_AS_CURRENT`, `RESET_SESSION_INVALID` |

### Với Signup FRA

| Signup Item | Tái sử dụng |
|---|---|
| Password policy (min 8 chars, bcrypt) | ✅ Dùng lại Joi schema + bcrypt config |
| OTP mechanics (6 digits, crypto-secure, hash storage) | ✅ Dùng lại pattern (khác TTL: 15m thay vì 5m) |

---

*Tài liệu sẵn sàng chuyển sang Technical Design Document.*
