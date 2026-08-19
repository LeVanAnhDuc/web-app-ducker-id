# List Table UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor 6 list tables to a shared column-config renderer `ListTable<T>` and deliver 4 UX improvements: content-height-when-few-items, single-line pagination, per-column align, and row-click-to-detail + kebab actions.

**Architecture:** New generic `ListTable<T>` (in `src/components/list/`) wraps `ListTableCard` + `<Table containerClassName="md:h-full">` and renders header/body from a `ListColumn<T>[]` config (columns declared as data in `dataSources/<Feature>`, built via translator fns like `buildLoginHistoryFilterDefs`). Row-click detail uses a stretched `<Link>` overlay; extra actions go in a trailing kebab column. Two CSS tweaks fix table height (`#1`) and pagination alignment (`#2`). No API/schema/query change.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind 4, shadcn/ui, next-intl.

## Global Constraints

- Read `client/.claude/CLAUDE.md` + rules (`components.md`, `views.md`, `jsx.md`, `imports.md`, `types.md`) before touching `client/src/**`.
- Component = folder `index.tsx`, single default export, arrow function. Type props **inline** at destructuring param — EXCEPT shared types (`ColumnAlign`, `ListColumn<T>`) which go in `src/types/List/index.ts`.
- Import groups ordered with section comments (`// libs`, `// types`, `// components`, `// hooks`, `// dataSources`, `// others`); only groups present.
- JSX: no `{/* */}`, no blank lines between elements.
- Navigation `<Link>` from `@/i18n/navigation` (locale-aware) — NOT `next/link`/`next/navigation`.
- Route paths / endpoints via `CONSTANTS.<DOMAIN>` — never hardcode.
- i18n: all header labels, kebab labels, and row aria-labels from locale files (`en` + `vi`); no hardcoded strings.
- Responsive: height/sticky constraints are `md:`-gated; align/row-click/kebab are NOT gated.
- No unit test framework on FE → per-task verification = `cd client/.worktrees/list-table-ux && yarn format && yarn lint && npx tsc --noEmit`. Final gate = `yarn build`. E2E + SuperDesign SKIPPED (design §9).
- Commit review gate §7: subagents STAGE only, do NOT commit per-task; main loop presents overall diff.
- Worktree client path: `D:/Learn/web-app-store-server-client/client/.worktrees/list-table-ux`. Docs path: `D:/Learn/web-app-store-server-client/docs/.worktrees/list-table-ux`.

---

### Task 1: Shared types + `alignClass` util

**Files:**
- Modify: `src/types/List/index.ts` (append)
- Modify: `src/utils/index.ts` (append)

**Interfaces:**
- Produces: `type ColumnAlign = "left" | "center" | "right"`; `interface ListColumn<T> { id; header; align?; cell; headerClassName?; cellClassName?; srOnlyHeader? }`; `alignClass(align?: ColumnAlign): string`.

- [ ] **Step 1: Append types to `src/types/List/index.ts`**

Add (keep existing content; `ReactNode` — ensure `import type { ReactNode } from "react"` exists at top, add if missing):

```ts
export type ColumnAlign = "left" | "center" | "right";

export interface ListColumn<T> {
  id: string;
  header: ReactNode;
  align?: ColumnAlign;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;
}
```

- [ ] **Step 2: Append `alignClass` to `src/utils/index.ts`**

Add (import the type at top with other type imports: `import type { ColumnAlign } from "@/types/List";`):

```ts
export const alignClass = (align?: ColumnAlign) =>
  align === "center"
    ? "text-center"
    : align === "right"
      ? "text-right"
      : "text-left";
```

- [ ] **Step 3: Verify** — `cd <client worktree> && yarn format && yarn lint && npx tsc --noEmit` → 0 errors.
- [ ] **Step 4: Stage** — `git -C <client worktree> add src/types/List/index.ts src/utils/index.ts`

---

### Task 2: `ListTable<T>` component

**Files:**
- Create: `src/components/list/ListTable/index.tsx`

**Interfaces:**
- Consumes: `ListColumn<T>`, `ColumnAlign` (Task 1), `alignClass` (Task 1), `ListTableCard`, `ui/table` primitives, `@/i18n/navigation` `Link`.
- Produces: `<ListTable columns rows getRowKey getRowHref? rowLabel? rowActions? actionsLabel? caption? />`.

- [ ] **Step 1: Create component**

```tsx
"use client";

// libs
import type { ReactNode } from "react";
// types
import type { ListColumn } from "@/types/List";
// components
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import ListTableCard from "../ListTableCard";
// others
import { Link } from "@/i18n/navigation";
import { cn } from "@/libs/utils";
import { alignClass } from "@/utils";

const ListTable = <T,>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  rowLabel,
  rowActions,
  actionsLabel,
  caption
}: {
  columns: ListColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowHref?: (row: T) => string;
  rowLabel?: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
  actionsLabel?: string;
  caption?: string;
}) => (
  <ListTableCard>
    <Table containerClassName="md:h-full">
      {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.id}
              scope="col"
              className={cn(alignClass(col.align), col.headerClassName)}
            >
              {col.srOnlyHeader ? (
                <span className="sr-only">{col.header}</span>
              ) : (
                col.header
              )}
            </TableHead>
          ))}
          {rowActions && (
            <TableHead scope="col" className="w-12 text-right">
              <span className="sr-only">{actionsLabel}</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowKey(row)}
            className={cn("relative", getRowHref && "cursor-pointer")}
          >
            {columns.map((col, colIdx) => (
              <TableCell
                key={col.id}
                className={cn(alignClass(col.align), col.cellClassName)}
              >
                {colIdx === 0 && getRowHref && (
                  <Link
                    href={getRowHref(row)}
                    aria-label={rowLabel?.(row)}
                    className="absolute inset-0 z-[1]"
                  />
                )}
                {col.cell(row)}
              </TableCell>
            ))}
            {rowActions && (
              <TableCell className="relative z-10 text-right">
                {rowActions(row)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ListTableCard>
);

export default ListTable;
```

Notes: stretched `<Link>` at `z-[1]` overlays the row (TableRow is `relative`), so the whole row navigates; actions cell at `z-10` stays clickable above it. Display-only cells are not individually clickable (accepted stretched-link tradeoff). `TableRow` base already has `hover:bg-muted/50`.

- [ ] **Step 2: Verify** — `yarn format && yarn lint && npx tsc --noEmit` → 0 errors.
- [ ] **Step 3: Stage** — `git -C <client worktree> add src/components/list/ListTable/index.tsx`

---

### Task 3: #1 — table height fits content when few items

**Files:**
- Modify: `src/components/list/ListContent/index.tsx`
- Modify: `src/components/list/ListTableCard/index.tsx`

- [ ] **Step 1: `ListContent` — drop `md:flex-1`**

In the `fullHeight` return branch, change the wrapper div className from
`"md:flex md:min-h-0 md:flex-1 md:flex-col"` to `"md:flex md:min-h-0 md:flex-col"`.

- [ ] **Step 2: `ListTableCard` — drop `md:flex-1`**

Remove `md:flex-1` from the card div className (keep `md:flex md:min-h-0 md:flex-col` + `bg-card overflow-hidden rounded-xl border` + the `[&_thead_th]` sticky/bg classes). Result class (order may differ after Prettier): `bg-card overflow-hidden rounded-xl border [&_thead_th]:bg-card md:flex md:min-h-0 md:flex-col md:[&_thead_th]:sticky md:[&_thead_th]:top-0 md:[&_thead_th]:z-10`.

- [ ] **Step 3: Verify** — `yarn format && yarn lint && npx tsc --noEmit` → 0 errors.
- [ ] **Step 4: Stage** — `git -C <client worktree> add src/components/list/ListContent/index.tsx src/components/list/ListTableCard/index.tsx`

---

### Task 4: #2 — single-line pagination (results left / controls right)

**Files:**
- Modify: `src/components/list/ListPagination/index.tsx`

**Interfaces:**
- Consumes: `CustomPagination` (accepts `className`, forwarded to `ui/pagination` `Pagination`).

- [ ] **Step 1: Edit `ListPagination`**

Change the outer wrapper to force one line, and pass an override className to `CustomPagination` so it no longer stretches/centers:

```tsx
    <div className="flex flex-nowrap items-center justify-between gap-2">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {loading && <Spinner className="size-3.5" aria-hidden="true" />}
        <span>
          {t("page")} {page} {t("of")} {totalPages} · {total} {t("results")}
        </span>
      </p>
      <CustomPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="w-auto justify-end"
      />
    </div>
```

`className="w-auto justify-end"` overrides the shadcn `Pagination` base `mx-auto flex w-full justify-center` via tailwind-merge. Do NOT edit `ui/pagination.tsx`.

- [ ] **Step 2: Verify** — `yarn format && yarn lint && npx tsc --noEmit` → 0 errors.
- [ ] **Step 3: Stage** — `git -C <client worktree> add src/components/list/ListPagination/index.tsx`

---

## Migration tasks (5–10)

**Shared migration recipe (applies to each table below):**

1. In `src/dataSources/<Feature>/index.ts`, add a builder `build<Feature>Columns(...translators + any deps) : ListColumn<TRow>[]`. Move each existing `<TableHead>` label → `header`, and each corresponding `<TableCell>` JSX → `cell: (row) => (...)` **verbatim** (same components, same className on the cell content — but cell-level layout className like `text-right`/`text-muted-foreground text-xs` moves to the column's `cellClassName`). Set `align` where the current cell/head uses `text-right`/`text-center`. Give each column a stable `id`.
   - The builder takes translator fns (pattern: `buildLoginHistoryFilterDefs`) and any runtime maps (e.g. `categoryMap`) the cells need. Type it against the row entity type from `@/types/<Feature>`.
   - Shared row types stay in `@/types/<Feature>`; the builder returns `ListColumn<TRow>[]`.
2. In the view, replace the `<ListTableCard><Table containerClassName="md:h-full">…</Table></ListTableCard>` block with `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} … />`. Build `columns` via `useMemo` from the builder (deps = translators/maps).
3. Detail table → pass `getRowHref` + `rowLabel`; remove the trailing "View"/ChevronRight button + its column. Actions table → pass `rowActions={(row) => <XxxRowActions … />}` + `actionsLabel`.
4. Read the current view file first; preserve cell JSX and behavior exactly.

Each migration task: **Steps** = (1) add builder to dataSource, (2) rewire view, (3) `yarn format && yarn lint && npx tsc --noEmit` → 0 errors, (4) stage `git -C <client worktree> add src/dataSources/<Feature> src/views/<Feature>`.

---

### Task 5: Migrate `LoginHistory` (columns only)

**Files:**
- Modify: `src/dataSources/LoginHistory/index.ts` (add `buildLoginHistoryColumns`)
- Modify: `src/views/LoginHistory/mains/LoginHistoryTable/index.tsx`
- Read: `src/views/LoginHistory/components/LoginHistoryTableRow/index.tsx` (current per-row cell JSX to migrate)

**Interfaces:**
- Consumes: `ListTable` (Task 2), `ListColumn` (Task 1).
- Row type: `LoginHistoryItem` (or as named in `@/types/LoginHistory`).

- [ ] **Step 1:** Add `buildLoginHistoryColumns(tTable, tStatus, tMethod)` returning 6 columns (`createdAt`, `method`, `status`, `deviceType`, `ip`, `country`) — move the `<td>` JSX from `LoginHistoryTableRow` into each `cell`. All `align: "left"` (default; omit). No `getRowHref`, no `rowActions` (this table has neither detail nor actions).
- [ ] **Step 2:** Rewire view: `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} caption={tTable("caption")} />`. Delete `LoginHistoryTableRow` usage (and the component file if now unused). Keep `ListPageShell fullHeight` / `ListContent fullHeight` / `ListPagination`.
- [ ] **Step 3:** Verify (recipe step 3).
- [ ] **Step 4:** Stage (recipe step 4).

---

### Task 6: Migrate `AdminLoginHistory` (row-click detail, remove View button)

**Files:**
- Modify: `src/dataSources/LoginHistory/index.ts` (add `buildAdminLoginHistoryColumns`)
- Modify: `src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`

**Interfaces:**
- Consumes: `ListTable`, `CONSTANTS.ROUTES.ADMIN_LOGIN_HISTORY`, `@/i18n/navigation` (via ListTable — view no longer needs `useRouter`).

- [ ] **Step 1:** Add `buildAdminLoginHistoryColumns(tTable, tMethod, tStatus)` returning columns for: `usernameAttempted`, `method`, `status`, `ipLocation`, `isAnomaly`, `createdAt` — move each current `<TableCell>` JSX into `cell`. Do NOT create an actions column. `align` default left.
- [ ] **Step 2:** Rewire view: `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} caption={tTable("caption")} getRowHref={(r) => \`${ADMIN_LOGIN_HISTORY}/${r._id}\`} rowLabel={(r) => tTable("viewDetailFor", { name: r.usernameAttempted })} />`. Remove the last `<TableHead>`/`<TableCell>` with the ChevronRight `viewDetail` button and the now-unused `useRouter`, `ChevronRight`, `CustomButton` imports. Add i18n key `loginHistory.table.viewDetailFor` (en: "View details for {name}", vi: "Xem chi tiết cho {name}") to both locale files.
- [ ] **Step 3:** Verify.
- [ ] **Step 4:** Stage (+ `git -C <client worktree> add src/locales`).

---

### Task 7: Migrate `AdminContact` (row-click detail, remove View button)

**Files:**
- Modify: `src/dataSources/ContactAdmin/index.ts` (or the dataSource this view uses — confirm by reading the view's dataSource import; add `buildAdminContactColumns`)
- Modify: `src/views/AdminContact/mains/AdminContactTable/index.tsx`

- [ ] **Step 1:** Add `buildAdminContactColumns(tTable, tStatus, statusVariant)` for columns: `ticketNumber` (ShortId, `font-mono text-xs font-medium` → cellClassName), `email`, `subject` (`max-w-[200px] truncate` → cellClassName), `status` (CustomBadge), `createdAt` (FormatTime). No actions column.
- [ ] **Step 2:** Rewire view: `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} getRowHref={(r) => \`${ADMIN_CONTACT}/${r._id}\`} rowLabel={(r) => tTable("viewDetailFor", { id: r._id })} />`. Remove ChevronRight view button column + unused `useRouter`/`ChevronRight`/`CustomButton` imports. Add i18n key `<contact namespace>.table.viewDetailFor` to en + vi.
- [ ] **Step 3:** Verify.
- [ ] **Step 4:** Stage (+ locales).

---

### Task 8: Migrate `AdminUsers` (kebab actions)

**Files:**
- Modify: `src/dataSources/AdminUsers/index.ts` (add `buildAdminUsersColumns`)
- Modify: `src/views/AdminUsers/mains/AdminUsersTable/index.tsx`

**Interfaces:**
- Reuses existing `UserRowActions` component + the reset/lock/force-logout dialogs & state (keep them in the view).

- [ ] **Step 1:** Add `buildAdminUsersColumns(tTable)` for: `user` (fullName + email stack), `role` (`UserRoleBadge`), `status` (`UserStatusBadge`), `lastLoginAt` (FormatTime or `neverLoggedIn`), `createdAt` (FormatTime). No actions column in the builder (ListTable adds it).
- [ ] **Step 2:** Rewire view: `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} rowActions={(user) => <UserRowActions user={user} onResetPassword={setResetTarget} onLockToggle={setLockTarget} onForceLogout={setForceLogoutTarget} />} actionsLabel={tTable("actions")} />`. Keep all dialogs + state. No `getRowHref` (no user detail page).
- [ ] **Step 3:** Verify.
- [ ] **Step 4:** Stage.

---

### Task 9: Migrate `AdminApps` (kebab actions)

**Files:**
- Modify: `src/dataSources/AdminApps/index.ts` (add `buildAdminAppsColumns`)
- Modify: `src/views/AdminApps/mains/AdminAppsTable/index.tsx`

- [ ] **Step 1:** Add `buildAdminAppsColumns(tTable, categoryMap)` for: `app` (displayName + name stack), `category` (`categoryMap.get(app.categoryId) ?? "—"`), `status` (`AppStatusBadge`), `roles` (RoleChip list), `redirectUris` (`app.redirectUris.length`), `updatedAt` (FormatTime). No actions column in builder.
- [ ] **Step 2:** Rewire view: `<ListTable columns={columns} rows={items} getRowKey={(r) => r._id} rowActions={(app) => <AppRowActions app={app} onEdit={handleEdit} onHide={handleHide} onUnhide={handleUnhide} />} actionsLabel={tTable("actions")} />`. Keep form sheet / hide / secret dialogs + handlers. `totalPages={1}` on pagination stays. No `getRowHref`.
- [ ] **Step 3:** Verify.
- [ ] **Step 4:** Stage.

---

### Task 10: Migrate `AdminEntitlements` (kebab action, conditional, no pagination)

**Files:**
- Modify: `src/dataSources/AdminEntitlements/index.ts` (create if missing; add `buildAdminEntitlementsColumns`)
- Read + Modify: `src/views/AdminEntitlements/mains/AdminEntitlementsTable/index.tsx`

- [ ] **Step 1:** Read the view first (table renders inside a conditional and has a revoke action). Add `buildAdminEntitlementsColumns(tTable, ...)` for columns `app`, `requiredRoles`, `status`, `grantInfo` (move current cell JSX). The trailing revoke action becomes `rowActions`.
- [ ] **Step 2:** Rewire the `<ListTableCard><Table>…</Table></ListTableCard>` block (inside its existing conditional branch) to `<ListTable columns={columns} rows={rows} getRowKey={(r) => r.app._id} rowActions={(row) => (…existing revoke trigger…)} actionsLabel={tTable("actions")} />`. Keep the conditional, the revoke dialog, and the no-pagination layout. No `getRowHref`.
- [ ] **Step 3:** Verify.
- [ ] **Step 4:** Stage.

---

### Task 11: Final verification gate + manual visual check

**Files:** none.

- [ ] **Step 1: Green-checks §4.7** — `cd <client worktree> && yarn lint && yarn build` → build success, 0 lint errors. (Copy `.env.local` from main client into the worktree first if `yarn build` fails on the `next.config` rewrite — the env is gitignored and not checked out into worktrees.)
- [ ] **Step 2: Manual visual (main loop coordinates, app running):** record PASS/FAIL for design §9 checklist —
  1. Few items → card height fits content (no full-viewport stretch); many items → internal scroll + sticky header.
  2. Pagination: results left / controls right, one line, all 6 tables.
  3. Align: any `center`/`right` column aligns in header + cells.
  4. Row-click (AdminContact, AdminLoginHistory): click row → detail; hover bg + cursor; Tab→row→Enter opens; kebab (if any) doesn't navigate.
  5. Kebab actions (AdminUsers/AdminApps/AdminEntitlements) behave as before.
  6. light/dark + en/vi + `<md` (natural scroll, no sticky lock).
- [ ] **Step 3:** On regression → `superpowers:systematic-debugging`, fix in the owning task, re-run gate.

---

## Order & dependencies

- Task 1 → Task 2 (ListTable needs types + alignClass + is used by all migrations).
- Task 3, 4 independent of each other and of 2 (can run anytime after 1).
- Tasks 5–10 each depend on Task 2 (and 1). They touch disjoint files → safe to run one-at-a-time in sequence (subagent-driven).
- Task 11 depends on all.

## Post-implementation (main loop)

- **Security review §4.5:** SKIP — pure FE render/layout + navigation via `<Link>`; no auth/input/data-exposure surface.
- **CLAUDE.md drift §4.6:** feature adds `ListTable` + column-config pattern in `dataSources`. Update `client/.claude/CLAUDE.md` (list shell mentions ListTable + column-config) — non-blocking, gitignored (won't be in PR).
- **README §4.8:** SKIP — no setup/config/env/deps change.
- **Commit gate §7 → PR:** present overall diff (client + docs), commit per-repo, `creating-github-pr` (stop before merge per user).
