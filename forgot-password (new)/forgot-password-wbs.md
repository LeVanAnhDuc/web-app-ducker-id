# 📋 WORK BREAKDOWN STRUCTURE (WBS)
## Tính năng: Quên Mật Khẩu (Forgot Password)

**Tài liệu tham chiếu:** Forgot Password FRA v1.0 · Forgot Password TDD v1.0  
**Ngày tạo:** 08/02/2026  

---

## Nguyên tắc phân pha

- Mỗi phase tập trung **1 flow hoặc 1 nhóm chức năng**.
- Mỗi sub-task ≤ **4 giờ** cho 1 junior BE (Node.js / Express / MongoDB).
- **Tái sử dụng tối đa:** OTP generation (Sign-in), Password validation (Signup), Event Emitter (Login History).
- Lockout check, DISABLED check, rate limiting — tái sử dụng logic/middleware hiện có.

---

## 🔷 PHASE 1 — Reset qua Link (Gửi + Verify + Đặt mật khẩu)

**Scope:** Flow chính: user request link → nhận email → click link → đặt mật khẩu mới  
**APIs:** `POST /forgot-password/send-link` · `POST /forgot-password/verify-link`  
**Tham chiếu FRA:** FR-01, FR-02, FR-04, FR-05

| Task | Mô tả | Ước tính |
|---|---|---|
| P1-T1 | Tạo Joi validation schemas: send-link request, verify-link request (tái sử dụng password schema từ Signup) | 2h |
| P1-T2 | Tạo module send-link: validate email, find user, check accountStatus + lockout, generate token (tái sử dụng crypto util), hash, lưu Redis, gửi email | 4h |
| P1-T3 | Tạo module verify-link: validate token hash từ Redis, compare, check trùng password cũ (bcrypt compare), hash mật khẩu mới, update MongoDB, clear temp password fields, xoá Redis key | 4h |
| P1-T4 | Tạo controller + route cho 2 endpoints | 3h |
| P1-T5 | Tạo email template HTML cho reset link | 2h |
| P1-T6 | Implement anti-enumeration: trả generic response khi email không tồn tại / chưa verify | 2h |
| P1-T7 | Viết unit test cho module send-link + verify-link | 4h |
| P1-T8 | Viết integration test: full flow send → verify → password updated + edge cases (expired, used, same password) | 3h |
| | **Tổng Phase 1** | **~24h** |

**Definition of Done:**
- API hoạt động đúng theo **FRA FR-01, FR-02, FR-04, FR-05** (tất cả branches).
- Anti-enumeration + LOCKED/DISABLED check đúng (xem **FRA EC-01 → EC-04**).
- Unit test + integration test pass.

---

## 🔷 PHASE 2 — Reset qua OTP (Gửi + Verify + Đặt mật khẩu)

**Scope:** Flow OTP: user request OTP → nhận email → nhập OTP → verify → đặt mật khẩu mới  
**APIs:** `POST /forgot-password/send-otp` · `POST /forgot-password/verify-otp` · `POST /forgot-password/reset-password`  
**Tham chiếu FRA:** FR-01, FR-03, FR-04, FR-05

| Task | Mô tả | Ước tính |
|---|---|---|
| P2-T1 | Tạo Joi validation schemas: send-otp, verify-otp, reset-password | 2h |
| P2-T2 | Tạo module send-otp: tái sử dụng OTP generation pattern từ Sign-in/Signup, hash, lưu Redis TTL 15 phút, gửi email | 3h |
| P2-T3 | Tạo module verify-otp: check failed attempts (Redis), bcrypt compare OTP, nếu đúng → generate reset session token, lưu Redis, cleanup OTP data | 4h |
| P2-T4 | Tạo module reset-password: verify session token (Redis), check trùng password, hash + update MongoDB, clear temp fields, xoá session | 3h |
| P2-T5 | Tạo controller + route cho 3 endpoints | 3h |
| P2-T6 | Tạo email template HTML cho reset OTP | 2h |
| P2-T7 | Viết unit test cho 3 modules | 3h |
| P2-T8 | Viết integration test: full OTP flow + edge cases (sai 5 lần lock, expired, session expired) | 3h |
| | **Tổng Phase 2** | **~23h** |

**Definition of Done:**
- API hoạt động đúng theo **FRA FR-01, FR-03, FR-04, FR-05** (tất cả branches).
- OTP lockout + session token đúng (xem **TDD Section 4.4, 4.5**).

---

## 🔷 PHASE 3 — Rate Limiting + Cooldown + Edge Cases

**Scope:** Bảo vệ abuse: cooldown, rate limit, invalidate token cũ  
**APIs:** Áp dụng lên cả 5 endpoints  
**Tham chiếu FRA:** FR-01 (validation), Edge Cases EC-14 đến EC-23

| Task | Mô tả | Ước tính |
|---|---|---|
| P3-T1 | Implement cooldown 60s cho send-link + send-otp (Redis key `reset:cooldown:{email}`) | 2h |
| P3-T2 | Implement rate limit 3/15 phút cho send-link + send-otp (Redis key `reset:rate:{email}`) | 3h |
| P3-T3 | Implement invalidate token/OTP cũ khi request mới (Redis SET overwrite) | 2h |
| P3-T4 | Implement OTP failed attempts tracking + lockout 15 phút (Redis key `reset:otp:failed:{email}`) | 3h |
| P3-T5 | Viết unit test cho rate limiting + cooldown + OTP lockout | 3h |
| P3-T6 | Viết integration test: cooldown active → reject, rate exceeded → reject, OTP 5 lần sai → lock | 3h |
| | **Tổng Phase 3** | **~16h** |

**Definition of Done:**
- Cooldown + rate limit hoạt động đúng theo **FRA FR-01** và **FRA EC-14 → EC-17**.
- OTP lockout đúng (xem **TDD Section 3.1** — Redis keys).

---

## 🔷 PHASE 4 — Ghi log vào Login History

**Scope:** Tích hợp ghi log sự kiện vào login_histories qua Event Emitter  
**APIs:** Không tạo endpoint mới — tích hợp vào 5 endpoints hiện có  
**Tham chiếu FRA:** FR-06

| Task | Mô tả | Ước tính |
|---|---|---|
| P4-T1 | Bổ sung enum values vào LoginHistory model: `loginMethod: 'PASSWORD_RESET'` + 6 failure reasons mới | 2h |
| P4-T2 | Tạo event listeners mới trên Event Emitter hiện có: `password.reset.success`, `password.reset.failed`, `password.reset.otp.verified` | 4h |
| P4-T3 | Tích hợp emit event vào send-link/verify-link controllers (try-catch, non-blocking) | 2h |
| P4-T4 | Tích hợp emit event vào send-otp/verify-otp/reset-password controllers | 3h |
| P4-T5 | Viết unit test cho event listeners | 3h |
| P4-T6 | Viết integration test: mỗi scenario (thành công, thất bại) → verify log đúng trong login_histories | 4h |
| | **Tổng Phase 4** | **~18h** |

**Definition of Done:**
- Ghi log đúng theo **FRA FR-06** (tất cả sự kiện trong bảng).
- Event Emitter hoạt động đúng (xem **TDD Section 7**).

---

## 🔷 PHASE 5 — Email Templates + Cleanup + Polish

**Scope:** Hoàn thiện email, cleanup logic, xử lý edge cases còn lại  
**APIs:** Không tạo endpoint mới  
**Tham chiếu FRA:** FR-05, Edge Cases EC-18, EC-24

| Task | Mô tả | Ước tính |
|---|---|---|
| P5-T1 | Hoàn thiện email template reset link: responsive HTML, warning "Do not share", expiry info, branding | 3h |
| P5-T2 | Hoàn thiện email template OTP: responsive HTML, expiry info, branding — nhất quán style với Signup OTP email | 3h |
| P5-T3 | Implement cleanup toàn bộ Redis keys sau reset thành công (token, OTP, session, cooldown, rate, failed attempts) | 2h |
| P5-T4 | Implement clear temp password fields (từ Login History unlock) khi forgot password thành công | 2h |
| P5-T5 | Review + fix edge cases: EC-18 (email preview), concurrent requests, Redis TTL consistency | 3h |
| P5-T6 | Viết integration test: end-to-end cả 2 flows (link + OTP) với full cleanup verification | 3h |
| | **Tổng Phase 5** | **~16h** |

**Definition of Done:**
- Cleanup đúng theo **FRA FR-05** và **FRA EC-24** (clear temp fields + Redis keys).
- End-to-end test pass cho cả 2 flows.

---

## 📊 TỔNG KẾT

| Phase | Tên | Tasks | Giờ | Tích luỹ |
|---|---|---|---|---|
| 1 | Reset qua Link | 8 | 24h | 24h |
| 2 | Reset qua OTP | 8 | 23h | 47h |
| 3 | Rate Limiting + Edge Cases | 6 | 16h | 63h |
| 4 | Ghi log Login History | 6 | 18h | 81h |
| 5 | Email Templates + Cleanup | 6 | 16h | **97h** |

> **Tổng: ~97 giờ ≈ 12 ngày làm việc ≈ ~2.5 tuần** (1 junior dev)

---

## PHỤ LỤC: Dependency Graph

```
Phase 1 (Reset Link)
  ↓
  └→ Phase 3 (Rate Limiting) ← Phase 2 (Reset OTP) cũng cần
       ↓
Phase 4 (Login History Log) ← cần Phase 1 + 2 hoàn thành
       ↓
Phase 5 (Cleanup + Polish) ← cần tất cả phases trước
```

**Gợi ý nếu có 2 dev:**
- Dev A: Phase 1 → Phase 3 (link flow + rate limiting)
- Dev B: Phase 2 (OTP flow — có thể làm song song với Phase 1)
- Sau đó: Dev A Phase 4, Dev B Phase 5
- Tổng thời gian: **~1.5 tuần** thay vì 2.5 tuần
