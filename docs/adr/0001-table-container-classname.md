# ADR 0001 — Expose `containerClassName` on shadcn `Table`

**Status:** Accepted
**Date:** 2026-07-07

## Context

shadcn `Table` (`client/src/components/ui/table.tsx`) bọc `<table>` trong một div scroll `relative w-full overflow-auto` với class hard-code, không nhận className. Tính năng full-height list tables (specs/full-height-list-tables) cần bound chiều cao container scroll này để có sticky header + rows cuộn nội bộ. Wrap từ bên ngoài không khả thi: nested-scroll làm hỏng `position: sticky` (thead sticky bám vào scroll container gần nhất, phải là chính div overflow đó).

## Decision

Thêm optional prop `containerClassName` forward vào div container, merge qua `cn()`. Không đổi hành vi mặc định (không truyền → y như trước). Đây là ngoại lệ PROJECT-PATCH của rule "immutable `ui/*`" trong `client/.claude/rules/components.md`.

## Consequences

- Divergence khỏi shadcn upstream (upstream chưa expose prop này) → khi `npx shadcn@latest add --diff table` cần re-apply patch thủ công. Comment `// PROJECT-PATCH` đánh dấu điểm này.
- Cho phép `ListTableCard` + full-height tables hoạt động mà không phải fork toàn bộ Table primitive.
