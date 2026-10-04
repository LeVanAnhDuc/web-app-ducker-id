# E2E — Home Activity Insights

> Spec: `design.md` §4.6 (Scenario Matrix) · File: `client/e2e/home/home.e2e.ts`
> Chạy: `E2E_BASE_URL=http://localhost:3100 pnpm e2e e2e/home/home.e2e.ts --project=chromium`

## Đây là một lượt reconcile, không phải viết mới

`client/e2e/home/home.e2e.ts` đã tồn tại từ thời Home dùng mock. Theo `e2e-scenario-coverage`,
feature sửa đổi phải **thêm / sửa / xoá**, không chỉ append:

| Hành động | Test cũ | Lý do |
| --- | --- | --- |
| **Xoá** | `the total-apps stat reflects the API total` | Assert `role="group"` tên `Tổng ứng dụng đã dùng: N`. Thẻ giờ là `link`, nhãn đổi, và con số lấy từ `recent-apps/stats` chứ không phải `meta.total` của catalog — giữ lại là assert một hành vi đã cố ý bỏ |
| **Xoá** | `shows the login stat cards from the API (vi)` · `links through to the full login history (en)` | `LoginStatsRow` với 3 thẻ `role="group"` không còn; thay bằng 4 thẻ link + biểu đồ |
| **Xoá** | `renders in English at /` | Assert heading `Quick Access` / `Recommended for You`; cả hai đã đổi tên. Thay bằng test i18n rộng hơn |
| **Sửa** | `QuickAccess renders real apps from the API` | Nguồn đổi sang `recent-apps`; test mới xác minh **fallback về catalog** khi chưa mở app nào, và không còn phụ thuộc app tên `Blog` có trong seed |
| **Thêm** | 15 test | Toàn bộ hành vi mới — xem bảng dưới |

## Phạm vi và cách dựng dữ liệu

Cả `/login-history/stats` lẫn `/users/me/recent-apps/stats` đều **stub bằng `page.route`**. Điều
đang kiểm là trang làm gì với một payload, không phải seed tình cờ chứa gì — nếu đọc dữ liệu thật thì
số cột, ngưỡng "thưa" và trạng thái rỗng sẽ đổi theo ngày chạy test.

`test.use({ timezoneId: "Asia/Ho_Chi_Minh" })` đặt ở đầu file để tham số `tz` có giá trị xác định.

Toàn bộ là read-only → **không có scenario `A only`**, không cần revert ở `afterAll`.

## Kết quả

19/19 pass (gồm `auth.setup`). Đối chiếu với matrix ở `design.md` §4.6:

| Matrix | Test |
| --- | --- |
| 1 Happy path | `renders the four stat cards as links carrying their value` |
| 2 AuthN | `sends a signed-out visitor to the login screen` (storageState rỗng) |
| 3 AuthZ | N/A — xem lý do ở matrix |
| 4 Validation **[EP]** | `falls back to seven days when the range is not one we offer` (`?range=999d`) |
| 5 Empty | `explains an empty period instead of showing a blank chart` · `invites the user to open an app when nothing is ranked yet` · `Quick Access falls back to the catalog…` |
| 6 Boundary **[BVA]** | `keeps a row per day…` (7) · `writes the choice into the URL and reloads from it` (30) · `explains a sparse period at the threshold, and stops at one over it` (3 / 4 quanh `SPARSE_THRESHOLD`) |
| 7 Filter / điều hướng | `a stat card opens the matching filtered list` · `a method slice…` · `a device row filters the list, and the panel shows that filter` · `writes the choice into the URL…` |
| 8 Data rendering | `a method slice…` và `a device row…` chọn phần tử theo nhãn người đọc (`Mật khẩu`, `Di động`), nên enum thô lọt ra là fail |
| 9 i18n | `renders the same screen in English at /` · `the removed vanity metrics are gone from both locales` |
| 10 Error | `shows an error in the activity card without taking the page down` |
| 11 Mutation | N/A — Home chỉ đọc |
| 12 A11y | `exposes the chart to a screen reader as a summary plus a table` · các thẻ chọn bằng `role="link"` |
| 13 Timezone | `sends the browser timezone so the days are cut locally` |
| 14 Lỗi bộ lọc ngày | Ở tầng unit — xem phần dưới |

## Ba điều phát hiện khi chạy test, không phải khi viết code

1. **`Asia/Saigon` chứ không phải `Asia/Ho_Chi_Minh`.** Chrome báo tên mà ICU của **nó** coi là
   canonical. Bản Node của project thì ngược lại: `Intl.supportedValuesOf("timeZone")` có
   `Asia/Saigon`, **không** có `Asia/Ho_Chi_Minh`, cũng không có `Asia/Kolkata` lẫn `UTC`. Whitelist
   dựng từ danh sách đó sẽ trả 400 cho đúng người dùng Việt Nam trên Chrome mới. Đã đổi sang kiểm tra
   "runtime có resolve được không" bằng `Intl.DateTimeFormat`, chấp nhận cả canonical lẫn link —
   `server/src/validators/timezone.spec.ts`.
2. **Thẻ lỗi cần hơn 5 giây.** Query client dùng chung retry 5xx hai lần với backoff 1s/2s, nên
   trạng thái lỗi tới sau cửa sổ `expect` mặc định. Test nới timeout thay vì đổi retry — retry là
   hành vi đúng.
3. **Suite chạy nhầm cổng nếu quên `E2E_BASE_URL`.** `e2e/helpers/env.ts` đọc biến môi trường →
   `.worktree-state.json` → `localhost:3000`. File state nằm ở repo gốc và **không** có entry cho
   worktree này, nên mặc định rơi về `:3000` — tức app bản `main`. Test sẽ chạy và fail vì lý do hoàn
   toàn khác. Luôn truyền `E2E_BASE_URL` khi chạy từ worktree.

## Còn thiếu (phụ thuộc seed)

**Matrix #14 — lỗi bộ lọc ngày (DR-16)** chỉ được phủ ở tầng unit
(`server/src/modules/login-history/helpers/login-history-filter.spec.ts`): date-only phủ trọn ngày, và
Joi `.raw()` không viết lại chuỗi trước khi tới filter.

Không khẳng định ở E2E vì cần seed có bản ghi `login_histories` đúng **ngày chạy test** — một assert
"danh sách không rỗng" sẽ xanh hôm nay và đỏ ngày mai. Đã xác minh tay trên dữ liệu thật: link từ một
cột của biểu đồ ra đúng 15 dòng của ngày đó, gồm cả các lượt lúc 20:59 giờ địa phương mà bộ lọc cũ
loại bỏ hoàn toàn.

Muốn phủ bằng E2E thì cần seed ghi `login_histories` tương đối theo `now` thay vì ngày cố định.
