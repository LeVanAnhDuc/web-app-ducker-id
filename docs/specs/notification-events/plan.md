# Plan — Notification Events

> Design: `design.md` (cùng folder). Thực thi inline trong worktree `.worktrees/notification-events`,
> TDD cho từng đơn vị server (viết spec trước, chạy đỏ, viết code, chạy xanh).

## Server

1. **Model + types** — `models/notification.ts`: bỏ `title/message/meta`, thêm `category`, `params`,
   `link` (validator DR-12), index `{ userId, category, createdAt }`. `modules/notification/constants`:
   `NOTIFICATION_CATEGORIES`, `NOTIFICATION_CATEGORY_BY_TYPE`, `NOTIFICATION_LINKS`, `isInternalLink`.
   `types`: `NotificationDocument`, `NotificationParams`, query `category`.
2. **Read side** — DTO mới, filter `category` (helper + repo), Joi `category`, service spec cập nhật.
   Swagger `modules/notification/swagger/` + đăng ký trong `libs/swagger/openapi.ts`.
3. **Write infra** — `types/services/notification.ts` (`NotificationJobData`),
   `services/notification/notification.service.ts` (`NotificationDeliveryService`),
   `services/notification/notification.dispatcher.ts`, `services/queue/processors/notification.processor.ts`,
   `queue.module.ts` (queue thứ hai + Bull Board), `services.loader.ts`, `queue.loader.ts`,
   `loaders/index.ts`, `modules.loader.ts`. Spec: delivery, dispatcher, processor.
4. **PASSWORD_CHANGED** — `change-password` (service + module), `user` (deps + admin-reset). Spec.
5. **ACCOUNT_LOCKED** — `login/strategies/password-login` + `login.module.ts`. Spec.
6. **LOGIN_ANOMALY** — `login-history`: `services/deps.ts`, method files nhận `deps`,
   `shared/build-login-history-data.ts`, helper `assessLoginAnomaly`, repo `findSignInTraits`,
   `record-successful-login` async. Spec helper + service.
7. **APP_AVAILABLE** — `models/web-app.ts` `announcedAt`, repo `markAnnounced`, deps, `shared/announce-app.ts`,
   create/update. Spec.
8. **Seed** — `data/notifications.ts` + `notification.seeder.ts` theo shape mới.
9. `pnpm format && pnpm lint:fix && pnpm lint && pnpm type-check && pnpm test`.

## Client

10. **Types/requests/constants** — `types/Notification`, `requests/notification.ts` (`category`),
    `dataSources/Notifications` (visual theo type + danh sách nhóm), util `isInternalLink`,
    `formatRegion`.
11. **Hooks** — `useNotifications({ isRead, category, limit })` `staleTime: 0`, `useUnreadCount`
    polling 60s + refetch on focus, `useMarkNotificationRead` (giữ toast lỗi), `useOpenNotification`.
12. **`components/NotificationItem`** dùng chung + `NotificationItemContent` (dịch template).
13. **Panel** — tab Tất cả / Chưa đọc, item mới, loading/empty/error, đóng khi bấm item.
14. **Trang** — tab 3 trạng thái + chip nhóm, nhóm theo ngày, load more, announce.
15. **Locales** en + vi: `notifications.types.*`, `categories`, `tabs.all`, `actions.notMe`, `states.retry`,
    `dashboard.notifications.*` bổ sung.
16. `pnpm format && pnpm lint:fix && pnpm lint && pnpm exec tsc --noEmit`.

## E2E + docs

17. Viết lại `e2e/notifications/notifications.e2e.ts` + helper theo shape mới; thêm kịch bản ở `e2e.md`.
    Chạy worktree server `:5100` + client `:3100`, seed lại DB, `E2E_BASE_URL=http://localhost:3100`.
18. Cập nhật `docs/erd.md`, `docs/project-goals.md`, `docs/unfinished-features.md`, `README.md`
    (`## Features` + số test), `CLAUDE.md` (Swagger registry, số test, notification ghi qua queue).
19. Commit theo nhóm, push, PR, merge, xoá worktree + branch.
