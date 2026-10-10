# OPS — test cases

Operator tooling: health checks, the OpenAPI document and its Swagger UI, and
the error envelope with per-request translation (REQ-OPS-01…03).

Source of truth: `server/src/loaders/health.loader.ts`,
`server/src/libs/swagger/{swagger.setup,openapi}.ts`,
`server/src/middlewares/filters/error.filter.ts`, `server/src/i18n/`
(`middleware.ts`, `locales.config.ts`, `locales/{en,vi}/*.json`),
`server/src/loaders/queue.loader.ts`.

**Where these live.** `/health/*`, `/api-docs*` and `/admin/queues` are
mounted on the API only; the Next client proxies `/api/v1/*`, `/oauth/*` and
`/.well-known/*`, nothing else. Those specs therefore talk to the API origin
(`helpers/ops.ts → API_ORIGIN`, `E2E_API_URL`, default `http://localhost:5000`).
The health check has **no bare `/health` route** — the probes are
`/health/all`, `/health/mongodb` and `/health/redis`. Error-envelope cases go
through the client origin, the way the app calls the API.

**Locale.** The server reads `Accept-Language` only (q-weights honoured,
region subtags dropped). Supported `vi`, `en`; the **default is `vi`** — a
missing or unsupported header answers in Vietnamese. Asserted copy comes from
`server/src/i18n/locales/{en,vi}/` (server-side messages, not the client
catalogues).

### TC-OPS-001 — The aggregate health check reports MongoDB and Redis up

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (healthy class)
- **Preconditions:** API, MongoDB and Redis running
- **Steps:**
  1. `GET /health/all` on the API origin.
- **Expected:** 200 success envelope, message `All services are healthy`,
  `data.mongodb.status = up`, `data.redis.status = up`,
  `data.redis.latency_ms` a non-negative number or null.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-002 — Each datastore has its own health probe

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (one probe per datastore)
- **Preconditions:** API, MongoDB and Redis running
- **Steps:**
  1. `GET /health/mongodb`; `GET /health/redis`.
- **Expected:** both 200; `MongoDB is healthy` with `data.mongodb.status = up`;
  `Redis is healthy` with `data.redis.status = up` and a latency field. Each
  reports only its own store.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-003 — /health itself is not a probe

- **Requirement:** REQ-OPS-01
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (operators and load balancers commonly probe `/health`)
- **Preconditions:** none
- **Steps:**
  1. `GET /health` and `GET /health/unknown` on the API origin.
- **Expected:** 404 in the standard error envelope (`code: NOT_FOUND`) — the
  real probe paths are the three in TC-OPS-001/002. Documents the path a
  monitor must be pointed at.
- **Automated:** `tests/api/ops/health.api.ts`

### TC-OPS-004 — Swagger UI is served at /api-docs

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP
- **Preconditions:** none
- **Steps:**
  1. `GET /api-docs` (following the redirect to `/api-docs/`).
- **Expected:** 200 `text/html` page that boots Swagger UI (references
  `swagger-ui` assets) and the init script it loads is served.
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-005 — /api-docs.json is a valid OpenAPI 3 document

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** Specification-based checklist (OpenAPI 3.0 structure, `$ref` resolution)
- **Preconditions:** none
- **Steps:**
  1. `GET /api-docs.json`; walk every path, operation and `$ref`.
- **Expected:** 200 JSON; `openapi` is `3.x.y`; `info.title` and
  `info.version` strings; a `servers` entry; non-empty `paths`; every operation
  has a `responses` object; every local `$ref` resolves inside the document.
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-006 — The OpenAPI document covers every mounted API module

- **Requirement:** REQ-OPS-02
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (module wired in `modules.loader.ts` but not in `openapi.ts`)
- **Preconditions:** none
- **Steps:**
  1. Check `paths` for one route of each mounted module (auth, users, admin
     apps, categories, recent apps, login history, notifications, favorites).
- **Expected:** every module has at least one documented path. **Currently
  fails** (BUG, known debt in `CLAUDE.md`): `/login-history`,
  `/notifications` and `/users/me/favorites`-style routes are absent.
- **Automated:** `tests/api/ops/api-docs.api.ts`

### TC-OPS-007 — An unknown route answers 404 in the error envelope, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (locale en / vi)
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/does-not-exist?x=1` with `Accept-Language: en`, then `vi`.
- **Expected:** 404 `{ code: NOT_FOUND, message, timestamp, path }` with
  `path = /api/v1/does-not-exist?x=1`, `timestamp` an ISO instant within a few
  seconds of now; message `Not Found` (en) / `Không tìm thấy` (vi); no `data`.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-008 — A validation failure answers 400 with field errors, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (invalid email + missing password), locale en / vi
- **Preconditions:** none
- **Steps:**
  1. `POST /api/v1/auth/login` with `{ email: "not-an-email" }` in en, then vi.
- **Expected:** 400 `code: VALIDATION_ERROR`; message `Validation failed` /
  `Dữ liệu không hợp lệ`; `errors[]` has `email` (`string.email`) and
  `password` (`any.required`) with their translated messages.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-009 — A protected endpoint without a token answers 401, translated

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (locale en / vi)
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/users/me` with no token in en, then vi.
- **Expected:** 401 `code: AUTH_MISSING_TOKEN`; message `Unauthorized access` /
  `Không có quyền truy cập`; envelope fields present.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-010 — Accept-Language negotiation picks the best supported locale

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** EP + Decision Table over the header — `vi-VN,vi;q=0.9`,
  `en-US`, `en;q=0.5, vi;q=0.9`, `fr-FR, en;q=0.8`, `fr`, absent
- **Preconditions:** none
- **Steps:**
  1. Request the 404 route with each header.
- **Expected:** `vi-VN…` → vi; `en-US` → en; q-weights → vi; `fr-FR, en;q=0.8`
  → en (first supported); `fr` and absent → vi (server default).
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-011 — OAuth endpoints are the documented exception to the envelope

- **Requirement:** REQ-OPS-03
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** Specification-based (RFC 6749 §5.2 body shape, design §4)
- **Preconditions:** none
- **Steps:**
  1. `POST /oauth/token` with an unsupported grant type.
  2. `GET /oauth/authorize` with no `client_id`.
- **Expected:** flat `{ error, error_description }` bodies with no `code`,
  `timestamp`, `path` — an OIDC client library must be able to parse them.
- **Automated:** `tests/api/ops/error-envelope.api.ts`

### TC-OPS-012 — The Bull Board queue dashboard requires an admin

- **Requirement:** REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (operator UI mounted without a guard)
- **Preconditions:** API running with Redis (queue enabled)
- **Steps:**
  1. `GET /admin/queues` and `GET /admin/queues/api/queues` on the API origin
     with no credentials.
- **Expected:** 401/403 (or not mounted at all). **Currently fails** (BUG,
  severity S1): both answer 200 to anyone, and the JSON API returns email job
  payloads — sign-up, login and password-reset **OTP codes in plaintext** —
  for every recent job. `queue.loader.ts` mounts the router with no guard and
  no environment check.
- **Automated:** `tests/api/ops/queues.api.ts`
