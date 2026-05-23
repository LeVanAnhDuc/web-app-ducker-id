# Rules — docs/

Folder `docs/` chỉ chứa 2 nhóm tài liệu source-of-truth:

## 1. `project-goals.md` — Định vị + scope

- Single source of truth về Identity/Vision/Goals/Non-Goals của dự án
- Mọi feature mới phải đối chiếu `## 4. Goals` và `## 5. Non-Goals` **trước khi** vào pipeline orchestrator
- Xung đột với goals → cập nhật `project-goals.md` qua PR có review của owner. KHÔNG tự suy diễn trong feature spec
- Pipeline agent (clarifier, pm-requirements, tech-architect) đọc file này khi feature liên quan đến định vị / scope / non-goals

## 2. `erds/` — Data model

- `erds/erd.md` — schema MongoDB chính cho IDMS (Identity + App Registry + Entitlement + OAuth + Notification + Support)
- `erds/erd-*.md` — schema cho satellite app (vd `erd-blog.md`)
- Source-of-truth: file ERD. Sync **TAY** với Mongoose schemas tại `server/src/modules/*/entities/`
- Drift giữa ERD và entity code:
  - Code mới hơn ERD → developer/architect update ERD trong cùng commit/PR
  - ERD mới hơn code → là spec chưa implement → flag trong pipeline
- Tech-architect đọc ERD khi thiết kế data model. Phát hiện thiếu field/collection → đề xuất update ERD qua ADR trong `design.md`
