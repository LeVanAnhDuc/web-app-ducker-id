# ADR 0002 — Design system: Prussian + Brass, Space Grotesk + IBM Plex Sans

**Status:** Accepted
**Date:** 2026-09-25

## Context

Ducker ID trước đây không có nguồn token duy nhất. Giá trị thật nằm rải ở `client/src/app/[locale]/globals.css` (token shadcn 2 tầng, oklch), `client/.claude/rules/uiux-tokens.md` (bảng type/spacing/shadow/motion) và `.claude/uiux/*` trong repo architecture (design-guide 406 dòng, frontend-reference 737 dòng — đã bị xoá khỏi working tree). Ba nơi này chồng lấn và đã bắt đầu lệch nhau.

Quyết định của owner: nhận skill `design-bootstrap` + plugin `ui-ux-pro-max` (kèm `frontend-design` vì Step 2 của skill bắt buộc), và **thiết kế lại hoàn toàn theo chúng** — MASTER.md thắng token và rule đang có, không phải ngược lại.

Step 1 (`ui-ux-pro-max --design-system`, query `identity provider app launcher dashboard saas`) trả về: style Glassmorphism, palette trust blue `#2563EB` + orange CTA `#EA580C`, và `Plus Jakarta Sans` cho **cả hai** vai typography.

## Decision

Token duy nhất: `docs/design-system/ducker-id/MASTER.md`. Bốn điểm override output của Step 1:

| Step 1 đề xuất | Chốt | Lý do |
| --- | --- | --- |
| Plus Jakarta Sans / Plus Jakarta Sans | **Space Grotesk** (display) + **IBM Plex Sans** (body) + **IBM Plex Mono** (OTP, client secret, ticket ID, IP) | Một family vi phạm luật ≥2 distinct families của chính bootstrap. Plus Jakarta cũng là giọng SaaS mặc định, không nói gì về sản phẩm credential |
| Trust blue `#2563EB` + orange `#EA580C` | **Prussian `#143A5A`** primary + **Brass `#B07D2B`** accent, nền **warm stone** | Ducker ID là khung bao quanh app của người khác — lưới launcher đầy icon bên thứ ba. Chrome xanh bão hoà đánh nhau với chúng; near-neutral ấm để chúng yên. Brass mang ẩn dụ chìa khoá/cổng và là điểm ấm duy nhất |
| Glassmorphism | **Engineered flat** — độ sâu từ surface, không từ blur | Chính catalog gắn nhãn `risk:conditional \| requires:contrast-text-4.5` cho style này. Panel kính đặt trên lưới icon bên thứ ba là đúng chỗ rủi ro đó rơi xuống. Giữ đúng một ngoại lệ: sticky header |
| Page pattern "Hero + Features + CTA" | **App shell** (`AppHeader → PageShell → PageHeader → PageToolbar → PageContent`) | Sản phẩm không có landing page marketing; thứ tự section mô tả một trang không tồn tại |

Signature element: **brass keyline** — đường 2px brass đánh dấu biên đang-active (nav item active, field focus, app tile được chọn).

Giữ nguyên từ Step 1, không được override: rule a11y/UX (4.5:1, target 44px, focus nhìn thấy, reduced-motion), thang spacing, shadow depth, anti-pattern, pre-delivery checklist.

Tương phản đã đo và ghi trong MASTER.md. Hai ràng buộc sinh ra từ phép đo: nhãn trên brass luôn là ink `#1C1917` (4.84:1 — chữ trắng chỉ 3.61:1), và **brass không bao giờ làm chữ** (3.46:1 trên nền sáng).

Ba thứ **không** theo plugin vì gắn với code và test: icon chỉ **Lucide**; motion chỉ **Framer Motion**, trần 500ms, không cài GSAP; chiều cao control theo `BUTTON_SIZE_CLASSES` (36/40/48) — MASTER.md § Component Specs đã chủ động nhường phần này.

## Consequences

- `client/src/app/[locale]/globals.css` phải viết lại: palette mới (light + dark) sang `oklch()`, và tách token 2 tầng hiện tại thành 3 tầng primitive → semantic → component theo skill `design-system`.
- `client/src/app/[locale]/layout.tsx` phải thêm 3 font qua `next/font/google` + map vào `@theme`. Hiện project **chưa wire font nào** — đang chạy font mặc định của Tailwind.
- Mục `## Font` trong `client/.claude/CLAUDE.md` (preload `/fonts/Inter.woff2`) vốn đã chết, đã thay bằng cấu hình `next/font` thật.
- `client/.claude/rules/uiux-tokens.md` hạ xuống thành tầng hiện thực của MASTER.md; luật "một font family duy nhất" và focus ring 3px đã bị thay.
- 30 spec Playwright chưa assert màu/font nên không gãy về mặt selector, nhưng mọi ảnh chụp và cảm nhận thị giác sẽ đổi. Cần chạy lại `pnpm e2e` sau khi migrate.
- Thay đổi UI diện rộng này chạy như một feature riêng (`docs/specs/design-system-migration/`) trong worktree, có gate duyệt trước commit.
- `.claude/uiux/design-guide.md` và `frontend-reference.md` không khôi phục nữa — MASTER.md thay thế chúng. `icon-map.md` và `ux-copy.md` thì nên khôi phục vì plugin không biết về Lucide map và i18n copy của project.
