# FAVORITES — Bug log

## Đang mở

| Bug                                   | Mức        | TC               | Tóm tắt                                                                     |
| ------------------------------------- | ---------- | ---------------- | --------------------------------------------------------------------------- |
| [BUG-FAVORITES-01](#bug-favorites-01) | Trung bình | TC-FAVORITES-035 | Tải `/favorites` lỗi hiện empty state thay cho thông báo lỗi                |
| [BUG-FAVORITES-02](#bug-favorites-02) | Thấp       | TC-FAVORITES-038 | Bỏ sao bằng bàn phím trên `/favorites` làm focus rơi về body                |
| [BUG-FAVORITES-03](#bug-favorites-03) | Trung bình | TC-FAVORITES-039 | Bấm trái tim trên Home không gửi request, báo "Failed to update favorites." |

### BUG-FAVORITES-01

- **TC:** TC-FAVORITES-035 · **Requirement:** REQ-FAVORITES-07
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** có ít nhất một yêu thích; cho `GET /users/me/favorites` trả 5xx (stub hoặc server lỗi); mở
  `/favorites` và chờ React Query thử lại xong.
- **Mong đợi:** "Could not load favorites. Please try again." (`favorites.error`), không có empty state
  (`design.md` §4, `plan.md` FavoritesGrid `isError ? … role="alert"`).
- **Thực tế:** `FavoritesGrid` đặt `<p role="alert">{t("error")}</p>` **bên trong** `PageContent`, mà `PageContent`
  trả `PageEmptyState` khi `isEmpty` (`items` rỗng vì không có data) — user thấy "You haven't favorited any apps yet."
  như thể chưa gắn sao gì; chỉ toast toàn cục "Server error" báo lỗi.

### BUG-FAVORITES-02

- **TC:** TC-FAVORITES-038 · **Requirement:** REQ-FAVORITES-08
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** `/favorites` với hai yêu thích; Tab tới trái tim của card đầu, nhấn Enter.
- **Mong đợi:** focus chuyển sang phần tử kế tiếp trong lưới (`design.md` §6 nhóm 12: "quản lý focus … không mất focus
  vào body").
- **Thực tế:** `useToggleFavorite` gỡ card khỏi cache ngay (optimistic) và không ai dời focus; nút đang focus bị gỡ khỏi
  DOM nên `document.activeElement` là `<body>`, người dùng bàn phím phải Tab lại từ đầu trang.

### BUG-FAVORITES-03

- **TC:** TC-FAVORITES-039 · **Requirement:** REQ-FAVORITES-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (chạy thật)
- **Bước tái hiện:** user không có yêu thích nào; mở Home (`/`), bấm trái tim của một tile ("Jump back in" hoặc
  Recommended). Test: `tests/e2e/favorites/toggle.e2e.ts` ("Starring from a Home tile shows up on `/favorites`").
- **Mong đợi:** `POST /users/me/favorites/:appId` → 201, trái tim chuyển sang đã bấm, app hiện trên `/favorites`.
- **Thực tế:** không có request nào được gửi; live region đọc "Failed to update favorites." và trái tim giữ nguyên.
  `client/src/hooks/useToggleFavorite.ts` `onMutate` coi mọi cache `[recentApps, …]` là `InfiniteData` (`old.pages.map`),
  nhưng `QuickAccessSection` của Home cache `[recentApps, { limit: 4 }]` dạng trang thường `{ items, meta }` →
  `old.pages` là `undefined`, `onMutate` ném TypeError, mutation thất bại trước khi `mutationFn` chạy. Mọi trái tim trên
  Home (cả khi lịch sử rỗng — query vẫn có trong cache) đều hỏng; `/apps` và `/recently-used` mở thẳng thì không.

## Đã sửa

_(chưa có)_
