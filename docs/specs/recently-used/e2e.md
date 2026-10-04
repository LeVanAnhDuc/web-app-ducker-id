# E2E — Recently Used

Spec: `client/e2e/recently-used/recently-used.e2e.ts` (project `chromium`, user `user@test.com`).
Helper: `client/e2e/helpers/recentApps.ts` — dựng lịch sử qua API, snapshot ở `beforeAll`, phát lại ở `afterAll`.

Suite đọc app từ catalog thật (2 app đầu theo tên) thay vì tên seed cố định, nên chạy được trên DB không seed chuẩn;
ca cần 2 app tự skip khi catalog chỉ có 1.

| # | Nhóm | Kịch bản | Kỳ vọng |
| --- | --- | --- | --- |
| 1 | Happy | Ghi B rồi A | Nhóm "Today", thứ tự A, B; "Opened once" |
| 2 | Empty | Xoá toàn bộ | "No recent apps yet" + "Browse apps" dẫn tới `/apps` |
| 3 | Search | Gõ tiền tố tên A; gõ chuỗi không khớp | Chỉ còn A; "No results found" + "Clear filters" khôi phục |
| 4 | Remove + Undo | Bấm "Remove from history: A", rồi Undo trên toast | Dòng biến mất ngay; Undo đưa lại, API cũng thấy A |
| 5 | Clear all | "Clear History" → dialog → xác nhận, reload | Empty state, giữ nguyên sau reload |
| 6 | Ghi nhận | Bấm "Open A" ở `/apps` | `POST /users/me/recent-apps/:id` → 204; A xuất hiện ở `/recently-used` |
| 7 | Favorite | Bấm tim trên dòng 2 lần | `aria-pressed` đổi rồi về như cũ |
| 8 | Phân trang | Stub API: trang 1 / 2, mỗi trang 1 dòng | Dòng trang 2 được tải (sentinel hoặc nút), hiện "You've reached the end" |
| 9 | i18n | `/vi/recently-used` | H1 "Dùng gần đây", nhóm "Hôm nay" |

Kết quả 04.10.2026 (worktree, server :5100 / client :3100): **9 pass, 1 skip** (#1 — DB hiện chỉ có 1 app user thấy được).
Ghi nhận qua OIDC (`/oauth/authorize`) được phủ bằng unit test `oauth.spec.ts`, không có E2E vì cần một app vệ tinh thật.
