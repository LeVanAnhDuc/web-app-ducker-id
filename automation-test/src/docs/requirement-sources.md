# Nguồn requirement của Ducker ID

**Requirement của module lấy ở đâu.** `/write-tests` đọc file này ở bước 1 và chỉ đọc các nơi liệt kê dưới đây, cộng với
những gì user nói trong chat. Không dùng Jira/Confluence.

Đường dẫn tính từ gốc repo app (`web-app-ducker-id/`, thư mục cha của `automation-test/`). Khi user chỉ thêm nơi khác,
hoặc một nơi bị bỏ/đóng băng, sửa bảng này trong cùng lượt.

## Tài liệu

- `README.md` → `## Features` — những gì **đã ship**; requirement chỉ viết cho tính năng có ở đây.
- `docs/project-goals.md` — phạm vi, goals / non-goals.
- `docs/unfinished-features.md` — backlog; tính năng ở đây chưa build → "Ngoài phạm vi" trong `decisions/<module>.md`.
- `docs/specs/<feature>/design.md` (+ `plan.md`, `security-report.md`) — luồng, quy tắc nghiệp vụ, quyết định của feature.
- `docs/ui-designs/<feature>/*.html` — mock UI đã duyệt.
- `docs/erd.md` — mô hình dữ liệu.
- `CLAUDE.md` (gốc repo) — cách các phần nối với nhau, OIDC, entitlements, notifications.

## Code

- Client: `client/src/app/[locale]/**` (route), `client/src/views/<Page>/**` (màn hình, form, trạng thái loading/lỗi/rỗng),
  `client/src/locales/{en,vi}/*.json` (text), `client/src/requests/**` (endpoint gọi tới), `client/src/layouts/**` (guard).
- Server: `server/src/modules/<name>/**` (route, controller, service, constants), `server/src/validators/schemas/**`
  (Joi — biên, định dạng), `server/src/i18n/locales/{en,vi}/*.json` (message), `server/src/models/**`,
  `server/src/middlewares/**` (guard, rate limit), `server/src/constants/redis/**`.
- Seed: `server/src/database/seeders/data/*.ts` — dữ liệu và tài khoản test có sẵn.

## Không đọc như nguồn đúng

- `docs/specs/**/e2e.md`, `docs/specs/**/e2e-bugs.md` — bản ghi lịch sử trước khi có bộ regression (ID cũ).
- `automation-test/src/docs/runs/**`, `automation-test/src/docs/bug-history.md` — kết quả chạy, không phải yêu cầu.
- `client/src/mocks/**` và màn hình còn đọc từ `@/mocks` (Billing, Profile stat badge, force logout) — chưa nối API thật.

## Thứ tự thẩm quyền

User (chat) > tài liệu trên > code. Code cho biết app _đang_ làm gì, không cho biết _nên_ làm gì.
