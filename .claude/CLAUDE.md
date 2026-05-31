# Rules — docs/

Folder `docs/` chứa 3 nhóm tài liệu source-of-truth:

## 1. `project-goals.md` — Định vị + scope

- Single source of truth về Identity/Vision/Goals/Non-Goals của dự án
- Mọi feature mới phải đối chiếu `## 4. Goals` và `## 5. Non-Goals` **trước khi** vào `superpowers:brainstorming`
- Xung đột với goals → cập nhật `project-goals.md` qua PR có review của owner. KHÔNG tự suy diễn trong feature spec
- Đọc file này khi feature liên quan đến định vị / scope / non-goals (giai đoạn `brainstorming` + `pm-requirements`)

## 2. `erds` — Data model

- `erds/erd.md` — schema MongoDB chính cho IDMS (Identity + App Registry + Entitlement + OAuth + Notification + Support)
- Source-of-truth: file ERD. Sync **TAY** với Mongoose schemas tại `server/src/modules/*/entities/`
- Drift giữa ERD và entity code:
  - Code mới hơn ERD → developer update ERD trong cùng commit/PR
  - ERD mới hơn code → là spec chưa implement → flag trong `writing-plans`
- Khi thiết kế data model (giai đoạn `brainstorming` / `writing-plans`) đọc ERD trước. Phát hiện thiếu field/collection → đề xuất update ERD qua Decision Record (DR) trong `requirements.md`

## 3. `ui-designs/` — Thiết kế UX (Pencil)

- File `.pen` thiết kế web/mobile app (vd `authen.pen`, `dashboard.pen`)
- `.pen` được mã hóa: chỉ thao tác qua các tool MCP `pencil` — **KHÔNG** dùng Read/Grep trực tiếp lên file `.pen`
- Source-of-truth cho UI/UX của feature FE. Khi code `client/src/**` đụng màn hình tương ứng → đối chiếu design ở đây trước
- Drift giữa design và code FE → flag trong `brainstorming` / `requesting-code-review`, không tự suy diễn layout
