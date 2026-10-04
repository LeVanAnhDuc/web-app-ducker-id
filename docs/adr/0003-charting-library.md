# ADR 0003 — Biểu đồ: shadcn `chart` (recharts), và cách chọn màu chuỗi dữ liệu

**Status:** Accepted
**Date:** 2026-10-04
**Liên quan:** ADR 0002 (design system), `docs/specs/home-activity-insights/design.md` (DR-9, DR-14, DR-15)

## Context

Trước feature `home-activity-insights`, project không có thư viện biểu đồ nào. Biểu đồ duy nhất —
"Weekly Activity" ở Home — vẽ bằng `div` với `height` inline, trên dữ liệu viết cứng.

MASTER.md chốt ba ràng buộc về UI gắn với code thật: icon chỉ **Lucide**, motion chỉ **Framer Motion**
(không cài GSAP), chiều cao control theo `BUTTON_SIZE_CLASSES`. Thư viện biểu đồ **không** nằm trong
danh sách đó — nghĩa là chưa ai quyết định, không phải là đã cấm.

Feature này cần: cột xếp chồng theo ngày (7/30/90 điểm) có tooltip, donut theo phương thức đăng nhập,
và bảng xếp hạng ngang. Hai lựa chọn được cân nhắc ở `docs/ui-designs/home-activity-insights/`:
tiếp tục tự vẽ bằng CSS/SVG, hoặc nhận một thư viện.

`globals.css` đã có sẵn `--chart-1..5` map vào palette Prussian/Brass kèm biến thể dark — tức là
hợp đồng token của shadcn `chart` đã nằm trong repo từ lần migrate design system, chỉ chưa ai dùng.

## Decision

**Nhận `shadcn/chart` (recharts `2.15.4`, pin chính xác), cài qua CLI.**

Owner chọn phương án này thay vì tự vẽ. Tooltip, trục, responsive container và legend là phần tự vẽ
sẽ phải viết lại kém hơn; `--chart-*` đã tồn tại nên không phát sinh token mới.

Ba hệ quả được chốt kèm:

| # | Quyết định | Lý do |
| --- | --- | --- |
| 1 | `components/ui/chart.tsx` thuộc lớp shadcn → **bất biến**. Mọi tuỳ biến đi qua wrapper trong `views/Home/components/` | Đúng quy ước `Custom*` sẵn có. CLI khi cài `chart` đã tự ý hạ cấp `card.tsx` về bản `forwardRef` cũ — đã revert; đây là lý do lớp wrapper tồn tại |
| 2 | **Chuỗi có ngữ nghĩa trạng thái không lấy màu từ `--chart-*`.** Thành công dùng `--primary`, thất bại dùng `--destructive` | Đỏ "thất bại" đã có nghĩa cố định ở `LoginStatCard` và cột trạng thái của Lịch sử đăng nhập. Gán cho nó một màu phân loại tuỳ ý là tự mâu thuẫn trong cùng một sản phẩm |
| 3 | Chuỗi **phân loại** dùng theo thứ tự `--chart-1`, `--chart-5`, `--chart-4`, rồi `--chart-2`; mỗi fill có viền 1px màu `--card` | Xem phần tương phản bên dưới. Brass (`--chart-2`) là slot thứ tư chứ không phải slot bị cấm — bảng màu chỉ có bấy nhiêu hue dùng được |

**Sửa token:** `--chart-3` ở light mode đổi từ `--prussian-300` sang `--prussian-500`.

Đây là lần đầu một giá trị trong `globals.css` bị sửa ngoài `design-bootstrap`, nên ghi rõ: không phải
đổi thẩm mỹ, mà là sửa lỗi tương phản. `--prussian-300 #7CA9D8` là màu brand dành cho **dark mode**;
trên nền trắng nó đạt khoảng **2.5:1**, dưới ngưỡng **3:1** của WCAG 1.4.11 cho đồ hoạ phi văn bản.

Đo tiếp thì thấy dark mode của `--chart-3` là `--prussian-500`, trên nền card tối cũng chỉ ~2.2:1 —
tức hai giá trị đã bị đặt ngược nhau ngay từ đầu. Hoán lại cũng không xong, vì `--prussian-300` ở dark
mode đã là `--chart-1`. Bảng màu đơn giản là **không có hue thứ năm**. Kết luận được ghi vào comment
ngay tại `globals.css`: `--chart-3` là slot yếu, ưu tiên 1 / 5 / 4 / 2 trước, và mọi fill phân loại
kèm viền 1px để ranh giới do viền đảm nhiệm — WCAG 1.4.11 xét được biên của đối tượng, không bắt
riêng fill phải đạt ngưỡng.

MASTER.md được bổ sung một dòng ghi nhận lớp biểu đồ. Phần còn lại của MASTER.md không đổi: ADR này
không mở lại `design-bootstrap`.

## Consequences

- Trang Home nặng thêm vì recharts: route `/[locale]` sau build là **119 kB** (First Load 319 kB),
  so với 10.2 kB / 243 kB của `/recently-used` — chênh lệch phần lớn là thư viện biểu đồ. Chấp nhận
  cho một trang sau đăng nhập; nếu sau này có biểu đồ ở trang public thì phải đo lại.
- recharts render SVG mà screen reader không đọc được theo từng điểm, nên mỗi biểu đồ **bắt buộc** đi
  kèm `role="img"` + `aria-label` tóm tắt và một bảng `sr-only` chứa đúng dữ liệu đó
  (`views/Home/components/ChartDataTable`). Đây là chi phí cố định của quyết định này.
- Bảng xếp hạng một chuỗi (`CountBarList`) **không** dùng recharts: chỉ có một chuỗi nên độ dài thanh
  đã nói hết, và markup thường giữ được mỗi dòng là một link thật với vùng chạm 44px, thứ mà một
  `<rect>` trong SVG không cho.
- Mọi biểu đồ về sau phải theo bảng thứ tự màu ở trên thay vì tự chọn `--chart-*`.
