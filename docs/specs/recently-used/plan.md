# Plan — Recently Used Apps

> Design: `design.md` · Branch: `feat/recently-used`

Thứ tự thực hiện (mỗi bước xanh tsc + lint + test trước khi sang bước sau).

## BE

1. `isAppVisibleTo(app, role)` vào `web-app/helpers` (thuần); `AppFavoritableGuard` dùng lại nó.
2. Model `user-app-usage.ts` + `MODEL_NAMES.USER_APP_USAGE` + 3 index (unique, list, TTL `hiddenAt`).
3. Module `recent-app/` theo layout mới: interface + `impl/mongo-recent-app.repository.ts`
   (`record` = upsert bằng update pipeline: insert / hồi sinh / dedupe 60s / `$inc`, retry 1 lần khi đua unique index),
   `services/` một method một file, controller, routes, module factory.
4. Validator `recent-app.ts` (`page`/`limit` như các list khác); i18n `recentApp` en + vi + `ns` trong `i18n/config.ts`;
   `ERROR_CODES.RECENT_APP_NOT_FOUND`; rate limit `recordRecentAppByUser` (60/phút/user).
5. Wire `modules.loader.ts` (sau `favorite`, trước `oauth`); `oauth` nhận `recentAppService`, ghi lượt mở sau
   `recordAppSignIn` (không ghi khi denied, lỗi chỉ log).
6. Swagger `recent-app/swagger` + đăng ký trong `openapi.ts`.
7. Sau khi PR #18 merge: rebase, chuyển `list` sang `resolvePaging` / `toPageMeta` / `PaginatedResult`.
8. Unit test: `services/spec/recent-app.spec.ts`, cập nhật `oauth.spec.ts` (ghi khi cấp code, không ghi khi denied, lỗi không chặn redirect).

## FE

1. Constants (`END_POINTS.RECENT_APP*`, `QUERY_KEYS.RECENT_APPS`, `RECENT_GROUP`), types `RecentApp`, `requests/recentApps.ts`.
2. `hooks/useOpenApp` — mở tab trước, ghi lượt mở nền; thay 5 chỗ `window.open`.
3. `useToggleFavorite` cập nhật optimistic + invalidate cả cache `RECENT_APPS`.
4. View: `RecentAppsBoard` (PageShell/PageHeader/PageToolbar/PageContent) → `RecentAppsList` → `RecentAppGroup` + `RecentAppRow`;
   `LoadMoreButton` / `AllLoadedNote`; ghost `LoadMoreTrigger` (IntersectionObserver); `ClearHistoryDialog`;
   hooks `useRecentApps` / `useHideRecentApp` (optimistic + toast Undo) / `useClearRecentApps`.
5. `utils/recentApps.ts` — nhóm theo ngày local. Xoá `mocks/RecentlyUsed`, `HistoryList`, type cũ; locale en + vi.

## Docs

`erd.md` (DR-RECENT), `unfinished-features.md` §5, `project-goals.md` bảng endpoint, README `## Features`, CLAUDE.md, `e2e.md`.
