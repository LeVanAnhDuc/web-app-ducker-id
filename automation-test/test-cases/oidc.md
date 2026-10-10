# OIDC — test cases

Single sign-on for satellite apps: discovery, `/oauth/authorize`, `/oauth/token`,
`/oauth/userinfo`, `/oauth/logout` (REQ-OIDC-01…09).

Source of truth: `server/src/modules/oauth/**`, `server/src/modules/session/**`,
`server/src/modules/web-app` (client registration), `client/next.config.ts`,
`client/src/middleware.ts`, `docs/specs/oidc-provider/design.md`.

**Test data.** Every spec registers its own OAuth clients as admin
(`helpers/oidc.ts → registerClient`, names `e2e-oidc-*`, display names
`E2E OIDC …`) in `beforeAll`, and deactivates then deletes them in `afterAll` —
there is no DELETE endpoint, and a left-over app would shift the category app
counts and admin list other modules assert on. Every authorize flow runs as a
throwaway account: an OAuth sign-in writes login history and a recent app for
the user, so the seeded accounts are never used. The redirect URIs
(`https://rp.e2e.example.com/…`) are never reached — API tests read the
`Location` header with `maxRedirects: 0`, browser tests intercept it with
`page.route`. Codes are expired by shortening their Redis key (`oauth-code:*`)
rather than waiting 60 s.

**Server facts the cases rely on.** Code TTL 60 s, read with `GETDEL` (single
use, consumed _before_ any other check). PKCE S256 is required for every
client; `plain` is refused. Errors raised before `client_id` and
`redirect_uri` are validated come back as JSON (`{ error, error_description }`)
and never redirect; after that they are a 302 to the registered URI with
`?error=…&state=…`. Registration supports `client_secret_basic` (default,
confidential) and `none` (public); at the token endpoint a confidential
client's secret is accepted from the Basic header or the form body
(`client_secret_post`, advertised in discovery). Access and ID tokens are
RS256, 15 minutes, `aud` = `client_id`. `code_verifier` length is **not**
checked by the server (see TC-OIDC-031).

### TC-OIDC-001 — Discovery document advertises the provider's endpoints and capabilities

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (one valid request), specification-based checklist
- **Preconditions:** none
- **Steps:**
  1. `GET /.well-known/openid-configuration` on the client origin.
- **Expected:** 200 JSON; `issuer` equals the origin the browser sees; the
  authorization, token, userinfo, end-session and JWKS endpoints all sit under
  the issuer; `response_types_supported = [code]`,
  `grant_types_supported = [authorization_code]`,
  `code_challenge_methods_supported = [S256]`,
  `id_token_signing_alg_values_supported = [RS256]`; scopes
  `openid profile email`; token auth methods `client_secret_basic`,
  `client_secret_post`, `none`.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-002 — JWKS publishes the RSA public signing key and nothing private

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Specification-based checklist, Error Guessing (private key leakage)
- **Preconditions:** none
- **Steps:**
  1. `GET /.well-known/jwks.json` (the `jwks_uri` from discovery).
- **Expected:** 200 JSON `{ keys: [...] }` with at least one key: `kty RSA`,
  `alg RS256`, `use sig`, a non-empty `kid`, `n`, `e`; no private members
  (`d`, `p`, `q`, `dp`, `dq`, `qi`); the key imports as a valid RSA public key.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-003 — Well-known and OAuth paths bypass locale routing

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (next-intl prefixing `/vi/` would break every registered URI)
- **Preconditions:** none
- **Steps:**
  1. Request discovery and `/oauth/authorize` with `Accept-Language: vi` and a
     `NEXT_LOCALE=vi` cookie, without following redirects.
- **Expected:** discovery answers 200 JSON at the root path (no redirect to
  `/vi/...`); `/oauth/authorize` is answered by the API (OAuth JSON error for
  the missing `client_id`), not by a locale redirect.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-004 — Signed-in user gets a code at the registered redirect URI

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** api · **Priority:** P1 · **Role:** guest (throwaway account with an IdP session)
- **Technique:** EP (valid class), State Transition (no code → code issued)
- **Preconditions:** confidential client; throwaway account signed in (`sid` cookie)
- **Steps:**
  1. `GET /oauth/authorize` with `response_type=code`, `scope=openid profile email`,
     `state`, `nonce`, an S256 `code_challenge`.
- **Expected:** 302 straight to the registered `redirect_uri` (same origin,
  path) carrying `code`, the same `state` and `iss` = issuer; no login screen in
  between; the code exists in Redis (`oauth-code:<code>`).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-005 — Authorize without a code_challenge is refused

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (invalid class: PKCE absent) — confidential and public client
- **Preconditions:** confidential and public client; IdP session
- **Steps:**
  1. Authorize with every valid parameter but no `code_challenge` — once per client type.
- **Expected:** 302 to the registered URI with `error=invalid_request`, the
  original `state`, and **no** `code` — PKCE is required for confidential clients too.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-006 — Only code_challenge_method=S256 is accepted

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** EP — `S256` (valid) / `plain` / absent / `s256` / `RS256` (invalid)
- **Preconditions:** confidential client; IdP session
- **Steps:**
  1. Authorize with each method value.
- **Expected:** only `S256` yields a code; every other value redirects with
  `error=invalid_request` and the description `code_challenge_method must be S256`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-007 — Missing or unknown client_id is rejected without a redirect

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP — absent / unknown / empty `client_id`
- **Preconditions:** none
- **Steps:**
  1. Authorize with `client_id` absent, `client_unknown`, and empty, with a
     redirect URI that would otherwise look valid.
- **Expected:** no `Location` header; absent/empty → 400
  `{ error: invalid_request }`; unknown → 401 `{ error: invalid_client }`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-008 — A deactivated client cannot start a sign-in

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway) + admin
- **Technique:** State Transition (active → inactive → active)
- **Preconditions:** dedicated confidential client; IdP session
- **Steps:**
  1. Authorize while active; deactivate the client; authorize again; reactivate; authorize.
- **Expected:** active → code; inactive → 401 JSON `invalid_client`, no
  redirect; reactivated → code again.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-009 — Unregistered redirect URIs are rejected as JSON, never redirected to

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** EP + Error Guessing — foreign host, trailing slash, extra path
  segment, query appended, upper-case scheme/host, http instead of https, missing
- **Preconditions:** confidential client registered with `https://rp.e2e.example.com/callback`
- **Steps:**
  1. Authorize with each variant as `redirect_uri`.
- **Expected:** every variant → 400 `{ error: invalid_request }` JSON with no
  `Location`; no code issued (exact string match only).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-010 — Any of several registered redirect URIs is honoured exactly

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (each valid member of the registered list)
- **Preconditions:** client registered with two redirect URIs
- **Steps:**
  1. Authorize with the second registered URI; redeem the code with that URI.
- **Expected:** the code is delivered to the second URI, and the token call
  succeeds when it names that same URI.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-011 — Only response_type=code is supported

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP — `token`, `id_token`, `code id_token`, absent
- **Preconditions:** confidential client; IdP session
- **Steps:**
  1. Authorize with each `response_type`.
- **Expected:** 302 to the registered URI with
  `error=unsupported_response_type` and the original `state`; no `code`, no token.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-012 — Scope must include openid and stay within the client's scopes

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP — `openid` (valid), `profile email` (no openid), empty,
  `openid admin` (unknown), `openid offline_access`
- **Preconditions:** confidential client (scopes openid profile email)
- **Steps:**
  1. Authorize with each scope value.
- **Expected:** `openid` alone → code; every invalid value → redirect with
  `error=invalid_scope` and `state`, no code.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-013 — state is echoed verbatim on success and on error, and omitted when not sent

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (present / absent), BVA (state with reserved characters `&=+/ ?#%`)
- **Preconditions:** confidential client; IdP session
- **Steps:**
  1. Authorize with a state containing reserved characters.
  2. Authorize with the same state and `response_type=token` (error path).
  3. Authorize without state.
- **Expected:** 1 and 2 carry the identical decoded state; 3 has no `state`
  parameter at all (never `state=undefined`).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-014 — A guest is sent to the login page with a stored authorize request

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (no session → pending request)
- **Preconditions:** confidential client
- **Steps:**
  1. Authorize from a context with no cookies.
- **Expected:** 302 to `<client origin>/login?auth_req=<id>&app=<display name>`;
  no `code` anywhere; `oauth-req:<id>` exists in Redis with a TTL ≤ 600 s.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-015 — The stored request resumes after login once, and only once

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** api · **Priority:** P2 · **Role:** guest → throwaway account
- **Technique:** State Transition (pending → resumed → consumed), Error Guessing (unknown id)
- **Preconditions:** confidential client; throwaway account
- **Steps:**
  1. As a guest, authorize and read `auth_req`.
  2. Sign in with a password in the same context.
  3. `GET /oauth/authorize?auth_req=<id>`; redeem the code with the original verifier.
  4. Resume the same `auth_req` again; resume a made-up id.
- **Expected:** 3 → 302 to the original redirect URI with the original state
  and a redeemable code; 4 → 400 JSON `invalid_request` with no redirect, both times.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-016 — prompt=none with a live session returns a code silently

- **Requirement:** REQ-OIDC-06, REQ-OIDC-05
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Decision Table (prompt=none × session present)
- **Preconditions:** confidential client; IdP session
- **Steps:**
  1. Authorize with `prompt=none`.
- **Expected:** 302 to the redirect URI with a `code` and the `state`; no hop
  through `/login`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-017 — prompt=none without a session returns login_required, never a login screen

- **Requirement:** REQ-OIDC-06
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Decision Table (prompt=none × no session / stale `sid` cookie)
- **Preconditions:** confidential client
- **Steps:**
  1. Authorize with `prompt=none` and no cookies.
  2. Repeat with a forged `sid` cookie that matches no session.
- **Expected:** both → 302 to the registered URI with `error=login_required`
  and the `state`; never a redirect to `/login`; no `oauth-req:*` stored for it.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-018 — A user without the app's required role is denied

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway, role `user`)
- **Technique:** Decision Table (requiredRoles × user role), Error Guessing
- **Preconditions:** client with `requiredRoles = [admin]`
- **Steps:**
  1. Authorize as a regular user.
- **Expected:** 302 to the registered URI with `error=access_denied` and the
  state; no code.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-019 — Confidential client redeems a code with client_secret_basic

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Decision Table — confidential × `client_secret_basic` × valid PKCE
- **Preconditions:** confidential client (secret returned once at creation)
- **Steps:**
  1. Obtain a code; `POST /oauth/token` (form-encoded) with
     `Authorization: Basic base64(client_id:secret)` and the verifier.
- **Expected:** 200 with `access_token`, `id_token`, `token_type Bearer`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-020 — Confidential client redeems a code with client_secret_post

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Decision Table — confidential × `client_secret_post` × valid PKCE
- **Preconditions:** confidential client
- **Steps:**
  1. Obtain a code; token request with `client_id` + `client_secret` in the body.
- **Expected:** 200 token set (the method discovery advertises is honoured).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-021 — Confidential client without a valid secret is refused

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Decision Table — confidential × {no secret, wrong secret via
  Basic, wrong secret via post, public client's empty secret}
- **Preconditions:** confidential client
- **Steps:**
  1. For each row, obtain a fresh code and redeem it.
- **Expected:** every row → 401 `{ error: invalid_client }`, no tokens.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-022 — Public client is registered without a secret and redeems with PKCE alone

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** admin + signed-in throwaway
- **Technique:** Decision Table — public (`none`) × no secret × valid PKCE
- **Preconditions:** admin session
- **Steps:**
  1. Register a client with `tokenEndpointAuthMethod=none`.
  2. Obtain a code; redeem it with `client_id` and the verifier only.
- **Expected:** creation returns `clientSecret: null`; redemption → 200 token set.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-023 — Token response is a flat, non-cacheable RFC 6749 body

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Specification-based checklist
- **Preconditions:** confidential client
- **Steps:**
  1. Redeem a code.
- **Expected:** body has `access_token`, `id_token`, `token_type: Bearer`,
  `expires_in: 900`, `scope` equal to the requested scopes, and no
  `data`/`timestamp` envelope; headers `Cache-Control: no-store` and `Pragma: no-cache`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-024 — A wrong code_verifier is rejected and burns the code

- **Requirement:** REQ-OIDC-08, REQ-OIDC-03
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** State Transition (issued → failed redemption → retry), EP (wrong verifier)
- **Preconditions:** public client (PKCE is the only proof)
- **Steps:**
  1. Redeem a code with a different, well-formed verifier.
  2. Redeem the same code with the right verifier.
- **Expected:** 1 → 400 `invalid_grant` (PKCE verification failed); 2 → 400
  `invalid_grant` — a failed attempt consumes the code, so it cannot be brute-forced.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-025 — Token request without code or code_verifier is invalid

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (missing required parameter)
- **Preconditions:** public client
- **Steps:**
  1. Token request without `code_verifier`; then the same code without `code`.
- **Expected:** both → 400 `invalid_request`; the code is still redeemable
  afterwards (validation happens before the code is consumed).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-026 — An authorization code is single-use

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** State Transition (issued → redeemed → reused)
- **Preconditions:** confidential client
- **Steps:**
  1. Redeem a code; redeem it again with identical parameters.
- **Expected:** first → 200; second → 400 `invalid_grant`; the Redis key is gone after the first.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-027 — A fresh code lives 60 seconds

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** BVA (TTL upper bound 60 s)
- **Preconditions:** confidential client
- **Steps:**
  1. Obtain a code and read the TTL of `oauth-code:<code>`.
- **Expected:** 55 < TTL ≤ 60.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-028 — A code is accepted just before expiry and refused just after

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** BVA around the 60 s lifetime (simulated by shortening the
  Redis TTL: ~2 s left vs. expired)
- **Preconditions:** confidential client
- **Steps:**
  1. Obtain code A, shorten its TTL to 2 s, redeem at once.
  2. Obtain code B, shorten its TTL to 1 ms, wait until the key is gone, redeem.
- **Expected:** A → 200; B → 400 `invalid_grant`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-029 — A code is bound to its client and redirect URI

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Error Guessing (code injection across clients), EP
- **Preconditions:** two clients
- **Steps:**
  1. Redeem client A's code naming client B's `client_id`.
  2. Redeem a fresh code with the other registered `redirect_uri`.
- **Expected:** both → 400 `invalid_grant`, no tokens.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-030 — Only the authorization_code grant is supported

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** EP — `refresh_token`, `client_credentials`, `password`, absent
- **Preconditions:** confidential client
- **Steps:**
  1. `POST /oauth/token` with each grant type and valid client credentials.
- **Expected:** 400 `{ error: unsupported_grant_type }` for each.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-031 — code_verifier length follows RFC 7636 (43…128)

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P3 · **Role:** guest (signed-in throwaway)
- **Technique:** BVA — 42 / 43 / 128 / 129 characters
- **Preconditions:** public client
- **Steps:**
  1. For each length, authorize with the matching S256 challenge and redeem.
- **Expected:** 43 and 128 → 200; 42 and 129 → 400 `invalid_request`
  (RFC 7636 §4.1). **Currently fails:** the server accepts any length — the
  43/128 bounds are checked as a passing test, the out-of-range ones are
  marked `test.fail` (BUG).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-032 — The ID token is RS256-signed by a key in the JWKS

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Specification-based, Error Guessing (tampered signature, `alg`)
- **Preconditions:** confidential client
- **Steps:**
  1. Redeem a code; verify `id_token` and `access_token` with the JWKS key
     whose `kid` matches the header (node `crypto`).
  2. Flip one signature character and verify again.
- **Expected:** header `alg RS256` with a `kid` present in the JWKS; both
  tokens verify; the tampered one does not.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-033 — ID token claims identify issuer, audience, user and request

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** Specification-based checklist (OIDC Core §2, §3.1.3.7)
- **Preconditions:** confidential client
- **Steps:**
  1. Authorize with a nonce; redeem; decode the ID token.
- **Expected:** `iss` = issuer, `aud` = client_id, `sub` = the account's user
  id, `nonce` = the sent nonce, `exp − iat = 900`, `auth_time ≤ iat`, `sid`
  present, `exp` in the future; `email`/`name` match the account.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-034 — Claims are filtered by the granted scopes

- **Requirement:** REQ-OIDC-04, REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP — `openid` / `openid email` / `openid profile`; no nonce sent
- **Preconditions:** confidential client
- **Steps:**
  1. For each scope set, redeem a code (no nonce) and call userinfo.
- **Expected:** `openid` → only `sub` (+ protocol claims); `openid email` →
  `email`, `email_verified`, no `name`; `openid profile` → `name`, `picture`, no
  `email`; the ID token has no `nonce` when none was sent; the token response
  `scope` echoes the set.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-035 — A satellite access token cannot call Ducker ID's own API

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Error Guessing (audience confusion)
- **Preconditions:** confidential client
- **Steps:**
  1. Send the OAuth `access_token` as Bearer to `GET /api/v1/users/me`.
- **Expected:** refused (4xx, error envelope) — its `aud` is the client_id, not the issuer.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-036 — userinfo returns the user's claims for a valid access token

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (valid token)
- **Preconditions:** confidential client; token set with `openid profile email`
- **Steps:**
  1. `GET /oauth/userinfo` with `Authorization: Bearer <access_token>`.
- **Expected:** 200 flat JSON: `sub` = ID token `sub`, `email` = account email,
  `name` = account name, `email_verified: true`; `Cache-Control: no-store`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-037 — userinfo without a Bearer token is refused

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP — header absent / `Basic …` / `Bearer` with no token / lowercase `bearer`
- **Preconditions:** none
- **Steps:**
  1. Call userinfo with each header variant.
- **Expected:** 4xx `{ error }` with no `sub` or other claims.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-038 — userinfo with a malformed or tampered token is refused

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP — random string / tampered signature / `alg: none` token
- **Preconditions:** a valid access token to tamper with
- **Steps:**
  1. Call userinfo with each bad token.
- **Expected:** 4xx `{ error }` with no claims.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-039 — userinfo errors follow RFC 6750 (401 invalid_token)

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** Specification-based (OIDC Core §5.3.3 → RFC 6750 §3.1)
- **Preconditions:** none
- **Steps:**
  1. Call userinfo with no token and with an invalid token.
- **Expected:** 401 with a `WWW-Authenticate: Bearer` header; invalid token →
  `error=invalid_token`. **Currently fails** (BUG): 400 `invalid_request` /
  400 `invalid_grant`, no `WWW-Authenticate`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-040 — An ID token presented to userinfo is refused cleanly

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Error Guessing (token type confusion)
- **Preconditions:** a token set
- **Steps:**
  1. Call userinfo with the `id_token` as the Bearer token.
- **Expected:** 401 `invalid_token`, no claims. **Currently fails** (BUG): the
  ID token passes signature/issuer verification, has no `authId`, and the
  server answers 500 `server_error`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-041 — A first-party Ducker ID access token is not accepted by userinfo

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Error Guessing (audience confusion — the reverse of TC-OIDC-035)
- **Preconditions:** a first-party access token from `/api/v1/auth/login`
- **Steps:**
  1. Call userinfo with the first-party access token.
- **Expected:** 401, no claims — its `aud` is the issuer, not a client.
  **Currently fails** (BUG): 200 `{ sub }` — `verifyOAuthAccessToken` checks
  issuer only, never audience.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-042 — /oauth/logout ends the identity-provider session

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P1 · **Role:** guest (signed-in throwaway)
- **Technique:** State Transition (session → logged out → prompt=none)
- **Preconditions:** confidential client; IdP session (`idp-session:<sid>` in Redis)
- **Steps:**
  1. `GET /oauth/logout` without redirect following.
  2. Authorize with `prompt=none` in the same context.
- **Expected:** 1 → 302 and a `Set-Cookie` that empties `sid`; the Redis
  session key is gone. 2 → `error=login_required`. A code issued before logout
  is still redeemable only until its own TTL (no revocation — documented).
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-043 — Logout redirects only to a registered post-logout URI

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** Decision Table (client_id given × URI registered), Error Guessing (open redirect)
- **Preconditions:** client with `postLogoutRedirectUris = [https://rp.e2e.example.com/signed-out]`
- **Steps:**
  1. Logout with the registered URI, `client_id` and a state.
  2. Logout with an unregistered URI.
  3. Logout with the registered URI but no `client_id`.
- **Expected:** 1 → 302 to the URI with the same `state`; 2 and 3 → 302 to the
  Ducker ID home (client origin), never to the supplied URI.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-044 — Logout expires the sid cookie

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P3 · **Role:** guest (signed-in throwaway)
- **Technique:** Error Guessing (cookie cleared but not expired)
- **Preconditions:** IdP session
- **Steps:**
  1. Read the `Set-Cookie: sid=…` header of `/oauth/logout`.
- **Expected:** an `Expires` in the past (or `Max-Age=0`). **Currently fails**
  (BUG): `res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS)` passes
  `maxAge`, so Express 4 writes `sid=; Max-Age=604800` — an empty cookie that
  lives 7 more days. Harmless today (empty sid = no session) but not a deletion.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-045 — Signing out of Ducker ID also ends the SSO session

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** State Transition (first-party logout → prompt=none)
- **Preconditions:** confidential client; IdP session + first-party access token
- **Steps:**
  1. `POST /api/v1/auth/logout` with the first-party token and cookies.
  2. Authorize with `prompt=none`.
- **Expected:** the Redis session is gone and 2 → `error=login_required`.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-046 — A satellite sign-in is recorded in login history with its app

- **Requirement:** REQ-OIDC-05
- **Layer:** api · **Priority:** P2 · **Role:** guest (signed-in throwaway)
- **Technique:** EP (silent SSO vs. interactive resume)
- **Preconditions:** confidential client; throwaway account
- **Steps:**
  1. With an existing session, authorize (silent).
  2. As a guest, authorize, sign in, resume `auth_req` (interactive).
  3. `GET /api/v1/login-history` with the account's token.
- **Expected:** rows with `method: sso`, `status: success`, `source: oauth`,
  `app.id` = the client's app id, `app.name` = its display name; the silent one
  `interactive: false`, the resumed one `interactive: true`.
- **Automated:** `tests/api/oidc/login-history.api.ts`

### TC-OIDC-047 — A guest signs in at Ducker ID and lands back in the app with a code

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** e2e · **Priority:** P1 · **Role:** guest (throwaway account)
- **Technique:** State Transition (guest → login → back to the app), Use Case
- **Preconditions:** confidential client; throwaway account
- **Steps:**
  1. Open the authorize URL in the browser.
  2. On the login screen enter the email, continue, enter the password, sign in.
- **Expected:** the login screen is shown; after signing in the browser
  arrives at the registered redirect URI with a `code` and the original
  `state`; that code redeems for tokens whose `email` is the account's.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`

### TC-OIDC-048 — An existing Ducker ID session goes straight back to the app

- **Requirement:** REQ-OIDC-05
- **Layer:** e2e · **Priority:** P1 · **Role:** guest (throwaway account signed in)
- **Technique:** Use Case (single sign-on), State Transition
- **Preconditions:** confidential client; the browser holds an IdP session
- **Steps:**
  1. Open the authorize URL.
- **Expected:** the browser lands on the redirect URI with a code; no Ducker ID
  page (no `/login`, no screen) is navigated to in between.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`

### TC-OIDC-049 — prompt=none in a browser with no session never shows a login screen

- **Requirement:** REQ-OIDC-06
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Decision Table (prompt=none × no session)
- **Preconditions:** confidential client
- **Steps:**
  1. Open the authorize URL with `prompt=none` in a cookie-less browser.
- **Expected:** the browser lands on the redirect URI with
  `error=login_required` and the state; `/login` is never navigated to.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`
