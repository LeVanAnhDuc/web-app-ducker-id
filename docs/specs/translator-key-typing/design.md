# Type-safe translator params — `LeafKeyOf<M>` (bỏ cast/loose/union cho `t`)

## Context

Nhiều nơi trong `client/src` nhận **translator `t`** (từ `useTranslations` / `getTranslations`) làm **tham số hàm**, nhưng type khai báo **chưa đúng** → mất type-safety và autocomplete cho i18n key:

- **Cast key**: `t(item.key as Parameters<typeof t>[0])` — ép kiểu, bỏ qua check.
- **Loose `string`**: `tTable: (k: string) => string` — nhận mọi string, không autocomplete, không bắt key sai.
- **Union gõ tay**: `t: (key: "local" | "unknown") => string` — dễ drift với i18n thật, không derive từ `Messages`.

Điểm mấu chốt: `client` đã có augmentation `AppConfig.Messages` (`src/types/libs.d.ts`: `export type Messages = typeof messages`) nên **có thể derive type key trực tiếp từ JSON i18n**, autocomplete + bắt lỗi ngay compile-time. Chỉ là các call-site chưa tận dụng.

## Goal / Non-goals

**Goal**: mọi hàm nhận `t` làm param đều được type theo **đúng key của namespace** (autocomplete full-chain, key sai bị TS bắt), derive từ `Messages` — **không cast, không `(k: string)`, không union gõ tay**.

**Non-goals**:
- Không đổi behavior/UI (breadcrumb, table, filter render y hệt). → **Skip E2E + SuperDesign** (§4.3 / §1.5: pure refactor).
- Không đổi locale JSON (key giữ nguyên).
- Không đụng `server/`. Client-only.
- Không refactor cách gọi `useTranslations`/`getTranslations` ngoài phạm vi cần cho việc type param.

## Approach — chọn `LeafKeyOf<M>` (idiom `Messages["..."]`)

### Type helper (thêm 1 lần vào `src/types/libs.d.ts`)

```ts
import type { MessageKeys, NestedKeyOf } from "next-intl";
// ...existing: Messages, LoginMessages, SignupMessages... giữ nguyên

// leaf key union của 1 message object — KHỚP CHÍNH XÁC tập key mà t nhận
export type LeafKeyOf<M> = MessageKeys<M, NestedKeyOf<M>>;

// object type per top-namespace (theo idiom LoginMessages = Messages["login"])
export type ContactAdminMessages = Messages["contactAdmin"];
export type LoginHistoryMessages = Messages["loginHistory"];
export type AdminUsersMessages = Messages["adminUsers"];
export type AdminAppsMessages = Messages["adminApps"];
export type AdminEntitlementsMessages = Messages["adminEntitlements"];
// ...thêm object type nào feature đụng tới
```

### Nguyên tắc — type theo ĐÚNG namespace thật của param (ít churn nhất)

Mỗi param `t` được feed bởi 1 `useTranslations(NS)`/`getTranslations(NS)` ở call-site — thường là **sub-namespace sâu** (vd `useTranslations("loginHistory.location")`, `"loginHistory.status"`). **Default: type param theo đúng `NS` đó → key + call-site GIỮ NGUYÊN, chỉ đổi type**:

```ts
import type { LeafKeyOf } from "@/types/libs";

// param scope "loginHistory.location" → key ngắn "local"/"unknown" giữ nguyên
const formatLoginLocation = (
  t: (key: LeafKeyOf<LoginHistoryMessages["location"]>) => string
) => t("local");
```

Sub-namespace index inline từ object type top-level (`LoginHistoryMessages["location"]`) — không cần khai báo alias sâu cho mỗi cấp.

Truyền translator vào: gán **TRỰC TIẾP**, không wrap/cast:
```ts
const tLocation = useTranslations("loginHistory.location");
formatLoginLocation(tLocation);
```

**Breadcrumb là ngoại lệ** (đang rewrite hẳn): dùng top-namespace + key full-chain (`t("admin.detail.breadcrumb.list")`) cho gọn — xem §Breadcrumb.

### Tại sao là `MessageKeys<M, NestedKeyOf<M>>` chứ không phải thứ khác (đã verify bằng `tsc`)

- `NestedKeyOf<M>` một mình = **mọi path** kể cả nhánh trung gian (`"admin"`, `"admin.detail"`) → **rộng hơn** tập `t` nhận → `t` **không** gán được vào `(key: NestedKeyOf<M>) => string` (probe fail).
- `t` thật chỉ nhận **leaf key** (value là string). Lọc leaf bằng `MessageKeys<M, NestedKeyOf<M>>` — **đúng công thức next-intl dùng nội bộ** (`NamespacedMessageKeys`) → tập khớp khít → `t` gán trực tiếp, đồng thời **bắt cả key sai lẫn path trung gian** (`t("admin.detail.breadcrumb")` bị lỗi).
- **Không dùng `ReturnType<typeof useTranslations<...>>`**: hoạt động nhưng đi ngược yêu cầu "derive từ `Messages`, không ReturnType". `LeafKeyOf` thuần helper type, không đụng `ReturnType`.
- **Không thể tự chế `(key) => string` mà nhận được `t` trực tiếp** trừ khi key type khớp `MessageKeys` (generic + overload `rich/markup` của `t` khiến hand-written signature khác bị TS từ chối) — đó là lý do phải qua `LeafKeyOf`.
- Import helper từ **`next-intl`** (re-export sẵn), không import `use-intl` (transitive).

## Inventory — các site cần sửa (`client/src`)

| # | File | Param(s) hiện tại | Loại | Xử lý |
| --- | --- | --- | --- | --- |
| 1 | `components/CustomBreadcrumb/index.tsx` | `t(item.key as Parameters<typeof t>[0])` | cast | **Bỏ hẳn** `useTranslations`/`namespace`/cast; render `item.label` (xem §Breadcrumb) |
| 2 | `dataSources/AdminContactDetail/index.ts` | (thêm) | breadcrumb | builder nhận `t: (key: LeafKeyOf<ContactAdminMessages>) => string`, label full-chain |
| 3 | `dataSources/AdminLoginHistoryDetail/index.ts` | const | breadcrumb | const → builder nhận `t: LeafKeyOf<LoginHistoryMessages>` |
| 4 | `dataSources/LoginHistory/index.tsx` | `tStatus/tMethod/tFilters/tTable/tLocation: (k: string)` (×3 nhóm) | loose | type mỗi param theo sub-namespace thật của nó: `LeafKeyOf<LoginHistoryMessages["status"]>`, `["method"]`, `["location"]`, `["admin"]["list"]["filters"]`, `[...]["table"]`... (đọc call-site để lấy đúng cấp) |
| 5 | `dataSources/ContactAdmin/index.tsx` | `tStatus/tTable: (k: string)` | loose | `LeafKeyOf<ContactAdminMessages[...sub]>` theo namespace từng param |
| 6 | `dataSources/AdminUsers/index.tsx` | `tRole/tStatus/tToolbar/tTable: (k: string)` | loose | `LeafKeyOf<AdminUsersMessages[...sub]>` theo namespace từng param |
| 7 | `dataSources/AdminEntitlements/index.tsx` | `tTable/tGrant: (k: string)` | loose | `LeafKeyOf<AdminEntitlementsMessages[...sub]>` theo namespace từng param |
| 8 | `dataSources/AdminApps/index.tsx` | `tTable: (k: string)` | loose | `LeafKeyOf<AdminAppsMessages[...sub]>` theo namespace param |
| 9 | `dataSources/Dashboard/index.ts` (`getSortLabel`) | `t: (key: SortOption)` | union | **Verify usage trước** — grep không thấy call-site (nghi dead code). Còn dùng → type `t` theo `LeafKeyOf<...>` namespace của nó (giữ `SortOption` cho tham số `value`); không dùng → flag remove. |
| 10 | `utils/index.ts` (`formatLoginLocation`) | `t: (key: "local" \| "unknown")` | union | `LeafKeyOf<LoginHistoryMessages["location"]>` (call-site: `useTranslations("loginHistory.location")` — đã xác nhận) |

**Exception — `components/FormFieldMessage/index.tsx`**: key là **runtime string** `` `${name}.${errorKey}` `` (không biết được lúc compile) + đã guard bằng `t.has()`. Đây là **key động hợp lệ** — giữ cast `as Parameters<typeof t>[0]`, KHÔNG ép `LeafKeyOf` (không statically-typed được). Ghi rõ là exception có chủ đích.

> **Per-site namespace resolution**: mỗi param `tXxx` được feed bởi 1 `useTranslations(NS)`/`getTranslations(NS)` scope cụ thể ở call-site (thường sub-namespace sâu). `plan.md` đọc từng call-site để lấy đúng `NS` → `LeafKeyOf<Messages[...NS...]>`. **Default KHÔNG gộp translator, KHÔNG đổi key, KHÔNG đổi call-site** — chỉ sửa type param (ít churn). (Breadcrumb là ngoại lệ vì rewrite hẳn.)

## Breadcrumb — thay đổi cụ thể (application đầu tiên)

- `src/types/CustomBreadcrumb/index.ts`: `label?` → **`label` bắt buộc**:
  ```ts
  export type CustomBreadcrumbItem = { key: string; label: string; href?: string };
  ```
- `src/components/CustomBreadcrumb/index.tsx`: bỏ `useTranslations` + prop `namespace` + `type Namespace` + dòng cast; render thẳng `item.label`. Không còn hook → cân nhắc bỏ `"use client"`.
- `dataSources/AdminContactDetail` + `AdminLoginHistoryDetail`: builder nhận `t` typed `LeafKeyOf<...>`, label = `t("admin.detail.breadcrumb.list")` / `t("admin.detail.breadcrumb.current")` (contact: `current` = `id`, không dịch).
- 2 header (`AdminContactDetailHeader`, `AdminLoginHistoryDetailHeader`): dùng 1 translator scope top-namespace (`getTranslations("contactAdmin")` / `("loginHistory")`) cho cả breadcrumb + title (`t("admin.detail.title")`).

## Verification

- **Green checks (§4.7)**: `cd client && yarn lint && yarn build` (+ `npx tsc --noEmit`) phải xanh. TS là hàng rào chính — mọi key sai/param sai sẽ fail compile.
- **Không E2E** (pure refactor, không behavior mới) — §4.3 SKIP.
- Grep audit sau khi sửa: không còn `as Parameters<typeof t>` (trừ FormFieldMessage exception), không còn `(k: string) => string` / `(key: string) => string` cho translator param.

## Risks / Open items

- **Namespace mismatch**: nếu type param không khớp `NS` thật ở call-site → build fail (đúng ý — TS bắt). Resolve bằng cách đọc call-site (plan). Đây là hàng rào, không phải rủi ro âm thầm.
- **`getSortLabel` dead code**: xác nhận usage trước khi sửa (§Inventory #9).
- **`use-intl` version**: `LeafKeyOf` dựa trên `MessageKeys`/`NestedKeyOf` (next-intl 4.3.9 re-export). Nâng version next-intl cần re-verify (thấp).

## Blast radius

`client/` only: `types/libs.d.ts` + `types/CustomBreadcrumb` + `components/CustomBreadcrumb` + ~7 `dataSources/*` + `utils/index.ts` + 2 header. `docs/` cho spec. Không `server/`.
