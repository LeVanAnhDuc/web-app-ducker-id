# Design — login-history-ip-country

Fix hiển thị **quốc gia = UNKNOWN** và **địa chỉ IP thô/méo** (`::1`) trong lịch sử đăng nhập, đồng thời chuẩn hóa việc lấy IP client cho production.

## Bối cảnh & Vấn đề

Trong lịch sử đăng nhập (`login_histories`), người dùng thấy `country = UNKNOWN` và IP hiển thị thô `::1`. Điều tra `server/src/modules/login-history/helpers/index.ts`:

1. **`country = UNKNOWN` gộp 2 nguyên nhân khác nhau** — (a) IP loopback/private (đang chạy local), và (b) IP public thật nhưng `geoip-lite` không tra được. Cả hai đều trả `GEO_DEFAULTS.UNKNOWN_COUNTRY` → không phân biệt được.
2. **IP loopback hiển thị thô** — `maskIp("::1")`: `"::1".split(".")` = `["::1"]` (1 phần, ≠ 4) và `"::1".split(":")` = `["","","1"]` (3 phần, < 4) → trả nguyên `::1`.
3. **Bug `maskIp` với IPv4-mapped IPv6** — `req.socket.remoteAddress` thường trả `::ffff:1.2.3.4`. `"::ffff:1.2.3.4".split(".")` = `["::ffff:1","2","3","4"]` → **length = 4** → `maskIp` tưởng là IPv4 → ra chuỗi méo `::ffff:1.2.*.*`.
4. **BE không có `trust proxy`** — `app.ts` chưa `app.set("trust proxy", …)`. `extractIp` tự parse header `x-forwarded-for` (dễ bị spoof) và fallback `req.socket.remoteAddress`; sau reverse proxy/LB thật, không lấy đúng IP client.

**Trên local**: `::1` + `UNKNOWN` về bản chất là đúng (máy chính là localhost, không có IP public để geolocate). Vậy "fix" = (1) hiển thị đúng ngữ nghĩa cho local, (2) sửa bug `maskIp`, (3) chuẩn hóa lấy IP cho production.

## Quyết định thiết kế

- **Phạm vi**: cả hai — polish hiển thị local **và** sửa gốc cho production.
- **Biểu diễn local**: BE **phân biệt** `LOCAL` (loopback/private) với `UNKNOWN` (public geoip-miss thật); FE map cả hai sang nhãn i18n. Không nhầm 2 trường hợp.

## Kiến trúc thay đổi (theo side)

### BE — `server/src` (task BE)

1. **`modules/login-history/constants/index.ts`** — thêm `GEO_DEFAULTS.LOCAL = "LOCAL"` (giá trị mới cho `country`/`city` khi loopback/private).
2. **`modules/login-history/helpers/index.ts`**:
   - `extractIp(req)` — **ưu tiên `req.ip`** (Express tính đúng theo `trust proxy`, an toàn hơn tự parse `x-forwarded-for` vì header này spoof được khi proxy untrusted); fallback `req.socket.remoteAddress`. **Normalize**: strip prefix `::ffff:` (IPv4-mapped IPv6 → IPv4 thuần); map `::1` → `127.0.0.1`. Trả IP đã chuẩn hóa.
   - `geoipLookup(ip)` — loopback/private (theo `PRIVATE_IP_PATTERNS` + `LOCALHOST_VALUES`) → `country = LOCAL, city = LOCAL`; public + geoip có kết quả → country ISO; public + miss/lookup fail → `UNKNOWN`.
   - `maskIp(ip)` — **fix**: loopback/private → trả **nguyên** (không nhạy cảm, hiện `127.0.0.1`); public IPv4 → mask 2 octet cuối (`1.2.*.*`); public IPv6 → mask đuôi. Sau khi `extractIp` đã normalize, `maskIp` không còn gặp dạng `::ffff:` nhưng vẫn giữ phân loại private/public làm nguồn quyết định mask.
3. **`app.ts`** — `app.set("trust proxy", config.TRUST_PROXY)` đặt **trước** các middleware/route đọc IP.
4. **`constants/env.ts`** — thêm `TRUST_PROXY` (default `"loopback"`; parse: `"true"/"false"` → boolean, chuỗi số → number, còn lại giữ string như `"loopback"`).
5. **`server/.env.example`** — thêm `TRUST_PROXY=loopback` (tạo file nếu chưa có; chỉ key + placeholder). Cập nhật env tạm của worktree runner (`.claude/scripts/worktree.mjs`) nếu cần (§3.1).

### FE — `client/src` (task FE)

6. **Helper dùng chung** — hàm map location, đặt tại `src/utils` (theo `rules/types.md`/util convention): nhận `{ city, country }` + hàm dịch → trả chuỗi location. Rule: `country === "LOCAL"` → nhãn i18n local; `country === "UNKNOWN"` → nhãn i18n unknown; ISO code → giữ nguyên. Ghép city chỉ khi `city ∉ {UNKNOWN, LOCAL}` → `${city}, ${countryLabel}`.
7. **Thay 3 nơi đang lặp logic** `city !== "UNKNOWN" ? ...`:
   - `views/LoginHistory/components/LoginHistoryTableRow/index.tsx`
   - `views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
   - `views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`
8. **i18n** — `locales/{en,vi}/loginHistory.json` thêm nhóm `location`:
   - `location.local` → EN `"Local"` · VI `"Nội bộ (Local)"`
   - `location.unknown` → EN `"Unknown"` · VI `"Không xác định"`
9. **IP** — BE đã normalize + mask, FE chỉ render `item.ip`/`data.ip` như cũ (giờ ra `127.0.0.1` thay vì `::1`).

## Bỏ qua có chủ đích

- **Step 1.5 (Pencil UI mock)**: SKIP — không thêm UI mới, không đổi layout/flow, chỉ đổi giá trị text trong cell có sẵn.
- **Seeder / schema (§3.2)**: SKIP — không có seeder login-history; `country` là `String` free (không enum) nên thêm giá trị `LOCAL` không đổi schema constraint.
- **Data cũ**: các bản ghi login-history cũ vẫn mang `country=UNKNOWN` cho cả trường hợp local trước đây — chấp nhận (append-only log, TTL 90 ngày tự trôi), không backfill.

## API contract (BE DTO ↔ FE type)

- `country`/`city` vẫn kiểu `string`; **giá trị mới `"LOCAL"`** được thêm vào miền giá trị. FE type `LoginHistoryItem`/detail giữ `string` → không drift kiểu. FE xử lý `LOCAL` như một giá trị hợp lệ.

## Security (§4.5 — sẽ chạy sau code review)

Đụng input header (`x-forwarded-for`) + auth-log → chạy security-audit. Trọng tâm: `trust proxy` cấu hình sai = rủi ro spoof IP → lý do dùng `req.ip` + default an toàn `"loopback"` (chỉ tin proxy loopback).

## E2E Scenario Matrix

**Loại thay đổi**: sửa feature đã có → **reconcile** delta (không rebuild). Delta = cách render **IP** + **country/location** ở 3 view login-history. E2E hiện có: `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts` (view LoginHistory của user chưa có e2e riêng → bổ sung tối thiểu cho delta). Trên môi trường local, gate assert giá trị LOCAL + IP `127.0.0.1`.

**Lưu ý phân tầng test**: bản chất bug `maskIp`/`extractIp`/`geoipLookup` là **pure function** → cover sâu bằng **BE unit test** (`helpers` spec) với EP/BVA đầy đủ; E2E chỉ assert **kết quả render** cuối (nhãn + IP đã normalize) trên UI.

| #   | Category            | Gate | Quyết định |
| --- | ------------------- | ---- | ---------- |
| 1   | Happy path          | A+B  | ✅ User mở "Lịch sử đăng nhập" của mình → row gần nhất hiện IP đã normalize (`127.0.0.1` ở local) + nhãn country ("Nội bộ (Local)"). Admin table + admin detail hiện cùng giá trị. |
| 2   | AuthN               | —    | N/A — delta không đổi luồng auth; các trang login-history đã yêu cầu đăng nhập, đã cover ở suite hiện có. |
| 3   | AuthZ               | —    | N/A — admin views đã chặn role qua BE 403; delta render không đổi authz (cover sẵn ở `admin-authz`). |
| 4   | Validation / error  | A+B  | ✅ **[EP]** miền giá trị `country` render: `LOCAL`→"Nội bộ (Local)" · `UNKNOWN`→"Không xác định" · ISO (`VN`)→giữ nguyên. **[EP]** miền `ip` (cover sâu ở BE unit test, E2E assert render): loopback `::1`→`127.0.0.1` (không mask) · IPv4-mapped `::ffff:1.2.3.4`→`1.2.*.*` · public IPv4→`x.x.*.*` · public IPv6→mask đuôi. Query tampered (`page=abc`) không thuộc delta → N/A. |
| 5   | Empty / null        | —    | N/A — empty state login-history không đổi bởi delta (cover sẵn). |
| 6   | Boundary / paging   | —    | N/A — pagination/sort không đổi bởi delta. **[BVA]** ranh giới mask (min/max octet, IPv4-mapped) là bound của pure function → cover ở BE unit test, không phải E2E. |
| 7   | Filter / search     | —    | N/A — UI filter hiện chỉ có status/method/date (không có filter country); delta không thêm filter. |
| 8   | Data rendering      | A+B  | ✅ **[DT]** composition location theo `(city, country)`: `city ∈ {UNKNOWN, LOCAL}` → chỉ hiện nhãn country · `city = giá trị thật` → `"${city}, ${countryLabel}"`. Country hiện **nhãn người-đọc**, không phải enum thô `LOCAL`/`UNKNOWN`; IP hiện `127.0.0.1`, không phải `::1`. |
| 9   | **i18n**            | A+B  | ✅ (bắt buộc) Nhãn country render đúng ở **EN** ("Local"/"Unknown") **và VI** ("Nội bộ (Local)"/"Không xác định"). Bắt bug thiếu message key `loginHistory.location.*`. |
| 10  | Error / loading     | —    | N/A — error/loading UI không đổi bởi delta (cover sẵn). |
| 11  | Mutation safety     | —    | N/A — feature read-only, không có mutation. |
| 12  | Accessibility       | —    | N/A — location/IP là text thuần trong cell có sẵn, không thêm element tương tác; selector role/label giữ nguyên. |

**Gate**: tất cả scenario read-only → `A+B` (không có mutation, không `A only`, không lo contamination).

## Verify (§4.7)

- **BE**: `cd server && yarn lint && yarn type-check && yarn test && yarn build`
- **FE**: `cd client && yarn lint && yarn build` + E2E dual-gate (§4.3)
