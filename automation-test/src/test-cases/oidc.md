# OIDC — test case

Đăng nhập một lần (SSO) cho các app vệ tinh: discovery, `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`, `/oauth/logout`,
quyền vào app khi SSO và rate limit (REQ-OIDC-01…11).
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/oidc.md

### TC-OIDC-001 — Discovery document advertises the provider's endpoints and capabilities

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP, một request hợp lệ), checklist theo đặc tả
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /.well-known/openid-configuration` trên origin của client.
- **Mong đợi:** 200 JSON; `issuer` bằng origin trình duyệt thấy; các endpoint
  authorization, token, userinfo, end-session và JWKS đều nằm dưới issuer;
  `response_types_supported = [code]`,
  `grant_types_supported = [authorization_code]`,
  `code_challenge_methods_supported = [S256]`,
  `id_token_signing_alg_values_supported = [RS256]`; scope
  `openid profile email`; phương thức xác thực token `client_secret_basic`,
  `client_secret_post`, `none`.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-002 — JWKS publishes the RSA public signing key and nothing private

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** checklist theo đặc tả, đoán lỗi (lộ private key)
- **Tiền điều kiện:** không có
- **Bước:**
  1. `GET /.well-known/jwks.json` (`jwks_uri` lấy từ discovery).
- **Mong đợi:** 200 JSON `{ keys: [...] }` có ít nhất một key: `kty RSA`,
  `alg RS256`, `use sig`, `kid` không rỗng, `n`, `e`; không có thành phần private
  (`d`, `p`, `q`, `dp`, `dq`, `qi`); key import được thành RSA public key hợp lệ.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-003 — Well-known and OAuth paths bypass locale routing

- **Requirement:** REQ-OIDC-01
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (next-intl gắn tiền tố `/vi/` sẽ làm hỏng mọi URI đã đăng ký)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi discovery và `/oauth/authorize` với `Accept-Language: vi` và cookie
     `NEXT_LOCALE=vi`, không theo redirect.
- **Mong đợi:** discovery trả 200 JSON tại đường dẫn gốc (không redirect sang
  `/vi/...`); `/oauth/authorize` do API trả lời (lỗi OAuth JSON vì thiếu
  `client_id`), không phải một redirect theo locale.
- **Automated:** `tests/api/oidc/discovery.api.ts`

### TC-OIDC-004 — Signed-in user gets a code at the registered redirect URI

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm có session IdP)
- **Kỹ thuật:** phân vùng tương đương (EP, lớp hợp lệ), chuyển trạng thái (chưa có code → cấp code)
- **Tiền điều kiện:** client confidential; tài khoản tạm đã đăng nhập (cookie `sid`)
- **Bước:**
  1. `GET /oauth/authorize` với `response_type=code`, `scope=openid profile email`,
     `state`, `nonce`, một `code_challenge` S256.
- **Mong đợi:** 302 thẳng tới `redirect_uri` đã đăng ký (cùng origin, path)
  mang `code`, đúng `state` và `iss` = issuer; không có màn hình đăng nhập ở
  giữa; code tồn tại trong Redis (`oauth-code:<code>`).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-005 — Authorize without a code_challenge is refused

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, lớp không hợp lệ: thiếu PKCE) — client confidential và public
- **Tiền điều kiện:** client confidential và public; session IdP
- **Bước:**
  1. Authorize với mọi tham số hợp lệ nhưng không có `code_challenge` — mỗi loại client một lần.
- **Mong đợi:** 302 tới URI đã đăng ký với `error=invalid_request`, `state`
  ban đầu, và **không** có `code` — PKCE bắt buộc cả với client confidential.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-006 — Only code_challenge_method=S256 is accepted

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) — `S256` (hợp lệ) / `plain` / không có / `s256` / `RS256` (không hợp lệ)
- **Tiền điều kiện:** client confidential; session IdP
- **Bước:**
  1. Authorize với từng giá trị method.
- **Mong đợi:** chỉ `S256` nhận được code; mọi giá trị khác redirect với
  `error=invalid_request` và mô tả `code_challenge_method must be S256`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-007 — Missing or unknown client_id is rejected without a redirect

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) — `client_id` không có / không tồn tại / rỗng
- **Tiền điều kiện:** không có
- **Bước:**
  1. Authorize với `client_id` không có, `client_unknown`, và rỗng, kèm một
     redirect URI mà nếu không thì trông hợp lệ.
- **Mong đợi:** không có header `Location`; không có/rỗng → 400
  `{ error: invalid_request }`; không tồn tại → 401 `{ error: invalid_client }`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-008 — A deactivated client cannot start a sign-in

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập) + admin
- **Kỹ thuật:** chuyển trạng thái (active → inactive → active)
- **Tiền điều kiện:** client confidential riêng; session IdP
- **Bước:**
  1. Authorize khi đang active; vô hiệu hoá client; authorize lại; kích hoạt lại; authorize.
- **Mong đợi:** active → code; inactive → 401 JSON `invalid_client`, không
  redirect; kích hoạt lại → lại có code.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-009 — Unregistered redirect URIs are rejected as JSON, never redirected to

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) + đoán lỗi — host lạ, dấu `/` cuối, thêm
  segment path, nối thêm query, scheme/host viết hoa, http thay vì https, không có
- **Tiền điều kiện:** client confidential đăng ký với `https://rp.e2e.example.com/callback`
- **Bước:**
  1. Authorize với từng biến thể làm `redirect_uri`.
- **Mong đợi:** mọi biến thể → 400 JSON `{ error: invalid_request }` không có
  `Location`; không cấp code (chỉ so khớp chuỗi chính xác).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-010 — Any of several registered redirect URIs is honoured exactly

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, từng phần tử hợp lệ trong danh sách đã đăng ký)
- **Tiền điều kiện:** client đăng ký hai redirect URI
- **Bước:**
  1. Authorize với URI đã đăng ký thứ hai; đổi code với chính URI đó.
- **Mong đợi:** code được giao tới URI thứ hai, và lệnh gọi token thành công
  khi ghi đúng URI đó.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-011 — Only response_type=code is supported

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) — `token`, `id_token`, `code id_token`, không có
- **Tiền điều kiện:** client confidential; session IdP
- **Bước:**
  1. Authorize với từng `response_type`.
- **Mong đợi:** 302 tới URI đã đăng ký với
  `error=unsupported_response_type` và `state` ban đầu; không có `code`, không có token.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-012 — Scope must include openid and stay within the client's scopes

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) — `openid` (hợp lệ), `profile email` (thiếu openid), rỗng,
  `openid admin` (không tồn tại), `openid offline_access`
- **Tiền điều kiện:** client confidential (scope openid profile email)
- **Bước:**
  1. Authorize với từng giá trị scope.
- **Mong đợi:** chỉ `openid` → code; mọi giá trị không hợp lệ → redirect với
  `error=invalid_scope` và `state`, không có code.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-013 — state is echoed verbatim on success and on error, and omitted when not sent

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, có / không có), giá trị biên (BVA, state chứa ký tự đặc biệt `&=+/ ?#%`)
- **Tiền điều kiện:** client confidential; session IdP
- **Bước:**
  1. Authorize với state chứa ký tự đặc biệt.
  2. Authorize với cùng state và `response_type=token` (nhánh lỗi).
  3. Authorize không có state.
- **Mong đợi:** 1 và 2 mang state đã decode giống hệt; 3 hoàn toàn không có
  tham số `state` (không bao giờ là `state=undefined`).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-014 — A guest is sent to the login page with a stored authorize request

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không có session → request chờ)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Authorize từ một context không có cookie.
- **Mong đợi:** 302 tới `<client origin>/login?auth_req=<id>&app=<display name>`;
  không có `code` ở đâu cả; `oauth-req:<id>` tồn tại trong Redis với TTL ≤ 600 s.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-015 — The stored request resumes after login once, and only once

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest → tài khoản tạm
- **Kỹ thuật:** chuyển trạng thái (chờ → tiếp tục → đã dùng), đoán lỗi (id không tồn tại)
- **Tiền điều kiện:** client confidential; tài khoản tạm
- **Bước:**
  1. Với vai trò guest, authorize và đọc `auth_req`.
  2. Đăng nhập bằng mật khẩu trong cùng context.
  3. `GET /oauth/authorize?auth_req=<id>`; đổi code với verifier ban đầu.
  4. Tiếp tục lại đúng `auth_req` đó; tiếp tục một id bịa ra.
- **Mong đợi:** 3 → 302 tới redirect URI ban đầu với state ban đầu và một code
  đổi được; 4 → 400 JSON `invalid_request` không redirect, cả hai lần.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-016 — prompt=none with a live session returns a code silently

- **Requirement:** REQ-OIDC-06, REQ-OIDC-05
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** bảng quyết định (prompt=none × có session)
- **Tiền điều kiện:** client confidential; session IdP
- **Bước:**
  1. Authorize với `prompt=none`.
- **Mong đợi:** 302 tới redirect URI với `code` và `state`; không đi qua
  `/login`.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-017 — prompt=none without a session returns login_required, never a login screen

- **Requirement:** REQ-OIDC-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (prompt=none × không có session / cookie `sid` cũ)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Authorize với `prompt=none` và không có cookie.
  2. Lặp lại với một cookie `sid` giả không khớp session nào.
- **Mong đợi:** cả hai → 302 tới URI đã đăng ký với `error=login_required`
  và `state`; không bao giờ redirect tới `/login`; không lưu `oauth-req:*` nào cho nó.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-018 — A user without the app's required role is denied

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập, role `user`)
- **Kỹ thuật:** bảng quyết định (requiredRoles × role của user), đoán lỗi
- **Tiền điều kiện:** client có `requiredRoles = [admin]`
- **Bước:**
  1. Authorize với tư cách user thường.
- **Mong đợi:** 302 tới URI đã đăng ký với `error=access_denied` và state;
  không có code.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-019 — Confidential client redeems a code with client_secret_basic

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** bảng quyết định — confidential × `client_secret_basic` × PKCE hợp lệ
- **Tiền điều kiện:** client confidential (secret chỉ trả về một lần khi tạo)
- **Bước:**
  1. Lấy code; `POST /oauth/token` (form-encoded) với
     `Authorization: Basic base64(client_id:secret)` và verifier.
- **Mong đợi:** 200 với `access_token`, `id_token`, `token_type Bearer`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-020 — Confidential client redeems a code with client_secret_post

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** bảng quyết định — confidential × `client_secret_post` × PKCE hợp lệ
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Lấy code; request token với `client_id` + `client_secret` trong body.
- **Mong đợi:** 200 bộ token (phương thức mà discovery quảng bá được tôn trọng).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-021 — Confidential client without a valid secret is refused

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** bảng quyết định — confidential × {không có secret, secret sai qua
  Basic, secret sai qua post, secret rỗng của client public}
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Với mỗi dòng, lấy code mới và đổi nó.
- **Mong đợi:** mọi dòng → 401 `{ error: invalid_client }`, không có token.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-022 — Public client is registered without a secret and redeems with PKCE alone

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** admin + tài khoản tạm đã đăng nhập
- **Kỹ thuật:** bảng quyết định — public (`none`) × không có secret × PKCE hợp lệ
- **Tiền điều kiện:** session admin
- **Bước:**
  1. Đăng ký client với `tokenEndpointAuthMethod=none`.
  2. Lấy code; đổi code chỉ với `client_id` và verifier.
- **Mong đợi:** lệnh tạo trả `clientSecret: null`; đổi code → 200 bộ token.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-023 — Token response is a flat, non-cacheable RFC 6749 body

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** checklist theo đặc tả
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Đổi một code.
- **Mong đợi:** body có `access_token`, `id_token`, `token_type: Bearer`,
  `expires_in: 900`, `scope` bằng các scope đã xin, và không có envelope
  `data`/`timestamp`; header `Cache-Control: no-store` và `Pragma: no-cache`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-024 — A wrong code_verifier is rejected and burns the code

- **Requirement:** REQ-OIDC-08, REQ-OIDC-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** chuyển trạng thái (đã cấp → đổi thất bại → thử lại), phân vùng tương đương (EP, verifier sai)
- **Tiền điều kiện:** client public (PKCE là bằng chứng duy nhất)
- **Bước:**
  1. Đổi code với một verifier khác, đúng định dạng.
  2. Đổi lại chính code đó với verifier đúng.
- **Mong đợi:** 1 → 400 `invalid_grant` (xác minh PKCE thất bại); 2 → 400
  `invalid_grant` — một lần thử thất bại đã tiêu code, nên không thể brute-force.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-025 — Token request without code or code_verifier is invalid

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, thiếu tham số bắt buộc)
- **Tiền điều kiện:** client public
- **Bước:**
  1. Request token không có `code_verifier`; rồi với cùng code nhưng không có `code`.
- **Mong đợi:** cả hai → 400 `invalid_request`; sau đó code vẫn đổi được
  (validate diễn ra trước khi code bị tiêu).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-026 — An authorization code is single-use

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** chuyển trạng thái (đã cấp → đã đổi → dùng lại)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Đổi một code; đổi lại lần nữa với tham số y hệt.
- **Mong đợi:** lần đầu → 200; lần hai → 400 `invalid_grant`; key Redis biến mất sau lần đầu.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-027 — A fresh code lives 60 seconds

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** giá trị biên (BVA, cận trên TTL 60 s)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Lấy code và đọc TTL của `oauth-code:<code>`.
- **Mong đợi:** 55 < TTL ≤ 60.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-028 — A code is accepted just before expiry and refused just after

- **Requirement:** REQ-OIDC-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** giá trị biên (BVA) quanh vòng đời 60 s (giả lập bằng cách rút ngắn
  TTL Redis: còn ~2 s so với đã hết hạn)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Lấy code A, rút TTL xuống 2 s, đổi ngay.
  2. Lấy code B, rút TTL xuống 1 ms, chờ đến khi key biến mất, rồi đổi.
- **Mong đợi:** A → 200; B → 400 `invalid_grant`.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-029 — A code is bound to its client and redirect URI

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (tiêm code giữa các client), phân vùng tương đương (EP)
- **Tiền điều kiện:** hai client
- **Bước:**
  1. Đổi code của client A nhưng ghi `client_id` của client B.
  2. Đổi một code mới với `redirect_uri` đã đăng ký còn lại.
- **Mong đợi:** cả hai → 400 `invalid_grant`, không có token.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-030 — Only the authorization_code grant is supported

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) — `refresh_token`, `client_credentials`, `password`, không có
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. `POST /oauth/token` với từng grant type và credential client hợp lệ.
- **Mong đợi:** 400 `{ error: unsupported_grant_type }` cho mỗi loại.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-031 — code_verifier length follows RFC 7636 (43…128)

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** giá trị biên (BVA) — 42 / 43 / 128 / 129 ký tự
- **Tiền điều kiện:** client public
- **Bước:**
  1. Với mỗi độ dài, authorize với challenge S256 tương ứng rồi đổi code.
- **Mong đợi:** 43 và 128 → 200; 42 và 129 → 400 `invalid_request`
  (RFC 7636 §4.1). **Hiện đang fail:** server chấp nhận mọi độ dài — biên
  43/128 được kiểm như một test pass, các giá trị ngoài khoảng được đánh dấu
  `test.fail` (BUG).
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-032 — The ID token is RS256-signed by a key in the JWKS

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** theo đặc tả, đoán lỗi (chữ ký bị sửa, `alg`)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Đổi code; xác minh `id_token` và `access_token` bằng key JWKS có `kid`
     khớp header (node `crypto`).
  2. Đổi một ký tự trong chữ ký rồi xác minh lại.
- **Mong đợi:** header `alg RS256` với `kid` có trong JWKS; cả hai token xác
  minh được; token bị sửa thì không.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-033 — ID token claims identify issuer, audience, user and request

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** checklist theo đặc tả (OIDC Core §2, §3.1.3.7)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Authorize kèm nonce; đổi code; decode ID token.
- **Mong đợi:** `iss` = issuer, `aud` = client_id, `sub` = user id của tài
  khoản, `nonce` = nonce đã gửi, `exp − iat = 900`, `auth_time ≤ iat`, có
  `sid`, `exp` ở tương lai; `email`/`name` khớp tài khoản.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-034 — Claims are filtered by the granted scopes

- **Requirement:** REQ-OIDC-04, REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) — `openid` / `openid email` / `openid profile`; không gửi nonce
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Với mỗi bộ scope, đổi một code (không nonce) và gọi userinfo.
- **Mong đợi:** `openid` → chỉ `sub` (+ claim giao thức); `openid email` →
  `email`, `email_verified`, không có `name`; `openid profile` → `name`, `picture`,
  không có `email`; ID token không có `nonce` khi không gửi; `scope` trong
  token response lặp lại đúng bộ scope.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-035 — A satellite access token cannot call Ducker ID's own API

- **Requirement:** REQ-OIDC-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (nhầm audience)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Gửi `access_token` OAuth làm Bearer tới `GET /api/v1/users/me`.
- **Mong đợi:** bị từ chối (4xx, envelope lỗi) — `aud` của nó là client_id, không phải issuer.
- **Automated:** `tests/api/oidc/id-token.api.ts`

### TC-OIDC-036 — userinfo returns the user's claims for a valid access token

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, token hợp lệ)
- **Tiền điều kiện:** client confidential; bộ token với `openid profile email`
- **Bước:**
  1. `GET /oauth/userinfo` với `Authorization: Bearer <access_token>`.
- **Mong đợi:** 200 JSON phẳng: `sub` = `sub` của ID token, `email` = email tài khoản,
  `name` = tên tài khoản, `email_verified: true`; `Cache-Control: no-store`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-037 — userinfo without a Bearer token is refused

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) — không có header / `Basic …` / `Bearer` không kèm token / `bearer` chữ thường
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi userinfo với từng biến thể header.
- **Mong đợi:** 4xx `{ error }` không có `sub` hay claim nào khác.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-038 — userinfo with a malformed or tampered token is refused

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP) — chuỗi ngẫu nhiên / chữ ký bị sửa / token `alg: none`
- **Tiền điều kiện:** một access token hợp lệ để sửa
- **Bước:**
  1. Gọi userinfo với từng token hỏng.
- **Mong đợi:** 4xx `{ error }` không có claim.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-039 — userinfo errors follow RFC 6750 (401 invalid_token)

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** theo đặc tả (OIDC Core §5.3.3 → RFC 6750 §3.1)
- **Tiền điều kiện:** không có
- **Bước:**
  1. Gọi userinfo không có token và với token không hợp lệ.
- **Mong đợi:** 401 với header `WWW-Authenticate: Bearer`; token không hợp lệ →
  `error=invalid_token`. **Hiện đang fail** (BUG): 400 `invalid_request` /
  400 `invalid_grant`, không có `WWW-Authenticate`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-040 — An ID token presented to userinfo is refused cleanly

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (nhầm loại token)
- **Tiền điều kiện:** một bộ token
- **Bước:**
  1. Gọi userinfo với `id_token` làm Bearer token.
- **Mong đợi:** 401 `invalid_token`, không có claim. **Hiện đang fail** (BUG):
  ID token qua được kiểm tra chữ ký/issuer, không có `authId`, và server trả
  500 `server_error`.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-041 — A first-party Ducker ID access token is not accepted by userinfo

- **Requirement:** REQ-OIDC-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (nhầm audience — chiều ngược của TC-OIDC-035)
- **Tiền điều kiện:** một access token first-party từ `/api/v1/auth/login`
- **Bước:**
  1. Gọi userinfo với access token first-party.
- **Mong đợi:** 401, không có claim — `aud` của nó là issuer, không phải một client.
  **Hiện đang fail** (BUG): 200 `{ sub }` — `verifyOAuthAccessToken` chỉ kiểm
  issuer, không bao giờ kiểm audience.
- **Automated:** `tests/api/oidc/userinfo.api.ts`

### TC-OIDC-042 — /oauth/logout ends the identity-provider session

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** chuyển trạng thái (có session → đã logout → prompt=none)
- **Tiền điều kiện:** client confidential; session IdP (`idp-session:<sid>` trong Redis)
- **Bước:**
  1. `GET /oauth/logout` không theo redirect.
  2. Authorize với `prompt=none` trong cùng context.
- **Mong đợi:** 1 → 302 và một `Set-Cookie` làm rỗng `sid`; key session trong
  Redis biến mất. 2 → `error=login_required`. Code cấp trước khi logout vẫn
  đổi được cho tới hết TTL của chính nó (không thu hồi — đã ghi nhận).
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-043 — Logout redirects only to a registered post-logout URI

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** bảng quyết định (có client_id × URI đã đăng ký), đoán lỗi (open redirect)
- **Tiền điều kiện:** client có `postLogoutRedirectUris = [https://rp.e2e.example.com/signed-out]`
- **Bước:**
  1. Logout với URI đã đăng ký, `client_id` và một state.
  2. Logout với URI chưa đăng ký.
  3. Logout với URI đã đăng ký nhưng không có `client_id`.
- **Mong đợi:** 1 → 302 tới URI với đúng `state`; 2 và 3 → 302 tới trang chủ
  Ducker ID (origin client), không bao giờ tới URI được truyền vào.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-044 — Logout expires the sid cookie

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (cookie bị xoá giá trị nhưng không hết hạn)
- **Tiền điều kiện:** session IdP
- **Bước:**
  1. Đọc header `Set-Cookie: sid=…` của `/oauth/logout`.
- **Mong đợi:** `Expires` ở quá khứ (hoặc `Max-Age=0`). **Hiện đang fail**
  (BUG): `res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS)` truyền
  `maxAge`, nên Express 4 ghi `sid=; Max-Age=604800` — một cookie rỗng sống
  thêm 7 ngày. Hiện vô hại (sid rỗng = không có session) nhưng không phải là xoá.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-045 — Signing out of Ducker ID also ends the SSO session

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** chuyển trạng thái (logout first-party → prompt=none)
- **Tiền điều kiện:** client confidential; session IdP + access token first-party
- **Bước:**
  1. `POST /api/v1/auth/logout` với token first-party và cookie.
  2. Authorize với `prompt=none`.
- **Mong đợi:** session Redis biến mất và 2 → `error=login_required`.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-046 — A satellite sign-in is recorded in login history with its app

- **Requirement:** REQ-OIDC-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** phân vùng tương đương (EP, SSO im lặng so với tiếp tục có tương tác)
- **Tiền điều kiện:** client confidential; tài khoản tạm
- **Bước:**
  1. Khi đã có session, authorize (im lặng).
  2. Với vai trò guest, authorize, đăng nhập, tiếp tục `auth_req` (có tương tác).
  3. `GET /api/v1/login-history` với token của tài khoản.
- **Mong đợi:** các dòng có `method: sso`, `status: success`, `source: oauth`,
  `app.id` = app id của client, `app.name` = display name của nó; dòng im lặng
  `interactive: false`, dòng tiếp tục `interactive: true`.
- **Automated:** `tests/api/oidc/login-history.api.ts`

### TC-OIDC-047 — A guest signs in at Ducker ID and lands back in the app with a code

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm)
- **Kỹ thuật:** chuyển trạng thái (guest → đăng nhập → quay lại app), use case
- **Tiền điều kiện:** client confidential; tài khoản tạm
- **Bước:**
  1. Mở URL authorize trong trình duyệt.
  2. Trên màn hình đăng nhập nhập email, tiếp tục, nhập mật khẩu, đăng nhập.
- **Mong đợi:** màn hình đăng nhập hiện ra; sau khi đăng nhập trình duyệt tới
  redirect URI đã đăng ký với `code` và `state` ban đầu; code đó đổi được ra
  token có `email` là của tài khoản.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`

### TC-OIDC-048 — An existing Ducker ID session goes straight back to the app

- **Requirement:** REQ-OIDC-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** use case (single sign-on), chuyển trạng thái
- **Tiền điều kiện:** client confidential; trình duyệt đang giữ session IdP
- **Bước:**
  1. Mở URL authorize.
- **Mong đợi:** trình duyệt tới redirect URI với code; không điều hướng qua
  trang Ducker ID nào (không `/login`, không màn hình nào) ở giữa.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`

### TC-OIDC-049 — prompt=none in a browser with no session never shows a login screen

- **Requirement:** REQ-OIDC-06
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (prompt=none × không có session)
- **Tiền điều kiện:** client confidential
- **Bước:**
  1. Mở URL authorize với `prompt=none` trong trình duyệt không có cookie.
- **Mong đợi:** trình duyệt tới redirect URI với `error=login_required` và
  state; không bao giờ điều hướng tới `/login`.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`

### TC-OIDC-050 — Signing in to a revoked app is refused, and allowed after reset

- **Requirement:** REQ-OIDC-10
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user tạm (+ API admin)
- **Kỹ thuật:** bảng quyết định (role cho phép × override deny)
- **Tiền điều kiện:** tài khoản tạm đã đăng nhập; Notes bị thu hồi
- **Bước:**
  1. `GET /oauth/authorize` cho Notes (PKCE S256); xoá override; lặp lại.
- **Mong đợi:** 302 với `error=access_denied`; sau đó 302 tới redirect URI với `code`.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-OIDC-051 — An app granted beyond the role lets SSO through

- **Requirement:** REQ-OIDC-10
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** user tạm (+ API admin)
- **Kỹ thuật:** bảng quyết định (role không cho × override allow)
- **Tiền điều kiện:** tài khoản tạm đã đăng nhập
- **Bước:**
  1. `GET /oauth/authorize` cho Operations Console; cấp quyền; lặp lại.
- **Mong đợi:** `error=access_denied`; sau đó có `code`.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-OIDC-052 — An admin signs in to a user-only app

- **Requirement:** REQ-OIDC-10
- **Layer:** api · **Priority:** P1 · **Vai trò:** admin (phiên IdP `sid` của `admin@test.com` từ bước setup)
- **Kỹ thuật:** bảng quyết định (role admin × app `[user]`)
- **Tiền điều kiện:** session admin; app seed Blog (`client_blog_8f3a`, chỉ `[user]`)
- **Bước:**
  1. `GET /oauth/authorize` cho Blog (PKCE S256), không theo redirect; code không đem đổi.
- **Mong đợi:** 302 tới `https://blog.example.com/auth/callback?code=…` — admin
  đủ điều kiện cho mọi app (trước đây bị `access_denied`).
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-053 — A code issued before its client was deactivated cannot be redeemed

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm đã đăng nhập) + admin
- **Kỹ thuật:** chuyển trạng thái (code đã cấp → client inactive → đổi code)
- **Tiền điều kiện:** client confidential riêng; session IdP
- **Bước:**
  1. Lấy code.
  2. Admin vô hiệu hoá client.
  3. Đổi code với secret và verifier đúng; kích hoạt lại client.
- **Mong đợi:** 3 → 401 `{ error: invalid_client }`, không có token — client đã tắt không đổi được code nào,
  kể cả code cấp trước đó.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-054 — A token request that leaves out redirect_uri is refused

- **Requirement:** REQ-OIDC-08
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (bỏ tham số bắt buộc), theo đặc tả (RFC 6749 §4.1.3)
- **Tiền điều kiện:** client confidential; code xin với `redirect_uri` đã đăng ký
- **Bước:**
  1. `POST /oauth/token` với `grant_type`, `code`, `code_verifier`, `client_id`, `client_secret` đúng nhưng
     không có `redirect_uri`.
- **Mong đợi:** 400 `invalid_request` (hoặc `invalid_grant`), không có token — `redirect_uri` bắt buộc khi
  request authorize đã gửi nó. **Hiện đang fail** (BUG): server chỉ so `redirect_uri` khi request có gửi, nên
  bỏ nó đi thì đổi được code.
- **Automated:** `tests/api/oidc/token.api.ts`

### TC-OIDC-055 — Repeated and extra-spaced scope values are normalised, not rejected

- **Requirement:** REQ-OIDC-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest (tài khoản tạm đã đăng nhập)
- **Kỹ thuật:** đoán lỗi (khoảng trắng thừa, giá trị lặp)
- **Tiền điều kiện:** client confidential (scope openid profile email)
- **Bước:**
  1. Authorize với `scope="  openid   openid email  email "`; đổi code.
- **Mong đợi:** authorize cấp code (không `invalid_scope`); token response có `scope: "openid email"` —
  scope được tách theo khoảng trắng và bỏ trùng.
- **Automated:** `tests/api/oidc/authorize.api.ts`

### TC-OIDC-056 — Logout without a session redirects like a normal logout

- **Requirement:** REQ-OIDC-09
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest (không cookie)
- **Kỹ thuật:** đoán lỗi (logout khi chưa đăng nhập / logout hai lần), chuyển trạng thái
- **Tiền điều kiện:** client có `postLogoutRedirectUris = [https://rp.e2e.example.com/signed-out]`
- **Bước:**
  1. `GET /oauth/logout` không tham số, không cookie.
  2. `GET /oauth/logout` với `client_id`, URI đã đăng ký và `state`, không cookie.
- **Mong đợi:** không lỗi 4xx/5xx; 1 → 302 về trang chủ Ducker ID; 2 → 302 tới URI đã đăng ký với đúng `state`.
- **Automated:** `tests/api/oidc/logout.api.ts`

### TC-OIDC-057 — Authorize and token requests share the per-IP sign-in rate limit

- **Requirement:** REQ-OIDC-11
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA, request thứ 30 / 31 trong cửa sổ 15 phút), bảo mật (brute-force)
- **Tiền điều kiện:** counter `rate-limit:login:ip:*` bắt đầu từ 0 (`keepRateLimits` + xoá riêng counter này)
- **Bước:**
  1. Gọi `GET /oauth/authorize` (không `client_id`) 30 lần.
  2. Gọi lần thứ 31; rồi `POST /oauth/token`; rồi `POST /auth/login`.
- **Mong đợi:** 1 → cả 30 lần là 400 `invalid_request` (vẫn bị đếm); 2 → cả ba là 429, body
  `{ code: TOO_MANY_REQUESTS, message: login:errors.rateLimitExceeded }` — ba endpoint dùng chung một ngân sách.
- **Automated:** `tests/api/oidc/rate-limit.api.ts`

### TC-OIDC-058 — A guest who signs in with a one-time code lands back in the app

- **Requirement:** REQ-OIDC-02, REQ-OIDC-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest (tài khoản tạm)
- **Kỹ thuật:** phân vùng tương đương (cách đăng nhập: mật khẩu ở TC-OIDC-047 / mã một lần), chuyển trạng thái
  (request chờ phải sống qua nhiều bước đăng nhập)
- **Tiền điều kiện:** client confidential; tài khoản tạm
- **Bước:**
  1. Mở URL authorize trong trình duyệt → màn hình đăng nhập.
  2. Nhập email → bước mật khẩu → "Try another way" → chọn mã một lần; plant mã đã biết; nhập mã.
- **Mong đợi:** trình duyệt tới redirect URI đã đăng ký với `code` và `state` ban đầu; code đổi được ra token có
  `email` của tài khoản.
- **Automated:** `tests/e2e/oidc/sign-in.e2e.ts`
