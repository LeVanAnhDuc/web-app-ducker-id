# Security Report — admin-lock-unlock-user

Date: 2026-07-09 · Reviewer: security-audit subagent (equivalent of `/security-review`) · Branch: `feat/admin-lock-unlock-user`

## Scope

Admin-only endpoints toggling `auth.isActive` (lock/unlock). Attack surface: auth / authz / input validation / data exposure / business-logic abuse. BE (server) + FE wiring (client).

## Axes — result

| Axis | Result |
|------|--------|
| AuthN | ✅ Clean — both routes behind router-level `authGuard` (no unauth path) |
| AuthZ | ✅ Clean — `adminGuard` before validation/self-check; guard order authGuard→adminGuard→validation→self-check confirmed; self-lock actor id from verified JWT via `RequestContext` (not spoofable via body/params) |
| Input validation | ✅ Clean — `:id` validated by Joi 24-hex regex + `validateObjectId`; no NoSQL operator injection (param is always a string, rejected if not ObjectId); no mass-assignment (`$set:{isActive}` literal, no body) |
| Data exposure | ✅ Clean — response is only `{ _id, isActive }`; logs only `authId` + boolean (no PII/secrets) |
| FE | ✅ Clean — hooks only swapped mock→request; no client-side trust; BE enforces authz; no token-handling change |

## Findings

| # | Title | Severity | Decision |
|---|-------|----------|----------|
| 1 | Locking every other admin → total administrative lockout (no in-app recovery) | **Medium** | **REMEDIATED** — added `ADMIN_CANNOT_LOCK_LAST_ADMIN` guard (owner decision) |
| 2 | No rate-limit on `/lock` `/unlock` | Low | **ACCEPTED** — routes are `adminGuard`-gated (trusted admin only); internal IdP; noisy-neighbor risk only. Owner accepted; may add later consistent with other admin mutations. |
| 3 | Soft-lock residual: locked user's existing access token valid until TTL | Info | **ACCEPTED (by design)** — documented in design §1; immediate kill = force-logout backlog item, out of scope. Bounded by short access-token TTL. |

### Finding 1 — remediation (owner-approved)

Owner chose to add a guard rather than accept the risk. Implemented: on the lock path, if the target is an **active admin** and `countActiveAdmins() <= 1`, reject with `403 ADMIN_CANNOT_LOCK_LAST_ADMIN`. Still allows locking other (non-last) admins per the approved design; only blocks emptying the admin set. Guard order on lock: validate → 404 → self-lock → **last-admin** → setActive. Covered by BE service unit tests (last active admin blocked; >1 admin allowed; non-admin unaffected; unlock never blocked).

## VERDICT

- Initial: **CONDITIONAL** (no Critical/High).
- After remediation of finding 1 + explicit acceptance of findings 2 & 3: **✅ PASS**.

No Critical → not a BLOCK; cleared to proceed to PR/merge once green-checks pass.

## Post-remediation review (last-admin guard) — Minor findings (accepted)

- **TOCTOU** between `countActiveAdmins()` and `setActive()`: two concurrent lock requests on the last two active admins could both pass. **Accepted** — admin-only, low-frequency, human-driven; codebase has no transaction precedent for single-doc guards; atomic fix out of remediation scope. Recovery = ops/DB.
- Test asserts `ForbiddenError` class but not `error.code` (would tighten; non-blocking).
- Lock-admin path does 3 sequential DB round-trips (acceptable for low-QPS admin action).
