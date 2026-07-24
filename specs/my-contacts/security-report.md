# Security Review — MyContacts

- **Feature**: MyContacts (owner-scoped user contact list + read-only detail; `userId` owner field; `optionalAuthGuard` on submit).
- **Date**: 2026-07-24.
- **Scope**: `feat/my-contacts` diff vs `origin/main` (server + client). Axes: AuthN, AuthZ (owner-scope), input validation, data exposure, injection, credential/session.
- **Verdict**: ✅ **PASS** (0 Critical, 0 High, 0 Medium).

## Security assessment

- **AuthZ owner-scope cannot be bypassed.** Both read paths bind the caller identity *inside* the Mongo query (not post-fetch):
  - List: `findByUser` hard-sets `userId: new Types.ObjectId(requireUserId())`; `userId` originates only from the verified JWT `sub` via `RequestContext.requireUserId()`.
  - Detail: `findOne({ _id: id, userId })`.
  - No code path reads `userId` from query/body/param — `myContactsQuerySchema` has no `userId` field and the validation pipe runs `stripUnknown:true`, dropping any injected `?userId=` before `buildContactFilter`.
- **No existence oracle.** Wrong-owner and truly-absent detail both return identical `404 CONTACT_NOT_FOUND` (via `findByIdForUser → null → NotFoundError`).
- **optionalAuthGuard fails closed.** Header absent → anonymous submit (`userId=null`, public flow intact); header present → delegates to `authGuard` → `401` on any malformed/expired/forged token. A forged token cannot forge ownership (userId taken from verified `sub`, never body).
- **No NoSQL injection.** `:id` gated by ObjectId pattern; `status`/`sortBy`/`sortOrder` Joi enum; `page`/`limit` numeric-bounded (1..100); `search` `escapeRegex`-wrapped; all query objects `stripUnknown`.
- **No data leak.** List/detail DTOs never emit `userId`; submit response returns only `{ id }`.

## Findings (all Low / non-blocking)

- **L1** — Owner-scope invariant tested at service pass-through only; repo-level scoping covered by E2E + Postman (no fast unit test). Optional: add mongodb-memory-server integration test.
- **L2** — List `search` matches `subject` **and** `email` (reused admin `buildContactFilter`) vs design saying subject-only. Harmless (AND-ed with `userId`, regex-escaped) — doc/behavior drift only.
- **L3** — Seed data: owned contacts keep original guest emails (cosmetic; `email` is submitter field, orthogonal to owner).
- **L4** — *(Pre-existing, out of scope)* `submitContact` persists raw `subject`/`message`; sanitized values feed only length validation. Predates this diff (only `userId` added to the create call). Recommend a separate follow-up.
- **L5** — skip/limit pagination (consistent with existing admin list; indexed; small per-user datasets).

## Conclusion
✅ **PASS** — owner-scoping is correct and unbypassable; no auth/injection/exposure issues. Merge not blocked. L1–L3/L5 optional; L4 is a pre-existing sanitize-on-persist gap worth a separate ticket.
