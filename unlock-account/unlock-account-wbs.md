# 📋 WORK BREAKDOWN STRUCTURE (WBS)
## Tính năng: Mở khoá tài khoản qua Email + Bắt buộc đổi mật khẩu

**Tài liệu tham chiếu:** Unlock Account FRA — v1.0
**Ngày tạo:** 09/02/2026
**Cập nhật lần cuối:** 09/02/2026

---

## Nguyên tắc phân pha

- Mỗi phase tập trung **1 nhóm API / 1 mục tiêu rõ ràng**.
- Mỗi sub-task ≤ **4 giờ** cho 1 junior dev (Node.js + TypeScript).
- Lockout & Rate limiting infrastructure đã implement trong Sign-in → không cần setup lại.
- Tận dụng Redis, Nodemailer, bcrypt, JWT đã có sẵn.

---

## 🔷 PHASE 1 — Hạ tầng: User Model + Utility + Email Template

**Scope:** Chuẩn bị các thành phần cơ sở cần thiết cho unlock flow
**APIs liên quan:** Không có API trong phase này
**Tham chiếu FRA:** FR-02 (phần generate mật khẩu tạm), FR-05 (email template)

| Task | Mô tả | Ước tính |
|---|---|---|
| P1-T1 | Cập nhật schema User: thêm fields `tempPasswordHash`, `tempPasswordExpAt`, `tempPasswordUsed`, `mustChangePassword`, `accountStatus` | 2h |
| P1-T2 | Tạo utility generate mật khẩu tạm (16 ký tự, crypto-secure, mixed characters: upper + lower + digit + special, shuffle) | 2h |
| P1-T3 | Tạo constants cho unlock feature: Redis key patterns, TTL values, rate limit config, error messages i18n (EN/VI) | 2h |
| P1-T4 | Tạo email template HTML cho email unlock (song ngữ EN/VI, hiển thị mật khẩu tạm, thời hạn 15 phút, hướng dẫn sử dụng) | 2h |
| | **Tổng Phase 1** | **~8h** |

**Definition of Done:**
- User model có đủ 5 fields mới (xem **System Design Section 3.1**).
- Utility generate mật khẩu tạm hoạt động đúng (xem **System Design Section 7.1**).
- Constants file không có magic number/string.
- Email template render đúng cả EN và VI.

---

## 🔷 PHASE 2 — Unlock Request API

**Scope:** Endpoint yêu cầu gửi email unlock
**APIs liên quan:** `POST /api/v1/auth/unlock-request`
**Tham chiếu FRA:** FR-02

| Task | Mô tả | Ước tính |
|---|---|---|
| P2-T1 | Tạo Joi validation schema cho unlock-request (email: required, valid email, trim, lowercase) | 1h |
| P2-T2 | Tạo unlock service: logic check cooldown (Redis), check rate limit (Redis), find user, check DISABLED, check lock state, generate + hash temp password, lưu DB | 4h |
| P2-T3 | Tạo endpoint `POST /auth/unlock-request` (controller + route): gọi service, gửi email (non-blocking), set Redis cooldown + rate counter, return generic response | 2h |
| | **Tổng Phase 2** | **~7h** |

**Definition of Done:**
- API hoạt động đúng theo **FRA FR-02** (tất cả branches).
- Cooldown + Rate limit hoạt động đúng.
- Chống user enumeration (generic response).

---

## 🔷 PHASE 3 — Unlock Verify API + Force Change Password Middleware

**Scope:** Endpoint xác thực mật khẩu tạm + middleware bắt buộc đổi mật khẩu
**APIs liên quan:** `POST /api/v1/auth/unlock-verify` · Sửa `PUT /api/v1/me/password` (bổ sung clear flags)
**Tham chiếu FRA:** FR-03, FR-04

| Task | Mô tả | Ước tính |
|---|---|---|
| P3-T1 | Tạo Joi validation schema cho unlock-verify (email + tempPassword: required, min 12) | 1h |
| P3-T2 | Tạo unlock verify service: find user, check temp password expiry, check used, bcrypt compare, set flags, reset lockout, generate tokens | 3h |
| P3-T3 | Tạo endpoint `POST /auth/unlock-verify` (controller + route): gọi service, set refreshToken cookie, return tokens + mustChangePassword | 1h |
| P3-T4 | Tạo `forceChangePassword` middleware: check `mustChangePassword` flag, whitelist change password + logout endpoints, reject 403 cho endpoint khác | 1h |
| P3-T5 | Bổ sung logic vào endpoint change password hiện có: sau đổi mật khẩu thành công → clear `mustChangePassword`, `tempPasswordHash`, `tempPasswordExpAt`, `tempPasswordUsed` | 1h |
| | **Tổng Phase 3** | **~7h** |

**Definition of Done:**
- API hoạt động đúng theo **FRA FR-03, FR-04** (tất cả branches).
- Temp password sai/hết hạn/đã dùng → reject 401. **KHÔNG tăng lockout counter.**
- Middleware `forceChangePassword` hoạt động đúng (xem **System Design Section 8.1**).
- Change password endpoint clear đúng các temp password fields.

---

## 🔷 PHASE 4 — Testing

**Scope:** Unit test + Integration test cho toàn bộ unlock flow
**APIs liên quan:** Tất cả endpoints trong Phase 2-3
**Tham chiếu FRA:** Toàn bộ FR + Edge Cases

| Task | Mô tả | Ước tính |
|---|---|---|
| P4-T1 | Viết unit test cho utility generate mật khẩu tạm (format, length, character diversity, crypto-secure) | 1h |
| P4-T2 | Viết unit test cho unlock service: các nhánh logic (cooldown, rate limit, not found, disabled, not locked, success) | 2h |
| P4-T3 | Viết unit test cho unlock verify service: các nhánh logic (expired, used, wrong, success, lockout counter không tăng) | 2h |
| P4-T4 | Viết integration test: full flow lock → unlock request → nhận email → unlock verify → buộc đổi mật khẩu → truy cập bình thường | 3h |
| | **Tổng Phase 4** | **~8h** |

**Definition of Done:**
- Unit test coverage ≥ 80% cho unlock service, verify service, temp password utility.
- Integration test cover full happy path + edge cases (xem **FRA Section 5**).
- Tất cả test pass.

---

## 📊 TỔNG KẾT

| Phase | Tên | Tasks | Giờ | Tích luỹ |
|---|---|---|---|---|
| 1 | Hạ tầng: User Model + Utility + Email Template | 4 | 8h | 8h |
| 2 | Unlock Request API | 3 | 7h | 15h |
| 3 | Unlock Verify API + Force Change Password | 5 | 7h | 22h |
| 4 | Testing | 4 | 8h | **30h** |

> **Tổng: ~30 giờ ≈ 3.75 ngày làm việc ≈ ~1 tuần** (1 junior dev)

---

## PHỤ LỤC: Dependency Graph

```
Phase 1 (Hạ tầng)
  ↓
  ├→ Phase 2 (Unlock Request API)
  │       ↓
  └→ Phase 3 (Unlock Verify API + Force Change Password)
            ↓
       Phase 4 (Testing)
```

> Phase 2 và Phase 3 có dependency tuần tự (verify cần request đã hoạt động để test). Phase 4 phụ thuộc cả Phase 2 + 3 hoàn thành.
