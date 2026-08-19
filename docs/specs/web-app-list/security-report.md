# Security Report: web-app-list (BE read-only admin API)

**Feature**: Web App Registry - read-only admin listing
**Commit audited**: ae9ba44
**Side audited**: BE
**Date**: 2026-06-07

---

## Summary

**Verdict**: PASS - no Critical or High findings.

Overall risk: Low. Read-only admin API behind a two-layer guard. No Critical or High findings. Two Medium and one Low documented; all addressable after ship.

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 0     |
| Medium   | 2     |
| Low      | 1     |
| Info     | 1     |

---

## Vulnerabilities

### VULN-BE-1 - Medium - ReDoS via unbounded search parameter

**OWASP**: A03:2021 Injection (Regex Injection / ReDoS)
**Severity**: Medium
**Files**: `src/validators/schemas/web-app.ts` line 13; `src/modules/web-app/helpers/index.ts` lines 20-27

**Description**

The `search` parameter is accepted as `Joi.string().trim().optional()` with no maximum length. The raw, unescaped string is used directly as the `$regex` pattern in a MongoDB `$or` filter across `name`, `displayName`, and `description`.

An authenticated admin can submit a pathologically crafted regex. MongoDB evaluates it server-side. A pattern with nested quantifiers triggers catastrophic backtracking, spiking MongoDB CPU and blocking concurrent queries (DoS).

**Attack path**: Admin with valid JWT sends GET /api/v1/admin/apps?search=(a%2B)%2B%24 -> MongoDB evaluates unescaped regex across three fields -> CPU spike -> degraded service.

**Impact**: Requires a valid admin JWT. Availability impact: targeted MongoDB CPU exhaustion. Not exploitable by unauthenticated users.

**Note**: The existing `buildContactFilter` in contact-admin has the identical design, confirming a systemic pattern. Only web-app code is in scope.

**Recommended fix**:
1. Add `.max(200)` to `search` in `adminListAppsQuerySchema`. Extract `SEARCH_MAX_LENGTH = 200` to `src/validators/constants.ts`.
2. Escape regex metacharacters before using as `$regex` value. Extract a shared `escapeRegex` helper to `src/utils/string/escape-regex.ts`.

**Fix owner**: BE-dev
**Convention violated**: validators.md R4; OWASP A03:2021.

---

### VULN-BE-2 - Medium - redirectUris exposed in admin listing DTO

**OWASP**: A02:2021 Sensitive Data Exposure
**Severity**: Medium
**File**: `src/modules/web-app/dtos/admin-app.dto.ts` lines 17 and 33

**Description**

`AdminAppDto` includes `redirectUris: string[]` mapped directly from the document. `redirectUris` is the OAuth 2.0 allowlist used to validate redirect targets during the authorization code flow. Exposing it in a bulk listing response leaks the complete set of valid callback URLs for every registered client.

While not a credential leak, this is security-sensitive configuration. Any holder of a valid admin token receives a complete enumeration of all callback endpoints, reducing reconnaissance cost for phishing or redirect-bypass attacks against apps with lax redirect_uri validation. The listing use case (status/category management) does not require the OAuth callback whitelist.

**Attack path**: Attacker with compromised admin account calls GET /api/v1/admin/apps -> response includes all `redirectUris` for every client -> uses the list to craft phishing URLs or probe satellite apps for redirect mismatches.

**Impact**: Information disclosure to any valid admin token holder. Raises downstream risk for satellite OAuth clients.

**Recommended fix**: Remove `redirectUris` from `AdminAppDto` and `toAdminAppDto`. If a detail/edit view needs it, expose it from `GET /admin/apps/:id` only. Update `admin-app.dto.spec.ts` to assert `dto.redirectUris === undefined`.

**Fix owner**: BE-dev
**Convention reference**: Principle of least privilege - expose only what the listing UI requires.

---

### VULN-BE-3 - Low - OBJECTID_PATTERN regex duplicated instead of shared

**OWASP**: A05:2021 Security Misconfiguration (defence-in-depth / DRY)
**Severity**: Low
**File**: `src/validators/schemas/web-app.ts` line 9

**Description**

/^[a-fA-F0-9]{24}$/ is declared locally in `web-app.ts`. The identical literal also appears in `contact-admin.ts` line 18. Neither references a shared constant in `src/validators/constants.ts`. Drift risk: a future inconsistent update could leave a validation gap.

**Impact**: Theoretical. No current exploitability.

**Recommended fix**: Add `export const OBJECTID_PATTERN = /^[a-fA-F0-9]{24}$/;` to `src/validators/constants.ts` and import it in both files.

**Fix owner**: BE-dev
**Convention violated**: validators.md R4.

---

## Info

### INFO-1 - Plaintext dev client secrets in version-controlled seed file

**File**: `src/database/seeders/data/web-apps.ts` lines 26, 47, 119
**Severity**: Info (not a vulnerability for dev seeds; documented for awareness)

**Description**

Three entries (`blog-dev-secret-8f3a`, `analytics-dev-secret-2b7d`, `ops-dev-secret-5e21`) are stored as plaintext strings in a TypeScript file committed to git. The seeder calls `hashValue(app.clientSecret)` (bcrypt, 10 rounds) before `WebAppModel.create`, so the database never holds plaintext.

**Sub-point 1 - Plaintext in source control**: Labelled as dev secrets referencing `example.com` URLs. Acceptable for local dev provided they are never reused in staging or production. If CI/CD runs this seed against a shared environment, these values are permanently in commit history.

**Sub-point 2 - bcrypt for OAuth client secrets**: bcrypt is designed for low-entropy human passwords. Machine-generated OAuth client secrets are high-entropy random tokens typically compared via constant-time HMAC or SHA-256. Using bcrypt for token endpoint verification adds latency per request. Out of scope for the current seeder-only implementation; revisit when the token endpoint is built.

**Recommended action**:
- Add a comment block in `data/web-apps.ts` marking these as non-production secrets that must never be reused outside local dev.
- When implementing the token endpoint, assess whether `crypto.timingSafeEqual` against a SHA-256 digest is more appropriate than bcrypt.

**Fix owner**: BE-dev / architect (token endpoint design decision)

---

## Passed Checks

**AuthZ - both routes guarded**: `createAdminWebAppRoutes` applies `adminApps.use(authGuard, adminGuard)` as a sub-router call before any route registration. Both `GET /admin/apps` and `GET /admin/apps/categories` inherit this unconditionally. `adminGuard` re-verifies JWT via `authGuard` if `RequestContext` is empty, then asserts `AUTHENTICATION_ROLES.ADMIN`. No handler reachable without a valid admin token. `webAppAdminRouter` is mounted via `loadModules` with no bypass.

**Data exposure - clientSecretHash not leaked**: `toAdminAppDto` is an explicit allowlist mapper. `clientSecretHash`, `grantTypes`, `scopes`, `tokenEndpointAuthMethod`, `responseTypes`, `postLogoutRedirectUris`, `backchannelLogoutUri`, and `sortOrder` are absent from the DTO and mapper. The unit test `admin-app.dto.spec.ts` asserts all four sensitive fields are `undefined` on the output. Both repositories use `.lean()` - no Mongoose virtuals are hydrated (the `category` virtual requires `.populate()`, which is absent).

**Input validation - status and categoryId constrained**: `status` uses enum allowlist from `WEB_APP_STATUS_PUBLIC`. `categoryId` uses the 24-hex-char ObjectId pattern. `stripUnknown: true` removes all unrecognised query parameters. No unvalidated path from HTTP query to the Mongo filter builder.

**No MongoDB operator injection**: `$where`, raw query builders, and string interpolation into queries are absent. The filter is built from validated, typed fields only.

**Module wiring - no accidental public mount**: `createWebAppModule` is called once in `modules.loader.ts`. The router is mounted under `/api/v1` with no second registration point.

**Seeder - bcrypt hash applied**: `hashValue(app.clientSecret)` is called before `WebAppModel.create`, so `clientSecretHash` in MongoDB is always a bcrypt digest, never plaintext.

**No hardcoded env vars**: No `process.env` reads in any web-app module or seeder file.

---

## Recommendations

1. **Search length cap and regex escaping (supports VULN-BE-1)**: Apply uniformly across modules (web-app and contact-admin both affected). Extract `src/utils/string/escape-regex.ts` as a shared helper.

2. **Pagination for GET /admin/apps**: `findAll` returns all documents with no limit. Adding `page`/`limit` parameters (consistent with `adminListContactsQuerySchema`) is recommended before production scale.

3. **Text index for search performance**: `name`, `displayName`, and `description` are searched with `$regex` but have no text index, resulting in a full collection scan per request. A compound text index with `$text`/`$search` would improve performance and eliminate the ReDoS attack surface entirely.

4. **Dev seed secret reuse policy comment**: Add a comment block in `data/web-apps.ts` explicitly marking these values as non-production.

---

**VERDICT: PASS - 0 Critical, 0 High. Ship is unblocked. Address VULN-BE-1 (search ReDoS) and VULN-BE-2 (redirectUris exposure) in a follow-up before the registry is used beyond internal admin tooling.**
