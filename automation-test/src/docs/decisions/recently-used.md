# RECENTLYUSED — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/RecentlyUsed/**`, `client/src/utils/recentApps.ts`, `client/src/hooks/useOpenApp.ts`,
  `client/src/locales/{en,vi}/recentlyUsed.json`
- `server/src/modules/recent-app/**`, `server/src/modules/oauth/services/authorize.ts`,
  `server/src/validators/schemas/recent-app.ts`
- Chuyển từ `docs/specs/recently-used/e2e.md` (kịch bản 1–9; ghi chú trong đó rằng việc ghi nhận qua OIDC chưa có E2E
  nay là TC-RECENTLYUSED-028).

Đọc lại ngày 2026-10-14 (chuẩn hóa + bổ sung): `README.md` `## Features` (Recently used),
`docs/specs/recently-used/design.md`, `docs/unfinished-features.md` §5, `client/src/views/RecentlyUsed/**`
(`RecentAppsBoard`, `RecentAppsList`, `RecentAppRow`, `RecentAppGroup`, `ClearHistoryDialog`, `useHideRecentApp`,
`useClearRecentApps`), `client/src/locales/{en,vi}/recentlyUsed.json`, `server/src/modules/recent-app/**`
(`recent-app.routes.ts`, `services/*`, `repository/impl/mongo-recent-app.repository.ts`, `constants`),
`server/src/validators/schemas/recent-app.ts`, `server/src/middlewares/common/rate-limiter.middleware.ts`
(`recordRecentAppByUser`), `server/src/i18n/locales/en/recentApp.json`.

## Quyết định chốt

- **Q1** Phần nào phủ ở e2e, phần nào ở api? → các case trình duyệt chạy với session `user@test.com`; các nhóm theo
  ngày, phân trang và trường hợp lỗi stub `GET /users/me/recent-apps` và cố định đồng hồ trình duyệt (`page.clock`) cùng
  múi giờ (Asia/Ho_Chi_Minh); các case API chạy trên tài khoản dùng một lần. → REQ-RECENTLYUSED-01…05
- **Q2** (tự quyết 2026-10-14, cần user duyệt): Rate limit ghi lượt mở (design §3.2 "vd. 60 req/phút/user", code
  `RATE_LIMIT_CONFIG.RECENT_APP.RECORD.PER_USER` = 60 / 60 s, key theo user id) có là requirement không? README không
  nhắc → có: thêm requirement, kiểm ở api với tài khoản dùng một lần (lần 61 → 429 `TOO_MANY_REQUESTS` +
  `recentApp:errors.rateLimitExceeded`, user khác vẫn ghi được) → REQ-RECENTLYUSED-07 (TC-037)
- **Q3** (tự quyết 2026-10-14, cần user duyệt): Ẩn / khôi phục lặp lại, hoặc ẩn / khôi phục một app hợp lệ chưa từng
  mở, trả gì? Design §3.2 ghi DELETE "Idempotent"; code không kiểm app khi hide / restore → 204 mỗi lần, không tạo dòng
  mới, danh sách không đổi → REQ-RECENTLYUSED-04 (TC-035)
- **Q4** (tự quyết 2026-10-14, cần user duyệt): Tìm kiếm có trim và không phân biệt hoa thường không? Docs chỉ nói tìm
  theo name / displayName / description; code trim (Joi) và regex `i` (`buildWebAppFilter`), giống `/apps` → có, là
  kỳ vọng của REQ-RECENTLYUSED-03 (TC-036). Biên `search` 200 ký tự → 200 thêm vào TC-023 cạnh 201 → 400.
- **Q5** (tự quyết 2026-10-14, cần user duyệt): "Clear History" bị vô hiệu khi không có gì để xoá (chỉ thấy trong code
  `RecentAppsBoard`: `disabled={items.length === 0 && !hasSearch}`) — mong muốn hay bug? → mong muốn (không có gì để
  xác nhận xoá), thành kỳ vọng của REQ-RECENTLYUSED-04 (TC-031)
- **Q6** (tự quyết 2026-10-14, cần user duyệt): Toast sau khi xoá một app / xoá toàn bộ (locale `toast.removed`,
  `toast.cleared`; design §4.1 chỉ nói "toast có nút Undo") có là kỳ vọng không? → có, ở mức text toast hiển thị
  → REQ-RECENTLYUSED-04 (TC-034)
- **Q7** (tự quyết 2026-10-14, cần user duyệt): `POST /:appId/restore` sau `DELETE /` (xoá toàn bộ) cũng đưa dòng trở
  lại (repository `restore` không lọc theo `hiddenAt`) — mong muốn hay bug? Design chỉ cho Undo sau khi xoá **từng**
  app và UI không có đường nào gọi restore sau khi clear → không viết requirement, không test; ghi ở "Ngoài phạm vi"
  → không REQ nào
- **Q8** (tự quyết 2026-10-14, cần user duyệt): Search đặt trong URL (`useListQuery`, design §4.1 "URL là source of
  truth") → vào thẳng `/recently-used?search=…` phải mở sẵn kết quả đã lọc → REQ-RECENTLYUSED-03 (TC-032)

## Tài khoản test

- Case trình duyệt chạy với `user@test.com`: file chụp lại lịch sử đang hiển thị trong `beforeAll` và phát lại trong
  `afterAll` (`utils/recent-apps.ts`; phát lại sẽ đặt số lần mở về 1, điều không assertion nào dựa vào).
- App dùng trong test là các app đầu tiên của catalogue theo tên.
- Case API chạy trên tài khoản dùng một lần; `ageRecentUse()` lùi lần dùng cuối của tài khoản dùng một lần trong Mongo
  để vượt qua cửa sổ dedupe mà không phải chờ.

## Dữ kiện server

Các case dựa vào những điều sau. `POST /:appId` ghi một lần mở (204) cho app mà người gọi nhìn thấy được, ngược lại
trả 404; các lần ghi trong vòng 60 s kể từ lần trước sẽ dời `lastUsedAt` nhưng không cộng vào `useCount`.
`DELETE /:appId` ẩn một dòng (soft delete, purge sau 30 ngày), `POST /:appId/restore` bỏ ẩn kèm nguyên số lần,
`DELETE /` ẩn tất cả; ghi lại một app đang ẩn sẽ khởi động lại số lần từ 1. Phân trang: `page` ≥ 1, `limit` 1…100,
`search` ≤ 200. Việc ghi bị rate limit ở 60 lần mỗi user mỗi phút. Bước authorize của OIDC ghi nhận app mà nó đăng
nhập user vào.

## Ngoài phạm vi

- Purge dòng đã ẩn sau 30 ngày (TTL index MongoDB) — không chờ được trong một lượt chạy.
- `GET /users/me/recent-apps/stats` — thuộc module `home` (TC-HOME); ở đây chỉ kiểm guard 401 (TC-026).
- Ghi lượt mở cho app chỉ-admin / không hoạt động / không tồn tại → 404 — đã phủ ở TC-APPS-058, không lặp.
- Restore sau khi xoá toàn bộ (Q7).

## Tech debt liên quan

_(không có)_
