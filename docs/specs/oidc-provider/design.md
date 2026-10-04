# Design — OIDC Provider + app vệ tinh đầu tiên (badminton)

> **Status**: Chờ user review (chưa commit)
> **Date**: 2026-09-26
> **Feature branch**: `feat/oidc-provider` (Ducker ID) · `feat/ducker-id-login` (badminton)
> **Scope**: `server/src/**`, `client/src/**`, `client/next.config.ts`, và repo
> `web-app-calculate-badminton`

## 1. Bối cảnh

`docs/project-goals.md` §10 đặt MVP-1 là OAuth/OIDC server. Trước đợt này registry đã
lưu đủ metadata OIDC client (`clientId`, `redirectUris`, `grantTypes`, `responseTypes`,
`scopes`, `tokenEndpointAuthMethod`) nhưng **không có code nào đọc chúng**, và ba model
`refresh-token.ts`, `oauth-consent.ts`, `entitlement.ts` được định nghĩa mà chưa file nào
`import`. Launcher chỉ `window.open(homeUrl)` — app vệ tinh nhận khách ẩn danh.

App vệ tinh đầu tiên là **badminton**, và đặc điểm triển khai của nó quyết định gần như
toàn bộ thiết kế bên dưới.

## 2. Ràng buộc do badminton áp đặt

Badminton là Vite + React tĩnh, deploy GitHub Pages, **không có backend**. Chuỗi nhân quả:

| Ràng buộc | Hệ quả |
| --- | --- |
| Mọi code chạy trong trình duyệt | **Public client** — không có chỗ giữ `client_secret` |
| Không có secret | **PKCE** là cơ chế bảo vệ code duy nhất |
| `github.io` nằm trong Public Suffix List, cookie cross-site bị chặn | **Không dùng được cookie** chung với IdP |
| Không có cookie | **Không có refresh token** — không có chỗ cất an toàn |
| Không có endpoint server | **Không làm được back-channel logout** |
| GitHub Pages không có SPA fallback | `redirect_uri` là **gốc app**, không phải `/auth/callback` |

Hệ quả dễ chịu: không có refresh token nghĩa là **đăng xuất tự lan toả** trong vòng TTL của
access token (15 phút) — vai trò mà back-channel logout lẽ ra phải gánh.

## 3. Ba primitive mới

### 3.1. Phiên IdP — cookie `sid`

`/oauth/authorize` là **navigation thật của trình duyệt**, không phải XHR. Access token nằm
trong bộ nhớ Zustand của tab nên nó không đọc được. Cần một phiên đọc được từ cookie.

- `SESSION_COOKIE = "sid"`, `HttpOnly`, `Secure` ở production, `SameSite=Lax`.
- **Lax là đủ**: cookie Lax vẫn được gửi trong top-level GET navigation kể cả khác site.
  Không cần `SameSite=None`, nên không phụ thuộc third-party cookie.
- Record lưu Redis, TTL 7 ngày, giữ `authId`, `userId`, `roles`, `authTime`, `ip`,
  `userAgent`, `clients[]`.
- Mở phiên ở `LoginController` sau khi đăng nhập thành công; danh tính lấy qua
  `RequestContext` do `LoginCompletionService` đặt vào — cách này **không phải đổi chữ ký của
  cả ba login strategy**.
- `LogoutService` giờ huỷ phiên thật thay vì chỉ ghi log.

### 3.2. Ký bất đối xứng RS256 + JWKS

App vệ tinh phải verify được `id_token` mà **không** giữ bí mật nào. HS256 với secret dùng
chung nghĩa là ai verify được cũng ký giả được.

- `access_token` và `id_token` → RS256, có `kid`.
- `refresh_token` giữ HS256: nó chỉ đi giữa trình duyệt và Ducker ID, không ai khác verify.
- Khoá lấy từ `OAUTH_PRIVATE_KEY`/`OAUTH_PUBLIC_KEY`; thiếu ở dev thì sinh keypair tạm và
  cảnh báo, thiếu ở production thì **ném lỗi lúc boot** (`jwks.loader.ts` chạy trước
  `loadModules` để fail fast).
- **`aud` tách hai thế giới**: token first-party mang `aud = OIDC_ISSUER`, token của app vệ
  tinh mang `aud = clientId`. `verifyAccessToken` ép `audience = issuer`, nên một access
  token của badminton **không gọi được API first-party của Ducker ID**.

### 3.3. Authorization code store

- Redis, TTL 60 giây.
- Đọc bằng **`GETDEL`** — nguyên tử, đảm bảo dùng đúng một lần kể cả khi hai request đổi
  token chạy song song. Tách `GET` rồi `DEL` sẽ để lọt race condition.
- Authorize request đang chờ login cũng vào Redis (`auth_req`, TTL 10 phút) thay vì nhồi
  query string vào URL trang login — user không sửa được `redirect_uri` hay `scope` giữa chừng.

## 4. Endpoint

| Endpoint | Ghi chú |
| --- | --- |
| `GET /.well-known/openid-configuration` | Discovery |
| `GET /.well-known/jwks.json` | Public key theo `kid` |
| `GET /oauth/authorize` | Hỗ trợ `prompt=none` và `auth_req=<id>` |
| `POST /oauth/token` | `authorization_code`, verify PKCE S256 |
| `GET /oauth/userinfo` | Bearer, lọc claim theo scope |
| `GET /oauth/logout` | RP-initiated, huỷ phiên |

**Mount ngoài `/api/v1`.** Discovery bắt buộc nằm ở gốc origin, nên `mountOAuthRoutes` gắn
thẳng router lên `app`. Đây là module đầu tiên phá quy ước mount của `mountRoutes`.

**Không dùng envelope `ResponsePattern`.** RFC 6749 §5.1 quy định body là JSON phẳng; bọc
thêm envelope là mọi thư viện OIDC client không parse được. `OAuthError` +
`handleOAuthError` (gắn ngay trên router OAuth, chạy trước `handleError` toàn cục) lo phần
này. Đây là ngoại lệ duy nhất trong codebase.

## 5. Quyết định bảo mật

- **PKCE bắt buộc cho MỌI client**, kể cả confidential (OAuth 2.1 / RFC 9700).
- **`redirect_uri` khớp tuyệt đối chuỗi** — không prefix, không wildcard, không bỏ qua
  trailing slash. Với public client thì `client_id` là công khai, nên đây **là** cơ chế bảo
  mật chính chứ không phải kiểm tra hình thức. Validate lúc đăng ký cũng siết theo: bắt buộc
  https trừ localhost, cấm fragment, cấm wildcard.
- **Lỗi trước khi xác thực được `redirect_uri` thì trả JSON, không redirect** — redirect ở
  nhánh đó là biến IdP thành open redirector.
- **So sánh PKCE bằng `timingSafeEqual`**, có chặn lệch độ dài trước (hàm này ném nếu hai
  buffer khác độ dài).
- **`state` đối chiếu ở phía client** — lớp chống CSRF của OAuth.
- Thêm **unique index `clientId`** trên `web_apps`: trước đây không có index nào cho field
  này, mà `/authorize` và `/token` tra theo nó ở mọi request.

## 6. Phía client Ducker ID

- `next.config.ts` rewrite `/oauth/*` và `/.well-known/*` sang `API_SERVER_URL`. Không có
  bước này thì cookie `sid` thuộc origin `:5000` còn màn hình login ở `:3000`, hai bên không
  thấy phiên của nhau.
- `middleware.ts` **loại trừ** `oauth` và `.well-known` khỏi matcher — để next-intl chạm vào
  là nó gắn tiền tố locale (`/vi/oauth/authorize`) và phá mọi `redirect_uri` đã đăng ký.
- Ghost `AuthRequestCapture` cất `auth_req` vào sessionStorage ngay khi vào trang login, vì
  đăng nhập là luồng nhiều bước (email → password/OTP/magic-link).
- `usePostLoginRedirect` ưu tiên `auth_req` hơn mọi đích đến khác, và dùng
  `window.location.assign` chứ không phải router của Next — cần navigation thật để cookie đi kèm.
- Form admin thêm `tokenEndpointAuthMethod`; `createApp` **chỉ sinh secret khi là
  confidential**.

## 7. Phía badminton

- `src/lib/pkce.ts` — Web Crypto, không thêm dependency.
- `src/lib/duckerAuth.ts` — dựng URL authorize, đọc callback ở gốc app, đổi token, hook React.
- `consumeCallback()` dọn URL bằng `replaceState` ngay sau khi đọc: code dùng một lần, để
  nguyên trên URL thì một lần F5 sẽ đem code đã tiêu đi đổi lại và nhận `invalid_grant`.
- `AccountButton` ẩn hẳn khi chưa cấu hình `VITE_DUCKER_CLIENT_ID`.
- **Đăng nhập là tính năng cộng thêm, không phải cổng chặn** — app phải tính tiền được đầy
  đủ khi chưa đăng nhập và khi offline. Mọi lỗi auth chỉ hạ trạng thái xuống `signed-out`.

## 8. Ngoài phạm vi đợt này

Consent screen, `/oauth/introspect`, `/oauth/revoke`, refresh-token grant, back-channel
logout, entitlement per-user (hiện gate theo `requiredRoles`).

**Cần user chốt**: ADR-002 trong `project-goals.md` nói first-party vẫn phải có consent
screen, nhưng yêu cầu "đã đăng nhập thì quay về ngay" nghĩa là không được chặn bằng màn hình
nào. Bản này đang **không** hiện consent. Nếu giữ ADR-002 thì cần thêm cờ `isFirstParty` và
một màn hình consent.
