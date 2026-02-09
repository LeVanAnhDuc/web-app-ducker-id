# 📋 FEATURE REQUIREMENTS ANALYSIS
## Tính năng: Ghi lại Lịch sử Đăng nhập Thành công / Thất bại

**Phiên bản:** 4.0 — Final  
**Ngày tạo:** 08/02/2026  
**Cập nhật lần cuối:** 08/02/2026  
**Trạng thái:** Đã xác nhận yêu cầu — Sẵn sàng chuyển sang Technical Design  
**Tài liệu liên quan:** Sign-in Feature Requirements Analysis v2.0  

---

## 1. TÓM TẮT (Executive Summary)

Tính năng ghi nhận **mọi lần đăng nhập** (thành công & thất bại) qua tất cả phương thức đã implement trong Sign-in feature (Password, OTP, Magic Link). Dữ liệu bao gồm thời gian, IP, thiết bị, vị trí địa lý, phương thức đăng nhập, trạng thái và lý do thất bại.

> **Lưu ý quan trọng:** Tính năng này **bổ sung** lên trên Sign-in feature đã implement. Các cơ chế lockout (progressive lockout cho password, fixed lockout cho OTP) và rate limiting đã có sẵn trong Sign-in — Login History **chỉ ghi log** các sự kiện này, **không thay đổi hay tạo mới** cơ chế lockout/rate limiting.

**Đối tượng:**
- **End User:** Xem lịch sử đăng nhập của chính mình.
- **Admin:** Xem, tìm kiếm, lọc lịch sử đăng nhập toàn hệ thống. Khoá vĩnh viễn tài khoản bị đe doạ. Export dữ liệu.
- **System:** Ghi log tự động mọi sự kiện đăng nhập. Gửi cảnh báo email khi phát hiện bất thường.

**Bối cảnh kỹ thuật:**

| Hạng mục | Hiện trạng |
|---|---|
| Backend | Node.js + Express (viết thuần, không framework auth) |
| Database | MongoDB |
| Cache/Counter | Redis (đã có sẵn — dùng cho OTP, magic link, rate limiting trong Sign-in) |
| Email | Nodemailer (đã có sẵn) |
| Kiến trúc | Client-Server, mỗi bên 1 repo riêng |
| Message Queue | Chưa có — sẽ triển khai phase cuối (Bull + Redis) |
| Lockout hiện tại | Progressive lockout (password), Fixed lockout 15 phút (OTP) — **đã implement trong Sign-in** |
| Rate limiting hiện tại | Per IP cho login, per email cho OTP/Magic Link, cooldown 60s — **đã implement trong Sign-in** |

---

## 2. USER STORIES

| ID | Role | User Story | Priority |
|---|---|---|---|
| US-01 | End User | Là người dùng, tôi muốn xem danh sách lịch sử đăng nhập của mình (dạng bảng) để biết có ai truy cập trái phép không. | **Must** |
| US-02 | End User | Là người dùng, tôi muốn bấm vào 1 dòng trong bảng để xem chi tiết đầy đủ của lần đăng nhập đó. | **Must** |
| US-03 | End User | Là người dùng, tôi muốn nhận email cảnh báo khi có đăng nhập từ thiết bị mới, IP mới, hoặc quốc gia mới. | **Should** |
| US-04 | Admin | Là admin, tôi muốn xem lịch sử đăng nhập của toàn bộ user (bao gồm user đã bị xoá) để giám sát và audit. | **Must** |
| US-06 | Admin | Là admin, tôi muốn lọc/tìm kiếm lịch sử theo nhiều tiêu chí (user, IP, thời gian, trạng thái, phương thức, quốc gia). | **Must** |
| US-07 | Admin | Là admin, tôi muốn unlock tài khoản bị khoá cho user khi cần. | **Must** |
| US-08 | Admin | Là admin, tôi muốn **khoá vĩnh viễn** tài khoản khi phát hiện bị đe doạ hoặc khi khách hàng yêu cầu. | **Must** |
| US-09 | Admin | Là admin, tôi muốn export lịch sử đăng nhập ra file CSV để phục vụ báo cáo và audit. | **Should** |

---

## 3. FUNCTIONAL REQUIREMENTS

### FR-01: Ghi nhận sự kiện đăng nhập

Áp dụng cho **tất cả phương thức đã implement trong Sign-in**: Password, OTP, Magic Link.

**Dữ liệu cần lưu trữ cho mỗi lần đăng nhập:**

| Trường | Mô tả | Bắt buộc |
|---|---|---|
| `id` | ID duy nhất bản ghi | ✅ |
| `user_id` | Tham chiếu tới user (NULL nếu username không tồn tại) | ⬜ |
| `username_attempted` | Email/phone/username được nhập lúc đăng nhập | ✅ |
| `status` | `SUCCESS` hoặc `FAILED` | ✅ |
| `failure_reason` | Lý do thất bại (xem bảng enum bên dưới) | Khi FAILED |
| `login_method` | `PASSWORD`, `OTP`, `MAGIC_LINK` | ✅ |
| `ip_address` | IPv4 hoặc IPv6 | ✅ |
| `country` | Quốc gia (từ GeoIP) | ✅ |
| `city` | Thành phố (từ GeoIP) | ⬜ |
| `device_type` | `DESKTOP`, `MOBILE`, `TABLET`, `UNKNOWN` | ✅ |
| `os` | Hệ điều hành (parsed từ User-Agent) | ✅ |
| `browser` | Trình duyệt (parsed từ User-Agent) | ✅ |
| `user_agent` | Raw User-Agent string | ✅ |
| `client_type` | `WEB`, `MOBILE_IOS`, `MOBILE_ANDROID` | ✅ |
| `created_at` | Thời gian UTC, millisecond precision | ✅ |
| `timezone_offset` | Offset từ client, vd: `+07:00` | ⬜ |

**Enum `failure_reason`:**

| Giá trị | Mô tả | Áp dụng cho |
|---|---|---|
| `WRONG_PASSWORD` | Sai mật khẩu | Password |
| `WRONG_OTP` | Sai mã OTP | OTP |
| `OTP_EXPIRED` | OTP hết hạn (>5 phút) | OTP |
| `MAGIC_LINK_EXPIRED` | Magic link hết hạn (>15 phút) | Magic Link |
| `MAGIC_LINK_INVALID` | Magic link không hợp lệ / đã bị sử dụng | Magic Link |
| `ACCOUNT_LOCKED` | Tài khoản đang bị khoá (progressive/fixed lockout) | Tất cả |
| `ACCOUNT_DISABLED` | Tài khoản bị vô hiệu hoá / khoá vĩnh viễn bởi admin | Tất cả |
| `ACCOUNT_NOT_FOUND` | Email không tồn tại *(chỉ log nội bộ — không trả về client)* | Tất cả |
| `EMAIL_NOT_VERIFIED` | Email chưa được xác nhận | Tất cả |
| `COOLDOWN_ACTIVE` | Gửi OTP/Magic Link quá sớm (<60s cooldown) | OTP, Magic Link |
| `RESEND_LIMIT_EXCEEDED` | Vượt quá 3 lần gửi OTP trong 5 phút | OTP |
| `IP_BLOCKED` | IP nằm trong blacklist | Tất cả |
| `TOO_MANY_ATTEMPTS` | Vượt quá số lần cho phép (OTP: 5 lần) | OTP |
| `UNKNOWN` | Lỗi không xác định | Tất cả |

**Quy tắc với user đã bị xoá:**
- Log đăng nhập **KHÔNG bị xoá** khi user bị xoá khỏi hệ thống.
- Trường `user_id` vẫn giữ giá trị cũ (soft reference).
- Khi hiển thị → label **"[Deleted User]"** kèm `username_attempted` gốc.

---

### FR-02: Tương tác với Lockout hiện tại (Chỉ ghi log — Không thay đổi cơ chế)

> **Lockout đã implement trong Sign-in feature. Login History KHÔNG tạo cơ chế lockout mới.**

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

**Login History cần ghi log các sự kiện lockout:**
- Khi account bị lock → ghi log với `failure_reason = ACCOUNT_LOCKED`.
- Khi account auto-unlock (đăng nhập thành công sau khi hết thời gian lock) → ghi log bình thường với `status = SUCCESS`.
- Khi login thành công → Sign-in đã reset failed attempts counter (Login History chỉ ghi log SUCCESS).

---

### FR-03: Admin khoá vĩnh viễn tài khoản

**Tính năng mới** — admin có quyền khoá vĩnh viễn (disable) tài khoản.

**Điều kiện sử dụng:**
- Admin phát hiện tài khoản bị đe doạ (qua lịch sử đăng nhập bất thường).
- Khách hàng chủ động yêu cầu khoá tài khoản (raise ticket).

**Hành vi:**
- Account chuyển sang trạng thái `DISABLED` — khác với `LOCKED` (tạm thời) của lockout.
- User bị `DISABLED` **không thể đăng nhập** bằng bất kỳ phương thức nào (Password, OTP, Magic Link).
- User bị `DISABLED` **không thể tự unlock** qua email — phải liên hệ admin để mở lại.
- `failure_reason = ACCOUNT_DISABLED` khi user cố đăng nhập.
- Chỉ admin có quyền enable lại tài khoản.

---

### FR-04: Giao diện xem lịch sử — End User

**Vị trí truy cập:** Cài đặt tài khoản → Bảo mật → Lịch sử đăng nhập.  
**Phân quyền:** Chỉ xem lịch sử **của chính mình**.

**Trang danh sách (Table View) — Các cột hiển thị:**

| Cột | Ghi chú |
|---|---|
| Thời gian | Hiển thị theo timezone user, vd: 08/02/2026 14:30 (UTC+7) |
| Trạng thái | ✅ Thành công (xanh) / ❌ Thất bại (đỏ) |
| Phương thức | Password / OTP / Magic Link |
| Thiết bị | Chrome · Windows · Desktop |
| Vị trí | Hồ Chí Minh, Việt Nam |
| IP | **Masked** — chỉ hiển thị 2 octet đầu, vd: `103.45.xxx.xxx` |

- Sắp xếp mặc định: mới nhất trước.
- Phân trang: 20 bản ghi/trang.
- Bộ lọc: khoảng thời gian, trạng thái (Tất cả / Thành công / Thất bại).

**Trang chi tiết (Click vào 1 dòng):** Hiển thị toàn bộ thông tin của bản ghi, bao gồm `failure_reason`, OS, browser, full user-agent, city. Nếu là lần đăng nhập bất thường → hiển thị badge cảnh báo kèm lý do.

---

### FR-05: Giao diện quản trị — Admin

**Phân quyền:** Admin xem lịch sử đăng nhập **toàn bộ user** (bao gồm deleted users).

**Trang danh sách Admin — khác biệt so với user:**
- Thêm cột **User** (email/username hoặc "[Deleted User]").
- Thêm cột **Lý do thất bại**.
- IP hiển thị **đầy đủ** (không mask).
- Bộ lọc nâng cao: user (search by email), khoảng thời gian, trạng thái, phương thức, IP, quốc gia.
- Full-text search theo email, IP.

**Chức năng bổ sung:**
- **Bấm vào dòng → Detail view** (đầy đủ thông tin, IP không mask).
- **Unlock tài khoản:** Nút unlock thủ công cho tài khoản bị khoá (reset lockout state).
- **Disable tài khoản:** Nút khoá vĩnh viễn tài khoản (chuyển sang `DISABLED`).
- **Enable tài khoản:** Nút mở khoá tài khoản đã bị `DISABLED`.
- **Export CSV:** Giới hạn 10,000 bản ghi mỗi lần export.

---

### FR-06: Cảnh báo đăng nhập bất thường qua Email

**Điều kiện trigger** (chỉ khi đăng nhập **THÀNH CÔNG**):

| Điều kiện | Mô tả |
|---|---|
| Thiết bị mới | Tổ hợp (OS + Browser + Device type) chưa xuất hiện trong 90 ngày gần nhất của user |
| IP mới | IP chưa xuất hiện trong 90 ngày gần nhất |
| Quốc gia mới | Quốc gia chưa xuất hiện trong 90 ngày gần nhất |

> **Ghi chú:** Sign-in FRA đã liệt kê "Login notification emails (new device/location)" trong Out of Scope. Tính năng này nay được implement trong Login History feature.

**Nội dung email cảnh báo:** thời gian, thiết bị, IP (masked), vị trí, lý do cảnh báo, kèm CTA "Nếu không phải bạn, hãy đổi mật khẩu ngay".

**Rate limit:** Tối đa **5 email cảnh báo / user / ngày** (sử dụng Redis counter).

**Dữ liệu known devices:** Lưu cache danh sách thiết bị/IP/quốc gia đã biết của mỗi user trong Redis để tăng tốc anomaly detection. Fallback query MongoDB nếu Redis miss.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### NFR-01: Hiệu suất
- Ghi log **không được làm tăng response time đăng nhập quá 100ms** (phase đầu: synchronous).
- API lấy danh sách login history phản hồi ≤ **500ms** (p95) với pagination.
- Cần indexing phù hợp trên các trường thường query: `user_id`, `created_at`, `status`, `ip_address`.
- Anomaly detection (check known devices) ≤ **50ms** — ưu tiên đọc từ Redis cache.

### NFR-02: Bảo mật
- IP hiển thị cho user: **masked**. IP cho admin: **đầy đủ**.
- Mật khẩu tạm (unlock) phải được hash bcrypt (cost factor ≥ 12) trước khi lưu — nhất quán với Sign-in.
- Log data là **append-only** — không có chức năng sửa/xoá bản ghi đơn lẻ.
- Tất cả API admin phải kiểm tra phân quyền.
- Chống user enumeration: nhất quán với Sign-in — response message generic (FR-005.6 trong Sign-in FRA).
- Tuân thủ **GDPR** — nhất quán với constraint trong Sign-in FRA: không log PII không cần thiết.

> **Không thêm rate limiting / lockout mới.** Các cơ chế này đã có sẵn trong Sign-in feature (FR-005.1, FR-005.2, FR-005.3, FR-001.7, FR-002.12).

### NFR-03: Độ tin cậy
- Nếu ghi log lỗi → **vẫn trả login response cho user**, không block luồng đăng nhập — nhất quán với Sign-in (NFR-015, NFR-016: graceful degradation).
- Nếu gửi email cảnh báo lỗi → retry 3 lần. Nếu vẫn fail → log error, không block login.
- Phase sau (async queue): đảm bảo zero data loss qua message queue + dead-letter queue.

### NFR-04: Data Retention
- Lưu trữ tối thiểu **3 năm**.
- Dữ liệu cũ hơn → archive hoặc purge (configurable).
- Log của **deleted users vẫn giữ nguyên**.

### NFR-05: Khả năng mở rộng
- Thiết kế sẵn cho time-based indexing/sharding (MongoDB).
- Tận dụng Redis đã có cho caching (known devices, anomaly counters, email rate limit counters).
- Phase cuối: chuyển sang async processing (Bull + Redis) để tăng throughput.

---

## 5. EDGE CASES & XỬ LÝ LỖI

| # | Tình huống | Hệ quả | Cách xử lý đề xuất |
|---|---|---|---|
| EC-01 | **Đăng nhập với email không tồn tại** | Không có `user_id` | Ghi log với `user_id = NULL`, `failure_reason = ACCOUNT_NOT_FOUND`. Response vẫn generic "Invalid credentials" — nhất quán với Sign-in (FR-005.6). |
| EC-02 | **Email chưa verify → cố đăng nhập** | Chưa hoàn tất registration | Ghi log với `failure_reason = EMAIL_NOT_VERIFIED`. Response: "Please verify your email" — nhất quán với Sign-in. |
| EC-03 | **Account bị lock → user chờ auto-unlock → đăng nhập lại** | Auto-unlock theo Sign-in logic | Login History chỉ ghi log: nếu thành công → `SUCCESS`, nếu vẫn sai → `FAILED` + lockout tiếp. |
| EC-04 | **Account bị DISABLED (admin khoá vĩnh viễn) → user cố đăng nhập** | Không thể đăng nhập | Ghi log `failure_reason = ACCOUNT_DISABLED`. Response: "Account suspended". User không thể tự unlock — phải liên hệ admin. |
| EC-05 | **Gửi OTP/Magic Link trong cooldown (<60s)** | Spam prevention đã có trong Sign-in | Ghi log `failure_reason = COOLDOWN_ACTIVE`. Response: "Please wait X seconds" — nhất quán với Sign-in (FR-002.1, FR-003.1). |
| EC-06 | **Gửi OTP quá 3 lần trong 5 phút** | Resend limit đã có trong Sign-in | Ghi log `failure_reason = RESEND_LIMIT_EXCEEDED`. Response nhất quán với Sign-in (FR-002.3). |
| EC-07 | **Đăng nhập đồng thời từ nhiều thiết bị** | Nhiều log tạo cùng lúc | Mỗi request tạo bản ghi riêng. Không conflict vì insert-only. Nhất quán với Sign-in: mỗi tab có tokens riêng. |
| EC-08 | **GeoIP lookup fail (service lỗi hoặc IP private/localhost)** | Thiếu thông tin vị trí | Ghi `country = 'UNKNOWN'`, `city = 'UNKNOWN'`. Không block login. |
| EC-09 | **User-Agent rỗng hoặc bị giả mạo** | Parse device info fail | Ghi `device_type = 'UNKNOWN'`, `os = 'UNKNOWN'`, `browser = 'UNKNOWN'`. Vẫn lưu raw user-agent. |
| EC-10 | **Ghi log DB fail (MongoDB connection error)** | Mất bản ghi log | **Không block login response** — nhất quán với Sign-in graceful degradation (NFR-015). Log error ra file. Phase async queue sau sẽ giải quyết. |
| EC-11 | **Redis down → anomaly detection fail** | Không check được known devices | Fallback: query MongoDB trực tiếp. Nếu cả 2 fail → skip anomaly check, không block login. |
| EC-12 | **Admin unlock user đang bị DISABLED** | Trạng thái conflict | Unlock chỉ reset lockout (LOCKED → unlocked). DISABLED cần thao tác **Enable** riêng. Thông báo rõ cho admin. |
| EC-13 | **Deleted user xuất hiện trong admin search** | Admin thấy user lạ | Hiển thị `[Deleted User]` + `username_attempted` gốc. Không link tới profile. |
| EC-14 | **User đổi email → lịch sử cũ vẫn ghi email cũ** | Gây nhầm lẫn | Log lưu `username_attempted` tại thời điểm đăng nhập (immutable). Liên kết qua `user_id`. |
| EC-15 | **Email cảnh báo bất thường gửi fail** | User không nhận cảnh báo | Retry 3 lần với backoff — nhất quán với Sign-in email handling. Nếu fail → log error, không block login. |
| EC-16 | **VPN user → quốc gia thay đổi liên tục** | Spam email cảnh báo | Rate limit 5 email/user/ngày (Redis counter). Chỉ cảnh báo khi quốc gia **hoàn toàn mới** (chưa từng trong 90 ngày). |
| EC-17 | **Export CSV > 10,000 bản ghi** | Response quá lớn, timeout | Giới hạn 10,000/lần. Yêu cầu admin thu hẹp bộ lọc. |
| EC-18 | **Email client auto-preview magic link** | Liên quan Sign-in, không phải Login History | Login History chỉ ghi log kết quả verify. Sign-in đã xử lý bằng POST verify (FR-003.9). |

---

## 6. API ENDPOINTS

| # | Method | Endpoint | Mô tả | Auth | Mới/Sửa |
|---|---|---|---|---|---|
| 1 | POST | `/api/v1/auth/login` | Đăng nhập — **thêm ghi log** | Public | Sửa |
| 2 | POST | `/api/v1/auth/login/otp/send` | Gửi OTP — **thêm ghi log** | Public | Sửa |
| 3 | POST | `/api/v1/auth/login/otp/verify` | Verify OTP — **thêm ghi log** | Public | Sửa |
| 4 | POST | `/api/v1/auth/login/magic-link/send` | Gửi Magic Link — **thêm ghi log** | Public | Sửa |
| 5 | POST | `/api/v1/auth/login/magic-link/verify` | Verify Magic Link — **thêm ghi log** | Public | Sửa |
| 6 | GET | `/api/v1/me/login-history` | User xem danh sách lịch sử | User | **Mới** |
| 7 | GET | `/api/v1/me/login-history/:id` | User xem chi tiết 1 bản ghi | User | **Mới** |
| 8 | GET | `/api/v1/admin/login-history` | Admin xem toàn bộ lịch sử | Admin | **Mới** |
| 9 | GET | `/api/v1/admin/login-history/:id` | Admin xem chi tiết 1 bản ghi | Admin | **Mới** |
| 10 | POST | `/api/v1/admin/users/:userId/unlock` | Admin unlock tài khoản (reset lockout) | Admin | **Mới** |
| 11 | POST | `/api/v1/admin/users/:userId/disable` | Admin khoá vĩnh viễn tài khoản | Admin | **Mới** |
| 12 | POST | `/api/v1/admin/users/:userId/enable` | Admin mở khoá tài khoản DISABLED | Admin | **Mới** |
| 13 | GET | `/api/v1/admin/login-history/export` | Admin export CSV | Admin | **Mới** |

---

## 7. PHÂN PHA TRIỂN KHAI

> 📎 **Tách file riêng:** Xem chi tiết tại **[login-history-wbs.md](./login-history-wbs.md)**
>
> **Tóm tắt:** 7 phases · 62 tasks · ~144 giờ · ~3.5 tuần (1 junior dev)
>
> **Lưu ý:** Tính năng Unlock qua Email đã được tách thành feature riêng — xem [unlock-account](../unlock-account/).

| Phase | Tên | Giờ |
|---|---|---|
| 1 | Ghi log cơ bản (5 endpoints) | 24h |
| 2 | User xem lịch sử | 18h |
| 3 | Admin xem lịch sử | 19h |
| 4 | Admin: Unlock + Disable/Enable + Export | 25h |
| 5 | Cảnh báo bất thường | 19h |
| 6 | Data Lifecycle | 13h |
| 7 | Async Queue (Bull + Redis) | 26h |

---

## 8. GIẢ ĐỊNH ĐÃ XÁC NHẬN

| # | Giả định | Trạng thái |
|---|---|---|
| A-01 | Backend: Node.js + Express, viết thuần | ✅ Confirmed |
| A-02 | Database: MongoDB | ✅ Confirmed |
| A-03 | Redis: đã có sẵn (dùng cho OTP, magic link, rate limiting trong Sign-in) | ✅ Confirmed |
| A-04 | Email: Nodemailer (đã có sẵn) | ✅ Confirmed |
| A-05 | Kiến trúc: Client-Server, 2 repos | ✅ Confirmed |
| A-06 | Phương thức đăng nhập: Password, OTP, Magic Link (đã implement) | ✅ Confirmed |
| A-07 | Lockout: Progressive (password) + Fixed 15m (OTP) — đã implement | ✅ Confirmed |
| A-08 | Rate limiting: Per IP, per email, cooldown 60s — đã implement | ✅ Confirmed |
| A-09 | Log user đã xoá vẫn giữ nguyên | ✅ Confirmed |
| A-10 | Không cần back-fill lịch sử cũ | ✅ Confirmed |
| A-11 | JWT infrastructure đã implement (accessToken, idToken, refreshToken) | ✅ Confirmed |

---

## 9. RỦI RO TIỀM ẨN

| # | Rủi ro | Mức độ | Giải pháp giảm thiểu |
|---|---|---|---|
| R-01 | Volume log lớn gây chậm query trên MongoDB | 🔴 Cao | Indexing strategy, TTL index, sharding khi cần |
| R-02 | Sync logging tăng response time login (phase 1–7) | 🟡 TB | Try-catch + monitor. Phase 8 chuyển async |
| R-03 | Ghi log fail → mất dữ liệu audit | 🔴 Cao | Try-catch + log file. Phase 8: Bull queue + DLQ |
| R-04 | Email unlock/cảnh báo bị lọt spam | 🟡 TB | Cấu hình SPF, DKIM, DMARC — nhất quán với email setup của Sign-in |
| R-05 | Admin lạm dụng quyền disable account | 🟡 TB | Ghi audit log cho mọi admin action (unlock, disable, enable) |
| R-06 | Redis down → anomaly detection + email counter fail | 🟡 TB | Fallback MongoDB. Graceful degradation — nhất quán với Sign-in (NFR-016) |

---

## 10. CROSS-REFERENCE VỚI SIGN-IN FRA

> Bảng đối chiếu các mục trong Sign-in FRA "Out of Scope" mà Login History feature implement:

| Sign-in Out of Scope Item | Login History Coverage |
|---|---|
| Login notification emails (new device/location) | ✅ FR-07: Cảnh báo bất thường qua email |
| IP geolocation tracking | ✅ FR-01: Ghi country, city từ GeoIP |
| Device fingerprinting | ⚠️ Partial: OS + Browser + Device type (không full fingerprint) |
| Account unlock via email verification | ➡️ Tách thành feature riêng — xem [unlock-account](../unlock-account/) |
| Login history view for users | ✅ FR-05: User xem lịch sử |
| Multi-device session tracking | ❌ Vẫn out of scope |
| View active sessions/devices | ❌ Vẫn out of scope |
| CAPTCHA for failed attempts | ❌ Vẫn out of scope |

---

*Tài liệu sẵn sàng chuyển sang giai đoạn **Technical Design** (database schema, sequence diagrams, API request/response contracts).*
