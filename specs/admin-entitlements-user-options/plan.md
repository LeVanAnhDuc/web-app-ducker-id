# Plan — AdminEntitlements: multi-user picker + bulk matrix

> Từ `design.md`. Slice FE-only (BE tái dùng `/admin/users` search, không đổi). Entitlement trên mock.

## Task FE-1 — Multi-select user picker (chạm `client/src/**`)
- Tái dùng `getAdminUsers({search, limit:20})` (`requests/adminUsers.ts`); bỏ `getAdminUserOptions` + `ADMIN_USER_OPTIONS` + type `AdminUserOption` (leftover slice cũ).
- Hook `useAdminUsersSearch` (debounce 300ms, `enabled` khi có query) trả `AdminUser[]` từ `.items`.
- Component `UserMultiSelect` (field + chips + Popover kết quả), `UserChip` (× remove). Selected = local state `AdminUser[]` ở orchestrator.
- a11y: `role=combobox`/`aria-expanded`, `useAnnounce` cho result count + selection.

## Task FE-2 — Bulk app-access matrix trên mock (chạm `client/src/**`)
- Rework `@/mocks/AdminEntitlements`: `getBulkEntitlements(userIds)` → per-app `{app, grantedCount, totalCount, status, insufficientRoleUserIds}`; `grantEntitlementBulk({appId,userIds})` / `revokeEntitlementBulk(...)`.
- App list từ `getAdminApps()`. Trạng thái tổng hợp: All granted / M/N granted (partial) / Not granted / Role required (khi có user thiếu role).
- `BulkEntitlementMatrix` + `AppAccessRow` + status badge; Grant all/Revoke all (revoke có confirm dialog); empty state "No users selected".
- Hooks `useBulkEntitlements` / `useGrantBulk` / `useRevokeBulk` (query key 1 nơi, invalidate sau mutation).
- Types bulk ở `src/types/AdminEntitlements`; enum status ở `constants/entitlementStatus.ts` (thêm PARTIAL nếu cần, derive type).

## Task DOCS-1 — Spec (chạm `docs/**`)
- `design.md`, `plan.md`, `e2e.md` + mock đã duyệt `ui-designs/admin-entitlements-user-options/picker-bulk-matrix.html`.

## Verify
- FE: `yarn lint && yarn build` xanh. i18n en+vi đủ. Không hardcode string/route/endpoint.
- Security: skip (không bề mặt BE mới — DR §6). E2E: hoãn slice sau (`e2e.md`).
