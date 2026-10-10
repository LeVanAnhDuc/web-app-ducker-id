# Design — login-history-app-source

Lịch sử đăng nhập cho biết **đăng nhập vào đâu**: thẳng vào Ducker ID (IdP) hay vào một app vệ
tinh qua OIDC. Đồng thời ghi lại các lần **SSO im lặng**, những lần mà hiện giờ không để lại
dấu vết nào.

## Bối cảnh & Vấn đề

`login_histories` hiện chỉ lưu **cách** đăng nhập (`method`, `status`, IP, thiết bị,
`clientType` = WEB/iOS/Android). Không có trường nào nói đăng nhập **vào app nào**.

`GET /oauth/authorize` (`server/src/modules/oauth/oauth.service.ts`) có hai nhánh:

1. **Chưa có phiên IdP.** Request được cất vào Redis (`auth_req`), user bị chuyển sang
   `/login?auth_req=…&app=…`, đăng nhập xong thì `resumeAuthorize` quay lại `/oauth/authorize?auth_req=…`.
   Login-history ghi **một dòng giống hệt đăng nhập IdP thường**, không phân biệt được.
2. **Đã có phiên** (SSO im lặng). `issueCode` cấp code ngay và **không ghi gì**. User vào
   Match CV mười lần cũng không thấy dòng nào.

Ngoài ra, khi bị chặn vì không đủ quyền (`assertEntitled` → `access_denied`), sự kiện đó cũng không được ghi.

## Tham chiếu ngành

Các hệ thống lớn đều lưu đủ từng sự kiện và chỉ gộp/lọc khi hiển thị:

- **Auth0** tách log `s` (đăng nhập có credential) và `ssa` (silent auth), mỗi dòng có `client_id`/`client_name`.
- **Microsoft Entra ID** chia sign-in log thành *interactive* và *non-interactive*, dòng nào cũng có
  trường *Application*. Portal gộp các lần non-interactive giống nhau khi hiển thị.
- **Okta** có `user.session.start` (xác thực) và `user.authentication.sso` (mỗi lần vào app).
- **Google** phía user chỉ liệt kê các lần xác thực, các app thì nằm ở trang *Third-party connections*.
  Phía admin có *Login audit* và *OAuth Token audit* tách riêng.

## Quyết định thiết kế

- **Phạm vi A + B, dùng chung collection `login_histories`** (không tách collection riêng).
- **Ghi mọi lần cấp code**, không dedupe lúc ghi. Mỗi dòng có cờ `interactive`. Việc gộp/lọc là
  chuyện của UI, giống Entra. Collection đã có TTL nên không lo phình dữ liệu.
- **Hướng A thực hiện ở server, không gửi `auth_req` từ client.** Brainstorm ban đầu định gửi
  `auth_req` kèm body của request login. Đọc code thì thấy cách này hỏng: `auth_req` nằm trong
  `sessionStorage` (`client/src/utils/index.ts` → `saveAuthRequestId`). Magic link mở ở tab mới
  hoặc máy khác sẽ không có nó, và phải sửa 5 luồng (password, OTP, magic link, forgot-password,
  unlock). Thay vào đó:
  - Khi `/oauth/authorize` đi vào nhánh **resume** (`auth_req` được restore từ Redis), dòng SSO
    được ghi với `interactive = true`. Nghĩa là "vừa nhập credential để vào app này".
  - Dòng xác thực vẫn là `source = idp` như cũ. Trên timeline user sẽ thấy hai dòng liền nhau:
    *"Mật khẩu · Ducker ID"* rồi *"SSO · Match CV · interactive"*. Mô hình này giống
    `user.session.start` + `user.authentication.sso` của Okta, và đúng với thực tế là phiên IdP
    được dùng chung cho nhiều app.
  - Nguồn của `clientId` là client do **server** resolve. Tham số `app` trên URL chỉ để hiển thị,
    không bao giờ được ghi vào log.
- **Không ghi** khi `prompt=none` thất bại vì chưa có phiên (`login_required`). Đó là app dò phiên,
  không phải user đăng nhập, và nó sẽ tạo nhiễu.

## Mô hình dữ liệu

`server/src/models/login-history.ts`, thêm các trường:

| Trường        | Kiểu                         | Default  | Ghi chú |
| ------------- | ---------------------------- | -------- | ------- |
| `source`      | enum `idp` \| `oauth`        | `idp`    | `LOGIN_SOURCES` mới trong `modules/login-history/constants` |
| `webAppId`    | ObjectId ref `WebApp` \| null | `null`  | `_id` của web-app. Không dùng `clientId` string vì nó có thể bị rotate |
| `clientName`  | string \| null               | `null`   | Snapshot `displayName` lúc ghi. App bị đổi tên hoặc ẩn thì log vẫn đọc được |
| `interactive` | boolean                      | `true`   | `false` = SSO im lặng |

- `LOGIN_METHODS` thêm `SSO: "sso"`.
- `LOGIN_FAIL_REASONS` thêm `NOT_ENTITLED: "not_entitled"`.
- Index mới: `{ userId: 1, webAppId: 1, createdAt: -1 }` để lọc theo app ở trang user, và
  `{ webAppId: 1, createdAt: -1 }` cho admin.
- **Dữ liệu cũ:** không backfill. Mongoose default chỉ áp khi tạo mới, nên với dòng cũ thiếu trường,
  DTO mapper sẽ coi `source ?? "idp"`, `interactive ?? true`, `webAppId ?? null`. Log là append-only
  và TTL tự xoá dữ liệu cũ, giống cách làm ở `login-history-ip-country`.

**Docs đi cùng PR:** `docs/erd.md` có khối `LOGIN_HISTORY`. Khối này cần thêm 4 trường mới và quan
hệ `WEB_APP ||--o{ LOGIN_HISTORY` (nullable). `docs/project-goals.md` §4 (admin xem login-history,
SSO tới app vệ tinh) đã bao phạm vi này, nên không cần sửa Goals. Chỉ thêm một dòng vào changelog của file.

## Kiến trúc thay đổi

### BE — `server/src`

1. **`modules/login-history/constants`**: thêm `LOGIN_SOURCES`, `LOGIN_METHODS.SSO`,
   `LOGIN_FAIL_REASONS.NOT_ENTITLED`. Thêm types tương ứng.
2. **`models/login-history.ts`**: thêm 4 trường và 2 index ở trên.
3. **`LoginHistoryService`**: thêm `recordAppSignIn({ userId, usernameAttempted, webApp, interactive, req })`
   và `recordAppSignInDenied({ … })`. Cả hai đi qua `logLoginAttempt` (fire-and-forget, nuốt lỗi
   như hiện tại), nên việc ghi log không bao giờ làm hỏng luồng OAuth. `recordSuccessfulLogin` /
   `recordFailedLogin` giữ nguyên chữ ký, chỉ mặc định `source = idp`.
4. **`OAuthService`**:
   - Nhận thêm `loginHistoryService` qua constructor. `modules.loader.ts` đã tạo
     `loginHistoryService` trước nên chỉ cần truyền vào `createOAuthModule`.
   - `authorize()` biết mình đang ở nhánh nào (`query.auth_req` có hay không), từ đó truyền
     `interactive` xuống.
   - Sau `issueCode` thành công thì gọi `recordAppSignIn`. Trong `assertEntitled`, trước khi throw
     `access_denied` thì gọi `recordAppSignInDenied`.
   - `usernameAttempted` là trường bắt buộc nhưng `SessionRecord` không có email. Lấy qua user
     repository mà `loadClaims` đang dùng, chạy **trong** phần ghi log bất đồng bộ để không cộng
     thêm độ trễ cho redirect.
5. **Query**: `loginHistoryQuerySchema` thêm `source` (`idp`|`oauth`), `webAppId` (ObjectId pattern)
   và `interactive` (boolean). `buildLoginHistoryFilter` và `toMongoFilter` của repository map các
   trường này. Áp dụng cho cả route user lẫn admin.
6. **DTO**: `MyHistoryItemDto` và `AllHistoryItemDto` (kéo theo detail) thêm
   `source`, `app: { id, name, iconUrl } | null` và `interactive`. `iconUrl` lấy bằng `populate`
   `webAppId` với select `displayName iconUrl`. Nếu app đã bị xoá thì fallback về `clientName` snapshot, `iconUrl = null`.
7. **Stats** (`aggregateMyStats`, `GET /login-history/me/stats`): **loại** `method = sso` khỏi
   các thẻ thống kê. Thẻ hiện đếm "lần đăng nhập", và nếu tính cả SSO im lặng thì số sẽ phồng lên
   mất ý nghĩa.
8. **Swagger** (`login-history` hiện chưa có entry trong `openapi.ts`): không làm trong phạm vi này,
   vì đó là món nợ đã ghi ở `CLAUDE.md`.

### FE — `client/src`

9. **Types + constants**: `types/LoginHistory` thêm `source`, `app`, `interactive`. `CONSTANTS.LOGIN_HISTORY`
   thêm `SOURCE`, `METHOD.SSO`, fail reason `not_entitled`, và màu cho `sso` trong `LOGIN_HISTORY_METHOD_COLOR`.
10. **Cột "Ứng dụng"** ở `dataSources/LoginHistory` (bảng user) và bảng admin: icon app (`CustomImage`,
    fallback chữ cái đầu) + tên. Dòng `source = idp` hiện "Ducker ID" kèm logo IdP. Dòng
    non-interactive có thêm badge nhỏ "Tự động (SSO)".
11. **Bộ lọc** (khai báo dạng data trong `buildLoginHistoryFilterDefs`):
    - *Ứng dụng*: select gồm "Ducker ID" + các app trong catalog (`requests/` web-app hiện có),
      map sang `source=idp` hoặc `webAppId=<id>`.
    - ~~Filter "Kiểu đăng nhập" (thủ công / SSO tự động)~~: **đã gỡ ngày 04.10.2026**. Trang user ẩn SSO tự
      động khi filter để trống, và chính người làm feature, khi test, tưởng là log không được ghi. Filter này
      cũng chồng nghĩa với *Phương thức = SSO* và *Ứng dụng*: chọn SSO mà vẫn không thấy dòng SSO. Bây giờ cả
      hai trang hiện tất cả. Thủ công / tự động chỉ còn là badge "Tự động" trên dòng và một trường ở trang
      chi tiết admin. API vẫn nhận query `interactive` cho ai cần lọc qua API.
12. **Admin detail** (`AdminLoginHistoryDetailCard`): thêm các dòng *Nguồn*, *Ứng dụng*, *Kiểu đăng nhập*
    (interactive / SSO im lặng).
13. **i18n** `locales/{en,vi}/loginHistory.json`: `method.sso`, `failReason.not_entitled`, `source.*`,
    `table.app`, `filters.app`, `filters.showSilent`, `filters.interactive`, `app.idp` ("Ducker ID"),
    `badge.silent`.

## UI mock

Thêm cột, bộ lọc và dòng chi tiết, tức là có đổi layout. Vì vậy cần mock trước khi lập plan, đặt ở
`docs/ui-designs/login-history-app-source/` (đọc `MASTER.md` trước khi vẽ). Gate duyệt mock là
gate chặn riêng.

## API contract (BE DTO ↔ FE type)

```ts
// thêm vào item của GET /login-history/me và GET /admin/login-history(/:id)
source: "idp" | "oauth";
app: { id: string | null; name: string; iconUrl: string | null } | null; // null khi source = idp
interactive: boolean;
method: … | "sso";
failReason: … | "not_entitled";

// query mới (cả user và admin)
source?: "idp" | "oauth";
webAppId?: string;      // ObjectId
interactive?: boolean;
```

## Security (§4.5)

- Đụng luồng OAuth và audit log, nên chạy security-audit sau code review.
- `webAppId`/`clientName` chỉ lấy từ client do server resolve, không bao giờ lấy từ `app` hay bất kỳ
  input nào của user.
- Việc ghi log phải fire-and-forget. Lỗi Mongo hoặc lỗi lookup email không được làm hỏng `/oauth/authorize`.
- Query `webAppId` validate bằng `OBJECTID_PATTERN`. Ở trang user, filter vẫn bị ép theo `userId`
  hiện tại (`buildLoginHistoryFilter` đã làm), nên không lộ log của người khác.

## Bỏ qua có chủ đích

- Trang "Ứng dụng đã kết nối" (mỗi app một dòng, lần dùng cuối, kiểu Google) để thành feature riêng.
  Dữ liệu SSO của feature này sẽ là nguồn thật cho `RecentlyUsed`, hiện vẫn đang mock (mục 5 trong
  `docs/unfinished-features.md`). Ghi chú vào backlog trong cùng PR.
- Backfill dữ liệu cũ: không làm (lý do ở mục Mô hình dữ liệu).
- Ghi log ở `/oauth/token`: không làm. Cấp code là thời điểm user thực sự vào app. Token exchange
  là việc server-to-server, ghi thêm chỉ tạo dòng trùng.

## E2E Scenario Matrix

Đây là thay đổi trên feature đã có, nên **reconcile** delta với `client/e2e/login-history/` và
`client/e2e/admin-login-history/`. Phần ghi log ở `OAuthService` (nhánh resume / im lặng / denied /
`prompt=none`) là logic server, cover sâu bằng **Jest unit test**. E2E tạo dòng SSO bằng cách đi
qua `/oauth/authorize` với app seed `IDMS Portal` (đã có `clientId` + redirect URI trong seeder).
Bước này sẽ chốt chi tiết ở `e2e.md`.

| #  | Category           | Gate | Quyết định |
| -- | ------------------ | ---- | ---------- |
| 1  | Happy path         | A+B  | ✅ Đăng nhập IdP: dòng mới hiện "Ducker ID". Đi qua authorize của app seed: có dòng `SSO · IDMS Portal`. Admin table + detail hiện cùng dữ liệu. |
| 2  | AuthN              | A    | ✅ Chưa có phiên → authorize → login → resume: dòng SSO là interactive (không có badge "Tự động"). |
| 3  | AuthZ              | A    | ✅ User không đủ role vào app có `requiredRoles`: dòng `failed · not_entitled · <app>`. User thường không xem được log admin (đã cover ở `admin-authz`). |
| 4  | Validation / error | A+B  | ✅ **[EP]** query `webAppId` sai định dạng → 400. `source`/`interactive` ngoài miền → 400. |
| 5  | Empty / null       | A+B  | ✅ Lọc theo app chưa từng đăng nhập → empty state. Dòng cũ thiếu trường → hiện "Ducker ID", không vỡ cell. |
| 6  | Boundary / paging  | —    | N/A. Pagination không đổi. |
| 7  | Filter / search    | A+B  | ✅ **[DT]** (app × interactive): mặc định trang user ẩn SSO im lặng, bật toggle thì hiện. Filter app = Ducker ID chỉ ra dòng `idp`. Filter nằm trên URL, reload vẫn giữ. |
| 8  | Data rendering     | A+B  | ✅ Icon + tên app, fallback chữ cái đầu khi không có `iconUrl`. Badge "Tự động (SSO)" chỉ ở dòng non-interactive. Thẻ stats không đếm SSO. |
| 9  | **i18n**           | A+B  | ✅ EN/VI cho `method.sso`, `not_entitled`, cột/filter/badge mới. |
| 10 | Error / loading    | —    | N/A. Không đổi. |
| 11 | Mutation safety    | —    | N/A. Read-only. Việc tạo dòng SSO là side effect của authorize, không phải mutation trên UI. |
| 12 | Accessibility      | A+B  | ✅ Toggle có label truy cập được. Icon app có `alt` = tên app, hoặc `aria-hidden` khi đã có tên bên cạnh. |

## Verify (§4.7)

- **BE**: `cd server && pnpm lint && pnpm type-check && pnpm test && pnpm build`
- **FE**: `cd client && pnpm lint && pnpm exec tsc --noEmit && pnpm build` + E2E dual-gate
- README `## Features`: thêm một bullet về nguồn đăng nhập và SSO trong lịch sử đăng nhập.
