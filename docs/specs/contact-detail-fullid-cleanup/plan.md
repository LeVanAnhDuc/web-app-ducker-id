# Contact detail full-id + breadcrumb + remove Files column — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Detail hiện full `_id` ticket, breadcrumb hiện full `_id`, và bỏ cột "Tệp" trong table list.

**Architecture:** FE-only. Mở rộng `CustomBreadcrumb` để nhận `label` override, truyền `id` xuống header detail, đổi render detail card sang full id, gỡ cột attachments.

**Tech Stack:** Next.js App Router + React + TypeScript + next-intl + Tailwind + shadcn.

## Global Constraints

- Chỉ chạm `client/src/**` + i18n. BE không đổi. Đọc `client/.claude/CLAUDE.md` (đọc từ main checkout — `.claude/` gitignore trong worktree) + `.claude/rules/views.md` trước khi sửa.
- Mọi string UI qua next-intl. Full id = `contact._id` / route param `id` (24-hex), render `font-mono`.
- FE verify = `cd client && yarn lint && yarn build`. Behavior verify ở Task 4 (E2E).
- Backward-compat: mở rộng `CustomBreadcrumb` KHÔNG được làm hỏng breadcrumb hiện có (item không có `label` vẫn dịch qua `key`).

---

### Task 1: `CustomBreadcrumb` — hỗ trợ `label` override

**Files:**
- Modify: `client/src/types/CustomBreadcrumb/index.ts`
- Modify: `client/src/components/CustomBreadcrumb/index.tsx`

**Interfaces:**
- Produces: `CustomBreadcrumbItem` có thêm optional `label?: string`; `CustomBreadcrumb` render `item.label ?? t(item.key)`.

- [ ] **Step 1: Thêm `label?` vào type**

Mở `types/CustomBreadcrumb/index.ts`, thêm field optional `label?: string` vào interface `CustomBreadcrumbItem` (giữ `key`, `href?` như cũ). Đọc file trước để khớp shape.

- [ ] **Step 2: Render label override trong component**

Trong `components/CustomBreadcrumb/index.tsx`, đổi dòng:
```tsx
const label = t(item.key as Parameters<typeof t>[0]);
```
thành:
```tsx
const label = item.label ?? t(item.key as Parameters<typeof t>[0]);
```
(item có `label` → dùng thẳng, không gọi `t`; item cũ không `label` → dịch qua `key` như trước.)

- [ ] **Step 3: Verify**

Run: `cd client && yarn lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/CustomBreadcrumb src/components/CustomBreadcrumb
git commit -m "feat(breadcrumb): support raw label override on breadcrumb items"
```

---

### Task 2: Contact detail — full `_id` ở card + breadcrumb

**Files:**
- Modify: `client/src/dataSources/AdminContactDetail/index.ts`
- Modify: `client/src/views/AdminContactDetail/mains/AdminContactDetailHeader/index.tsx`
- Modify: `client/src/views/AdminContactDetail/index.tsx`
- Modify: `client/src/views/AdminContactDetail/mains/ContactDetailCard/index.tsx`
- Modify: `client/src/locales/en/contactAdmin.json`
- Modify: `client/src/locales/vi/contactAdmin.json`

**Interfaces:**
- Consumes: `CustomBreadcrumbItem.label` (Task 1).
- Produces: `buildAdminContactDetailBreadcrumb(id: string): readonly CustomBreadcrumbItem[]`.

- [ ] **Step 1: dataSource → builder**

Trong `dataSources/AdminContactDetail/index.ts`, đổi const `ADMIN_CONTACT_DETAIL_BREADCRUMB` thành builder:
```ts
// types
import type { CustomBreadcrumbItem } from "@/types/CustomBreadcrumb";
// others
import CONSTANTS from "@/constants";

export const buildAdminContactDetailBreadcrumb = (
  id: string
): readonly CustomBreadcrumbItem[] => [
  { key: "list", href: CONSTANTS.ROUTES.ADMIN_CONTACT },
  { key: "current", label: id }
];
```

- [ ] **Step 2: Header nhận `id`, dùng builder**

Trong `AdminContactDetailHeader/index.tsx`: thêm prop `{ id }: { id: string }`; import `buildAdminContactDetailBreadcrumb` thay `ADMIN_CONTACT_DETAIL_BREADCRUMB`; truyền `items={buildAdminContactDetailBreadcrumb(id)}`. Giữ `namespace`, `PageTitle` như cũ.
```tsx
const AdminContactDetailHeader = async ({ id }: { id: string }) => {
  const t = await getTranslations("contactAdmin.admin.detail");
  return (
    <div className="flex flex-col gap-3">
      <CustomBreadcrumb
        items={buildAdminContactDetailBreadcrumb(id)}
        namespace="contactAdmin.admin.detail.breadcrumb"
      />
      <PageTitle>{t("title")}</PageTitle>
    </div>
  );
};
```

- [ ] **Step 3: Page truyền `id` xuống header**

Trong `views/AdminContactDetail/index.tsx`: `<AdminContactDetailHeader id={id} />`.

- [ ] **Step 4: Detail card → full id**

Trong `ContactDetailCard/index.tsx`: đổi header ticket `<ShortId value={contact._id} />` → `{contact._id}`. Xoá import `ShortId` (kiểm tra không còn dùng chỗ khác trong file → nếu không, xoá import).

- [ ] **Step 5: Gỡ i18n dead key `breadcrumb.current`**

Ở `en/contactAdmin.json` + `vi/contactAdmin.json`: trong `admin.detail.breadcrumb`, xoá key `current` (giữ `list`). JSON hợp lệ, không trailing comma.

- [ ] **Step 6: Verify**

Run: `cd client && yarn lint && yarn build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/dataSources/AdminContactDetail src/views/AdminContactDetail src/locales/en/contactAdmin.json src/locales/vi/contactAdmin.json
git commit -m "feat(contact): show full ticket id in detail card and breadcrumb"
```

---

### Task 3: Bỏ cột "Tệp" (attachments) khỏi table list

**Files:**
- Modify: `client/src/views/AdminContact/mains/AdminContactTable/index.tsx`
- Modify: `client/src/types/ContactAdmin/index.ts`
- Modify: `client/src/locales/en/contactAdmin.json`
- Modify: `client/src/locales/vi/contactAdmin.json`

- [ ] **Step 1: Bỏ header + cell attachments trong table**

Trong `AdminContactTable/index.tsx`:
- Xoá header: `<TableHead scope="col">{tTable("attachments")}</TableHead>`.
- Xoá cell attachments (đang là):
```tsx
<TableCell className="text-muted-foreground text-center">
  {item.attachmentCount > 0 ? item.attachmentCount : "—"}
</TableCell>
```
Đảm bảo số header = số cell sau khi xoá.

- [ ] **Step 2: Gỡ `attachmentCount` khỏi type**

Trong `types/ContactAdmin/index.ts`: xoá `attachmentCount: number;` khỏi `ContactListItem` (và `UserContactItem` nếu có — kiểm tra; `UserContactItem` cũng có `attachmentCount`, xoá luôn để đồng bộ vì không FE nào dùng nữa). `ContactDetailItem extends ContactListItem` → tự kế thừa, detail dùng `attachments` (mảng) riêng, không phải `attachmentCount`.

> Kiểm tra: `grep -rn "attachmentCount" client/src` sau khi sửa → 0 hit. Nếu còn chỗ dùng, dừng và báo.

- [ ] **Step 3: Gỡ i18n `table.attachments`**

Ở `en/contactAdmin.json` + `vi/contactAdmin.json`: xoá `admin.list.table.attachments`. (Giữ `admin.detail.fields.attachments` và `admin.detail.attachments.*` — detail vẫn có phần tệp.)

- [ ] **Step 4: Verify**

Run: `cd client && yarn lint && yarn build`
Expected: PASS. `grep -rn "attachmentCount" src` → 0 hit.

- [ ] **Step 5: Commit**

```bash
git add src/views/AdminContact src/types/ContactAdmin src/locales/en/contactAdmin.json src/locales/vi/contactAdmin.json
git commit -m "fix(contact): remove Files (attachments) column from contact list table"
```

---

### Task 4: E2E reconcile — cập nhật suite `e2e/contact/`

**Files:**
- Modify: `client/e2e/contact/contact-display.e2e.ts`
- Modify (docs, reconcile): `docs/specs/contact-ticket-id-display/e2e.md` (append delta note trỏ tới design mới)

**Interfaces:** app chạy :3100 (worktree runner), admin project.

- [ ] **Step 1: UPDATE test detail — full id thay ShortId**

Test "detail page renders the ShortId ticket" → đổi assert: detail card header hiện **full `_id`** (dùng đúng id stub 24-hex, vd `0123456789abcdef01234567`), KHÔNG phải `012345...`. Thêm assert breadcrumb item cuối hiện full id đó (selector breadcrumb `current` / `BreadcrumbPage`).

- [ ] **Step 2: UPDATE test list — không còn cột "Tệp"**

Thêm/điều chỉnh assert: table list KHÔNG có column header khớp `/files|tệp/i`.

- [ ] **Step 3: Giữ case cũ**

List ticket vẫn ShortId (`/^[0-9a-f]{6}\.\.\.$/`), category vẫn absent — giữ nguyên các assert này (không hồi quy).

- [ ] **Step 4: i18n en+vi**

Lặp assert breadcrumb-id + no-Files-column ở cả `/admin/contact(/id)` (en) và `/vi/...` (vi).

- [ ] **Step 5: Reconcile e2e.md**

Append vào `docs/specs/contact-ticket-id-display/e2e.md` một mục "Delta (contact-detail-fullid-cleanup)" tóm tắt: detail full id, breadcrumb id, bỏ cột Tệp; trỏ tới `contact-detail-fullid-cleanup/design.md`.

- [ ] **Step 6: Gate A**

Bring up worktree FE (`worktree.mjs up contact-detail-fullid-cleanup`, verify đúng owner :3100 + curl), rồi `yarn e2e contact/`. Tất cả pass. Gate B (MCP) nếu môi trường có; không thì flag skip.

- [ ] **Step 7: Commit (2 repo)**

```bash
# client worktree
git add e2e/contact && git commit -m "test(contact): reconcile e2e for full detail id + no Files column"
# docs worktree
git -C <docs-worktree> add specs/contact-ticket-id-display/e2e.md && git commit -m "docs(contact): e2e delta for detail full id + Files column removal"
```

---

## Self-Review

- **Spec coverage:** breadcrumb label (T1), detail full id + breadcrumb id (T2), remove Files column (T3), E2E reconcile (T4). ✅
- **Placeholder scan:** không TBD/TODO; mọi step có code/command. ✅
- **Type consistency:** `CustomBreadcrumbItem.label?` (T1) ↔ builder dùng `label` (T2). `buildAdminContactDetailBreadcrumb(id)` (T2 step1) ↔ header caller (T2 step2). `attachmentCount` gỡ khỏi type (T3) ↔ mọi consumer gỡ (T3 step1). ✅
