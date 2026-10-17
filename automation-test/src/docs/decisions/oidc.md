# OIDC — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `server/src/modules/oauth/**`
- `server/src/modules/session/**`
- `server/src/modules/web-app` (đăng ký client)
- `client/next.config.ts`
- `client/src/middleware.ts`
- `docs/specs/oidc-provider/design.md`

Phạm vi ban đầu của module: đăng nhập một lần cho app vệ tinh — discovery, `/oauth/authorize`, `/oauth/token`,
`/oauth/userinfo`, `/oauth/logout` (REQ-OIDC-01…09).

Đọc thêm ngày 2026-10-14 (lượt chuẩn hóa, `/write-tests oidc`):

- `README.md` → `## Features` ("Single sign-on for satellite apps") và `### Not built yet` ("The rest of the OIDC surface")
- `docs/specs/oidc-provider/design.md`, `docs/specs/access-control/design.md`
- `server/src/modules/oauth/**` (routes, controller, `services/{authorize,exchange-token,logout,get-user-info}.ts`,
  `services/shared/resolve-client.ts`, `helpers`, `constants`), `server/src/modules/session/services/end.ts`
- `server/src/middlewares/common/rate-limiter.middleware.ts`, `server/src/constants/redis/rate-limit/index.ts`
- `client/src/ghosts/AuthRequestCapture`, `client/src/hooks/usePostLoginRedirect.ts`,
  `client/src/layouts/GuestGuardLayout`, `client/src/components/RedirectingScreen`, `client/src/utils/index.ts`
  (`saveAuthRequestId` / `resumeAuthorize`), `client/src/views/Logins/*/hooks`

## Quyết định chốt

- Q1 Redirect URI không bao giờ được truy cập thật → test API đọc header `Location` với `maxRedirects: 0`, test
  trình duyệt chặn nó bằng `page.route`.
- Q2 Không chờ 60 s để code hết hạn → rút ngắn key Redis (`oauth-code:*`) của code (TC-OIDC-028).
- Q3 (tự quyết 2026-10-14, cần user duyệt): `/oauth/authorize` và `/oauth/token` đi qua limiter `loginByIp` (30 / 15 phút,
  chung key `rate-limit:login:ip:*` với `POST /auth/login`) — docs không nhắc, chỉ thấy trong code. Hành vi mong muốn
  hay bug? → Mong muốn: chặn dò code / secret bằng brute-force; ghi thành requirement, kỳ vọng 429 với envelope lỗi của
  API (không phải body OAuth) như code đang trả → REQ-OIDC-11 (TC-OIDC-057).
- Q4 (tự quyết 2026-10-14, cần user duyệt): `tests/e2e/admin-entitlements/admin-sso.e2e.ts` chứng minh TC-OIDC-052 — để
  đâu? → Chuyển vào `tests/api/oidc/authorize.api.ts` (describe chạy với role admin), xoá file cũ; TC-OIDC-052 đổi
  `Layer` e2e → api: test chỉ gọi HTTP `/oauth/authorize` bằng phiên `sid` của admin, không có màn hình nào, và
  CLAUDE.md đặt giao thức OIDC ở tầng API. Giữ nguyên kỳ vọng (302 tới callback của Blog kèm `code=`) → REQ-OIDC-10.
- Q5 (tự quyết 2026-10-14, cần user duyệt): `/oauth/token` không có `redirect_uri` vẫn đổi được code (server chỉ so khi
  request có gửi). Docs chỉ nói "khớp tuyệt đối chuỗi"; RFC 6749 §4.1.3 bắt buộc gửi lại khi authorize đã gửi → giữ RFC
  làm kỳ vọng (cùng cách TC-OIDC-031 lấy RFC 7636), test đánh dấu bug BUG-OIDC-06 (đã sửa 2026-10-15, fix/open-bugs) → REQ-OIDC-08 (TC-OIDC-054).
- Q6 (tự quyết 2026-10-14, cần user duyệt): scope có khoảng trắng thừa / giá trị lặp (`"openid  openid email"`) — từ
  chối hay chấp nhận? → Chấp nhận và chuẩn hoá (tách theo khoảng trắng, bỏ trùng; RFC 6749 §3.3 coi scope là danh sách
  phân cách bằng khoảng trắng), như code đang làm → REQ-OIDC-02 (TC-OIDC-055).
- Q7 (tự quyết 2026-10-14, cần user duyệt): `/oauth/logout` khi không có phiên → coi như logout bình thường (302 về
  trang chủ, hoặc về URI hậu-logout đã đăng ký kèm `state`), không lỗi → REQ-OIDC-09 (TC-OIDC-056).
- Q8 (tự quyết 2026-10-14, cần user duyệt): cách đăng nhập nào phải đưa người dùng quay lại app? → Mọi cách (design §6:
  `auth_req` sống qua email → mật khẩu / OTP / magic link). Mật khẩu (TC-OIDC-047) và mã một lần (TC-OIDC-058) là hai
  đại diện tự động; magic link không tự động trong lượt này (xem Ngoài phạm vi) → REQ-OIDC-02, REQ-OIDC-05.
- Q9 (tự quyết 2026-10-14, cần user duyệt): client bị vô hiệu hoá sau khi đã cấp code → code đó không đổi được nữa
  (401 `invalid_client`), như code đang làm (`resolveClient` chạy ở token endpoint) → REQ-OIDC-08 (TC-OIDC-053).

## Tài khoản test

- Mỗi spec tự đăng ký OAuth client của mình với vai trò admin (`utils/oidc-state.ts → registerClient`, tên `e2e-oidc-*`,
  display name `E2E OIDC …`) trong `beforeAll`, rồi vô hiệu hoá và xoá chúng trong `afterAll` — không có endpoint
  DELETE, và một app sót lại sẽ làm lệch số app theo category và danh sách admin mà các module khác assert.
- Mọi luồng authorize chạy bằng tài khoản tạm: một lần đăng nhập OAuth ghi login history và một recent app cho user,
  nên không bao giờ dùng tài khoản seed.
- Redirect URI (`https://rp.e2e.example.com/…`) không bao giờ được truy cập thật.
- Code được làm hết hạn bằng cách rút ngắn key Redis (`oauth-code:*`) thay vì chờ 60 s.
- Ngoại lệ duy nhất dùng tài khoản seed: TC-OIDC-052 authorize bằng phiên của `admin@test.com` (chỉ đọc — code không
  đem đổi; ghi một dòng login history SSO và một recent app cho admin, như trước khi chuyển file).
- TC-OIDC-057 đặt `keepRateLimits` và tự xoá counter `rate-limit:login:ip:*` trước và sau test.

## Dữ kiện server

- Code TTL 60 s, đọc bằng `GETDEL` (dùng một lần, bị tiêu _trước_ mọi kiểm tra khác).
- PKCE S256 bắt buộc với mọi client; `plain` bị từ chối.
- Lỗi phát sinh trước khi `client_id` và `redirect_uri` được validate trả về dạng JSON (`{ error, error_description }`)
  và không bao giờ redirect; sau đó chúng là 302 tới URI đã đăng ký với `?error=…&state=…`.
- Đăng ký hỗ trợ `client_secret_basic` (mặc định, confidential) và `none` (public); tại token endpoint, secret của
  client confidential được nhận từ header Basic hoặc form body (`client_secret_post`, có quảng bá trong discovery).
- Access token và ID token là RS256, 15 phút, `aud` = `client_id`.
- Server **không** kiểm độ dài `code_verifier` (xem TC-OIDC-031).

## Ngoài phạm vi

- Chưa build (README `### Not built yet`, design §8): consent screen, `/oauth/introspect`, `/oauth/revoke`, grant
  `refresh_token` (TC-OIDC-030 chỉ kiểm nó bị từ chối), back-channel logout. Access token đã cấp vẫn dùng được tới khi
  hết hạn sau logout / sau khi bị thu hồi quyền — README ghi là giới hạn đã biết, không kiểm.
- Magic link mở trong tab khác: `auth_req` nằm trong `sessionStorage` của tab login, nên đăng nhập bằng magic link mở từ
  email (tab mới) có thể không quay lại app. Chưa có docs nói hành vi mong muốn cho trường hợp này; cần user chốt
  trước khi viết test.
- Màn hình chờ "Taking you back to {app}…" (`RedirectingScreen`) chỉ hiện trong khoảnh khắc trước khi trình duyệt rời
  trang — không assert được ổn định.
- TC-OIDC-050 / -051 thuộc module oidc nhưng nằm ở `tests/e2e/apps/launcher-access.e2e.ts` (dùng chung tài khoản và phiên
  `beforeAll` với các case launcher của module apps) — không chuyển trong lượt này.

## Tech debt liên quan

- Helper cũ `src/helpers/oidc.ts` đã tách (2026-10-14): giao thức thuần → `utils/oidc.ts` (kèm `oidc.test.ts`), trạng thái
  backend (client đăng ký, phiên IdP, key Redis) → `utils/oidc-state.ts`, HTTP → `api/oauth.client.ts` (namespace
  `api.oauth`, gọi đường dẫn gốc, không qua `API_PREFIX`), JWT/JWKS → `utils/jwt.ts`, màn hình → `pages/oauth/authorize.page.ts`.
  `utils/catalog.ts` và spec của login-history, recently-used, favorites dùng lại `utils/oidc-state.ts`.
