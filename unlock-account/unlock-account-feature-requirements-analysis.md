# 📋 FEATURE REQUIREMENTS ANALYSIS
## Tính năng: Mở khoá tài khoản qua Email + Bắt buộc đổi mật khẩu

**Phiên bản:** 1.0 — Confirmed
**Ngày tạo:** 09/02/2026
**Cập nhật lần cuối:** 09/02/2026
**Trạng thái:** Đã xác nhận yêu cầu — Sẵn sàng chuyển sang Technical Design
**Tài liệu liên quan:** Sign-in Feature Requirements Analysis v2.0 · Login History FRA v4.0 (tách từ Phase 2)

---

## 1. TÓM TẮT (Executive Summary)

Tính năng cho phép user **tự mở khoá tài khoản sớm** qua email khi bị lockout (progressive lockout cho password, fixed lockout cho OTP) thay vì phải chờ hết thời gian auto-unlock. Hệ thống gửi một **mật khẩu tạm được tạo tự động** qua email, user dùng mật khẩu tạm để đăng nhập và **bắt buộc phải đổi mật khẩu** ngay sau đó.

> **Lưu ý quan trọng:** Tính năng này **bổ sung** lên trên Sign-in feature đã implement. Các cơ chế lockout (progressive lockout cho password, fixed lockout cho OTP) và rate limiting đã có sẵn trong Sign-in — feature này **thêm 1 kênh unlock mới** (qua email), **KHÔNG thay đổi** cơ chế lockout/rate limiting hiện tại. User vẫn có 2 lựa chọn: chờ auto-unlock HOẶC unlock sớm qua email.

**Đối tượng:**
- **End User:** Khi tài khoản bị khoá (auto-lock), user có thể tự mở khoá sớm qua email thay vì chờ hết thời gian.
- **System:** Gửi email chứa mật khẩu tạm, xác thực mật khẩu tạm, reset lockout state, bắt buộc đổi mật khẩu.

**Bối cảnh kỹ thuật:**
Node.js + Express · MongoDB · Redis · Nodemailer · JWT + bcrypt — tất cả đã implement trong Sign-in.

> 📎 Chi tiết tech stack: xem **[System Design](./unlock-account-system-design.md) Section 1**.

---

## 2. USER STORIES

| ID | Role | User Story | Priority |
|---|---|---|---|
| US-01 | End User | Là người dùng, khi tài khoản bị khoá (auto-lock), tôi muốn có thể tự mở khoá sớm qua email thay vì chờ hết thời gian, để tiếp tục sử dụng dịch vụ nhanh hơn. | **Must** |
| US-02 | End User | Là người dùng, sau khi mở khoá bằng mật khẩu tạm, tôi muốn được yêu cầu đổi mật khẩu ngay để đảm bảo an toàn tài khoản. | **Must** |
| US-03 | End User | Là người dùng, tôi muốn nhận email chứa mật khẩu tạm rõ ràng, dễ hiểu, để biết cách sử dụng mật khẩu tạm và thời hạn hiệu lực. | **Must** |
| US-04 | End User | Là người dùng, khi mật khẩu tạm hết hạn hoặc đã được dùng, tôi muốn có thể yêu cầu gửi lại mật khẩu tạm mới. | **Should** |

---

## 3. FUNCTIONAL REQUIREMENTS

### FR-01: Tương tác với Lockout hiện tại (Chỉ bổ sung kênh unlock — Không thay đổi cơ chế)

> **Lockout đã implement trong Sign-in feature. Feature này KHÔNG thay đổi cơ chế lockout — chỉ thêm kênh unlock mới.**

**Password — Progressive Lockout (đã có):**

| Lần thất bại | Thời gian khoá | Auto-unlock |
|---|---|---|
| 1–4 | Không khoá | — |
| 5 | 30 giây | ✅ |
| 6 | 60 giây | ✅ |
| 7 | 2 phút | ✅ |
| 8 | 4 phút | ✅ |
| 9 | 8 phút | ✅ |
| 10+ | 30 phút | ✅ |

**OTP — Fixed Lockout (đã có):**

| Điều kiện | Hành động | Auto-unlock |
|---|---|---|
| 5 lần nhập sai OTP | Khoá 15 phút | ✅ |

**Tính năng unlock qua email bổ sung:**
- Khi tài khoản bị khoá (progressive hoặc fixed lockout), màn hình đăng nhập hiển thị thời gian còn lại để auto-unlock **VÀ** nút "Mở khoá qua email".
- User có 2 lựa chọn: chờ auto-unlock HOẶC unlock sớm qua email.
- Feature này **KHÔNG thay đổi** counter lockout, thời gian lockout, hay logic lockout hiện tại.

---

### FR-02: Yêu cầu mở khoá qua Email (Unlock Request)

**Luồng xử lý:**
1. User bấm "Mở khoá qua email" trên màn hình đăng nhập khi tài khoản đang bị khoá.
2. Hệ thống kiểm tra cooldown (60 giây giữa 2 lần gửi) và rate limit (3 lần / giờ / tài khoản).
3. Hệ thống kiểm tra email có tồn tại trong hệ thống hay không.
4. Nếu email không tồn tại → trả response generic (chống user enumeration) — nhất quán với Sign-in.
5. Nếu tài khoản bị DISABLED (khoá vĩnh viễn bởi admin) → từ chối, yêu cầu liên hệ support.
6. Nếu tài khoản không bị lock → từ chối (không cần unlock).
7. Hệ thống tạo **mật khẩu tạm tự động** (16 ký tự, bao gồm chữ hoa, thường, số, ký tự đặc biệt).
8. Mật khẩu tạm được hash bcrypt (cost factor ≥ 12) trước khi lưu — nhất quán với Sign-in.
9. Mật khẩu cũ **KHÔNG bị xoá** — mật khẩu tạm là kênh đăng nhập song song.
10. Gửi email chứa mật khẩu tạm (plaintext) cho user.
11. Set cooldown 60 giây và tăng rate limit counter.
12. Response luôn generic: "If this email is registered, an unlock email has been sent" — chống user enumeration.

**Ràng buộc bảo mật:**
- Mật khẩu tạm có **thời hạn 15 phút** — quá hạn phải yêu cầu lại.
- Mật khẩu tạm chỉ dùng được **1 lần** (single-use).
- Rate limit gửi email unlock: tối đa **3 lần / giờ / tài khoản**.
- Cooldown giữa 2 lần gửi: **60 giây**.
- Mật khẩu tạm phải được tạo bằng **crypto-secure random** (KHÔNG dùng Math.random hay tương đương).

---

### FR-03: Xác thực mật khẩu tạm (Unlock Verify)

**Luồng xử lý:**
1. User nhận email, copy mật khẩu tạm, nhập vào form unlock.
2. Hệ thống kiểm tra email có tồn tại không.
3. Kiểm tra mật khẩu tạm còn hiệu lực (< 15 phút) → nếu hết hạn → reject. **KHÔNG tính vào bộ đếm lockout** (progressive lockout).
4. Kiểm tra mật khẩu tạm chưa được sử dụng → nếu đã dùng → reject.
5. So sánh mật khẩu tạm với hash (bcrypt) → nếu sai → reject. **KHÔNG tăng lockout counter.**
6. Nếu mật khẩu tạm đúng:
   - Đánh dấu mật khẩu tạm đã sử dụng (`tempPasswordUsed = true`).
   - Set flag bắt buộc đổi mật khẩu (`mustChangePassword = true`).
   - Reset lockout state: `failedAttempts = 0`, `lockUntil = null`.
   - Generate tokens (accessToken, idToken, refreshToken) — nhất quán với Sign-in.
   - Return tokens + `mustChangePassword = true`.

**Quy tắc nghiệp vụ:**
- Mật khẩu tạm hết hạn hoặc sai → **KHÔNG tăng lockout counter** (để tránh khiến user bị khoá thêm khi đang cố unlock).
- Mật khẩu tạm đã dùng → reject tương tự hết hạn (response message generic).
- Sau khi unlock thành công, mật khẩu cũ vẫn tồn tại nhưng user **bắt buộc đổi mật khẩu** trước khi dùng bất kỳ tính năng nào khác.

---

### FR-04: Bắt buộc đổi mật khẩu sau Unlock

**Hành vi:**
- Sau khi đăng nhập bằng mật khẩu tạm, response trả `mustChangePassword = true`.
- Client phải redirect user đến màn hình đổi mật khẩu.
- User **KHÔNG thể truy cập** các trang/API khác cho đến khi đổi mật khẩu xong.
- Sau khi đổi mật khẩu thành công:
  - Mật khẩu mới replace mật khẩu cũ (nhất quán với Sign-in change password flow).
  - Clear `mustChangePassword = false`.
  - Clear các fields mật khẩu tạm (`tempPasswordHash`, `tempPasswordExpAt`, `tempPasswordUsed`).

> **Lưu ý:** Màn hình đổi mật khẩu và API change password đã có sẵn trong Sign-in feature. Feature này chỉ cần: (1) set flag `mustChangePassword`, (2) check flag trên middleware để chặn truy cập, (3) clear flag sau khi đổi mật khẩu.

---

### FR-05: Email template cho Unlock

**Nội dung email cần bao gồm:**
- Tiêu đề rõ ràng: "Mật khẩu tạm để mở khoá tài khoản"
- Mật khẩu tạm (hiển thị rõ, dễ copy)
- Thời hạn hiệu lực: 15 phút
- Hướng dẫn: nhập mật khẩu tạm vào form unlock → đổi mật khẩu ngay
- Cảnh báo: nếu không phải bạn yêu cầu, hãy bỏ qua email này
- Hỗ trợ song ngữ EN/VI — nhất quán với email templates hiện có

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### NFR-01: Hiệu suất
- API unlock-request phản hồi ≤ **500ms** (p95) — bao gồm thời gian generate + hash + lưu DB.
- Gửi email **non-blocking** — không chờ email gửi xong mới trả response.

### NFR-02: Bảo mật
- Mật khẩu tạm phải được hash bcrypt (cost factor ≥ 12) trước khi lưu — nhất quán với Sign-in.
- Mật khẩu tạm phải dùng **crypto-secure random** — KHÔNG dùng Math.random.
- Chống user enumeration: response message generic cho tất cả trường hợp (email tồn tại / không tồn tại) — nhất quán với Sign-in (FR-005.6 trong Sign-in FRA).
- Mật khẩu tạm single-use + TTL 15 phút → giảm rủi ro bị lợi dụng.
- Unlock request **KHÔNG áp dụng** cho tài khoản bị DISABLED (khoá vĩnh viễn).
- Xác thực mật khẩu tạm sai/hết hạn → **KHÔNG tăng lockout counter** (tránh vòng lặp lock → unlock → lock).

### NFR-03: Độ tin cậy
- Nếu gửi email thất bại → retry 3 lần với backoff — nhất quán với Sign-in email handling.
- Nếu retry vẫn fail → log error. User vẫn có thể chờ auto-unlock hoặc yêu cầu gửi lại (trong rate limit).

### NFR-04: Khả năng mở rộng
- Tận dụng Redis đã có cho cooldown và rate limit counters.
- Thiết kế sẵn cho migration sang async email queue (Bull + Redis) ở phase sau.

---

## 5. EDGE CASES & XỬ LÝ LỖI

| # | Tình huống | Hệ quả | Cách xử lý đề xuất |
|---|---|---|---|
| EC-01 | **User bấm unlock khi tài khoản KHÔNG bị lock** | Không cần unlock | Trả error "Account is not locked". |
| EC-02 | **User bấm unlock khi tài khoản bị DISABLED (khoá vĩnh viễn bởi admin)** | Không nên cho phép | Từ chối yêu cầu unlock. Response: "Account suspended. Please contact support". |
| EC-03 | **Mật khẩu tạm hết hạn (>15 phút)** | Không còn hiệu lực | `failure_reason = TEMP_PASSWORD_EXPIRED`. Yêu cầu gửi lại. **Không tính vào bộ đếm lockout** (progressive lockout). |
| EC-04 | **Mật khẩu tạm bị dùng lần 2 (replay attack)** | Rủi ro bảo mật | Đánh dấu đã sử dụng sau lần dùng đầu. Lần thứ 2 → reject với response generic. |
| EC-05 | **Email unlock không đến (spam, delay)** | User không thể unlock sớm | Hiển thị "Kiểm tra thư rác" + nút "Gửi lại" (rate limit 3/giờ). Vẫn có thể chờ auto-unlock. |
| EC-06 | **User gửi unlock request liên tục (spam)** | Abuse hệ thống | Rate limit 3/giờ + cooldown 60s giữa mỗi lần. Vượt quá → 429 Too Many Requests. |
| EC-07 | **User nhập sai mật khẩu tạm** | Đăng nhập thất bại | Reject với response generic "Invalid or expired temporary password". **KHÔNG tăng lockout counter.** |
| EC-08 | **Email không tồn tại trong hệ thống** | Chống enumeration | Trả response generic success "If this email is registered, an unlock email has been sent". Không tiết lộ email tồn tại hay không. |
| EC-09 | **User gửi unlock request nhưng chưa verify email** | Email chưa xác nhận | Trả response generic success (nhất quán với chống enumeration). Không gửi email thực tế. |
| EC-10 | **User đổi mật khẩu thành công sau unlock → mật khẩu tạm cũ có còn dùng được không?** | Rủi ro nếu còn | Clear toàn bộ fields mật khẩu tạm sau khi đổi mật khẩu thành công. |
| EC-11 | **Nhiều unlock request cùng lúc → nhiều mật khẩu tạm** | Chỉ mật khẩu mới nhất hợp lệ | Mỗi lần generate mật khẩu tạm mới → overwrite fields cũ. Chỉ mật khẩu tạm cuối cùng hoạt động. |
| EC-12 | **Redis down → không check được cooldown/rate limit** | Không thể kiểm tra giới hạn | Fallback: cho phép request (fail-open) + log warning. Hoặc reject request (fail-close) — tuỳ chiến lược. **Đề xuất: fail-close** để bảo vệ hệ thống. |

---

## 6. API ENDPOINTS

| # | Method | Endpoint | Mô tả | Auth | Mới/Sửa |
|---|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/unlock-request` | Yêu cầu gửi email chứa mật khẩu tạm để unlock | Public | **Mới** |
| 2 | POST | `/api/v1/auth/unlock-verify` | Đăng nhập bằng mật khẩu tạm | Public | **Mới** |

> **Lưu ý:** API change password (`PUT /api/v1/me/password` hoặc tương đương) đã có sẵn trong Sign-in feature. Feature này chỉ cần bổ sung logic check/clear flag `mustChangePassword` vào endpoint hiện có.

---

## 7. PHÂN PHA TRIỂN KHAI

> 📎 Xem chi tiết tại **[unlock-account-wbs.md](./unlock-account-wbs.md)**

---

## 8. GIẢ ĐỊNH ĐÃ XÁC NHẬN

| # | Giả định | Trạng thái |
|---|---|---|
| A-01 | Backend: Node.js + Express, viết thuần | ✅ Confirmed |
| A-02 | Database: MongoDB | ✅ Confirmed |
| A-03 | Redis: đã có sẵn (dùng cho OTP, magic link, rate limiting trong Sign-in) | ✅ Confirmed |
| A-04 | Email: Nodemailer (đã có sẵn) | ✅ Confirmed |
| A-05 | Kiến trúc: Client-Server, 2 repos | ✅ Confirmed |
| A-06 | Lockout: Progressive (password) + Fixed 15m (OTP) — đã implement | ✅ Confirmed |
| A-07 | Rate limiting infrastructure: đã implement trong Sign-in | ✅ Confirmed |
| A-08 | JWT infrastructure đã implement (accessToken, idToken, refreshToken) | ✅ Confirmed |
| A-09 | Password hashing: bcrypt cost factor ≥ 12 — đã implement | ✅ Confirmed |
| A-10 | Change password API: đã implement trong Sign-in | ✅ Confirmed |
| A-11 | Account status field (`ACTIVE`/`DISABLED`) có thể đã tồn tại hoặc sẽ thêm mới | ✅ Confirmed |

---

## 9. RỦI RO TIỀM ẨN

| # | Rủi ro | Mức độ | Giải pháp giảm thiểu |
|---|---|---|---|
| R-01 | Email unlock bị lọt spam → user không nhận được | 🟡 TB | Cấu hình SPF, DKIM, DMARC — nhất quán với email setup của Sign-in. Hiển thị "Kiểm tra thư rác" cho user. |
| R-02 | Mật khẩu tạm bị lộ (email bị truy cập trái phép) | 🟡 TB | TTL 15 phút + single-use giảm thiểu cửa sổ tấn công. Bắt buộc đổi mật khẩu ngay sau unlock. |
| R-03 | Brute-force mật khẩu tạm (16 ký tự mixed) | 🟢 Thấp | Với 16 ký tự mixed (upper + lower + digit + special), không gian tìm kiếm đủ lớn. Kết hợp TTL 15 phút + single-use. |
| R-04 | Redis down → cooldown/rate limit không hoạt động | 🟡 TB | Chiến lược fail-close: reject request khi Redis down. Log error + alert. |
| R-05 | User quên đổi mật khẩu (bypass force change) | 🟡 TB | Middleware check `mustChangePassword` trên tất cả protected routes. Client redirect đến change password page. |

---

## 10. CROSS-REFERENCE VỚI SIGN-IN FRA

> Bảng đối chiếu với Sign-in FRA "Out of Scope":

| Sign-in Out of Scope Item | Feature này cover? |
|---|---|
| Account unlock via email verification | ✅ FR-02, FR-03: Unlock qua email + mật khẩu tạm |
| Force password change after unlock | ✅ FR-04: Bắt buộc đổi mật khẩu |
| Login notification emails (new device/location) | ❌ Vẫn out of scope (thuộc Login History feature) |
| IP geolocation tracking | ❌ Vẫn out of scope (thuộc Login History feature) |

---

*Tài liệu sẵn sàng chuyển sang giai đoạn **Technical Design** (database schema, sequence diagrams, API request/response contracts).*
