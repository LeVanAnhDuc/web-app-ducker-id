# CustomImage (next/image) Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay 3 thẻ `<img>` thô bằng một wrapper `CustomImage` (wrap `next/image`) tái sử dụng, xóa các comment `eslint-disable @next/next/no-img-element`, và đăng ký wrapper vào convention để chặn tái phạm.

**Architecture:** Tạo `src/components/CustomImage/index.tsx` wrap `next/image` với default `unoptimized=true` (ảnh trong app là remote/host động). Ba call site đổi `<img>` → `<CustomImage>`. Cập nhật `client/.claude/CLAUDE.md` + `rules/components.md` để liệt kê wrapper mới.

**Tech Stack:** Next.js 15 (`next/image`), React 19, TypeScript 5, Tailwind 4.

**Testing note:** Client KHÔNG có unit-test runner (chỉ Playwright cho E2E). Đây là refactor cosmetic (không thêm/đổi behavior người dùng quan sát được) → không áp TDD-unit (YAGNI, không có harness) và **skip E2E** (§4.3). Verification gate = `yarn format` → `yarn lint` → `yarn tsc` → `yarn build`, chạy trong worktree `client/`.

**Commit gate (§7, Review ON — mặc định):** Các task implement + **stage** thay đổi, KHÔNG commit per-task. Sau khi xong toàn bộ (Task 5 pass) → trình diff tổng thể → user duyệt → commit 1 lần (Task 6). Worktree code: `client/.worktrees/next-image-migration`. Worktree docs (chứa plan/design): `docs/.worktrees/next-image-migration`.

**Convention bắt buộc đọc trước khi sửa `client/src/**`:** `client/.claude/CLAUDE.md`, `rules/component-folder.md`, `rules/components.md`, `rules/imports.md`, `rules/jsx.md`.

---

### Task 1: Tạo component `CustomImage`

**Files:**
- Create: `client/src/components/CustomImage/index.tsx`

- [ ] **Step 1: Viết component**

```tsx
// types
import type { ComponentProps } from "react";
// libs
import Image from "next/image";

const CustomImage = ({
  unoptimized = true,
  ...props
}: ComponentProps<typeof Image>) => (
  <Image unoptimized={unoptimized} {...props} />
);

export default CustomImage;
```

Ghi chú tuân convention:
- `rules/component-folder.md`: 1 folder `CustomImage/` + `index.tsx`, arrow function, đúng 1 `export default` trùng tên, KHÔNG export thứ hai.
- `rules/imports.md`: `import type { ComponentProps }` → group `// types`; `next/image` → group `// libs`.
- `ComponentProps<typeof Image>` giữ nguyên ràng buộc TS: `alt` bắt buộc, `src` + (`width`/`height` hoặc `fill`) bắt buộc → an toàn a11y + không lỗi runtime do thiếu kích thước.
- KHÔNG thêm class mặc định → không cần `cn`; class do call site truyền qua `...props`.

- [ ] **Step 2: Type-check component mới**

Run (trong `client/.worktrees/next-image-migration`): `yarn tsc`
Expected: PASS, không lỗi mới ở `src/components/CustomImage/index.tsx`.

---

### Task 2: Migrate `AppCard` sang `CustomImage`

**Files:**
- Modify: `client/src/views/Apps/components/AppCard/index.tsx`

- [ ] **Step 1: Thêm import `CustomImage`**

Trong group `// components`, thêm dòng ngay sau `CustomButton`. Kết quả group:

```tsx
// components
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import { Card } from "@/components/ui/card";
```

- [ ] **Step 2: Đổi `<img>` → `<CustomImage>` và xóa comment disable**

Thay khối hiện tại (dòng ~29–31):

```tsx
  const iconNode = iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={iconUrl} alt="" className="size-full object-cover" />
  ) : (
    initial
  );
```

thành:

```tsx
  const iconNode = iconUrl ? (
    <CustomImage
      src={iconUrl}
      alt=""
      width={48}
      height={48}
      className="size-full object-cover"
    />
  ) : (
    initial
  );
```

Lý do `width={48} height={48}`: khớp hộp `size-12` (48px) — dùng kích thước cố định thay vì `fill` để KHÔNG phải thêm `position: relative` cho parent. `alt=""` giữ nguyên (icon decorative, parent đã `aria-hidden`).

---

### Task 3: Migrate `ContactAttachments` (thumbnail + dialog preview)

**Files:**
- Modify: `client/src/views/AdminContactDetail/mains/ContactAttachments/index.tsx`

- [ ] **Step 1: Thêm import `CustomImage`**

Trong group `// components`, thêm dòng ngay sau `CustomButton`. Kết quả group:

```tsx
// components
import { Button } from "@/components/ui/button";
import CustomButton from "@/components/CustomButton";
import CustomImage from "@/components/CustomImage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
```

- [ ] **Step 2: Đổi thumbnail `<img>` → `<CustomImage>`, xóa comment JSX**

Thay khối hiện tại (dòng ~64–71):

```tsx
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.previewUrl}
                    alt={att.originalName}
                    width={200}
                    height={80}
                    className="h-20 w-full rounded object-cover"
                  />
```

thành:

```tsx
                  <CustomImage
                    src={att.previewUrl}
                    alt={att.originalName}
                    width={200}
                    height={80}
                    className="h-20 w-full rounded object-cover"
                  />
```

Xóa comment `{/* ... */}` đồng thời đúng `rules/jsx.md` ("không comment trong JSX").

- [ ] **Step 3: Đổi dialog preview `<img>` → `<CustomImage>`, xóa comment**

Thay khối hiện tại (dòng ~116–124):

```tsx
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={tFields("attachments")}
              width={1920}
              height={1080}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}
```

thành:

```tsx
          {previewUrl && (
            <CustomImage
              src={previewUrl}
              alt={tFields("attachments")}
              width={1920}
              height={1080}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}
```

`tFields` đã được khai báo sẵn trong file (`const tFields = useTranslations("contactAdmin.admin.detail.fields");`) — không cần thêm.

---

### Task 4: Đăng ký `CustomImage` vào convention docs

**Files:**
- Modify: `client/.claude/CLAUDE.md` (Core Patterns — dòng `Custom*` wrapper layer)
- Modify: `client/.claude/rules/components.md` (bảng Rule 2)

- [ ] **Step 1: Cập nhật CLAUDE.md `Custom*` wrapper list**

Trong bullet "**`Custom*` wrapper layer**", thêm `CustomImage` vào danh sách wrapper và thêm 1 câu về ảnh. Đổi đoạn liệt kê:

```
(`CustomInput`, `CustomSelectTrigger`, `CustomDateInput`, `CustomBadge`, `CustomButton`, `CustomPagination`, `CustomTooltip`, `CustomFormLabel`, `SearchInput`, `PasswordInput`)
```

thành:

```
(`CustomInput`, `CustomSelectTrigger`, `CustomDateInput`, `CustomBadge`, `CustomButton`, `CustomImage`, `CustomPagination`, `CustomTooltip`, `CustomFormLabel`, `SearchInput`, `PasswordInput`)
```

và thêm câu sau ngay trước "Detail: `rules/components.md`.":

```
Ảnh phải đi qua `<CustomImage>` (wrap `next/image`, default `unoptimized`) — **never** raw `<img>` (vi phạm `@next/next/no-img-element`).
```

- [ ] **Step 2: Thêm dòng vào bảng Rule 2 của `rules/components.md`**

Trong section "### Rule 2: Khi `Custom*` wrapper đã tồn tại → BẮT BUỘC dùng wrapper", thêm 1 hàng vào cuối bảng (sau hàng "Form label cần required asterisk"):

```
| Ảnh / hình (img)                                 | `<CustomImage>` — wrap `next/image`, default `unoptimized`             | ❌ raw `<img>` (vi phạm `@next/next/no-img-element`) + `eslint-disable`                                                 |
```

---

### Task 5: Verification gate

**Files:** không sửa — chỉ chạy lệnh trong `client/.worktrees/next-image-migration`.

- [ ] **Step 1: Format**

Run: `yarn format`
Expected: Prettier ghi lại file, exit 0. Re-read các file đã sửa nếu format đổi nội dung.

- [ ] **Step 2: Lint**

Run: `yarn lint`
Expected: PASS, exit 0. Không còn cảnh báo `@next/next/no-img-element`; không còn directive `eslint-disable` thừa (nếu có "Unused eslint-disable" thì nghĩa là sót comment chưa xóa → xóa).

- [ ] **Step 3: Type-check**

Run: `yarn tsc`
Expected: PASS, không lỗi. (Nếu lỗi `src` type `string | StaticImport` → xác nhận giá trị tại call site là `string` non-null; cả 3 chỗ đã được guard `iconUrl ?` / `att.previewUrl ?` / `previewUrl &&`.)

- [ ] **Step 4: Build**

Run: `yarn build`
Expected: Build thành công. Đặc biệt xác nhận KHÔNG có lỗi runtime/SSG kiểu `hostname ... not configured under images` (đã né nhờ `unoptimized`). Nếu gặp lỗi này → kiểm tra `CustomImage` còn default `unoptimized=true` không.

---

### Task 6: Review tổng thể + commit (§7)

- [ ] **Step 1: Trình diff tổng thể cho user**

Run: `git -C client/.worktrees/next-image-migration status --short && git -C client/.worktrees/next-image-migration diff`
Trình toàn bộ diff (CustomImage mới + 2 call site + 2 file convention) cho user review **1 lần**. Đợi duyệt.

- [ ] **Step 2: Commit sau khi user duyệt**

```bash
cd client/.worktrees/next-image-migration
git add src/components/CustomImage/index.tsx \
  src/views/Apps/components/AppCard/index.tsx \
  "src/views/AdminContactDetail/mains/ContactAttachments/index.tsx" \
  .claude/CLAUDE.md .claude/rules/components.md
git commit -m "refactor(image): add CustomImage wrapper and migrate <img> to next/image"
```

(Plan + design ở repo `docs/` đã commit riêng — không nằm trong commit này.)

---

## Self-Review

**Spec coverage:**
- design §3.1 (CustomImage) → Task 1 ✓
- design §3.2 (3 call site) → Task 2 (AppCard) + Task 3 (ContactAttachments thumbnail + dialog) ✓
- design §3.3 (đăng ký convention) → Task 4 ✓
- design §5 (verification gate, skip E2E) → Task 5 ✓
- §7 commit gate → Task 6 ✓

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh + expected cụ thể.

**Type consistency:** `CustomImage` props = `ComponentProps<typeof Image>` xuyên suốt; call site truyền đúng `src`/`alt`/`width`/`height`/`className`; default `unoptimized=true` nhất quán giữa Task 1 và Task 5 Step 4.
