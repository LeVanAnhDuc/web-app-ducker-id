# Security Report — Admin Reset Password (+ force-change enforcement)

- **Feature**: `admin-reset-password` — `POST /admin/users/:id/reset-password` (BE) + force-change-password flow (FE)
- **Date**: 2026-07-24
- **Reviewer**: automated security review (equivalent to `/security-review`)
- **Scope**: current branch `feat/admin-reset-password` diff vs `origin/main`, both repos (`server/`, `client/`). Axes: AuthN, AuthZ, input validation, data exposure, session/credential lifecycle, injection/OWASP, rate-limiting.
- **Verdict**: ✅ **PASS** (0 Critical, 0 High). One Medium (rate-limiting) recommended as a non-blocking fast-follow; three Low informational/by-design items.

---

## Axis-by-axis summary

### 1. AuthN — PASS
- Reset endpoint is mounted under `adminUsers.use(authGuard, adminGuard)` (`user.routes.ts`). Token-less request → `authGuard` throws `401 AUTH_MISSING_TOKEN` (verified in `auth.guard.ts` + e2e `admin-authz.e2e.ts`).
- Force-change route lives under `app/[locale]/(private)/(force-password)/` → wrapped by `AuthGuardLayout`, so an unauthenticated visit redirects to `/login` (e2e-verified). The real credential gate is the BE `/auth/change-password` endpoint (behind `authGuard`); the FE gate is UX only.

### 2. AuthZ — PASS
- `adminGuard` requires `roles === ADMIN`, else `403 AUTH_ADMIN_ONLY`. It runs as router-level middleware **before** the route handler and therefore before the service's self-reset check, so a non-admin never reaches the self-guard (confirmed; matches the design's stated guard order).
- Self-reset blocked in `UserService.adminResetPassword`: `target.authId === RequestContext.requireAuthId()` → `ForbiddenError ADMIN_CANNOT_RESET_SELF` (403). Resetting another admin is intentionally allowed.
- Order in service: `validateObjectId` (400) → existence (404) → self-check (403), matching design precedence. Enumeration via 404-vs-200 is a non-issue on an admin-only endpoint (admins can already list all users/emails).

### 3. Input validation — PASS
- `:id` is double-validated: `paramsPipe(adminUserIdParamsSchema)` (Joi `^[a-fA-F0-9]{24}$`) at the route, then `validateObjectId` (`Types.ObjectId.isValid`) in the service.
- No NoSQL injection: `id` is a validated hex string; `UserModel.findById(id)` / `findByIdAndUpdate(authId, …)` receive scalar strings, not user-shaped objects. No `$where`/operator injection surface introduced.
- Force-change form uses the existing Zod `passwordSchema` client-side; BE `/auth/change-password` re-validates. E2E covers EP/BVA/DT classes (empty, no-upper, no-digit, no-special, min-1/min/max/max+1, mismatch).

### 4. Data exposure — PASS (includes verification of the already-fixed DLQ leak)
- HTTP response returns only `{ _id, email }` (`AdminResetPasswordResult`); the temp password and its hash are never in the response body (Swagger/Postman/e2e agree).
- Temp password plaintext flows only: `generateTempPassword()` → `hashValue()` (only the hash is persisted via `authService.adminResetPassword`) → `emailDispatcher.send(...data.tempPassword...)` (email channel). No `Logger` call receives `tempPassword`; service logs `{ userId, authId }` only.
- **Already-fixed DLQ leak — VERIFIED correct & complete.** The `fix(queue)` commit wraps the DLQ failure log with `redactSensitive(job.data)` (`queue.service.ts:112`). `redactSensitive` redacts any key whose lowercased name contains `password` (among others), recursively to depth 6 — so the email job's `data.tempPassword` is masked to `[REDACTED]`. I audited every other log sink in `queue.service.ts`: `completed` logs only `{queue, jobId}`; the transient-retry `failed` branch logs `{queue, jobId, attempt, error.message}` (no `job.data`); `worker error` logs only `error.message`. No other sink emits `job.data`, `tempPassword`, or the new-password value. No `.data` logging in the email service/dispatcher. Fix is complete.
- idToken `mustChangePassword` claim is a boolean — carries nothing sensitive.

### 5. Session / credential lifecycle — PASS
- `authentication.repository.adminResetPassword` performs `$inc: { tokenVersion: 1 }` + `mustChangePassword: true` + new `passwordChangedAt`. On refresh, `PasswordNotChangedGuard` rejects any refresh token whose `payload.tokenVersion < auth.tokenVersion` → prior refresh tokens are revoked. Verified end-to-end (repo bump ↔ guard comparison).
- Overwriting the real password with a random temp value + forcing a change is sound: login with the temp password works normally (no side-channel), and the forced change is enforced client-side.
- change-password clears the flag: `updatePassword` now sets `mustChangePassword: false` (and bumps `tokenVersion` again), and `/auth/change-password` returns fresh tokens with the flag false → user proceeds to HOME. Verified.

### 6. Injection / other OWASP — PASS
- Email template renders `tempPassword` via React Email (auto-escaped); temp-password charset is `[A-Za-z0-9!@#$%^&*]` with no HTML metacharacters → no HTML/email injection.
- No open redirect: `loginUrl` = `ENV.CLIENT_URL` (fixed) and the FE guards redirect to constant routes (`/change-password`, HOME) — never user-controlled.
- CSRF: reset is a POST authenticated by a `Bearer` access token in the `Authorization` header (in-memory, not an ambient cookie) → not CSRF-exploitable.
- Test-only `fakeJwt` (`alg:none`) in the FE e2e helper does not weaken production: `jwt-decode` client-side never verified signatures anyway; the BE always verifies the access token on every protected request.

### 7. Rate-limiting — see decision below.

---

## Findings

### Critical
None.

### High
None.

### Medium

**M1 — Reset endpoint (and lock/unlock) have no rate limiter — email-bombing / victim session-DoS by a malicious or compromised admin.** *(open)*
- **Axis**: rate-limiting / abuse.
- **Location**: `server/src/modules/user/user.routes.ts` — `createUserAdminRoutes(controller)` takes no `RateLimiterMiddleware`; `/:id/reset-password`, `/:id/lock`, `/:id/unlock` are all unthrottled. (Only the non-admin `PATCH /users/me` uses `rl.updateProfileByIp`.)
- **Exploit scenario**: an authenticated admin (insider, or an admin account whose access token was stolen) repeatedly POSTs reset for one victim id. Each call (a) enqueues another temp-password email → floods the victim's inbox and risks the SMTP sender being blacklisted, and (b) re-randomizes the victim's password + bumps `tokenVersion`, repeatedly locking the victim out even if they just changed it.
- **Recommendation**: attach a rate limiter to the admin-mutation routes (reuse `RateLimiterMiddleware`, e.g. a per-admin + per-target-id limiter such as a few resets per 15 min), and/or throttle `ADMIN_RESET_PASSWORD` emails at the dispatcher. Apply consistently to lock/unlock.
- **Status**: open. **Non-blocking** — see decision. Requires a privileged (admin) actor, matches the existing unthrottled lock/unlock convention, and the impact is bounded to email spam + session disruption of a single target (no data disclosure or auth bypass).

### Low

**L1 — Temporary password emailed in plaintext.** *(open, accepted)*
- **Axis**: data exposure / credential handling. **Location**: `user.service.ts` (`emailDispatcher.send(EmailType.ADMIN_RESET_PASSWORD, { data: { tempPassword } })`) + `templates/admin-reset-password.tsx`.
- The temp password equals the real password until changed; anyone able to read the victim's email (or an intercepted message) can log in. **Mitigated** by the forced change on next login and by `tokenVersion` revocation. This is an established project precedent (unlock-account emails a temp password identically). Accepted tradeoff; no action required.

**L2 — `mustChangePassword` is enforced client-side only; no BE gate.** *(open, by-design)*
- **Axis**: session lifecycle / authZ. **Location**: FE `MustChangePasswordGate` / `ForceChangeGuard`; BE has no middleware rejecting non-change-password requests when `mustChangePassword=true`.
- A client that ignores the redirect can use the app normally with the temp-password-derived session without changing the password. This is not privilege escalation — the session belongs to the legitimately authenticated user — so it is a UX/hygiene gate, not an authorization boundary. If a hard gate is ever required, enforce server-side. No action required now.

**L3 — Soft session model: the victim's current access token survives the reset until its TTL.** *(open, by-design)*
- **Axis**: session lifecycle. Reset revokes refresh tokens (via `tokenVersion`) but does not invalidate an already-issued short-lived access token (force-logout is explicitly out of scope per design §Non-goals). In a compromised-account scenario, an attacker's active access token keeps working until it expires. Documented tradeoff; consider a follow-up force-logout capability if the threat model demands immediate cutoff.

### Already-fixed (verified)

**F1 — Temp password leaked into the DLQ failure log.** *(fixed — verified correct & complete)*
- Fixed by `fix(queue): redact temp password / sensitive fields from DLQ failure log` using `redactSensitive(job.data)`. Verified the redactor masks `tempPassword` and that no other queue/email log sink emits `job.data` or the plaintext password (see Axis 4).

---

## Decision on rate-limiting

**Deferring is ACCEPTABLE — it does NOT rise to a CONDITIONAL or BLOCK item.** Rationale: the abuse requires an already-authenticated **admin** (a trusted, privileged actor), the impact is bounded to email spam and single-target session disruption (no data breach, no auth bypass, no unauthenticated exposure), and the endpoint is consistent with the pre-existing unthrottled lock/unlock admin routes. However, it is a **real abuse vector and a recommended fast-follow (Medium)**: add a per-admin/per-target rate limiter to the admin-mutation routes and/or throttle reset emails at the dispatcher. Track as a follow-up ticket; it need not block this PR.

---

## Final Verdict

✅ **PASS** — 0 Critical, 0 High. The auth/authZ/validation/data-exposure/session surfaces are sound and the previously-found DLQ temp-password leak is correctly and completely fixed. Merge is not blocked. Recommended (non-blocking) follow-up: add rate-limiting to admin user-mutation routes (M1).

**Findings by severity**: Critical 0 · High 0 · Medium 1 (M1, non-blocking) · Low 3 (L1–L3, accepted/by-design) · Already-fixed 1 (F1, verified).
