# FAVORITES — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/Favorites/**`
- `client/src/components/FavoriteButton`
- `client/src/hooks/useToggleFavorite.ts`
- `client/src/locales/{en,vi}/favorites.json`
- `server/src/modules/favorite/**`
- `server/src/validators/schemas/favorite.ts`

Đọc thêm ngày 2026-10-14 (chuẩn hoá theo `/write-tests favorites`, chạy tự động — user không có mặt):

- `README.md` → `## Features` (Favourites: "Star or unstar any app from its tile", "`/favorites` shows just your
  starred apps")
- `docs/specs/favorite-apps/{design,plan,security-report}.md`, `docs/erd.md` (DR-FAV, DR-ACCESS),
  `docs/project-goals.md`, `docs/unfinished-features.md`
- `client/src/views/Favorites/mains/FavoritesGrid`, `client/src/components/{AppCard,PageContainer/PageContent}`,
  `client/src/views/Home/{components,mains}` (QuickAccess + Recommended có trái tim), `client/src/libs/query-client.ts`
  (toast lỗi toàn cục), `client/src/dataSources/Favorites`, `client/src/constants/favoritesSort.ts`
- `server/src/modules/favorite/{favorite.routes.ts,guards,services,repository}`,
  `server/src/modules/web-app/{helpers,repository}` (`isAppVisibleTo`, `findActiveByIds`, `buildWebAppFilter`),
  `server/src/middlewares/{pipes/validation.pipe.ts,filters/error.filter.ts}`,
  `server/src/i18n/locales/{en,vi}/favorite.json`, `server/src/validators/constants.ts`

Chuyển đổi từ `docs/specs/favorite-apps/e2e.md` (kịch bản 1–16 và các dòng API bị hoãn của nó, nay đã tự động hoá ở
layer api).

## Quyết định chốt

- **Q1** Các dòng API từng bị hoãn trong `docs/specs/favorite-apps/e2e.md` được chứng minh ở layer `api`; layer `e2e`
  giữ các kịch bản 1–16 của luồng người dùng thật.
- **Q2** (tự quyết 2026-10-14, cần user duyệt): gắn / bỏ sao lỗi 5xx thì toast nào? `design.md` §4 và `plan.md` yêu cầu
  `toast.error(favorites.toast.error)`; code bỏ toast riêng và để `MutationCache` hiện toast lỗi toàn cục ("Server
  error. Please try again later.", `confirmErrorToast`), key `favorites.toast.error` không còn dùng → chấp nhận toast
  toàn cục là toast lỗi docs yêu cầu (quy ước chung của client, comment `skipGlobalErrorToast` trong
  `query-client.ts`); test assert câu toast toàn cục → REQ-FAVORITES-07 (TC-FAVORITES-036).
- **Q3** (tự quyết 2026-10-14, cần user duyệt): `GET /users/me/favorites` lỗi thì `/favorites` hiện gì? `design.md` §4 +
  `plan.md` (`{isError ? <p role="alert">{t("error")}</p> : …}`) yêu cầu thông báo lỗi; code đặt thông báo lỗi bên trong
  `PageContent` nhưng `PageContent` trả empty state khi danh sách rỗng, nên user thấy "You haven't favorited any apps
  yet." → giữ docs làm requirement, ghi bug BUG-FAVORITES-01 (đã sửa 2026-10-15, fix/open-bugs) → REQ-FAVORITES-07 (TC-FAVORITES-035).
- **Q4** (tự quyết 2026-10-14, cần user duyệt): gắn sao thành công có toast không? `design.md` §6 nhóm 1 nói "toast
  success"; `plan.md` (sau design) và code chỉ announce "Added to favorites." / "Removed from favorites." → theo
  `plan.md`: thành công chỉ announce, không toast → REQ-FAVORITES-08 (TC-FAVORITES-037).
- **Q5** (tự quyết 2026-10-14, cần user duyệt): bỏ sao trên `/favorites` thì focus đi đâu? `design.md` §6 nhóm 12 yêu cầu
  "quản lý focus … không mất focus vào body"; code không xử lý focus, card bị gỡ cùng nút đang focus → giữ docs, ghi
  bug BUG-FAVORITES-02 (đã sửa 2026-10-15, fix/open-bugs) → REQ-FAVORITES-08 (TC-FAVORITES-038).
- **Q6** (tự quyết 2026-10-14, cần user duyệt): search / category của `/favorites` lưu ở đâu? `design.md` §8 đề xuất
  in-memory; `CLAUDE.md` của repo ("List pages are one system: … URL query params as source of truth") và code
  (`useListQuery`) đặt chúng trên URL; sort là state cục bộ → giữ URL cho search + category (TC-FAVORITES-005, 006),
  sort không cần sống qua reload → REQ-FAVORITES-02.
- **Q7** (tự quyết 2026-10-14, cần user duyệt): POST một app đã gắn sao trả 200 hay 201? `design.md` §8 câu 4 để ngỏ;
  code luôn 201 (upsert) → 201 cả hai lần (TC-FAVORITES-021) → REQ-FAVORITES-01.
- **Q8** (tự quyết 2026-10-14, cần user duyệt): app "user được phép gắn sao" là theo role hay theo quyền truy cập?
  `CLAUDE.md` của repo + `erd.md` DR-ACCESS: mọi truy vấn launcher dùng `AccessPolicy` (role mặc định ± override) →
  override `allow` cho phép gắn sao app admin-only, `deny` chặn app role mặc định (TC-FAVORITES-030) → REQ-FAVORITES-01,
  REQ-FAVORITES-06.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): app đã gắn sao bị chuyển inactive thì sao? `design.md` §3.2 ("lọc
  status=ACTIVE … app bị deactivate/đổi role → tự ẩn") + DR-ACCESS ("chỉ bị ẩn khi đọc, không xoá") → ẩn, giữ bản ghi,
  hiện lại khi active (TC-FAVORITES-031) → REQ-FAVORITES-05 (mới).
- **Q10** (tự quyết 2026-10-14, cần user duyệt): 404 cho app không tồn tại / inactive / không được mở có được khác nhau
  không? `design.md` §4 gom cả ba vào một `favorite:errors.appNotFound`; tiêu chí bảo mật "không lộ tồn tại" → cùng
  code, cùng message (TC-FAVORITES-032) → REQ-FAVORITES-06 (mới).
- **Q11** (tự quyết 2026-10-14, cần user duyệt): trái tim ở Home có thuộc REQ-FAVORITES-01 không? README "Star or
  unstar any app from its tile" + `design.md` DR-4 (Apps, Home, Favorites) → có; một case e2e trên Home
  (TC-FAVORITES-039). Trái tim ở `/recently-used` đã do TC-RECENTLYUSED-007 phủ.
- **Q12** (tự quyết 2026-10-14, cần user duyệt): hai tab có tự đồng bộ không? Client tắt `refetchOnWindowFocus`; không
  docs nào hứa đồng bộ trực tiếp → tab thứ hai thấy thay đổi sau reload, đã phủ bởi TC-FAVORITES-013 / 027; không thêm
  case → REQ-FAVORITES-03.

## Tài khoản test

- Case trình duyệt chạy bằng `user@test.com`: mỗi file chụp lại danh sách yêu thích của user trong `beforeAll` và khôi
  phục nó trong `afterAll` (`utils/favorites.ts → setFavorites`, idempotent).
- App dùng là các app đầu tiên trong catalogue theo tên ("A", "B", "C"), đọc lúc chạy. Case Home gắn sao trái tim đầu
  tiên trên Home (app nào tuỳ lịch sử mở app của lượt chạy).
- Case API chạy trên tài khoản dùng một lần; override quyền chỉ ghi cho tài khoản dùng một lần (mỗi lần lật quyền gửi
  notification cho chủ tài khoản) và được gỡ trong `finally`.
- Các app admin-only / inactive mà user không được phép gắn sao được đăng ký riêng cho từng spec
  (`utils/catalog.ts → createFixtureApps`) và bị xoá trong `afterAll`. TC-FAVORITES-031 lật status của app admin-only
  của chính spec đó, không đụng app seed.

## Dữ kiện server

- POST trả 201 và idempotent (unique index); DELETE trả 204 và idempotent.
- Yêu thích một app mà người gọi không thấy được (inactive, admin-only với user, hoặc bị `deny`) là 404
  `FAVORITE_APP_NOT_FOUND`, cùng message với app không tồn tại.
- Danh sách không phân trang; `sort` là `recent` (mặc định, yêu thích mới nhất trước) hoặc `name`; `search` trim rồi
  ≤ 200 ký tự, không phân biệt hoa thường, khớp `name` / `displayName` / `description`; `categoryId` phải là id 24 ký
  tự hex; search và categoryId kết hợp kiểu AND. Lỗi Joi là 400 `VALIDATION_ERROR` kèm `errors[{ field, reason }]`.
- Không có rate limit riêng cho endpoint yêu thích (security-report §6, chấp nhận mức Low).

## Ngoài phạm vi

- Rate limit riêng cho POST yêu thích — `security-report.md` §6 chỉ đề xuất "nếu thấy lạm dụng"; chưa build.
- Phân trang `/favorites` — `design.md` §8 câu 1: chưa làm.
- Skeleton khi tải (`design.md` §6 nhóm 10) — trạng thái thoáng qua, không kiểm được ổn định; không tự động hoá.
- Trang admin không có trái tim (`design.md` §6 nhóm 3) — thuộc màn `/admin/apps` của module `admin-apps`.

## Tech debt liên quan

- `favorites.toast.error` (en + vi) không còn được dùng (xem Q2).
