# Full-height List Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm 6 trang table trong dashboard/admin gọn trong chiều cao viewport (≥md): header cột sticky, chỉ rows cuộn nội bộ, pagination ghăm đáy; <md cuộn tự nhiên.

**Architecture:** App-shell flex — `#main-content` (2 layout) thành flex-column lấp đầy chiều cao → `ListPageShell fullHeight` + `ListContent fullHeight` truyền chiều cao xuống → `ListTableCard` (mới) bound vùng cuộn + sticky header → `<Table containerClassName>` (patch nhỏ `ui/table.tsx`) làm container cuộn dọc. Thuần layout/CSS + structure JSX; không chạm data/API/query.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui.

## Global Constraints

- **Convention nguồn:** `client/.claude/CLAUDE.md` + rules (`components.md`, `views.md`, `jsx.md`, `imports.md`, `types.md`). Đọc trước khi sửa `client/src/**`.
- **`ui/*` immutable trừ PROJECT-PATCH:** sửa `ui/table.tsx` phải comment `// PROJECT-PATCH: …` + ghi ADR (`components.md` Rule 1 exception).
- **Custom* wrapper:** không import raw `ui/*` khi đã có Custom wrapper. `<Table>` không có Custom wrapper → dùng raw hợp lệ.
- **Type props inline** tại tham số destructuring; component = folder `index.tsx`, 1 default export, arrow function (`component-folder.md`).
- **JSX:** không comment `{/* */}`, không blank line giữa JSX element (`jsx.md`).
- **Responsive:** mọi ràng buộc full-height gắn prefix `md:` (≥768px). Dưới md không kích hoạt.
- **Token:** nền sticky header dùng `bg-card` (design system), không hard-code màu.
- **Không có unit test FE** — verification per task = `cd client && yarn format && yarn lint && npx tsc --noEmit`. Final gate = `yarn build`. E2E matrix đã SKIP (xem design §7).
- **Commit review gate §7:** subagent stage nhưng KHÔNG commit per-task; main loop trình diff tổng thể để user duyệt rồi mới commit.

---

### Task 1: Patch `ui/table.tsx` — expose `containerClassName` + ADR

**Files:**
- Modify: `client/src/components/ui/table.tsx:5-17`
- Create: `docs/adr/0001-table-container-classname.md`

**Interfaces:**
- Produces: `<Table containerClassName?: string>` — class merge vào div container cuộn (`relative w-full overflow-auto`). Mặc định không truyền → hành vi y như cũ.

- [ ] **Step 1: Patch `Table` component**

Sửa `client/src/components/ui/table.tsx`, chỉ đụng `Table` (dòng 5-17):

```tsx
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }
>(({ className, containerClassName, ...props }, ref) => (
  // PROJECT-PATCH: expose containerClassName to bound the scroll container for full-height sticky-scroll tables (see docs/adr/0001)
  <div className={cn("relative w-full overflow-auto", containerClassName)}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
```

Các component khác trong file giữ NGUYÊN.

- [ ] **Step 2: Write ADR**

Tạo `docs/adr/0001-table-container-classname.md`:

```markdown
# ADR 0001 — Expose `containerClassName` on shadcn `Table`

**Status:** Accepted
**Date:** 2026-07-07

## Context

shadcn `Table` (`client/src/components/ui/table.tsx`) bọc `<table>` trong một div scroll `relative w-full overflow-auto` với class hard-code, không nhận className. Tính năng full-height list tables (specs/full-height-list-tables) cần bound chiều cao container scroll này để có sticky header + rows cuộn nội bộ. Wrap từ bên ngoài không khả thi: nested-scroll làm hỏng `position: sticky` (thead sticky bám vào scroll container gần nhất, phải là chính div overflow đó).

## Decision

Thêm optional prop `containerClassName` forward vào div container, merge qua `cn()`. Không đổi hành vi mặc định (không truyền → y như trước). Đây là ngoại lệ PROJECT-PATCH của rule "immutable `ui/*`" trong `client/.claude/rules/components.md`.

## Consequences

- Divergence khỏi shadcn upstream (upstream chưa expose prop này) → khi `npx shadcn@latest add --diff table` cần re-apply patch thủ công. Comment `// PROJECT-PATCH` đánh dấu điểm này.
- Cho phép `ListTableCard` + full-height tables hoạt động mà không phải fork toàn bộ Table primitive.
```

- [ ] **Step 3: Verify**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error. (`containerClassName` optional → không file nào hiện dùng bị ảnh hưởng.)

- [ ] **Step 4: Stage (KHÔNG commit — commit gate §7)**

```bash
git -C client add src/components/ui/table.tsx
git -C docs add adr/0001-table-container-classname.md
```

---

### Task 2: Layout height-chain — `#main-content` flex-fill (2 layout)

**Files:**
- Modify: `client/src/layouts/DashboardLayout/index.tsx:42`
- Modify: `client/src/layouts/AdminLayout/index.tsx:42`

**Interfaces:**
- Produces: `#main-content` là flex-column có chiều cao xác định (`flex min-h-0 flex-1 flex-col`) → con opt-in dùng được `md:h-full`/`flex-1`.

- [ ] **Step 1: Sửa DashboardLayout**

`client/src/layouts/DashboardLayout/index.tsx`, dòng 42:

```tsx
<div id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
  {children}
</div>
```

- [ ] **Step 2: Sửa AdminLayout**

`client/src/layouts/AdminLayout/index.tsx`, dòng 42 — y hệt:

```tsx
<div id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
  {children}
</div>
```

- [ ] **Step 3: Verify + no-regression check**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error.

Manual (bước implement ghi nhận, verify ở Task 7): các trang thường (Profile, Billing, Notifications, AdminDashboard, Home) + 2 grid (Apps, Favorites) vẫn cuộn document bình thường — `#main-content` flex-fill chỉ stretch, content tràn thì `SidebarInset` (`overflow-y-auto`) cuộn như cũ.

- [ ] **Step 4: Stage**

```bash
git -C client add src/layouts/DashboardLayout/index.tsx src/layouts/AdminLayout/index.tsx
```

---

### Task 3: `ListPageShell` — prop `fullHeight`

**Files:**
- Modify: `client/src/components/list/ListPageShell/index.tsx`

**Interfaces:**
- Consumes: —
- Produces: `<ListPageShell fullHeight?: boolean>` — khi `true`, shell thành `flex flex-col gap-6 md:h-full md:min-h-0`. Mặc định giữ `flex flex-col gap-6`.

- [ ] **Step 1: Sửa component**

```tsx
// libs
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const ListPageShell = ({
  fullHeight = false,
  children
}: {
  fullHeight?: boolean;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "flex flex-col gap-6",
      fullHeight && "md:h-full md:min-h-0"
    )}
  >
    {children}
  </div>
);

export default ListPageShell;
```

- [ ] **Step 2: Verify**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error. (Các trang chưa truyền `fullHeight` → default false → class không đổi.)

- [ ] **Step 3: Stage**

```bash
git -C client add src/components/list/ListPageShell/index.tsx
```

---

### Task 4: `ListContent` — prop `fullHeight`

**Files:**
- Modify: `client/src/components/list/ListContent/index.tsx`

**Interfaces:**
- Consumes: —
- Produces: `<ListContent fullHeight?: boolean … >` — khi `true`, bọc mọi state (skeleton / empty / children) trong wrapper `md:flex md:min-h-0 md:flex-1 md:flex-col` để lấp đầy vùng còn lại. Mặc định (`false`) render y như cũ (không wrapper thêm).

- [ ] **Step 1: Sửa component**

```tsx
"use client";

// libs
import type { ReactNode } from "react";
// components
import ListEmptyState from "../ListEmptyState";

const ListContent = ({
  isLoading,
  isEmpty,
  hasActiveFilters,
  onClearFilters,
  skeleton,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  fullHeight = false,
  children
}: {
  isLoading: boolean;
  isEmpty: boolean;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  skeleton: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  fullHeight?: boolean;
  children: ReactNode;
}) => {
  const content = isLoading ? (
    skeleton
  ) : isEmpty ? (
    <ListEmptyState
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      title={emptyTitle}
      description={emptyDescription}
      icon={emptyIcon}
      action={emptyAction}
    />
  ) : (
    children
  );
  if (!fullHeight) return <>{content}</>;
  return (
    <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">{content}</div>
  );
};

export default ListContent;
```

- [ ] **Step 2: Verify**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error. (Callers hiện tại không truyền `fullHeight` → `<>{content}</>` giữ hành vi cũ.)

- [ ] **Step 3: Stage**

```bash
git -C client add src/components/list/ListContent/index.tsx
```

---

### Task 5: `ListTableCard` — component card + scroll + sticky header

**Files:**
- Create: `client/src/components/list/ListTableCard/index.tsx`

**Interfaces:**
- Consumes: —
- Produces: `<ListTableCard>{children}</ListTableCard>` — thay cho `<div className="bg-card rounded-xl border">`. ≥md: flex-column lấp đầy vùng cha (`md:flex md:min-h-0 md:flex-1 md:flex-col`), `overflow-hidden` để bo góc, và style descendant `<th>` sticky (`md:[&_thead_th]:sticky md:[&_thead_th]:top-0 md:[&_thead_th]:z-10`) + nền `[&_thead_th]:bg-card`. Children kỳ vọng là `<Table containerClassName="md:h-full">`.

- [ ] **Step 1: Tạo component**

```tsx
// libs
import type { ReactNode } from "react";

const ListTableCard = ({ children }: { children: ReactNode }) => (
  <div className="bg-card overflow-hidden rounded-xl border [&_thead_th]:bg-card md:flex md:min-h-0 md:flex-1 md:flex-col md:[&_thead_th]:sticky md:[&_thead_th]:top-0 md:[&_thead_th]:z-10">
    {children}
  </div>
);

export default ListTableCard;
```

Ghi chú kỹ thuật: sticky đặt trên `th` (không `thead`) để tương thích rộng; scroll container thật là div `overflow-auto` bên trong `<Table>` (được bound bởi `containerClassName="md:h-full"` — set ở Task 6). `bg-card` trên `th` để rows không lộ sau header khi cuộn.

- [ ] **Step 2: Verify**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error.

- [ ] **Step 3: Stage**

```bash
git -C client add src/components/list/ListTableCard/index.tsx
```

---

### Task 6: Wire 6 trang table dùng full-height

**Files (mỗi file cùng một phép biến đổi):**
- Modify: `client/src/views/AdminContact/mains/AdminContactTable/index.tsx`
- Modify: `client/src/views/AdminUsers/mains/AdminUsersTable/index.tsx`
- Modify: `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
- Modify: `client/src/views/AdminEntitlements/mains/AdminEntitlementsTable/index.tsx`
- Modify: `client/src/views/AdminApps/mains/AdminAppsTable/index.tsx`
- Modify: `client/src/views/LoginHistory/mains/LoginHistoryTable/index.tsx`

**Interfaces:**
- Consumes: `ListPageShell fullHeight` (Task 3), `ListContent fullHeight` (Task 4), `ListTableCard` (Task 5), `Table containerClassName` (Task 1).

**Phép biến đổi cho MỖI file (4 sửa đổi, giống nhau):**

1. Thêm import (đúng nhóm `// components` theo `imports.md`, cạnh các import `@/components/list/*` hiện có):
   ```tsx
   import ListTableCard from "@/components/list/ListTableCard";
   ```
2. `<ListPageShell>` → `<ListPageShell fullHeight>`.
3. `<ListContent … >` → thêm prop `fullHeight` (giữ nguyên các prop khác):
   ```tsx
   <ListContent fullHeight isLoading={…} isEmpty={…} … >
   ```
4. Đổi khối card + table:
   ```tsx
   <div className="bg-card rounded-xl border">
     <Table>
       …
     </Table>
   </div>
   ```
   thành:
   ```tsx
   <ListTableCard>
     <Table containerClassName="md:h-full">
       …
     </Table>
   </ListTableCard>
   ```
   (Nội dung bên trong `<Table>` — `TableCaption`/`TableHeader`/`TableBody` — giữ NGUYÊN. KHÔNG thêm sticky class thủ công lên `TableHeader`/`TableHead`; `ListTableCard` đã style descendant `th`.)

- [ ] **Step 1: Áp cho AdminContactTable**

File `client/src/views/AdminContact/mains/AdminContactTable/index.tsx`: thêm import (Step chung #1), sửa `<ListPageShell fullHeight>` (dòng ~89), `<ListContent fullHeight …>` (dòng ~99), đổi card block (dòng ~107-163) sang `<ListTableCard><Table containerClassName="md:h-full">…</Table></ListTableCard>`.

- [ ] **Step 2: Áp cho AdminUsersTable**

`client/src/views/AdminUsers/mains/AdminUsersTable/index.tsx`: card block dòng ~106-160. Cùng 4 sửa đổi.

- [ ] **Step 3: Áp cho AdminLoginHistoryTable**

`client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`: `<ListPageShell>` dòng 84, `<ListContent>` dòng 90, card block dòng 98-173. Cùng 4 sửa đổi.

- [ ] **Step 4: Áp cho AdminEntitlementsTable**

`client/src/views/AdminEntitlements/mains/AdminEntitlementsTable/index.tsx`: `<ListPageShell>` dòng 110, `<ListContent>` dòng 120, card block dòng 127-195. Cùng 4 sửa đổi. LƯU Ý: file này KHÔNG có `<ListPagination>` — chỉ áp `fullHeight` + `ListTableCard` như các file khác, không thêm pagination. Nếu table render trong nhánh điều kiện (theo user đã chọn), giữ nguyên điều kiện, chỉ đổi phần card→ListTableCard.

- [ ] **Step 5: Áp cho AdminAppsTable**

`client/src/views/AdminApps/mains/AdminAppsTable/index.tsx`: `<ListPageShell>` dòng 163, `<ListContent>` dòng 183, card block dòng 192-250. Cùng 4 sửa đổi.

- [ ] **Step 6: Áp cho LoginHistoryTable**

`client/src/views/LoginHistory/mains/LoginHistoryTable/index.tsx`: `<ListPageShell>` dòng 71, `<ListContent>` dòng 73, card block dòng 81-100. Cùng 4 sửa đổi.

- [ ] **Step 7: Verify**

Run: `cd client && yarn format && yarn lint && npx tsc --noEmit`
Expected: 0 error. Kiểm tra không còn `bg-card rounded-xl border` trong 6 file (đã thay bằng ListTableCard):
Run: `cd client && grep -rn "bg-card rounded-xl border" src/views/{AdminContact,AdminUsers,AdminLoginHistory,AdminEntitlements,AdminApps,LoginHistory}`
Expected: no match.

- [ ] **Step 8: Stage**

```bash
git -C client add src/views/AdminContact src/views/AdminUsers src/views/AdminLoginHistory src/views/AdminEntitlements src/views/AdminApps src/views/LoginHistory
```

---

### Task 7: Final verification gate (§4.7) + manual visual check

**Files:** none (verification only).

- [ ] **Step 1: Green-checks gate FE**

Run: `cd client && yarn lint && yarn build`
Expected: build success, 0 lint error.

- [ ] **Step 2: Manual visual verification (app chạy — main loop điều phối)**

Với mỗi mục, ghi PASS/FAIL:
1. 6 trang table ≥md (desktop): header cột sticky khi cuộn; chỉ rows cuộn nội bộ; pagination (5 trang có) luôn thấy ở đáy, không phải cuộn trang. AdminEntitlements: table cuộn nội bộ khi chọn user có nhiều entitlement.
2. Danh sách ngắn (ít row): khung vẫn gọn viewport, không tạo scroll trang.
3. <md (thu nhỏ browser / mobile): cuộn trang tự nhiên, header không sticky-lock.
4. No-regression: Profile, Billing, Notifications, AdminDashboard, Home + 2 grid (Apps, Favorites) cuộn document như cũ.
5. Sidebar collapse/expand + light/dark + switch locale en↔vi: layout không vỡ, sticky header nền đúng (`bg-card` cả 2 theme).

- [ ] **Step 3: (Nếu có regression) quay lại systematic-debugging** — chẩn đoán root cause, fix ở task tương ứng, chạy lại gate.

---

## Thứ tự & phụ thuộc

- Task 1, 2, 3, 4, 5 độc lập nhau → có thể chạy song song (subagent-driven dispatch).
- Task 6 phụ thuộc 1, 3, 4, 5.
- Task 7 phụ thuộc tất cả.

## Post-implementation (main loop, ngoài phạm vi task code)

- **CLAUDE.md drift audit §4.6:** feature thêm component list shell mới (`ListTableCard`) + prop mới (`fullHeight`) + patch `ui/table.tsx`. Cân nhắc cập nhật `client/.claude/CLAUDE.md` (Core Patterns — list shell) + rule `components.md` (bảng Custom*/ui, ghi `Table containerClassName` PROJECT-PATCH). Non-blocking.
- **Security review §4.5:** SKIP — thuần layout/CSS, không chạm auth/input/data nhạy cảm/bề mặt tấn công.
- **README §4.8:** SKIP — không đổi setup/config/env/deps/cách chạy.
- **Commit review gate §7:** trình diff tổng thể (client + docs) cho user duyệt → commit per-repo → creating-github-pr (dừng trước merge).
