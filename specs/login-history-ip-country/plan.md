# login-history-ip-country Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phân biệt IP local/private (`LOCAL`) với geoip-miss thật (`UNKNOWN`), normalize IP client, fix bug `maskIp` với IPv4-mapped IPv6, và cấu hình `trust proxy` để lấy đúng IP ở production.

**Architecture:** BE chuẩn hóa IP tại `extractIp` (ưu tiên `req.ip`, strip `::ffff:`, map `::1`→`127.0.0.1`), phân loại private/local trong `geoipLookup` + `maskIp` dùng chung một predicate; thêm giá trị `GEO_DEFAULTS.LOCAL`; bật `trust proxy` qua env. FE map `LOCAL`/`UNKNOWN` sang nhãn i18n qua 1 helper dùng chung tại 3 view.

**Tech Stack:** Express + TypeScript + Jest (BE); Next.js 15 + next-intl + Playwright (FE).

## Global Constraints

- Path alias BE `@/` → `server/src/`; FE `@/` → `client/src/`.
- BE: mọi env đọc qua `@/constants/env` — KHÔNG `process.env` trực tiếp nơi khác.
- BE: throw error qua class trong `@/common/exceptions` (không áp dụng ở task này — chỉ helper thuần).
- FE: type props inline; type dùng chung ở `src/types/`; string UI phải qua i18n (en + vi); import group theo `rules/imports.md`.
- FE: JSX không comment, không blank line giữa element (`rules/jsx.md`).
- Worktree paths: BE `server/.worktrees/login-history-ip-country/`, FE `client/.worktrees/login-history-ip-country/`, docs `docs/.worktrees/login-history-ip-country/`.
- Commit gate §7 Review ON: implementer **stage** thay đổi, KHÔNG commit per-task; main loop trình diff tổng thể → user duyệt → commit.

---

### Task 1 (BE): Chuẩn hóa IP + phân biệt LOCAL/UNKNOWN + fix maskIp

**Files:**
- Modify: `server/src/modules/login-history/constants/index.ts` (thêm `GEO_DEFAULTS.LOCAL`)
- Modify: `server/src/modules/login-history/helpers/index.ts` (`normalizeIp`, `extractIp`, `geoipLookup`, `maskIp`, predicate dùng chung)
- Test: `server/src/modules/login-history/helpers/index.spec.ts` (create)

**Interfaces:**
- Produces: `normalizeIp(ip: string): string`, `extractIp(req: Request): string`, `geoipLookup(ip: string): { country: string; city: string }`, `maskIp(rawIp: string): string`, `GEO_DEFAULTS.LOCAL = "LOCAL"`.
- Consumes: `PRIVATE_IP_PATTERNS`, `LOCALHOST_VALUES`, `GEO_DEFAULTS` từ `../constants`; `geoip-lite`.

- [ ] **Step 1: Thêm giá trị LOCAL vào constants**

Trong `constants/index.ts`, sửa `GEO_DEFAULTS`:

```ts
export const GEO_DEFAULTS = {
  UNKNOWN_COUNTRY: "UNKNOWN",
  UNKNOWN_CITY: "UNKNOWN",
  UNKNOWN_IP: "UNKNOWN",
  LOCAL: "LOCAL"
} as const;
```

- [ ] **Step 2: Viết test thất bại cho helpers**

Tạo `server/src/modules/login-history/helpers/index.spec.ts`:

```ts
// libs
import type { Request } from "express";
// module under test
import { normalizeIp, extractIp, geoipLookup, maskIp } from "./index";

jest.mock("geoip-lite", () => ({ lookup: jest.fn() }));
import geoip from "geoip-lite";

const makeReq = (ip?: string, remoteAddress?: string): Request =>
  ({ ip, socket: { remoteAddress } }) as unknown as Request;

describe("normalizeIp", () => {
  it("strips IPv4-mapped IPv6 prefix", () => {
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
  });
  it("maps IPv6 loopback to IPv4 loopback", () => {
    expect(normalizeIp("::1")).toBe("127.0.0.1");
  });
  it("leaves a plain IPv4 untouched", () => {
    expect(normalizeIp("1.2.3.4")).toBe("1.2.3.4");
  });
});

describe("extractIp", () => {
  it("prefers req.ip and normalizes it", () => {
    expect(extractIp(makeReq("::ffff:8.8.8.8"))).toBe("8.8.8.8");
  });
  it("maps ::1 from req.ip to 127.0.0.1", () => {
    expect(extractIp(makeReq("::1"))).toBe("127.0.0.1");
  });
  it("falls back to socket.remoteAddress when req.ip is empty", () => {
    expect(extractIp(makeReq(undefined, "10.0.0.5"))).toBe("10.0.0.5");
  });
  it("returns UNKNOWN when no source available", () => {
    expect(extractIp(makeReq(undefined, undefined))).toBe("UNKNOWN");
  });
});

describe("geoipLookup", () => {
  it("returns LOCAL for loopback/private IPs", () => {
    expect(geoipLookup("127.0.0.1")).toEqual({ country: "LOCAL", city: "LOCAL" });
    expect(geoipLookup("192.168.1.10")).toEqual({ country: "LOCAL", city: "LOCAL" });
  });
  it("returns country/city when geoip resolves a public IP", () => {
    (geoip.lookup as jest.Mock).mockReturnValueOnce({ country: "VN", city: "Hanoi" });
    expect(geoipLookup("203.0.113.45")).toEqual({ country: "VN", city: "Hanoi" });
  });
  it("returns UNKNOWN when geoip has no result for a public IP", () => {
    (geoip.lookup as jest.Mock).mockReturnValueOnce(null);
    expect(geoipLookup("203.0.113.45")).toEqual({ country: "UNKNOWN", city: "UNKNOWN" });
  });
});

describe("maskIp", () => {
  it("shows loopback/private IPs in full (not sensitive)", () => {
    expect(maskIp("127.0.0.1")).toBe("127.0.0.1");
    expect(maskIp("::1")).toBe("127.0.0.1");
    expect(maskIp("10.0.0.5")).toBe("10.0.0.5");
  });
  it("masks the last two octets of a public IPv4", () => {
    expect(maskIp("203.0.113.45")).toBe("203.0.*.*");
  });
  it("masks a public IPv4 delivered as IPv4-mapped IPv6", () => {
    expect(maskIp("::ffff:8.8.8.8")).toBe("8.8.*.*");
  });
  it("masks the tail of a public IPv6", () => {
    expect(maskIp("2001:db8:85a3:0:0:8a2e:370:7334")).toBe("2001:db8:85a3:*:*:*:*:*");
  });
});
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

Run (dùng testMatch override vì worktree, xem [[reference_jest_worktree_testmatch]]):
`cd server/.worktrees/login-history-ip-country && npx jest --testMatch "**/helpers/index.spec.ts" -t "normalizeIp"`
Expected: FAIL — `normalizeIp` chưa export.

- [ ] **Step 4: Sửa helpers/index.ts**

Thêm hằng + predicate + normalize, viết lại 3 hàm. Thêm gần đầu file (sau các import):

```ts
const IPV4_MAPPED_PREFIX = "::ffff:";
const IPV6_LOOPBACK = "::1";
const IPV4_LOOPBACK = "127.0.0.1";

export const normalizeIp = (ip: string): string => {
  if (!ip) return ip;
  let normalized = ip.trim();
  if (normalized.startsWith(IPV4_MAPPED_PREFIX)) {
    normalized = normalized.slice(IPV4_MAPPED_PREFIX.length);
  }
  if (normalized === IPV6_LOOPBACK) {
    normalized = IPV4_LOOPBACK;
  }
  return normalized;
};

const isPrivateOrLocalIp = (ip: string): boolean => {
  const isPrivate = PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
  const isLocalhost = LOCALHOST_VALUES.includes(
    ip as (typeof LOCALHOST_VALUES)[number]
  );
  return isPrivate || isLocalhost;
};
```

Thay `extractIp` (bỏ parse `x-forwarded-for` thủ công — dùng `req.ip` do Express tính theo `trust proxy`):

```ts
export const extractIp = (req: Request): string => {
  const rawIp = req.ip || req.socket.remoteAddress || GEO_DEFAULTS.UNKNOWN_IP;
  return normalizeIp(rawIp);
};
```

Thay nhánh private trong `geoipLookup` (return LOCAL thay vì UNKNOWN):

```ts
    if (isPrivateOrLocalIp(ip)) {
      return {
        country: GEO_DEFAULTS.LOCAL,
        city: GEO_DEFAULTS.LOCAL
      };
    }
```

(Giữ nguyên nhánh `!ip`, `!geo`, và catch → vẫn trả `UNKNOWN`.)

Thay `maskIp`:

```ts
export const maskIp = (rawIp: string): string => {
  const ip = normalizeIp(rawIp);

  if (isPrivateOrLocalIp(ip)) {
    return ip;
  }

  const ipv4Parts = ip.split(".");
  if (ipv4Parts.length === IPV4_PARTS) {
    return `${ipv4Parts.slice(0, IPV4_KEEP_PARTS).join(".")}.*.*`;
  }

  const ipv6Parts = ip.split(":");
  if (ipv6Parts.length >= IPV6_MIN_PARTS) {
    return `${ipv6Parts.slice(0, IPV6_KEEP_PARTS).join(":")}:*:*:*:*:*`;
  }

  return ip;
};
```

Cập nhật import: bỏ dùng `HTTP_HEADERS.X_FORWARDED_FOR` trong `extractIp` (giữ export `HTTP_HEADERS` — vẫn dùng ở service cho `USER_AGENT`/`CLIENT_TYPE`). Xóa 2 hằng `COMMA_SEPARATOR`/`FIRST_IP_INDEX` nếu không còn tham chiếu.

- [ ] **Step 5: Chạy toàn bộ helper spec — xác nhận PASS**

Run: `cd server/.worktrees/login-history-ip-country && npx jest --testMatch "**/helpers/index.spec.ts"`
Expected: PASS toàn bộ describe.

- [ ] **Step 6: Stage (KHÔNG commit — Review ON)**

`git add src/modules/login-history/constants/index.ts src/modules/login-history/helpers/index.ts src/modules/login-history/helpers/index.spec.ts`

---

### Task 2 (BE): Bật trust proxy qua env

**Files:**
- Modify: `server/src/constants/env.ts` (thêm `TRUST_PROXY`)
- Modify: `server/src/app.ts` (`app.set("trust proxy", …)`)
- Create: `server/.env.example` (nếu chưa có) — thêm `TRUST_PROXY`

**Interfaces:**
- Produces: `config.TRUST_PROXY` (boolean | number | string).

- [ ] **Step 1: Thêm parse TRUST_PROXY vào env.ts**

Trong `env.ts`, thêm hàm parse + field. Đặt hàm trước `const ENV`:

```ts
const parseTrustProxy = (raw?: string): boolean | number | string => {
  const value = (raw ?? "loopback").trim();
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value !== "") return asNumber;
  return value;
};
```

Thêm vào object `ENV` (sau `ALLOW_CROSS_ORIGIN_COOKIES`):

```ts
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
```

- [ ] **Step 2: Set trust proxy trong app.ts**

Trong `app.ts`, ngay sau `const app = express();` (trước `app.use(helmet())`):

```ts
// Tin tưởng reverse proxy/LB theo cấu hình TRUST_PROXY (default "loopback").
// Cần thiết để req.ip lấy đúng IP client thật từ x-forwarded-for; cấu hình
// hẹp (loopback) tránh bị spoof header khi không có proxy tin cậy.
app.set("trust proxy", config.TRUST_PROXY);
```

(`config` đã import sẵn: `import config from "@/constants/env";`.)

- [ ] **Step 3: Thêm key vào .env.example**

Nếu `server/.env.example` chưa tồn tại → tạo với các key hiện có (chỉ key + placeholder, KHÔNG secret thật), tối thiểu thêm:

```
TRUST_PROXY=loopback
```

Nếu đã tồn tại → chỉ thêm dòng `TRUST_PROXY=loopback`.

- [ ] **Step 4: Verify type-check + build**

Run: `cd server/.worktrees/login-history-ip-country && yarn type-check`
Expected: no errors.

- [ ] **Step 5: Stage (KHÔNG commit)**

`git add src/constants/env.ts src/app.ts .env.example`

---

### Task 3 (FE): Helper formatLoginLocation + i18n keys

**Files:**
- Modify: `client/src/utils/index.ts` (thêm `formatLoginLocation`)
- Modify: `client/src/locales/en/loginHistory.json` (thêm `location`)
- Modify: `client/src/locales/vi/loginHistory.json` (thêm `location`)

**Interfaces:**
- Produces: `formatLoginLocation(city: string, country: string, t: (key: "local" | "unknown") => string): string`.

- [ ] **Step 1: Thêm helper vào utils/index.ts**

Thêm (đặt gần các helper login-history như `isLoginHistoryStatus`):

```ts
const LOGIN_LOCATION_SENTINELS = ["UNKNOWN", "LOCAL"];

export const formatLoginLocation = (
  city: string,
  country: string,
  t: (key: "local" | "unknown") => string
): string => {
  const countryLabel =
    country === "LOCAL"
      ? t("local")
      : country === "UNKNOWN"
        ? t("unknown")
        : country;
  if (LOGIN_LOCATION_SENTINELS.includes(city)) {
    return countryLabel;
  }
  return `${city}, ${countryLabel}`;
};
```

- [ ] **Step 2: Thêm i18n keys (en)**

Trong `locales/en/loginHistory.json`, thêm block `"location"` (đặt sau `"method"`, trước `"admin"`):

```json
  "location": {
    "local": "Local",
    "unknown": "Unknown"
  },
```

- [ ] **Step 3: Thêm i18n keys (vi)**

Trong `locales/vi/loginHistory.json`, thêm block tương ứng (cùng vị trí):

```json
  "location": {
    "local": "Nội bộ (Local)",
    "unknown": "Không xác định"
  },
```

- [ ] **Step 4: Verify lint + build FE**

Run: `cd client/.worktrees/login-history-ip-country && yarn lint`
Expected: no errors trên file đã sửa.

- [ ] **Step 5: Stage (KHÔNG commit)**

`git add src/utils/index.ts src/locales/en/loginHistory.json src/locales/vi/loginHistory.json`

---

### Task 4 (FE): Wire 3 view dùng formatLoginLocation

**Files:**
- Modify: `client/src/views/LoginHistory/components/LoginHistoryTableRow/index.tsx`
- Modify: `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
- Modify: `client/src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`

**Interfaces:**
- Consumes: `formatLoginLocation` từ `@/utils`; `useTranslations("loginHistory.location")`.

- [ ] **Step 1: LoginHistoryTableRow**

Thêm import (group `// others`): `import { formatLoginLocation } from "@/utils";`
Thêm translator trong component: `const tLocation = useTranslations("loginHistory.location");`
Thay cell location (hiện `item.city !== "UNKNOWN" ? \`${item.city}, ${item.country}\` : item.country`):

```tsx
      <TableCell>{formatLoginLocation(item.city, item.country, tLocation)}</TableCell>
```

- [ ] **Step 2: AdminLoginHistoryTable**

Thêm import `formatLoginLocation` (group `// others`, cạnh `isLoginHistoryStatus`).
Thêm `const tLocation = useTranslations("loginHistory.location");` (cạnh các `useTranslations` khác).
Thay span location (dòng hiện `item.city !== "UNKNOWN" ? ...`):

```tsx
                    <span className="text-muted-foreground block text-xs">
                      {formatLoginLocation(item.city, item.country, tLocation)}
                    </span>
```

- [ ] **Step 3: LoginHistoryDetailCard**

Thêm import `formatLoginLocation` (group `// others`).
Thêm `const tLocation = useTranslations("loginHistory.location");`.
Thay biến `location` (hiện `data.city !== "UNKNOWN" ? ... : data.country`):

```tsx
  const location = formatLoginLocation(data.city, data.country, tLocation);
```

- [ ] **Step 4: Verify lint + build FE**

Run: `cd client/.worktrees/login-history-ip-country && yarn lint && yarn build`
Expected: no errors (next build type-check pass).

- [ ] **Step 5: Stage (KHÔNG commit)**

`git add src/views/LoginHistory src/views/AdminLoginHistory src/views/AdminLoginHistoryDetail`

---

### Task 5 (E2E): Reconcile scenario + tests + e2e.md

**Files:**
- Modify: `client/e2e/admin-login-history/admin-login-history-detail.e2e.ts` (reconcile assertion location/IP)
- Create: `client/e2e/login-history/my-login-history.e2e.ts` (happy + i18n render cho view user)
- Create: `docs/specs/login-history-ip-country/e2e.md`

**Interfaces:**
- Consumes: helpers `client/e2e/helpers/*`, `auth.setup.ts` (storageState).

- [ ] **Step 1: Đọc test hiện có + reconcile**

Đọc `admin-login-history-detail.e2e.ts`. Với assertion nào expect country `"UNKNOWN"` hoặc IP `::1` cho bản ghi local → cập nhật expected sang nhãn location mới ("Nội bộ (Local)"/"Local" theo locale test) + IP normalize (`127.0.0.1`). Nếu test seed IP public → assert mask `x.x.*.*`. KHÔNG đổi app code từ test.

- [ ] **Step 2: Thêm test view user LoginHistory (happy + i18n)**

Tạo `client/e2e/login-history/my-login-history.e2e.ts`: đăng nhập (storageState), mở trang lịch sử đăng nhập của user; assert (a) cột IP hiện giá trị đã normalize (không chứa `::1`, không chứa `::ffff:`), (b) cột location hiện nhãn người-đọc (regex khớp "Local"/"Nội bộ" hoặc tên quốc gia, KHÔNG hiện chuỗi thô `UNKNOWN`/`LOCAL`). Lặp assert i18n cho cả `en` và `vi` (điều hướng `/` và `/vi`).

- [ ] **Step 3: Viết e2e.md**

Tạo `docs/specs/login-history-ip-country/e2e.md` — liệt kê scenario từ Scenario Matrix (design.md): #1 happy, #4 validation-render (EP giá trị country/ip), #8 data-rendering (DT composition), #9 i18n en+vi; ghi rõ N/A cho các nhóm còn lại; note các case defer (vd IP public thật cần seed) + lý do.

- [ ] **Step 4: Stage (KHÔNG commit)**

`git add client:e2e...` (stage trong repo client + docs tương ứng).

Note: E2E dual-gate (§4.3) chạy ở bước riêng sau khi code xong (gate A `yarn e2e` + gate B MCP walk), không phải trong task này.

---

## Self-Review

- **Spec coverage**: BE constant LOCAL (T1) · normalize/extractIp/geoipLookup/maskIp (T1) · trust proxy + env + .env.example (T2) · FE helper + i18n (T3) · wire 3 view (T4) · E2E reconcile + e2e.md (T5). Đủ mọi mục design.
- **Placeholder scan**: mọi step có code/command cụ thể.
- **Type consistency**: `formatLoginLocation` signature dùng nhất quán T3↔T4; `GEO_DEFAULTS.LOCAL` T1↔dùng ở service (đã có `geoipLookup` trả). FE type `country/city: string` (đã có) — giá trị `"LOCAL"` không cần đổi type.
