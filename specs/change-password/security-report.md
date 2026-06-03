# Security Report — Change Password

> **Date**: 2026-06-03 · **Feature**: `change-password` (cross-stack BE + FE) · **Auditor**: security-auditor agent

## Summary

**Verdict: CONDITIONAL** → sau xử lý: **PASS** (xem mục Resolution).

| Severity | Count |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 2 |
| 🟢 Low | 2 |

Side audited: BE + FE.

---

## Findings

### VULN-BE-1 — 🟠 High — Rate-limit keyGenerator dùng sai identity + silent fallback
**Location**: `server/src/middlewares/common/rate-limiter.middleware.ts` (`changePasswordByIpAndUser`)
**OWASP**: A07 / A01.
`keyGenerator` dùng `RequestContext.getUserId() ?? "anon"` — (1) `getUserId()` trả `sub` (userId) chứ không phải `authId` như design §6; (2) fallback `"anon"` khiến mọi request không có context dồn vào 1 bucket `IP:anon` → mất chiều per-user của brute-force protection nếu middleware bị reorder/misconfig.
**Fix**: dùng `RequestContext.requireAuthId()` (throw nếu thiếu context, nhất quán với service).

### VULN-FE-1 — 🟡 Medium — onError không map error code → field, phản chiếu raw server message
**Location**: `client/src/views/AccountSettings/hooks/useChangePassword.ts`
**OWASP**: A07.
Design §8 yêu cầu map `CHANGE_PASSWORD_WRONG_CURRENT` → field `currentPassword`, `CHANGE_PASSWORD_SAME_AS_CURRENT` → field `newPassword`. Hiện chỉ `toast.error(message)` → không có field feedback (user retry mù → tự cạn rate-limit) + render raw message từ BE.
**Fix**: map code → `setError(field)` qua i18n key, fallback toast.

### VULN-BE-2 — 🟡 Medium — bcrypt đồng bộ block event loop (~200ms/request)
**Location**: `server/src/utils/crypto/bcrypt.ts` (`hashSync`/`compareSync`)
**OWASP**: A04/A10. DoS surface dưới tải. **Pre-existing toàn codebase** (signup/login/forgot-password) — change-password nhân đôi chi phí (verify + hash). **Disposition: DEFER** — cross-cutting, cần PR migration async riêng cho cả auth subsystem; không sửa trong feature này.

### VULN-BE-3 — 🟢 Low — Audit log thiếu context
**Location**: `change-password.service.ts` (`Logger.info("Password changed", { authId })`)
**OWASP**: A09. Design §2 nhắc LoginHistoryService nhưng **đã thống nhất bỏ** (deviation user-approved, tránh entry "login" giả). Log hiện thiếu ip/userAgent/userId.
**Fix**: enrich `Logger.info` với userId/ip/userAgent (giữ quyết định không ghi login_histories).

### VULN-FE-2 — 🟢 Low — Zustand persist (access token → localStorage?)
**Location**: `client/src/stores/slices/auth.ts`
**Disposition: VERIFIED SAFE** — store KHÔNG dùng `persist` middleware (`stores/index.ts` chỉ `create()` thuần). Token chỉ in-memory; refresh token trong httpOnly cookie. Không khai thác được. Không cần sửa.

---

## Passed checks (đạt)
authGuard trước mọi middleware · authId từ JWT không từ body · Joi validate + confirm match server-side · bcrypt compare constant-time · error chỉ leak code generic · token mới issue **sau** `passwordChangedAt` (không race) · `PasswordNotChangedGuard` revoke thiết bị khác · email alert chỉ chứa changedAt+ip (không token/hash) · cookie httpOnly/secure/sameSite · không hardcode secret · không MongoDB injection · helmet headers · FE no dangerouslySetInnerHTML · mutation fire trong submit handler · dual confirm match · autoComplete đúng.

## Recommendations (non-blocking)
1. bcrypt `SALT_ROUNDS` 10 → 12 (OWASP min) — toàn auth subsystem.
2. `app.set("trust proxy")` nếu chạy sau reverse proxy (để `req.ip` đúng trong email alert).
3. Gate Swagger UI khỏi production.

---

## Resolution (2026-06-03)
| Finding | Action |
|---|---|
| VULN-BE-1 (High) | ✅ **Fixed** — `keyGenerator` → `requireAuthId()` |
| VULN-FE-1 (Medium) | ✅ **Fixed** — map error code → `setError(field)` + i18n keys |
| VULN-BE-3 (Low) | ✅ **Fixed** — enrich `Logger.info` (userId/ip/userAgent) |
| VULN-BE-2 (Medium) | ⏸️ **Deferred** — pre-existing cross-cutting; tracked như hardening PR riêng |
| VULN-FE-2 (Low) | ✅ **Verified safe** — không dùng persist |

**Post-fix verdict: ✅ PASS** (High đã xử lý; Medium còn lại là deferred cross-cutting có chủ đích).
