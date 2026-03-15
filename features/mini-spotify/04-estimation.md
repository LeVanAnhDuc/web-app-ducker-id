# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                    |
| ---------------------------- | -------------------------- |
| **Tổng thời gian ước lượng** | ~11 ngày (có buffer 1.3x)  |
| **Số developer**             | 1 người                    |
| **Ngày bắt đầu dự kiến**    | 20/03/2026                 |
| **Ngày hoàn thành dự kiến**  | 03/04/2026                 |
| **Hệ số buffer**             | 1.3x (thêm 30%)            |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Thêm `SONG`, `PLAYLIST` vào `constants/models.ts` | TL3 - Mục 3.3 | 15m | |
| Tạo Mongoose model `song.ts` + indexes | TL3 - Mục 3.3 | 1h | Sub-doc audioFile + coverImage, text index |
| Tạo Mongoose model `playlist.ts` + indexes | TL3 - Mục 3.3 | 45m | songs array ref Song |
| Thêm `uploadSongFiles` vào `middlewares/file-upload.ts` | TL3 - Mục 3.3 | 1h | fields: audioFile (audio/*, no size limit) + coverImage (image/*, 5MB) |
| Tạo TypeScript types (`types/modules/mini-spotify.ts`) | TL3 - Mục 3.6 | 45m | |

### Phase 2: Backend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo Joi validation schemas (`validators/schemas/mini-spotify.ts`) | TL3 - Mục 3.8 | 1h | 7 schemas |
| Tạo `internals/range-stream.ts`: `parseRangeHeader()`, `streamAudio()` | TL3 - Mục 3.5 | 2h | Core streaming logic, edge cases: no Range, start > size → 416 |
| Tạo `internals/query-builder.ts`: `buildSongFilter()`, `buildSongSort()` | TL3 - Mục 3.5 | 45m | text search + sort |
| Tạo `SongRepository`: find, count, findById, create, update, hardDelete | TL3 - Mục 3.7 | 1.5h | lean(), populate uploadedBy |
| Tạo `PlaylistRepository`: find, count, findById, create, update, delete, pushSong, pullSong, removeSongFromAll | TL3 - Mục 3.7 | 2h | populate owner + songs, $push/$pull, updateMany cascade |
| Tạo `SongService`: createSong, listSongs, getSongById, streamSong, updateSong, deleteSong (+ cascade) | TL3 - Mục 3.5, TL2 - TC-09~11 | 3h | resolveCoverImage, deleteFileFromDisk best-effort, cascade |
| Tạo `PlaylistService`: create, list, getById, update, delete, addSong, removeSong | TL3 - Mục 3.5, TL2 - TC-03~06 | 2.5h | owner check, duplicate song 409, songs max 500 |
| Tạo `SongController` (6 routes + stream endpoint) | TL3 - Mục 3.7 | 1.5h | |
| Tạo `PlaylistController` (7 routes) | TL3 - Mục 3.7 | 1.5h | |
| Tạo `mini-spotify.module.ts` + mount vào `modules.loader.ts` | TL3 - Mục 3.7 | 45m | |
| Tạo i18n error keys | TL3 - Mục 3.4 | 30m | |
| **Doc standard API (Swagger)** _(bắt buộc)_ | Skill: doc-standards-api | 2.5h | 13 endpoints, stream đặc biệt cần Range header docs |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 1h | lean(), Promise.all, populate N+1, stream pipe |
| **Review security** _(bắt buộc)_ | Skill: review-security | 1h | Admin authZ, path traversal trên stream, file upload MIME |

### Phase 3: Frontend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo `dataSources/MiniSpotify/index.ts`: 13 API functions | TL1 - US-01~11 | 1h | |
| Tạo Zustand slice `stores/slices/music-player.ts` + localStorage persistence | TL3 - Mục 3.9 | 2h | play, pause, next, prev, seek, queue, history, savePosition |
| Tạo `hooks/useMusicPlayer.ts` | TL3 - Mục 3.9 | 30m | |
| Tạo `components/MusicPlayer/` (PlayerBar fixed bottom, Controls, Progress, Volume, QueuePanel) | TL2 - TC-07, TC-08 | 4h | HTML5 `<audio>` ref, timeupdate → savePosition, seek via currentTime |
| Tạo `app/[locale]/apps/mini-spotify/layout.tsx` (wrap MusicPlayer + pb-24) | TL3 - Mục 3.7 | 30m | |
| Tạo Browse songs page (`page.tsx`) + `views/MusicBrowse/` (list + search + SongCard) | TL1 - US-01 | 2.5h | |
| Tạo Playlists list page + `views/PlaylistList/` | TL1 - US-04 | 1.5h | |
| Tạo Playlist detail page + `views/PlaylistDetail/` (songs + add/remove nếu owner) | TL1 - US-04, US-05 | 2.5h | |
| Tạo Create playlist page + `views/PlaylistCreate/` | TL1 - US-03 | 1h | |
| Tạo Admin upload song page + `views/SongUpload/` (audio file + cover + metadata form) | TL1 - US-09 | 2.5h | multipart/form-data, audio file input |
| Tạo Admin edit song page + `views/SongEdit/` | TL1 - US-10 | 1.5h | pre-fill form, removeCover |
| Tích hợp delete song + delete playlist (confirm dialog + toast) | TL1 - US-06, US-11 | 1h | |
| Tạo translation files `locales/en/mini-spotify.json` + `vi/mini-spotify.json` | TL3 - Mục 3.7 | 30m | |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | MusicPlayer component phức tạp nhất |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 45m | audio element memory, re-render khi timeupdate |
| **Review security** _(bắt buộc)_ | Skill: review-security | 30m | Admin page guard, song URL không expose path thật |

### Phase 4: Testing & QA

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Unit test: `range-stream.ts` — no header, valid range, end > fileSize, start > fileSize → 416 | TL2 - TC-02.x | 1.5h | Core logic, nhiều edge cases |
| Unit test: `query-builder.ts` — search, sort combinations | TL2 - TC-01.x | 30m | |
| Unit test: `SongService` — createSong, deleteSong cascade, updateSong, resolveCoverImage | TL2 - TC-09~11 | 2h | Mock repos, mock fs |
| Unit test: `PlaylistService` — create, addSong (duplicate 409, max 500), removeSong, delete | TL2 - TC-03~06 | 2h | Mock repos |
| Unit test: Joi schemas — createSong, updateSong, createPlaylist, addSong, listQuery | TL2 - Mục 2.3 | 1h | |
| Integration test: Song CRUD (POST upload, GET list/detail, PATCH, DELETE cascade) | TL2 - TC-09~11 | 2h | Supertest + seeded data |
| Integration test: Stream endpoint — no header (200), Range (206), invalid range (416), missing file (404) | TL2 - TC-02.x | 2h | File mock hoặc real test file nhỏ |
| Integration test: Playlist CRUD + addSong/removeSong (owner check, duplicate, cascade) | TL2 - TC-03~06 | 2h | |
| Integration test: Auth/authZ — 401, 403 admin endpoints, 403 non-owner playlist | TL2 - TC-05.6~7, TC-09.8~9 | 1h | |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) | Trạng thái |
| ----------------------- | ------------------------ | -------------------------- | ---------- |
| 1. Setup & Foundation   | 3.75h                    | ~5h                        | ⬜ Todo    |
| 2. Backend Development  | 19.25h                   | ~25h                       | ⬜ Todo    |
| 3. Frontend Development | 23.25h                   | ~30h                       | ⬜ Todo    |
| 4. Testing & QA         | 14h                      | ~18h                       | ⬜ Todo    |
| **TỔNG**                | **~60.25h**              | **~78h (~10 ngày)**        |            |
