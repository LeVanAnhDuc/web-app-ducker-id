# design-system-migration — Plan

## Pha 1 — nền tảng token + font (ĐÃ XONG trong nhánh này)

| # | Việc | File | Trạng thái |
| --- | --- | --- | --- |
| 1 | Viết lại hệ token thành 3 tầng, palette Prussian/Brass/warm stone sang `oklch()` cho cả light và dark | `client/src/app/[locale]/globals.css` | ✅ |
| 2 | Thêm `--cta`, `--cta-foreground`, `--keyline`, `--overlay`, `--button-primary-*`, `--input-focus-keyline` | nt | ✅ |
| 3 | Rule backdrop qua `data-slot`, đặt ngoài `@layer` | nt | ✅ |
| 4 | Toast lỗi của sonner: bỏ oklch hardcode, dùng `var(--destructive)` | nt | ✅ |
| 5 | `.auth-card` bỏ `bg-white` → `bg-card` (rule dark thừa, đã xoá) | nt | ✅ |
| 6 | Utility `.keyline-active` cho signature element | nt | ✅ |
| 7 | Wire 3 font qua `next/font/google` + `@theme` + class trên `<html>` | `client/src/app/[locale]/layout.tsx` | ✅ |
| 8 | `themeColor` của viewport theo nền mới (`#fafaf9` / `#1c1917`) | nt | ✅ |
| 9 | Ghi chú cách đặt tên thật của 3 tầng vào MASTER.md | `docs/design-system/ducker-id/MASTER.md` | ✅ |

### Kiểm chứng đã chạy

- `pnpm exec tsc --noEmit` — sạch
- `pnpm lint` — sạch
- `pnpm build` — thành công
- Đọc lại CSS build ra: `body{font-family:var(--font-plex-sans)}`, cả 3 font có `@font-face`
  self-host, `--prussian-700` / `--cta` / `--overlay` có mặt trong output
- Quét `client/src`: **không còn** class palette mặc định của Tailwind (`*-gray-*`, `*-slate-*`,
  `*-blue-*`…). Hex còn lại chỉ là màu thương hiệu Google/Facebook trong icon social login

### Chưa chạy

- `pnpm e2e` — cần MongoDB + Redis + server + client đang chạy và DB đã seed. 30 spec không
  assert màu/font nên không kỳ vọng gãy selector, nhưng phải chạy trước khi merge.
- Xem bằng mắt light + dark ở 375 / 768 / 1024 / 1440.

## Pha 2 — áp signature element vào từng màn hình (chưa làm)

Cần mock + gate duyệt trước khi code:

1. Chốt màn nào dùng `bg-cta` (brass) thay `bg-primary` — đề xuất: chỉ primary action của luồng
   auth và CTA chính của empty state, tối đa 1 mỗi màn.
2. `.keyline-active` cho: item active của sidebar admin/dashboard, app tile đang chọn, field đang
   focus (hiện focus ring đã là brass qua `--ring`).
3. Rà `AppHeader` cho ngoại lệ backdrop-blur duy nhất được phép.
4. Kiểm tra lại `CustomBadge` với palette state mới.

## Rủi ro

- Ảnh chụp e2e và cảm nhận thị giác đổi toàn bộ — đây là redesign, không phải bug.
- `docs/specs/*` cũ mô tả màu theo palette zinc/slate cũ; giữ nguyên làm hồ sơ lịch sử.
