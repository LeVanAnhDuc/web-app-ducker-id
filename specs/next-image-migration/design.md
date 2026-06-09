# Design — Migrate `<img>` → `CustomImage` (next/image)

> Feature: `next-image-migration` · Branch: `refactor/next-image-migration` · Repos: `client/`, `docs/`

## 1. Bối cảnh & vấn đề

FE hiện dùng thẻ HTML `<img>` thô ở 3 chỗ, mỗi chỗ kèm comment `// eslint-disable-next-line @next/next/no-img-element` để tắt cảnh báo của ESLint rule `@next/next/no-img-element`:

| File | Dòng | Ảnh | Đặc điểm |
| --- | --- | --- | --- |
| `src/views/Apps/components/AppCard/index.tsx` | 30–31 | icon app (`iconUrl`) | không có dimension; `size-full` trong hộp `size-12` (48px); `alt=""` (decorative, parent `aria-hidden`) |
| `src/views/AdminContactDetail/mains/ContactAttachments/index.tsx` | 64–71 | thumbnail attachment (`att.previewUrl`) | đã có `width={200} height={80}`; comment dạng JSX `{/* ... */}` |
| `src/views/AdminContactDetail/mains/ContactAttachments/index.tsx` | 117–124 | preview full trong Dialog (`previewUrl`) | đã có `width={1920} height={1080}`; `object-contain` |

Mục tiêu: chuyển sang `next/image`, xóa các comment disable, và **tạo một wrapper `CustomImage` tái sử dụng** (đúng pattern `Custom*` của project) để mọi chỗ dùng ảnh sau này đi qua một điểm duy nhất — chặn việc tái dùng `<img>` thô.

## 2. Ràng buộc kỹ thuật

- `next/image` yêu cầu `alt` + (`width` & `height`) **hoặc** `fill`.
- `next.config.ts` **không** có `images` config. `next/image` với URL remote sẽ throw runtime (`hostname ... not configured under images`) trừ khi host nằm trong `images.remotePatterns`.
- `iconUrl` là URL admin **tự nhập** (host bất kỳ) → không thể liệt kê host an toàn (sẽ phải dùng wildcard `hostname: '**'` mà Next cảnh báo về bề mặt lạm dụng/SSRF). `previewUrl` do BE phục vụ (host động).

→ **Quyết định**: dùng prop `unoptimized` (bỏ qua optimizer của Next, hành xử như `<img>` nhưng vẫn là component `next/image` + lint pass), **không** đụng `next.config.ts`.

## 3. Giải pháp

### 3.1 Component mới — `src/components/CustomImage/index.tsx`

Wrap thẳng `next/image` (đây là "primitive" trong trường hợp này — không phải shadcn `ui/`). Default `unoptimized = true` làm project semantic ("ảnh trong app là remote/host động → mặc định không optimize"); ai cần optimize ảnh host-đã-biết thì truyền `unoptimized={false}`. Pass-through toàn bộ props của `Image` (kể cả `alt` bắt buộc, `src`, `width`/`height`/`fill`, `className`).

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

Tuân:
- `rules/component-folder.md` — 1 folder + `index.tsx`, arrow function, đúng 1 `export default` trùng tên folder, không export thứ hai.
- `rules/components.md` — đặt trong `src/components/` vì dùng ≥ 2 page; chỉ UI thuần, không business logic; là wrapper `Custom*` mở rộng primitive (không sửa primitive).
- `rules/imports.md` — `import type { ComponentProps }` ở group `// types`; `next/image` ở group `// libs`.
- A11y: TS vẫn ép `alt` vì `ComponentProps<typeof Image>` yêu cầu → không mất an toàn accessibility.

### 3.2 Migrate 3 call site

Mỗi chỗ: `import CustomImage from "@/components/CustomImage"` (group `// components`), đổi `<img>` → `<CustomImage>`, xóa comment `eslint-disable`. Không cần `unoptimized` ở call site (đã default `true`). Giữ nguyên `alt`/`className`.

- **AppCard:30–31** →
  ```tsx
  <CustomImage src={iconUrl} alt="" width={48} height={48} className="size-full object-cover" />
  ```
  Dùng `width/height = 48` (khớp `size-12`) thay vì `fill` → không phải thêm `position: relative` cho parent.
- **ContactAttachments:64–71** (thumbnail) →
  ```tsx
  <CustomImage src={att.previewUrl} alt={att.originalName} width={200} height={80} className="h-20 w-full rounded object-cover" />
  ```
  Xóa comment JSX dòng 64 (đồng thời đúng `rules/jsx.md` "không comment trong JSX").
- **ContactAttachments:117–124** (dialog) →
  ```tsx
  <CustomImage src={previewUrl} alt={tFields("attachments")} width={1920} height={1080} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
  ```
  Xóa comment dòng 117.

`src` ở cả 3 chỗ đều là `string` non-null tại điểm dùng (đã được guard `iconUrl ?`, `att.previewUrl ?`, `previewUrl &&`).

### 3.3 Đăng ký vào docs convention (chặn tái phạm)

- `client/.claude/CLAUDE.md` line 84 (Core Patterns — `Custom*` wrapper layer): thêm `CustomImage` vào danh sách wrapper hiện có.
- `client/.claude/rules/components.md` — bảng "Rule 2" (khi wrapper đã tồn tại → bắt buộc dùng): thêm 1 dòng "Ảnh / `<img>` → dùng `<CustomImage>` (next/image, default unoptimized) — ❌ raw `<img>`".

## 4. Phạm vi & ranh giới

- **Trong scope**: tạo `CustomImage`, migrate đúng 3 call site, xóa 3 comment disable, cập nhật 2 file convention.
- **Ngoài scope**: cấu hình `images.remotePatterns`/tối ưu ảnh thật; tạo rule file `images.md` riêng (đã quyết dùng cơ chế đăng ký wrapper sẵn có thay vì rule file mới); đổi behavior/UI; đụng BE.

## 5. Testing / Verification

- Không có logic mới → không áp TDD (swap component thuần, không behavior testable mới).
- Gate (chạy trong worktree `client/`): `yarn format` → `yarn lint` (3 cảnh báo `@next/next/no-img-element` phải biến mất, không còn `eslint-disable` thừa) → `yarn tsc` → `yarn build` (xác nhận không lỗi build do thiếu `images` config).
- E2E (§4.3): thay đổi không thêm/đổi behavior người dùng quan sát được (cosmetic/refactor) → **skip** E2E. Sẽ xác nhận lại ở bước writing-plans.

## 6. Rủi ro

- `next/image` với `fill` cần parent `relative` — đã né bằng cách dùng `width/height` cố định ở AppCard.
- Nếu sau này có ảnh cần SEO/LCP optimization thật → truyền `unoptimized={false}` và bổ sung `remotePatterns` (ngoài scope hiện tại).
