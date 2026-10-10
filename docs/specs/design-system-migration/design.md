# design-system-migration — Design

**Ngày:** 2026-09-25
**Nguồn:** `docs/design-system/ducker-id/MASTER.md`, `docs/adr/0002-design-system-bootstrap.md`

## Vấn đề

MASTER.md đã chốt palette, typography, style và page pattern mới, nhưng code vẫn chạy token cũ:
`globals.css` là hệ shadcn **2 tầng** (giá trị oklch gán thẳng vào tên semantic, neutral lạnh
zinc/slate), và client **không wire font nào** — đang dùng font mặc định của Tailwind. Hai nguồn
sự thật lệch nhau kể từ lúc MASTER.md được commit.

## Mục tiêu

Đưa code về đúng MASTER.md, không đổi hành vi, không đổi markup của bất kỳ màn hình nào.

## Quyết định thiết kế

### 1. Ba tầng token, tầng semantic mang tiền tố `--sem-`

Tailwind v4 giữ riêng namespace `--color-*` cho `@theme`; khai báo `--color-primary` trong `:root`
sẽ đụng bộ sinh utility. Vì vậy:

| Tầng | Tên trong code | Ví dụ |
| --- | --- | --- |
| primitive | `--stone-*`, `--prussian-*`, `--brass-*`, `--red-*`, `--green-*`, `--amber-*`, `--cream-*` | `--prussian-700: oklch(0.339 0.071 247.3)` |
| semantic | `--sem-*` (đổi theo light/dark) | `--sem-primary: var(--prussian-700)` |
| component | hợp đồng shadcn + token project | `--primary: var(--sem-primary)`, `--cta`, `--keyline`, `--overlay` |

Tầng component khai báo **một lần** — nó trỏ vào semantic, vốn đã tự đổi giữa `:root` và `.dark`.
Trước đây mỗi mode phải chép lại toàn bộ 40+ biến.

### 2. CTA brass không được map vào `--accent` của shadcn

Trong shadcn, `--accent` là **bề mặt hover**, không phải CTA. Map brass vào đó thì mọi hover state
trong app chuyển sang màu đồng. CTA đi qua token riêng `--cta` / `--cta-foreground`
(utility `bg-cta`, `text-cta-foreground`).

### 3. Destructive giữ nguyên một giá trị cho cả hai mode

MASTER.md ghi `#B42318` + nhãn trắng cho cả light lẫn dark. Lý do nằm ở code: `ui/badge.tsx` và
`ui/button.tsx` hardcode `text-white` trên nền destructive. Nếu dark dùng bản sáng (`red-300`)
thì tương phản tụt còn ~2.2:1.

### 4. Backdrop modal không sửa `components/ui/*`

MASTER.md yêu cầu backdrop ink ấm; shadcn hardcode `bg-black/50` trong `ui/dialog.tsx` và
`ui/sheet.tsx` — hai file immutable. Giải pháp: rule nhắm `[data-slot="dialog-overlay"]` /
`[data-slot="sheet-overlay"]` đặt **ngoài mọi `@layer`** trong `globals.css`. Style không thuộc
layer nào luôn thắng style trong layer, nên không cần `!important` và không cần PROJECT-PATCH.

### 5. Font qua `next/font/google`, không qua CSS `@import`

Space Grotesk (display, weight 500/700) · IBM Plex Sans (body, 400/500/700) · IBM Plex Mono
(400/500). Biến CSS đặt tên `--font-space-grotesk` / `--font-plex-sans` / `--font-plex-mono` rồi
map vào `@theme` thành `--font-display` / `--font-sans` / `--font-mono` — không đặt trùng tên vì
sẽ thành tham chiếu vòng. `h1`–`h3` dùng display face, phần còn lại dùng body face.

## Tương phản

Toàn bộ cặp màu đã đo bằng công thức WCAG 2.1, bảng nằm trong MASTER.md. Hai ràng buộc sinh ra
từ phép đo: nhãn trên brass luôn là ink (trắng chỉ 3.61:1), và brass không bao giờ làm chữ
(3.46:1 trên nền sáng). Các state color mới: success 5.04 · warning/ink 5.49 · info 6.71 ·
cream 7.89 — tất cả đạt AA.

## Ngoài phạm vi

Áp `bg-cta` và `.keyline-active` vào từng màn hình (nav active, app tile được chọn, primary
action của trang) là **pha 2**, cần mock và gate duyệt vì nó đổi cảm nhận thị giác từng trang.
Pha này chỉ đổi nền tảng token và font.
