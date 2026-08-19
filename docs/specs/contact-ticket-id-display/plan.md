# Contact — ShortId ticket + remove category — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị "Mã ticket" bằng `_id` rút gọn qua component dùng chung `ShortId`, và gỡ toàn bộ "Danh mục" (+ filter ticket) khỏi FE.

**Architecture:** FE-only. BE đã trả `_id` (list/detail) và `id` (submit) — không đổi. Tạo 1 component trình bày `ShortId`, nối vào 3 điểm hiển thị ticket, và xoá mọi tham chiếu `category`/`ticketNumber`-as-field + filter category/ticket.

**Tech Stack:** Next.js (App Router) + React + TypeScript + next-intl + Tailwind + shadcn.

## Global Constraints

- Chỉ chạm `client/src/**` + i18n `client/src/locales/**`. BE không đổi.
- Đọc `client/.claude/CLAUDE.md` + rules (`views.md`) trước khi sửa code FE.
- Component dùng chung → `client/src/components/` (views.md quy tắc #1).
- Mọi string UI đi qua next-intl (không hardcode). Ký tự rút gọn dùng literal `"..."`, số ký tự đầu = `6`.
- FE không có script `test`/`type-check`; verify = `cd client && yarn lint && yarn build` (next build đã type-check). Behavior verify ở Task 4 (E2E dual-gate).
- `client/.claude` bị gitignore ở client repo (memory) — nếu sửa rule sẽ không vào PR, flag user (task này không sửa rule).

---

### Task 1: Component `ShortId`

**Files:**
- Create: `client/src/components/ShortId/index.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `default export ShortId` — props `{ value: string; className?: string }`. Render `<span>` chứa `value.slice(0, 6) + "..."`, `title={value}`.

- [ ] **Step 1: Tạo component**

```tsx
// client/src/components/ShortId/index.tsx
// libs
import { cn } from "@/libs/utils";

const SHORT_ID_LENGTH = 6;

const ShortId = ({
  value,
  className
}: {
  value: string;
  className?: string;
}) => (
  <span className={cn("font-mono", className)} title={value}>
    {value.slice(0, SHORT_ID_LENGTH)}...
  </span>
);

export default ShortId;
```

> Kiểm tra path `cn`: mở `client/src/libs/utils.ts` (hoặc nơi shadcn đặt `cn`). Nếu khác, sửa import cho khớp codebase (shadcn chuẩn: `@/libs/utils` hoặc `@/lib/utils`).

- [ ] **Step 2: Verify build/lint xanh**

Run: `cd client && yarn lint`
Expected: PASS, không lỗi ở `components/ShortId`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ShortId/index.tsx
git commit -m "feat(contact): add reusable ShortId component"
```

---

### Task 2: Support submit flow → dùng `id` + `ShortId`

**Files:**
- Modify: `client/src/types/Support/index.ts`
- Modify: `client/src/components/SupportDialog/hooks/useSupportSubmit.ts`
- Modify: `client/src/components/SupportDialog/index.tsx`
- Modify: `client/src/components/SupportDialog/mains/SupportForm/index.tsx`
- Modify: `client/src/components/SupportDialog/mains/SupportSuccess/index.tsx`

**Interfaces:**
- Consumes: `ShortId` (Task 1).
- Produces: `SubmitSupportResponse = { id: string }`; `SupportSuccess` prop `{ id, onSubmitAnother, onClose }`; `SupportForm` prop `onSubmitted: (id: string) => void`.

- [ ] **Step 1: Đổi type response**

`client/src/types/Support/index.ts` — đổi:
```ts
export interface SubmitSupportResponse {
  id: string;
}
```
(giữ `SupportFormValues`, `SubmitSupportPayload` nguyên.)

- [ ] **Step 2: Sửa hook `useSupportSubmit`**

Trong `useSupportSubmit.ts`: đổi type prop + dùng `response.id`. `announce` dùng `id` rút gọn (6 ký tự đầu):
```ts
const useSupportSubmit = ({
  onSuccess
}: {
  onSuccess: (id: string) => void;
}) => {
  // ...
  onSuccess: (response) => {
    announce(tAnnounce("success", { ticketNumber: response.id.slice(0, 6) }));
    onSuccess(response.id);
  },
```
> Giữ nguyên key i18n `support.announce.success` (biến `{ticketNumber}` vẫn tồn tại trong message) — chỉ đổi giá trị truyền vào.

- [ ] **Step 3: Sửa `SupportDialog/index.tsx`**

Đổi state `ticketNumber` → `id`; `handleSubmitted(ticket)` → `handleSubmitted(id)`; truyền `<SupportSuccess id={id ?? ""} ... />`. `SupportForm onSubmitted={handleSubmitted}` giữ nguyên tên callback prop.

```tsx
const [id, setId] = useState<string | null>(null);
// ...
const handleSubmitted = (nextId: string) => {
  setId(nextId);
  setMode("success");
};
const handleSubmitAnother = () => {
  setId(null);
  setMode("form");
};
// reset trong handleOpenChange: setId(null);
// ...
<SupportSuccess id={id ?? ""} onSubmitAnother={handleSubmitAnother} onClose={handleClose} />
```

- [ ] **Step 4: Sửa `SupportForm/index.tsx`**

Đổi prop signature `onSubmitted: (ticketNumber: string) => void` → `onSubmitted: (id: string) => void`. Không đổi logic khác (hook `useSupportSubmit({ onSuccess: onSubmitted })`).

- [ ] **Step 5: Sửa `SupportSuccess/index.tsx`**

Đổi prop `ticketNumber` → `id`, render bằng `ShortId`:
```tsx
import ShortId from "@/components/ShortId";

const SupportSuccess = ({
  id,
  onSubmitAnother,
  onClose
}: {
  id: string;
  onSubmitAnother: () => void;
  onClose: () => void;
}) => {
  // ...
  <p className="font-mono text-base font-semibold">
    <ShortId value={id} />
  </p>
```
> Bỏ class `font-mono` trùng ở `<p>` nếu muốn (ShortId đã `font-mono`) — giữ `text-base font-semibold` ở wrapper.

- [ ] **Step 6: Verify build/lint xanh**

Run: `cd client && yarn lint && yarn build`
Expected: PASS (không còn tham chiếu `ticketNumber` trong support flow, không type error).

- [ ] **Step 7: Commit**

```bash
git add client/src/types/Support client/src/components/SupportDialog
git commit -m "fix(contact): show ShortId of returned id on support success"
```

---

### Task 3: Admin contact — ticket=_id qua ShortId + gỡ Danh mục + gỡ filter category/ticket

Task nguyên khối (atomic) để build luôn xanh: xoá field khỏi types kéo theo phải sửa mọi consumer cùng lúc.

**Files:**
- Modify: `client/src/types/ContactAdmin/index.ts`
- Modify: `client/src/dataSources/ContactAdmin/index.ts`
- Modify: `client/src/utils/index.ts`
- Modify: `client/src/views/AdminContact/mains/AdminContactTable/index.tsx`
- Modify: `client/src/views/AdminContactDetail/mains/ContactDetailCard/index.tsx`
- Modify: `client/src/locales/en/contactAdmin.json`
- Modify: `client/src/locales/vi/contactAdmin.json`

**Interfaces:**
- Consumes: `ShortId` (Task 1).
- Produces: `buildAdminContactFilterDefs(tStatus, labels)` (bỏ tham số `tCategory`; `labels` bỏ `category`, `ticketNumber`, `ticketPh`).

- [ ] **Step 1: `types/ContactAdmin/index.ts`**

- Xoá `export type ContactCategory = ...`.
- Trong `ContactListItem`, `ContactDetailItem`, `UserContactItem`: xoá dòng `ticketNumber: string;` và `category: ContactCategory;`.
- Trong `AdminContactQuery`: xoá `category?: ContactCategory;` và `ticketNumber?: string;`; trong `sortBy` union xoá `| "category"` → còn `"createdAt" | "priority" | "status"`.

- [ ] **Step 2: `dataSources/ContactAdmin/index.ts`**

- Xoá import `ContactCategory`.
- Xoá `export const CONTACT_CATEGORY_VALUES`.
- Đổi `buildAdminContactFilterDefs`: bỏ param `tCategory`; `labels` bỏ `category`, `ticketNumber`, `ticketPh`; bỏ 2 filter def `category` và `ticketNumber`:

```ts
export const buildAdminContactFilterDefs = (
  tStatus: (k: string) => string,
  labels: {
    status: string;
    email: string;
    dateRange: string;
    emailPh: string;
  }
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: labels.status,
    options: (["new", "processing", "resolved"] as const).map((s) => ({
      value: s,
      label: tStatus(s)
    }))
  },
  {
    key: "email",
    type: "text",
    label: labels.email,
    placeholder: labels.emailPh
  },
  { key: "dateRange", type: "dateRange", label: labels.dateRange }
];
```

- [ ] **Step 3: `utils/index.ts`**

- Xoá import `CONTACT_CATEGORY_VALUES` (dòng `import { CONTACT_CATEGORY_VALUES } from "@/dataSources/ContactAdmin";`).
- Ở import type: đổi `import type { ContactStatus, ContactCategory } from "@/types/ContactAdmin";` → `import type { ContactStatus } from "@/types/ContactAdmin";`.
- Xoá hàm `export const isContactCategory = ...`.

- [ ] **Step 4: `AdminContactTable/index.tsx`**

- Bỏ import `isContactCategory` (giữ `isContactStatus`).
- Import `ShortId` từ `@/components/ShortId`.
- Bỏ `const tCategory = useTranslations("contactAdmin.form.category");`.
- `buildAdminContactFilterDefs(...)`: bỏ đối số `tCategory` và bỏ các label `category`, `ticketNumber`, `ticketPh`; giữ `status`, `email`, `dateRange`, `emailPh`:

```tsx
const filterDefs = useMemo(
  () =>
    buildAdminContactFilterDefs(
      (k) => tStatus(k as Parameters<typeof tStatus>[0]),
      {
        status: tFilters("status"),
        email: tFilters("email"),
        dateRange: tList("dateRange.label"),
        emailPh: tFilters("email")
      }
    ),
  [tStatus, tFilters, tList]
);
```

- `params`: bỏ block `...(isContactCategory(query.filters.category) && { category: ... })` và block `...(query.filters.ticketNumber && { ticketNumber: ... })`.
- Header: bỏ `<TableHead>{tTable("category")}</TableHead>`.
- Cell ticket: đổi `{item.ticketNumber}` → `<ShortId value={item._id} />`.
- Bỏ cell category: `<TableCell className="text-muted-foreground">{tCategory(item.category)}</TableCell>`.

- [ ] **Step 5: `ContactDetailCard/index.tsx`**

- Import `ShortId`.
- Bỏ `const tCategory = useTranslations("contactAdmin.form.category");`.
- Đổi header ticket `{contact.ticketNumber}` → `<ShortId value={contact._id} />`.
- Bỏ nguyên block:
```tsx
<div>
  <dt ...>{t("fields.category")}</dt>
  <dd className="mt-1 text-sm">{tCategory(contact.category)}</dd>
</div>
```

- [ ] **Step 6: i18n `en/contactAdmin.json` + `vi/contactAdmin.json`**

Ở CẢ 2 file, xoá:
- `form.category` (cả object) → nếu `form` trống thì xoá luôn `form`.
- `admin.list.table.category`
- `admin.list.filters.category`
- `admin.list.filters.ticketNumber`
- `admin.detail.fields.category`
- `admin.detail.updateCategory` (cả object)
- `myContacts.table.category`

Cập nhật `admin.list.filters.searchPlaceholder`:
- en: `"Search by subject, email..."`
- vi: `"Tìm theo tiêu đề, email..."`

Giữ `admin.list.table.ticketNumber` và `admin.detail.fields.ticketNumber` (nhãn cột ticket vẫn dùng).

- [ ] **Step 7: Verify build/lint xanh**

Run: `cd client && yarn lint && yarn build`
Expected: PASS. Không còn `category`, `ticketNumber`-as-field, `tCategory`, `isContactCategory`, `CONTACT_CATEGORY_VALUES` trong FE (trừ app-category không liên quan). Grep kiểm: `grep -rn "ContactCategory\|isContactCategory\|CONTACT_CATEGORY_VALUES\|tCategory" client/src` → 0 hit liên quan contact.

- [ ] **Step 8: Commit**

```bash
git add client/src/types/ContactAdmin client/src/dataSources/ContactAdmin client/src/utils/index.ts client/src/views/AdminContact client/src/views/AdminContactDetail client/src/locales/en/contactAdmin.json client/src/locales/vi/contactAdmin.json
git commit -m "fix(contact): ticket=_id via ShortId, remove category + ticket/category filters"
```

---

### Task 4: E2E — reconcile matrix → `e2e.md` + tests + dual-gate

**Files:**
- Create: `docs/specs/contact-ticket-id-display/e2e.md`
- Create: `client/e2e/contact/contact-display.e2e.ts`

**Interfaces:**
- Consumes: app đang chạy (BE :5000, FE :3000/worktree port), admin auth (`admin.setup.ts`).

- [ ] **Step 1: Viết `e2e.md`**

Chuyển E2E Scenario Matrix trong `design.md` thành danh sách scenario cụ thể (mỗi ✅ row → ≥1 test; N/A giữ lý do). Ghi rõ scenario mutation-heavy `A only`.

- [ ] **Step 2: Viết test Playwright**

`client/e2e/contact/contact-display.e2e.ts` (admin project — theo `admin.setup.ts`), cover:
- Admin list: mỗi row cột ticket có text khớp `^.{1,6}\.\.\.$` (ShortId), KHÔNG rỗng.
- Admin list: KHÔNG có header "Category"/"Danh mục"; KHÔNG có filter "Danh mục"/"Mã ticket"; KHÔNG có chuỗi rò rỉ key `contactAdmin.form.category`.
- Admin detail: header ticket là ShortId; KHÔNG có field "Danh mục".
- i18n: lặp assert ở cả `en` và `vi` (không missing-message).
- Filter còn lại (status/email/dateRange) persist URL.

> Selector ưu tiên role/label. Nếu cần, `data-testid`. KHÔNG sửa app code trong test (gặp a11y issue → flag follow-up).

- [ ] **Step 3: Dual-gate (§4.3)**

Tiền đề app-running: agent tự check BE/FE/Mongo/Redis; chưa chạy → hỏi user (a) tự run / (b) agent run. Dispatch song song:
- Gate A: `cd client && yarn e2e` scope contact.
- Gate B: MCP walk matrix (auth context riêng; scenario mutation `A only` chỉ verify read/render).

Fail ≥1 gate → systematic-debugging → `e2e-bugs.md` → fix → chạy lại (max 3 vòng).

- [ ] **Step 4: Commit**

```bash
# docs repo
git -C <docs-worktree> add specs/contact-ticket-id-display/e2e.md && git commit -m "docs(contact): e2e scenarios"
# client repo
git add client/e2e/contact && git commit -m "test(contact): e2e for ShortId ticket + category removal"
```

---

## Self-Review

- **Spec coverage:** ShortId (Task1), ticket wiring 3 chỗ (Task2 success + Task3 list/detail), gỡ category toàn bộ (Task3), gỡ filter ticket (Task3), i18n en+vi (Task3), E2E matrix (Task4). BE không đổi (đúng spec). ✅
- **Placeholder scan:** không có TBD/TODO; mọi step có code/command cụ thể. ✅
- **Type consistency:** `SubmitSupportResponse { id }` (Task2) ↔ `response.id` (hook) ↔ `SupportSuccess id` (Task2). `buildAdminContactFilterDefs(tStatus, labels)` chữ ký mới (Task3 step2) ↔ caller (Task3 step4). `ShortId { value, className? }` (Task1) ↔ mọi consumer. ✅
