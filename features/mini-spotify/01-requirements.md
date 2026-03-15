# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                              |
| ----------------- | ------------------------------------- |
| **Tên feature**   | Mini-Spotify (App trong App Store)    |
| **Người yêu cầu** | Owner                                 |
| **Ngày tạo**      | 06/03/2026                            |
| **Phiên bản**     | v1.0                                  |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

> Dự án là một **App Store** platform. Mini-Spotify là app thứ hai trong store, cùng cấp với Blog (`apps/mini-spotify/`). Các app khác trong tương lai có thể là mini-tiktok, chatbox, v.v.

**Tình trạng hiện tại:**
Store hiện có Blog (v1.0). Mini-Spotify là app thứ hai — mang lại trải nghiệm nghe nhạc trực tuyến ngay trong platform, không cần rời sang ứng dụng ngoài.

**Vấn đề:**
User chưa có kênh để khám phá và nghe nhạc trong hệ sinh thái. Cần một music player module đơn giản, hỗ trợ streaming, playlist cá nhân và queue quản lý bài đang phát.

---

## 1.3. Mục tiêu (Objectives)

- Xây dựng thư viện nhạc do Admin quản lý: upload, cập nhật, xóa bài hát
- Hỗ trợ phát nhạc trực tiếp trên trình duyệt với progressive streaming (HTTP range requests — cho phép seek)
- Cho phép User tạo và quản lý playlist cá nhân (tạo, xem, thêm/xóa bài, xóa playlist)
- Hỗ trợ Queue (danh sách phát tiếp theo) quản lý client-side
- Hỗ trợ Playback Persistence — nhớ bài đang nghe + vị trí (position) khi reload hoặc quay lại app
- Thiết kế scalable: dễ thêm Artist/Album/Like/Lyrics và các tính năng nâng cao sau này

---

## 1.4. Đối tượng người dùng (Target Users)

| Role  | Mô tả                         | Nhu cầu chính                                                              |
| ----- | ----------------------------- | -------------------------------------------------------------------------- |
| Guest | Chưa đăng nhập                | Duyệt danh sách bài hát, tìm kiếm, nghe nhạc (stream)                    |
| User  | Đã đăng nhập                  | Nghe nhạc, tạo/quản lý playlist, dùng queue, playback persistence         |
| Admin | Quản trị viên                 | Upload bài hát (file + cover), cập nhật metadata, xóa bài hát             |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                                        | Ghi chú                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| US-01 | Là một **guest/user/admin**, tôi muốn **duyệt danh sách bài hát** (search, filter, sort, phân trang) để **khám phá nhạc**                        | Search theo title và artist name                      |
| US-02 | Là một **guest/user/admin**, tôi muốn **phát một bài hát** trực tiếp trên trình duyệt để **nghe nhạc**                                           | Progressive streaming, hỗ trợ seek                    |
| US-03 | Là một **user**, tôi muốn **tạo playlist** với tên và mô tả để **tổ chức nhạc yêu thích**                                                        | Playlist thuộc về owner, public                       |
| US-04 | Là một **guest/user/admin**, tôi muốn **xem danh sách playlist** và chi tiết playlist để **khám phá nhạc được tuyển tập**                        | Tất cả playlist public                                |
| US-05 | Là một **user**, tôi muốn **thêm hoặc xóa bài hát khỏi playlist của mình** để **quản lý danh sách nhạc**                                         | Chỉ owner mới sửa được                                |
| US-06 | Là một **user**, tôi muốn **xóa playlist của mình** để **dọn dẹp playlist không còn dùng**                                                       | Hard delete, không restore                            |
| US-07 | Là một **user**, tôi muốn **quản lý queue** (thêm vào hàng đợi, xem queue, next/prev) để **kiểm soát thứ tự phát nhạc**                         | Client-side state (Zustand + localStorage)            |
| US-08 | Là một **user**, tôi muốn **tiếp tục nghe từ chỗ đã dừng** (nhớ bài đang phát + position) khi reload hoặc quay lại app để **không mất mạch nhạc** | Client-side persistence (localStorage)                |
| US-09 | Là một **admin**, tôi muốn **upload bài hát** (audio file + cover image + metadata) để **bổ sung thư viện nhạc**                                 | Chỉ admin mới upload được                             |
| US-10 | Là một **admin**, tôi muốn **cập nhật thông tin bài hát** (title, artist, cover...) để **sửa metadata**                                          | Không đổi audio file sau khi upload (future)          |
| US-11 | Là một **admin**, tôi muốn **xóa bài hát** để **gỡ nội dung khỏi thư viện**                                                                      | Hard delete; cascade: xóa song khỏi mọi playlist     |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

**Song Management (Admin):**
- `POST /api/v1/apps/mini-spotify/songs` — Upload bài hát (audio file + cover, admin)
- `GET /api/v1/apps/mini-spotify/songs` — Danh sách bài hát (search/filter/sort/pagination)
- `GET /api/v1/apps/mini-spotify/songs/:id` — Chi tiết bài hát
- `GET /api/v1/apps/mini-spotify/songs/:id/stream` — Stream audio (HTTP range requests)
- `PATCH /api/v1/apps/mini-spotify/songs/:id` — Cập nhật metadata (admin)
- `DELETE /api/v1/apps/mini-spotify/songs/:id` — Xóa bài hát (admin, hard delete + cascade)

**Playlist Management (User):**
- `POST /api/v1/apps/mini-spotify/playlists` — Tạo playlist (auth)
- `GET /api/v1/apps/mini-spotify/playlists` — Danh sách playlist (public)
- `GET /api/v1/apps/mini-spotify/playlists/:id` — Chi tiết playlist + danh sách bài
- `PATCH /api/v1/apps/mini-spotify/playlists/:id` — Cập nhật name/description (owner)
- `DELETE /api/v1/apps/mini-spotify/playlists/:id` — Xóa playlist (owner)
- `POST /api/v1/apps/mini-spotify/playlists/:id/songs` — Thêm bài vào playlist (owner)
- `DELETE /api/v1/apps/mini-spotify/playlists/:id/songs/:songId` — Xóa bài khỏi playlist (owner)

**Queue & Playback Persistence:**
- Client-side only (Zustand store + localStorage) — không cần API
- Queue: danh sách bài hát đang chờ phát, hỗ trợ next/prev/add/remove
- Playback: nhớ `currentSongId`, `currentPosition` (giây), `volume`, `queue`

**Search & Filter trên song list:**
- Search: text search trên title và artist
- Filter: không có filter category (v1.0)
- Sort: theo title (A-Z/Z-A), theo createdAt (mới nhất/cũ nhất)

**Audio Streaming:**
- Progressive streaming với HTTP `Range` header
- Response `206 Partial Content`
- Hỗ trợ seek (tua) qua `<audio>` HTML element

**Cover Image:**
- Upload file lên server (multipart/form-data) hoặc nhập URL
- Nếu không có cover: `null`

**Audio File:**
- Upload file lên server (multipart/form-data)
- Mọi format audio được chấp nhận (mp3, wav, flac, ogg, aac, m4a...)
- Không giới hạn file size trong v1.0

### Ngoài phạm vi (Out of Scope)

- Like / favorite bài hát
- Artist & Album collection (chỉ là string field trong song)
- Lyrics
- Offline download
- Social sharing
- Recommendations / Discover
- Comments / reactions
- Premium tier / paywall
- Playlist visibility (private/public toggle) — v1.0 tất cả public
- Collaborative playlist (nhiều owner)
- Playlist cover image
- Shuffle mode
- Repeat mode (song/playlist)
- Update audio file sau khi upload (chỉ update metadata)
- Admin upload UI (v1.0 chỉ API; UI admin trong future)
- Notification

### Cân nhắc cho tương lai (Future Considerations)

- Artist & Album collection riêng (separate models, hierarchy)
- Like / favorite bài hát
- Lyrics (sync hoặc static)
- Offline download (PWA / mobile)
- Playlist: visibility toggle (public/private), collaborative, cover image
- Shuffle / repeat modes
- Audio transcoding (convert FLAC → mp3 khi stream)
- Recommendations / personalized feed
- Play count tracking
- Admin upload UI (giao diện web cho admin)
- Social sharing, comments
- Premium tier

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Server module: `server/src/modules/apps/mini-spotify/` — cùng namespace `apps/` với blog
- Client routes: `client/src/app/[locale]/apps/mini-spotify/...`
- API prefix: `/api/v1/apps/mini-spotify/...`
- Tuân theo kiến trúc module hiện tại (controller → service → repository)
- Audio và cover image upload lưu trên disk (`uploads/mini-spotify/audio/`, `uploads/mini-spotify/covers/`)
- `AdminGuard` đã tồn tại (từ login-history v2.0), dùng lại
- `OptionalAuthGuard` đã tồn tại (từ contact-admin v1.0), dùng lại
- Streaming: phải xử lý HTTP `Range` header để hỗ trợ seek — không thể dùng static file serve thông thường
- Khi admin xóa song: cascade xóa song đó khỏi tất cả playlist (giữ tính nhất quán)
- Package manager: YARN

**Giả định:**

- Tất cả bài hát đều public (không có private song trong v1.0)
- Playlist của user là public — ai cũng xem được, chỉ owner mới sửa/xóa
- Queue và playback persistence hoàn toàn client-side (không cần sync server)
- Audio file không thay đổi sau khi upload (chỉ update metadata như title, artist, cover)
- Browser hỗ trợ HTML5 `<audio>` element và các format phổ biến (mp3, ogg, wav) — format khác tùy browser
- `duration` (thời lượng bài) được nhập thủ công bởi admin khi upload (không auto-detect từ file trong v1.0)
