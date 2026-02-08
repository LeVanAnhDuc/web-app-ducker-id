# 📋 WORK BREAKDOWN STRUCTURE (WBS)

## Tính năng: Ghi lại Lịch sử Đăng nhập Thành công / Thất bại

**Tài liệu tham chiếu:** Feature Requirements Analysis — Login History v4.0  
**Ngày tạo:** 08/02/2026  
**Cập nhật lần cuối:** 08/02/2026

---

## 🔷 PHASE 1 — Ghi log đăng nhập cơ bản

**Scope:** Tích hợp logging vào 5 endpoint đăng nhập hiện có  
**APIs liên quan:** `POST /login` · `POST /login/otp/send` · `POST /login/otp/verify` · `POST /login/magic-link/send` · `POST /login/magic-link/verify`  
**Tham chiếu FRA:** FR-01, FR-02

| Task  | Mô tả                                                                                   | Ước tính |
| ----- | --------------------------------------------------------------------------------------- | -------- |
| P1-T1 | Thiết kế & tạo MongoDB collection `login_history` (schema, indexes)                     | 2h       |
| P1-T2 | Tạo utility parse User-Agent → device_type, os, browser                                 | 2h       |
| P1-T3 | Tạo utility GeoIP lookup từ IP → country, city                                          | 2h       |
| P1-T4 | Tạo module ghi log đăng nhập: nhận event data, validate, insert MongoDB                 | 3h       |
| P1-T5 | Tích hợp ghi log vào `POST /login` (password) — cả thành công & thất bại, bọc try-catch | 2h       |
| P1-T6 | Tích hợp ghi log vào `POST /login/otp/send` và `POST /login/otp/verify`                 | 3h       |
| P1-T7 | Tích hợp ghi log vào `POST /login/magic-link/send` và `POST /login/magic-link/verify`   | 3h       |
| P1-T8 | Viết unit test cho module ghi log                                                       | 3h       |
| P1-T9 | Viết integration test: mỗi phương thức login (thành công/thất bại) → verify log đúng    | 4h       |
|       | **Tổng Phase 1**                                                                        | **~24h** |

**Definition of Done:**

- Mọi lần đăng nhập (3 phương thức × thành công/thất bại) đều được ghi vào MongoDB.
- Ghi log fail không block login response.
- Unit test + integration test pass.

---

## 🔷 PHASE 2 — Unlock qua Email + Bắt buộc đổi mật khẩu

**Scope:** Tính năng mới — unlock sớm thay vì chờ auto-unlock  
**APIs liên quan:** `POST /api/v1/auth/unlock-request` · `POST /api/v1/auth/unlock-verify`  
**Tham chiếu FRA:** FR-03

| Task  | Mô tả                                                                                                                                                  | Ước tính |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| P2-T1 | Tạo utility generate mật khẩu tạm (12+ ký tự, mixed)                                                                                                   | 2h       |
| P2-T2 | Tạo module xử lý unlock request: validate email, check account không bị DISABLED, generate mật khẩu tạm, hash bcrypt, lưu DB, gửi email qua Nodemailer | 4h       |
| P2-T3 | Cập nhật schema user: thêm fields mật khẩu tạm (hash, thời hạn, trạng thái đã dùng, flag must_change_password)                                         | 2h       |
| P2-T4 | Tạo endpoint `POST /unlock-request` với rate limit 3/giờ (dùng Redis counter)                                                                          | 3h       |
| P2-T5 | Tạo module xử lý unlock verify: xác thực mật khẩu tạm, kiểm tra hết hạn, kiểm tra đã dùng, reset lockout state                                         | 4h       |
| P2-T6 | Tạo endpoint `POST /unlock-verify` + set flag bắt buộc đổi mật khẩu                                                                                    | 3h       |
| P2-T7 | Tạo email template HTML cho email unlock                                                                                                               | 2h       |
| P2-T8 | Viết unit test                                                                                                                                         | 3h       |
| P2-T9 | Viết integration test: full flow lock → unlock request → đăng nhập bằng mật khẩu tạm → buộc đổi mật khẩu                                               | 4h       |
|       | **Tổng Phase 2**                                                                                                                                       | **~27h** |

**Definition of Done:**

- User bị lock có thể bấm "Mở khoá qua email" → nhận mật khẩu tạm → đăng nhập → buộc đổi mật khẩu.
- Account bị DISABLED không thể dùng tính năng này.
- Rate limit 3/giờ hoạt động đúng.
- Mật khẩu tạm hết hạn sau 15 phút, single-use.

---

## 🔷 PHASE 3 — User xem lịch sử đăng nhập

**Scope:** End user xem lịch sử của chính mình  
**APIs liên quan:** `GET /api/v1/me/login-history` · `GET /api/v1/me/login-history/:id`  
**Tham chiếu FRA:** FR-05

| Task  | Mô tả                                                                         | Ước tính |
| ----- | ----------------------------------------------------------------------------- | -------- |
| P3-T1 | Tạo module query lịch sử đăng nhập theo user_id (filter, pagination, sort)    | 4h       |
| P3-T2 | Tạo endpoint `GET /me/login-history` (auth middleware, validate query params) | 3h       |
| P3-T3 | Tạo utility mask IP: `103.45.67.89` → `103.45.xxx.xxx`                        | 1h       |
| P3-T4 | Tạo response formatter cho list view (chỉ các field đại diện, IP masked)      | 2h       |
| P3-T5 | Tạo endpoint `GET /me/login-history/:id` (trả full detail, verify ownership)  | 3h       |
| P3-T6 | Tạo DB indexes tối ưu cho query user                                          | 1h       |
| P3-T7 | Viết unit test + integration test cho cả 2 endpoints                          | 4h       |
|       | **Tổng Phase 3**                                                              | **~18h** |

**Definition of Done:**

- User xem được danh sách lịch sử (phân trang, lọc theo thời gian/trạng thái).
- Bấm vào 1 dòng → xem chi tiết đầy đủ.
- IP hiển thị masked. Chỉ xem được lịch sử của chính mình.

---

## 🔷 PHASE 4 — Admin xem lịch sử toàn hệ thống

**Scope:** Admin dashboard lịch sử đăng nhập  
**APIs liên quan:** `GET /api/v1/admin/login-history` · `GET /api/v1/admin/login-history/:id`  
**Tham chiếu FRA:** FR-06

| Task  | Mô tả                                                                                                | Ước tính |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| P4-T1 | Tạo/cập nhật admin auth middleware (verify role = ADMIN)                                             | 2h       |
| P4-T2 | Tạo module query toàn bộ lịch sử với filter nâng cao (user, IP, status, method, country, date range) | 4h       |
| P4-T3 | Tạo endpoint `GET /admin/login-history` (validate query params)                                      | 3h       |
| P4-T4 | Tạo response formatter cho admin (IP đầy đủ, user info, label "[Deleted User]")                      | 2h       |
| P4-T5 | Tạo endpoint `GET /admin/login-history/:id` (detail view)                                            | 2h       |
| P4-T6 | Tạo DB indexes bổ sung cho admin query (ip, username, created_at)                                    | 2h       |
| P4-T7 | Viết unit test + integration test (bao gồm test phân quyền: user thường không truy cập được)         | 4h       |
|       | **Tổng Phase 4**                                                                                     | **~19h** |

**Definition of Done:**

- Admin xem, filter, search lịch sử đăng nhập toàn hệ thống (bao gồm deleted users).
- IP hiển thị đầy đủ. "[Deleted User]" hiển thị đúng.
- User thường truy cập admin API → bị reject 403.

---

## 🔷 PHASE 5 — Admin: Unlock + Disable/Enable + Export CSV

**Scope:** Các hành động admin trên tài khoản + export dữ liệu  
**APIs liên quan:** `POST .../unlock` · `POST .../disable` · `POST .../enable` · `GET .../export`  
**Tham chiếu FRA:** FR-04, FR-06

| Task  | Mô tả                                                                        | Ước tính |
| ----- | ---------------------------------------------------------------------------- | -------- |
| P5-T1 | Tạo module admin unlock: reset lockout state + ghi audit log                 | 3h       |
| P5-T2 | Tạo endpoint `POST /admin/users/:userId/unlock`                              | 2h       |
| P5-T3 | Tạo module admin disable: chuyển account sang DISABLED + ghi audit log       | 3h       |
| P5-T4 | Tạo endpoint `POST /admin/users/:userId/disable`                             | 2h       |
| P5-T5 | Tạo module admin enable: chuyển account từ DISABLED → active + ghi audit log | 2h       |
| P5-T6 | Tạo endpoint `POST /admin/users/:userId/enable`                              | 2h       |
| P5-T7 | Tạo module export CSV: query DB (limit 10,000), format CSV, stream response  | 4h       |
| P5-T8 | Tạo endpoint `GET /admin/login-history/export`                               | 3h       |
| P5-T9 | Viết unit test + integration test cho tất cả endpoints                       | 4h       |
|       | **Tổng Phase 5**                                                             | **~25h** |

**Definition of Done:**

- Admin unlock tài khoản bị lock (reset lockout) — phân biệt với enable.
- Admin disable tài khoản → user không đăng nhập được bất kỳ phương thức nào, không tự unlock qua email được.
- Admin enable tài khoản bị DISABLED → user đăng nhập lại bình thường.
- Export CSV ≤ 10,000 bản ghi hoạt động đúng.
- Mọi admin action đều có audit log.

---

## 🔷 PHASE 6 — Cảnh báo đăng nhập bất thường

**Scope:** Anomaly detection + email alert (không có endpoint mới)  
**APIs liên quan:** Tích hợp vào luồng login thành công hiện có  
**Tham chiếu FRA:** FR-07

| Task  | Mô tả                                                                                                                       | Ước tính |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| P6-T1 | Thiết kế & tạo MongoDB collection `known_devices` + Redis cache strategy                                                    | 2h       |
| P6-T2 | Tạo module phát hiện bất thường: check Redis cache trước → fallback MongoDB. So sánh device/IP/country với 90 ngày gần nhất | 4h       |
| P6-T3 | Tạo module cập nhật known_devices: ghi MongoDB + update Redis cache sau mỗi login thành công                                | 2h       |
| P6-T4 | Tạo email template HTML cho cảnh báo bất thường                                                                             | 2h       |
| P6-T5 | Tạo module gửi email cảnh báo (async, non-blocking) với rate limit 5/user/ngày (Redis counter)                              | 3h       |
| P6-T6 | Tích hợp vào luồng login: sau SUCCESS → check anomaly → gửi alert nếu cần                                                   | 2h       |
| P6-T7 | Viết unit test + integration test                                                                                           | 4h       |
|       | **Tổng Phase 6**                                                                                                            | **~19h** |

**Definition of Done:**

- Đăng nhập từ thiết bị/IP/quốc gia mới → user nhận email cảnh báo.
- Rate limit 5 email/user/ngày hoạt động đúng.
- Redis down → fallback MongoDB, không block login.
- Known devices được cache Redis, update sau mỗi login thành công.

---

## 🔷 PHASE 7 — Data Lifecycle & Monitoring

**Scope:** Background job dọn dẹp dữ liệu + health check  
**APIs liên quan:** Health check endpoint  
**Tham chiếu FRA:** NFR-04

| Task  | Mô tả                                                                                     | Ước tính |
| ----- | ----------------------------------------------------------------------------------------- | -------- |
| P7-T1 | Tạo cron job dọn dẹp: archive/purge log cũ hơn retention period                           | 4h       |
| P7-T2 | Cấu hình TTL index hoặc cron-based cleanup cho MongoDB                                    | 3h       |
| P7-T3 | Tạo config retention period (env variable, mặc định 3 năm)                                | 1h       |
| P7-T4 | Tạo health check endpoint: kiểm tra DB + Redis connection, collection size, oldest record | 2h       |
| P7-T5 | Viết test cho cron job                                                                    | 3h       |
|       | **Tổng Phase 7**                                                                          | **~13h** |

**Definition of Done:**

- Cron job chạy hàng ngày, dọn dẹp log > 3 năm (configurable).
- Health check endpoint trả về trạng thái DB, Redis, collection size.
- TTL index hoặc cron cleanup hoạt động đúng.

---

## 🔷 PHASE 8 — Migration sang Async Queue (Bull + Redis)

**Scope:** Chuyển logging & email sang async để không block login response  
**APIs liên quan:** Refactor toàn bộ login endpoints  
**Tham chiếu FRA:** NFR-01, NFR-03, NFR-05

| Task  | Mô tả                                                                             | Ước tính |
| ----- | --------------------------------------------------------------------------------- | -------- |
| P8-T1 | Setup Bull queue (tận dụng Redis hiện có)                                         | 3h       |
| P8-T2 | Tạo producer: publish login event vào queue                                       | 2h       |
| P8-T3 | Tạo consumer/worker: consume event → ghi DB + check anomaly                       | 4h       |
| P8-T4 | Tạo email queue riêng với retry (3 lần, backoff)                                  | 3h       |
| P8-T5 | Refactor login controllers: thay sync bằng publish event (feature flag để switch) | 3h       |
| P8-T6 | Implement dead-letter queue: event fail sau retry → vào DLQ + alert               | 3h       |
| P8-T7 | Viết integration test: login → event published → worker processed → data in DB    | 4h       |
| P8-T8 | Load test: 100 concurrent logins, verify zero data loss + response time < 200ms   | 4h       |
|       | **Tổng Phase 8**                                                                  | **~26h** |

**Definition of Done:**

- Toàn bộ logging & email chạy async qua Bull queue.
- Feature flag cho phép switch giữa sync/async.
- Login response time < 200ms.
- Zero data loss (DLQ cho failed events).
- Load test pass: 100 concurrent logins.

---

## 📊 TỔNG KẾT

| Phase | Tên                                     | Tasks | Giờ | Tích luỹ |
| ----- | --------------------------------------- | ----- | --- | -------- |
| 1     | Ghi log cơ bản (5 endpoints)            | 9     | 24h | 24h      |
| 2     | Unlock qua Email                        | 9     | 27h | 51h      |
| 3     | User xem lịch sử                        | 7     | 18h | 69h      |
| 4     | Admin xem lịch sử                       | 7     | 19h | 88h      |
| 5     | Admin: Unlock + Disable/Enable + Export | 9     | 25h | 113h     |
| 6     | Cảnh báo bất thường                     | 7     | 19h | 132h     |
| 7     | Data Lifecycle                          | 5     | 13h | 145h     |
| 8     | Async Queue (Bull + Redis)              | 8     | 26h | **171h** |

> **Tổng: ~171 giờ ≈ 21.5 ngày làm việc ≈ ~4.5 tuần** (1 junior dev)

---

## PHỤ LỤC: Dependency Graph

```
Phase 1 (Ghi log)
  ↓
  ├→ Phase 2 (Unlock Email) ─── không phụ thuộc Phase 3–5
  ├→ Phase 3 (User xem) ──────→ Phase 4 (Admin xem) ──→ Phase 5 (Admin actions)
  └→ Phase 6 (Cảnh báo) ─────── không phụ thuộc Phase 2–5
       ↓
Phase 7 (Data Lifecycle) ←────── có thể làm song song từ Phase 3+
       ↓
Phase 8 (Async Queue) ←──────── phụ thuộc Phase 1 + 6 hoàn thành
```

**Gợi ý nếu có 2 dev:**

- Dev A: Phase 1 → 2 → 3 → 4 → 5
- Dev B: (chờ Phase 1 xong) → Phase 6 → 7 → 8
- Tổng thời gian: **~3 tuần** thay vì 4.5 tuần
