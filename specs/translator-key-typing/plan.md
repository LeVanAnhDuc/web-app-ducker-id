# Plan — Type-safe translator params (`LeafKeyOf`)

Nguồn: `design.md`. Refactor client-only, không đổi behavior. TS (`npx tsc --noEmit`) + `yarn lint` + `yarn build` là verification gate. Không E2E.

## Namespace map (resolved từ call-site — authoritative)

Mỗi param `t` scope đúng 1 namespace ở call-site → type param = `LeafKeyOf<Messages[...ns...]>`, và call-site **truyền translator trực tiếp** (bỏ wrapper `(k) => tX(k as Parameters<typeof tX>[0])`).

| dataSource / util | param | namespace (call-site) | type mới |
| --- | --- | --- | --- |
| `LoginHistory` (3 builders) | tStatus | `loginHistory.status` | `LeafKeyOf<LoginHistoryMessages["status"]>` |
| | tMethod | `loginHistory.method` | `LeafKeyOf<LoginHistoryMessages["method"]>` |
| | tFilters | `loginHistory.filters` | `LeafKeyOf<LoginHistoryMessages["filters"]>` |
| | tTable | `loginHistory.table` | `LeafKeyOf<LoginHistoryMessages["table"]>` |
| | tLocation | `loginHistory.location` | `LeafKeyOf<LoginHistoryMessages["location"]>` |
| `ContactAdmin` (2 builders) | tStatus | `contactAdmin.admin.list.status` | `LeafKeyOf<ContactAdminMessages["admin"]["list"]["status"]>` |
| | tTable | `contactAdmin.admin.list.table` | `LeafKeyOf<ContactAdminMessages["admin"]["list"]["table"]>` |
| `AdminUsers` (2 builders) | tRole | `adminUsers.role` | `LeafKeyOf<AdminUsersMessages["role"]>` |
| | tStatus | `adminUsers.status` | `LeafKeyOf<AdminUsersMessages["status"]>` |
| | tToolbar | `adminUsers.toolbar` | `LeafKeyOf<AdminUsersMessages["toolbar"]>` |
| | tTable | `adminUsers.table` | `LeafKeyOf<AdminUsersMessages["table"]>` |
| `AdminApps` | tTable | `adminApps.table` | `LeafKeyOf<AdminAppsMessages["table"]>` |
| `AdminEntitlements` | tTable | `adminEntitlements.table` | `LeafKeyOf<AdminEntitlementsMessages["table"]>` |
| | tGrant | `adminEntitlements.grantInfo` | `LeafKeyOf<AdminEntitlementsMessages["grantInfo"]>` |
| `utils.formatLoginLocation` | t | `loginHistory.location` | `LeafKeyOf<LoginHistoryMessages["location"]>` |
| `Dashboard.getSortLabel` | — | — | **DEAD CODE** (no call-site) → remove hàm + `SortOption` param nếu không dùng nơi khác |

Breadcrumb (rewrite riêng): `AdminContactDetail` dùng `LeafKeyOf<ContactAdminMessages>` + key full-chain; `AdminLoginHistoryDetail` dùng `LeafKeyOf<LoginHistoryMessages>`.

> Lưu ý cast value→key: nhiều call gọi `tMethod(item.method)`, `tStatus(item.status)`, `tStatus(v)` với value là enum type (`LoginHistoryMethod`/`Status`, `ContactStatus`...). Sau khi type param = `LeafKeyOf<...>`, các enum value này **phải** assignable vào leaf-key (khi i18n key trùng enum value). Nếu tsc báo mismatch → giữ lại cast tối thiểu tại điểm đó + note; KHÔNG nới type param về `string`.

## Tasks

### T1 — Type helper + object aliases (`client/src/types/libs.d.ts`)
- Thêm `import type { MessageKeys, NestedKeyOf } from "next-intl"`.
- Thêm `export type LeafKeyOf<M> = MessageKeys<M, NestedKeyOf<M>>;`.
- Thêm object aliases: `ContactAdminMessages`, `LoginHistoryMessages`, `AdminUsersMessages`, `AdminAppsMessages`, `AdminEntitlementsMessages` (= `Messages["<ns>"]`).

### T2 — Breadcrumb (FS-ish, client)
- `types/CustomBreadcrumb/index.ts`: `label?` → `label` bắt buộc.
- `components/CustomBreadcrumb/index.tsx`: bỏ `useTranslations` + prop `namespace` + `type Namespace` + cast; render `item.label`; cân nhắc bỏ `"use client"`.
- `dataSources/AdminContactDetail/index.ts`: builder `(id, t: (key: LeafKeyOf<ContactAdminMessages>) => string)`, label `t("admin.detail.breadcrumb.list")`, current = id.
- `dataSources/AdminLoginHistoryDetail/index.ts`: const → builder `(t: (key: LeafKeyOf<LoginHistoryMessages>) => string)`, `t("admin.detail.breadcrumb.list"|".current")`.
- `AdminContactDetailHeader` / `AdminLoginHistoryDetailHeader`: `getTranslations("contactAdmin")` / `("loginHistory")`, breadcrumb + title (`t("admin.detail.title")`) dùng chung translator, bỏ prop `namespace`.

### T3 — dataSources loose `(k: string)` → typed (theo map)
Sửa signature param + **call-site truyền translator trực tiếp** (bỏ wrapper cast):
- `dataSources/LoginHistory/index.tsx` + view `LoginHistoryTable`, `AdminLoginHistoryTable`.
- `dataSources/ContactAdmin/index.tsx` + view `AdminContactTable`.
- `dataSources/AdminUsers/index.tsx` + view `AdminUsersTable`.
- `dataSources/AdminApps/index.tsx` + view `AdminAppsTable` (kèm các cast rời `tStatus(s as ...)`, `tToolbar("status" as ...)` → bỏ).
- `dataSources/AdminEntitlements/index.tsx` + view `AdminEntitlementsTable`.

### T4 — utils + dead code
- `utils/index.ts` `formatLoginLocation`: param `t` → `LeafKeyOf<LoginHistoryMessages["location"]>`.
- `dataSources/Dashboard/index.ts`: remove `getSortLabel` (dead). Kiểm tra `SortOption` còn dùng chỗ khác không trước khi bỏ import.

### T5 — Exception giữ nguyên
- `components/FormFieldMessage/index.tsx`: **không sửa** — key runtime động, cast có chủ đích.

### T6 — Convention doc (§4.6 drift)
- Thêm rule ngắn vào `client/.claude/rules/` (hoặc mục i18n trong types.md): "translator param → `LeafKeyOf<Messages[...ns]>`, KHÔNG `(k:string)`/cast/union". (client/.claude gitignored — [[reference_client_claude_gitignored]] — flag: không vào PR.)

## Verify (§4.7)
`cd client && yarn lint && npx tsc --noEmit && yarn build` — xanh hết. Grep audit: hết `as Parameters<typeof t` (trừ FormFieldMessage), hết `(k: string) => string` / `(key: string) => string` translator param.

## Security (§4.5)
Skip — pure type refactor, không đụng auth/input/data nhạy cảm. Ghi lý do.

## Non-goals
Không đổi locale JSON, không đổi behavior/UI, không E2E, không SuperDesign, không `server/`.
