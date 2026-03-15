# TÀI LIỆU 2: TEST CASE & ACCEPTANCE CRITERIA

> Map với từng User Story ở Tài liệu 1.

---

## 2.1. Quy ước đọc

- 🟢 **Happy Path** — Luồng chính, input hợp lệ
- 🟡 **Edge Case** — Input bất thường, trạng thái dữ liệu đặc biệt
- 🔴 **Error Case** — Lỗi hệ thống, thiếu auth, input sai

**Trạng thái:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Duyệt danh sách bài hát (Browse + Search)

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-01.1  | 🟢 Happy | **GIVEN** có 50 bài hát trong DB **WHEN** GET /songs (no params) **THEN** trả về 20 bài đầu, meta `{ total:50, page:1, limit:20, totalPages:3 }` | ⚪ |
| TC-01.2  | 🟢 Happy | **GIVEN** có bài "Shape of You" của "Ed Sheeran" **WHEN** GET /songs?search=shape **THEN** trả về bài đó trong kết quả | ⚪ |
| TC-01.3  | 🟢 Happy | **GIVEN** có nhiều bài **WHEN** GET /songs?search=ed+sheeran **THEN** trả về các bài có artist chứa "ed sheeran" | ⚪ |
| TC-01.4  | 🟢 Happy | **GIVEN** đang ở page 1 **WHEN** GET /songs?page=2&limit=10 **THEN** trả về bài 11–20, `page:2` | ⚪ |
| TC-01.5  | 🟢 Happy | **WHEN** GET /songs?sortBy=title&sortOrder=asc **THEN** danh sách sắp xếp A-Z theo title | ⚪ |
| TC-01.6  | 🟢 Happy | **WHEN** GET /songs?sortBy=createdAt&sortOrder=desc **THEN** bài mới nhất lên đầu (default) | ⚪ |
| TC-01.7  | 🟡 Edge  | **WHEN** GET /songs?search= (empty string) **THEN** trả về tất cả, không filter | ⚪ |
| TC-01.8  | 🟡 Edge  | **WHEN** GET /songs?page=999 (vượt quá totalPages) **THEN** trả về `items: []`, meta đúng | ⚪ |
| TC-01.9  | 🟡 Edge  | **WHEN** GET /songs?limit=200 (vượt max) **THEN** 400 Bad Request | ⚪ |
| TC-01.10 | 🟡 Edge  | **GIVEN** DB rỗng **WHEN** GET /songs **THEN** `items: []`, `total: 0` | ⚪ |
| TC-01.11 | 🟡 Edge  | **WHEN** GET /songs?search=<script>alert(1)</script> **THEN** không execute, trả về `items: []` hoặc kết quả an toàn | ⚪ |
| TC-01.12 | 🔴 Error | **GIVEN** MongoDB timeout **WHEN** GET /songs **THEN** 500 Internal Server Error | ⚪ |

---

### US-02: Phát bài hát (Stream Audio)

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-02.1  | 🟢 Happy | **GIVEN** song tồn tại, file tồn tại trên disk **WHEN** GET /songs/:id/stream (không có Range header) **THEN** 200, trả về toàn bộ audio file, `Content-Type` đúng | ⚪ |
| TC-02.2  | 🟢 Happy | **GIVEN** song tồn tại **WHEN** GET /songs/:id/stream với `Range: bytes=0-1023` **THEN** 206 Partial Content, `Content-Range: bytes 0-1023/fileSize`, body = 1024 bytes | ⚪ |
| TC-02.3  | 🟢 Happy | **GIVEN** đang phát đến giây 60 (seek) **WHEN** browser gửi `Range: bytes=X-` **THEN** 206, stream từ offset X đến cuối | ⚪ |
| TC-02.4  | 🟢 Happy | **GIVEN** guest (không token) **WHEN** stream bài hát **THEN** 206/200 OK (không cần auth) | ⚪ |
| TC-02.5  | 🟡 Edge  | **WHEN** GET /songs/:id/stream với Range: bytes=0-0 **THEN** 206, body = 1 byte | ⚪ |
| TC-02.6  | 🟡 Edge  | **WHEN** Range end > fileSize **THEN** 206, trả về đến cuối file (`Content-Range: bytes start-lastByte/total`) | ⚪ |
| TC-02.7  | 🟡 Edge  | **WHEN** Range start > fileSize **THEN** 416 Range Not Satisfiable | ⚪ |
| TC-02.8  | 🔴 Error | **GIVEN** song tồn tại trong DB nhưng audio file bị xóa khỏi disk **WHEN** stream **THEN** 404 Not Found (file not found) | ⚪ |
| TC-02.9  | 🔴 Error | **WHEN** GET /songs/nonexistent-id/stream **THEN** 404 Not Found (song not found) | ⚪ |
| TC-02.10 | 🔴 Error | **GIVEN** invalid ObjectId format **WHEN** GET /songs/abc/stream **THEN** 400 Bad Request | ⚪ |

---

### US-03: Tạo playlist

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-03.1  | 🟢 Happy | **GIVEN** user đã login **WHEN** POST /playlists `{ name: "Chill Vibes" }` **THEN** 201, playlist được tạo với `ownerId = userId`, `songs: []` | ⚪ |
| TC-03.2  | 🟢 Happy | **WHEN** POST /playlists `{ name: "My Mix", description: "Nhạc buổi sáng" }` **THEN** 201, description được lưu | ⚪ |
| TC-03.3  | 🟡 Edge  | **WHEN** POST /playlists `{ name: "A" }` (1 ký tự) **THEN** 201 OK (min length = 1) | ⚪ |
| TC-03.4  | 🟡 Edge  | **WHEN** POST /playlists `{ name: "X".repeat(100) }` (100 ký tự) **THEN** 201 OK (max = 100) | ⚪ |
| TC-03.5  | 🟡 Edge  | **WHEN** POST /playlists `{ name: "X".repeat(101) }` **THEN** 400 Bad Request | ⚪ |
| TC-03.6  | 🟡 Edge  | **WHEN** POST /playlists `{ name: "" }` **THEN** 400 Bad Request | ⚪ |
| TC-03.7  | 🔴 Error | **GIVEN** không có token **WHEN** POST /playlists **THEN** 401 Unauthorized | ⚪ |
| TC-03.8  | 🔴 Error | **GIVEN** MongoDB lỗi **WHEN** POST /playlists **THEN** 500 Internal Server Error | ⚪ |

---

### US-04: Xem danh sách playlist và chi tiết

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-04.1  | 🟢 Happy | **GIVEN** có 30 playlist **WHEN** GET /playlists **THEN** 200, trả về 20 đầu với meta pagination | ⚪ |
| TC-04.2  | 🟢 Happy | **GIVEN** guest (no token) **WHEN** GET /playlists **THEN** 200 OK (không cần auth) | ⚪ |
| TC-04.3  | 🟢 Happy | **GIVEN** playlist có 5 bài **WHEN** GET /playlists/:id **THEN** 200, trả về playlist info + `songs` array đầy đủ (populated title/artist/duration/cover) | ⚪ |
| TC-04.4  | 🟡 Edge  | **GIVEN** playlist rỗng (chưa có bài nào) **WHEN** GET /playlists/:id **THEN** 200, `songs: []` | ⚪ |
| TC-04.5  | 🟡 Edge  | **WHEN** GET /playlists/nonexistent-id **THEN** 404 Not Found | ⚪ |
| TC-04.6  | 🟡 Edge  | **WHEN** GET /playlists/invalid-format **THEN** 400 Bad Request | ⚪ |
| TC-04.7  | 🔴 Error | **GIVEN** DB timeout **WHEN** GET /playlists **THEN** 500 | ⚪ |

---

### US-05: Thêm / xóa bài hát khỏi playlist

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-05.1  | 🟢 Happy | **GIVEN** user là owner của playlist, song tồn tại **WHEN** POST /playlists/:id/songs `{ songId }` **THEN** 200, song được thêm vào cuối | ⚪ |
| TC-05.2  | 🟢 Happy | **GIVEN** song đang trong playlist **WHEN** DELETE /playlists/:id/songs/:songId **THEN** 200, song bị xóa khỏi playlist | ⚪ |
| TC-05.3  | 🟡 Edge  | **GIVEN** song đã có trong playlist **WHEN** POST /playlists/:id/songs với cùng songId **THEN** 409 Conflict (không thêm duplicate) | ⚪ |
| TC-05.4  | 🟡 Edge  | **WHEN** thêm song không tồn tại trong DB **THEN** 404 Not Found (song) | ⚪ |
| TC-05.5  | 🟡 Edge  | **WHEN** DELETE song không có trong playlist **THEN** 404 Not Found | ⚪ |
| TC-05.6  | 🔴 Error | **GIVEN** user KHÔNG phải owner **WHEN** POST /playlists/:id/songs **THEN** 403 Forbidden | ⚪ |
| TC-05.7  | 🔴 Error | **GIVEN** không có token **WHEN** POST /playlists/:id/songs **THEN** 401 Unauthorized | ⚪ |
| TC-05.8  | 🔴 Error | **GIVEN** playlist không tồn tại **WHEN** POST /playlists/:id/songs **THEN** 404 Not Found (playlist) | ⚪ |

---

### US-06: Xóa playlist

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-06.1  | 🟢 Happy | **GIVEN** user là owner **WHEN** DELETE /playlists/:id **THEN** 200, playlist bị xóa vĩnh viễn | ⚪ |
| TC-06.2  | 🟡 Edge  | **GIVEN** playlist có nhiều bài **WHEN** owner xóa **THEN** 200, playlist và tất cả song references bị xóa (không ảnh hưởng bản thân bài hát) | ⚪ |
| TC-06.3  | 🔴 Error | **GIVEN** user KHÔNG phải owner **WHEN** DELETE /playlists/:id **THEN** 403 Forbidden | ⚪ |
| TC-06.4  | 🔴 Error | **GIVEN** không có token **WHEN** DELETE /playlists/:id **THEN** 401 Unauthorized | ⚪ |
| TC-06.5  | 🔴 Error | **WHEN** DELETE /playlists/nonexistent **THEN** 404 Not Found | ⚪ |

---

### US-07: Quản lý Queue (client-side)

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-07.1  | 🟢 Happy | **GIVEN** queue rỗng **WHEN** user click "Add to Queue" trên một bài **THEN** bài được thêm vào queue, hiển thị trong panel | ⚪ |
| TC-07.2  | 🟢 Happy | **GIVEN** đang phát bài A, queue có [B, C] **WHEN** click Next **THEN** bài B bắt đầu phát, queue còn [C] | ⚪ |
| TC-07.3  | 🟢 Happy | **GIVEN** đang phát bài B, có history [A] **WHEN** click Prev **THEN** bài A phát lại | ⚪ |
| TC-07.4  | 🟢 Happy | **GIVEN** queue có nhiều bài **WHEN** user remove 1 bài khỏi queue **THEN** bài bị gỡ, thứ tự còn lại không đổi | ⚪ |
| TC-07.5  | 🟡 Edge  | **GIVEN** đang phát bài cuối, queue rỗng **WHEN** click Next **THEN** nhạc dừng hoặc replay bài hiện tại | ⚪ |
| TC-07.6  | 🟡 Edge  | **GIVEN** đang phát bài đầu tiên **WHEN** click Prev **THEN** seek về 0:00 của bài hiện tại | ⚪ |
| TC-07.7  | 🟡 Edge  | **WHEN** user reload page **THEN** queue được restore từ localStorage | ⚪ |

---

### US-08: Playback Persistence (client-side)

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-08.1  | 🟢 Happy | **GIVEN** user đang nghe bài X tại giây 45 **WHEN** reload page **THEN** player hiển thị bài X, position = 45s (nhạc không tự phát lại — cần user click play) | ⚪ |
| TC-08.2  | 🟢 Happy | **GIVEN** user đã nghe và đóng tab **WHEN** mở lại app **THEN** bài cuối + position được restore | ⚪ |
| TC-08.3  | 🟢 Happy | **GIVEN** volume = 30% **WHEN** reload **THEN** volume vẫn 30% | ⚪ |
| TC-08.4  | 🟡 Edge  | **GIVEN** bài X đã bị admin xóa **WHEN** restore playback **THEN** hiển thị "Song no longer available", player reset | ⚪ |
| TC-08.5  | 🟡 Edge  | **GIVEN** localStorage bị clear **WHEN** mở app **THEN** player ở trạng thái empty, không lỗi | ⚪ |

---

### US-09: Admin upload bài hát

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-09.1  | 🟢 Happy | **GIVEN** admin đã login **WHEN** POST /songs với audio file mp3 + cover file + metadata **THEN** 201, song được tạo, files lưu trên disk | ⚪ |
| TC-09.2  | 🟢 Happy | **WHEN** POST /songs với audio file + coverUrl (không upload cover) **THEN** 201, `coverImage: { type: 'url', url: '...' }` | ⚪ |
| TC-09.3  | 🟢 Happy | **WHEN** POST /songs với audio file, không có cover **THEN** 201, `coverImage: null` | ⚪ |
| TC-09.4  | 🟡 Edge  | **WHEN** POST /songs với audio file WAV **THEN** 201 OK (tất cả format được chấp nhận) | ⚪ |
| TC-09.5  | 🟡 Edge  | **WHEN** POST /songs với cả coverImage file lẫn coverUrl **THEN** coverImage file ưu tiên (hoặc 400 nếu conflict) | ⚪ |
| TC-09.6  | 🟡 Edge  | **WHEN** POST /songs thiếu title **THEN** 400 Bad Request | ⚪ |
| TC-09.7  | 🟡 Edge  | **WHEN** POST /songs thiếu audio file **THEN** 400 Bad Request (audio file required) | ⚪ |
| TC-09.8  | 🔴 Error | **GIVEN** user thường (non-admin) **WHEN** POST /songs **THEN** 403 Forbidden | ⚪ |
| TC-09.9  | 🔴 Error | **GIVEN** không có token **WHEN** POST /songs **THEN** 401 Unauthorized | ⚪ |
| TC-09.10 | 🔴 Error | **GIVEN** disk đầy **WHEN** upload file **THEN** 500, thông báo lỗi rõ ràng | ⚪ |

---

### US-10: Admin cập nhật thông tin bài hát

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-10.1  | 🟢 Happy | **GIVEN** admin **WHEN** PATCH /songs/:id `{ title: "New Title" }` **THEN** 200, title được update | ⚪ |
| TC-10.2  | 🟢 Happy | **WHEN** PATCH /songs/:id với cover file mới **THEN** 200, cover cũ bị replace | ⚪ |
| TC-10.3  | 🟢 Happy | **WHEN** PATCH /songs/:id `{ removeCover: true }` **THEN** 200, `coverImage: null` | ⚪ |
| TC-10.4  | 🟡 Edge  | **WHEN** PATCH /songs/:id với body rỗng `{}` **THEN** 200, không có gì thay đổi | ⚪ |
| TC-10.5  | 🟡 Edge  | **WHEN** PATCH /songs/nonexistent **THEN** 404 Not Found | ⚪ |
| TC-10.6  | 🔴 Error | **GIVEN** user thường **WHEN** PATCH /songs/:id **THEN** 403 Forbidden | ⚪ |
| TC-10.7  | 🔴 Error | **GIVEN** không có token **WHEN** PATCH /songs/:id **THEN** 401 Unauthorized | ⚪ |

---

### US-11: Admin xóa bài hát (cascade)

| ID       | Loại     | Scenario | Trạng thái |
| -------- | -------- | -------- | ---------- |
| TC-11.1  | 🟢 Happy | **GIVEN** admin, song không có trong playlist nào **WHEN** DELETE /songs/:id **THEN** 200, song bị xóa vĩnh viễn khỏi DB | ⚪ |
| TC-11.2  | 🟢 Happy | **GIVEN** song xuất hiện trong 3 playlists **WHEN** admin DELETE /songs/:id **THEN** 200, song bị xóa + tự động bị remove khỏi tất cả 3 playlists | ⚪ |
| TC-11.3  | 🟡 Edge  | **GIVEN** audio file đã bị xóa khỏi disk **WHEN** admin DELETE /songs/:id **THEN** 200, DB record vẫn bị xóa (idempotent, bỏ qua lỗi file) | ⚪ |
| TC-11.4  | 🔴 Error | **GIVEN** user thường **WHEN** DELETE /songs/:id **THEN** 403 Forbidden | ⚪ |
| TC-11.5  | 🔴 Error | **WHEN** DELETE /songs/nonexistent **THEN** 404 Not Found | ⚪ |

---

## 2.3. Validation Rules

### Song fields

| Field        | Rule                                              | Error Message                      | Validate tại    |
| ------------ | ------------------------------------------------- | ---------------------------------- | --------------- |
| `title`      | Required, string, 1–200 chars, trim               | "Title is required"                | Client + Server |
| `artist`     | Required, string, 1–100 chars, trim               | "Artist is required"               | Client + Server |
| `album`      | Optional, string, max 100 chars                   | "Album too long"                   | Server          |
| `duration`   | Required, number, integer, min 1 (giây)           | "Duration must be a positive integer" | Client + Server |
| `genre`      | Optional, string, max 50 chars                    | "Genre too long"                   | Server          |
| `audioFile`  | Required khi create, MIME bắt đầu bằng `audio/`  | "Audio file is required / Invalid audio format" | Server (Multer) |
| `coverImage` | Optional, MIME = image/* (jpg/png/webp/gif)       | "Invalid image format"             | Server (Multer) |
| `coverUrl`   | Optional, valid URI                               | "Invalid cover URL"                | Client + Server |
| `coverImage` + `coverUrl` | Không được có cả hai đồng thời        | "Provide either file or URL, not both" | Server      |

### Song query params

| Field       | Rule                                              | Default      |
| ----------- | ------------------------------------------------- | ------------ |
| `page`      | Integer, min 1                                    | 1            |
| `limit`     | Integer, min 1, max 100                           | 20           |
| `search`    | String, max 100 chars                             | —            |
| `sortBy`    | Enum: `title` \| `createdAt`                      | `createdAt`  |
| `sortOrder` | Enum: `asc` \| `desc`                             | `desc`       |

### Playlist fields

| Field         | Rule                                              | Error Message              |
| ------------- | ------------------------------------------------- | -------------------------- |
| `name`        | Required, string, 1–100 chars, trim               | "Name is required"         |
| `description` | Optional, string, max 300 chars                   | "Description too long"     |

### Playlist query params

| Field       | Rule                    | Default |
| ----------- | ----------------------- | ------- |
| `page`      | Integer, min 1          | 1       |
| `limit`     | Integer, min 1, max 100 | 20      |

### Add song to playlist

| Field    | Rule                        | Error Message         |
| -------- | --------------------------- | --------------------- |
| `songId` | Required, valid ObjectId    | "Invalid song ID"     |

---

## 2.4. Concurrent & Race Conditions

| Tình huống | Rủi ro | Hành vi mong đợi |
| ---------- | ------ | ---------------- |
| 2 user cùng thêm bài vào cùng playlist | Songs bị append đúng, không mất | Mongoose `$push` atomic — an toàn |
| Admin xóa song trong khi user đang stream | Stream bị ngắt giữa chừng | 404 hoặc connection drop — client xử lý bằng `onerror` trên `<audio>` |
| Admin xóa song trong khi user đang xem playlist detail | Song vẫn hiển thị trước khi refresh | Client re-fetch khi user interact; song không còn streamable → hiển thị "unavailable" |
| User xóa playlist trong khi đang mở ở tab khác | Tab khác vẫn hiển thị dữ liệu cũ | Re-fetch khi user thao tác — 404 nếu playlist không còn |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục | Giới hạn | Hành vi khi vượt ngưỡng |
| --- | -------- | ----------------------- |
| Songs trong 1 playlist | Tối đa 500 bài | 400 "Playlist is full" |
| Số playlist per user | Không giới hạn v1.0 | — |
| Audio file size | Không giới hạn (v1.0) | Multer không set limit |
| Cover image size | 5MB | 400 "Cover image too large" |
| Queue size (client) | Tối đa 200 bài | UI disable "Add to queue" hoặc cảnh báo |
| Search query length | 100 chars | 400 Bad Request |
| Pagination limit | Max 100 | 400 Bad Request |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí |
| ----- | ----------- | -------- |
| NF-01 | Performance | GET /songs list response < 500ms với 10.000 songs trong DB (có index) |
| NF-02 | Performance | Stream endpoint: time-to-first-byte < 200ms cho range requests |
| NF-03 | Performance | Playlist detail (populated songs) < 800ms với 500 songs |
| NF-04 | Security    | Chỉ Admin (AdminGuard) mới upload/update/delete song |
| NF-05 | Security    | Chỉ playlist owner mới thêm/xóa bài và xóa playlist |
| NF-06 | Security    | Audio file path không expose tên file thật (phòng path traversal) |
| NF-07 | Security    | Upload chỉ nhận MIME `audio/*` cho audio field, `image/*` cho cover field |
| NF-08 | Compatibility | HTML5 `<audio>` hoạt động trên Chrome, Safari, Firefox phiên bản mới nhất |
| NF-09 | Reliability | Khi audio file bị mất trên disk: 404 rõ ràng, không crash server |
| NF-10 | UX | Playback state được restore sau reload mà không cần user action thêm (ngoại trừ click play) |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] HTTP Range requests hoạt động đúng (seek trong bài hát)
- [ ] Cascade delete: xóa song → tự động remove khỏi playlists
- [ ] Queue + Playback persistence hoạt động sau reload
- [ ] AdminGuard block đúng (403 cho non-admin trên write endpoints)
- [ ] Unit test coverage >= 85%
- [ ] Không có bug severity Critical hoặc High còn open
