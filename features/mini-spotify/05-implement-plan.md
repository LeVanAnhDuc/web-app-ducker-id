# IMPLEMENTATION PLAN: Mini-Spotify (App Store — v1.0)

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 32         |
| Hoàn thành   | 0/32       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 20/03/2026 |

---

## Thứ tự implement

### Phase 1: Setup & Foundation

#### TASK-001: Thêm constants + tạo Mongoose models

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `SONG`, `PLAYLIST` vào `server/src/constants/models.ts`
  - [ ] Tạo `server/src/models/song.ts`: schema với sub-doc `audioFile { path, mimetype, size }`, sub-doc `coverImage { type, url } | null`, fields `title/artist/album/genre/duration/uploadedBy`, timestamps
  - [ ] Thêm indexes vào Song: `{ title: 'text', artist: 'text' }`, `{ createdAt: -1 }`, `{ artist: 1, createdAt: -1 }`
  - [ ] Tạo `server/src/models/playlist.ts`: schema với `name/description/ownerId/songs: [ObjectId]`, timestamps
  - [ ] Thêm indexes vào Playlist: `{ ownerId: 1, createdAt: -1 }`, `{ createdAt: -1 }`
  - [ ] Verify model names khớp với `MODEL_NAMES` constants
- **Files sẽ tạo/sửa:**
  - `server/src/constants/models.ts` (sửa)
  - `server/src/models/song.ts` (tạo mới)
  - `server/src/models/playlist.ts` (tạo mới)

---

#### TASK-002: Thêm uploadSongFiles middleware

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm `uploadSongFiles` vào `server/src/middlewares/file-upload.ts`
  - [ ] `diskStorage` audioFile: destination = `uploads/mini-spotify/audio/{YYYY-MM-DD}/`, filename = `{uuid}.{ext}`
  - [ ] `diskStorage` coverImage: destination = `uploads/mini-spotify/covers/{YYYY-MM-DD}/`, filename = `{uuid}.{ext}`
  - [ ] `fileFilter` audioFile: MIME starts with `audio/` — tất cả format
  - [ ] `fileFilter` coverImage: MIME = `image/jpeg | image/jpg | image/png | image/webp | image/gif`, max 5MB
  - [ ] Export `uploadSongFiles` dùng `.fields([{ name: 'audioFile', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }])`
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/file-upload.ts` (sửa)

---

#### TASK-003: Tạo TypeScript types

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `server/src/types/modules/mini-spotify.ts`
  - [ ] Định nghĩa: `CreateSongDto`, `UpdateSongDto`, `SongQuery`, `SongCoverImage`, `SongListItem`, `SongDetailItem`, `CreatePlaylistDto`, `UpdatePlaylistDto`, `PlaylistListItem`, `PlaylistDetailItem`, `PaginatedResult<T>`
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/mini-spotify.ts` (tạo mới)

---

### Phase 2: Backend Development

#### TASK-004: Tạo Joi validation schemas

- **Tham chiếu:** TL3 - Mục 3.8, TL2 - Mục 2.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `server/src/validators/schemas/mini-spotify.ts`
  - [ ] `createSongSchema`: title required, artist required, duration integer min(1), coverUrl uri optional
  - [ ] `updateSongSchema`: tất cả optional, removeCover boolean
  - [ ] `listSongsQuerySchema`: page, limit(max 100), search(max 100), sortBy, sortOrder với defaults
  - [ ] `createPlaylistSchema`: name required 1-100, description optional max 300
  - [ ] `updatePlaylistSchema`: tất cả optional
  - [ ] `addSongToPlaylistSchema`: songId required, valid ObjectId pattern
  - [ ] `listPlaylistsQuerySchema`: page, limit(max 100) với defaults
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/mini-spotify.ts` (tạo mới)
- **Test cần pass:** TL2 - Mục 2.3 (validation rules)

---

#### TASK-005: Tạo range-stream helper

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-02.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/internals/range-stream.ts`
  - [ ] `parseRangeHeader(rangeHeader, fileSize)`: parse `bytes=X-Y`, handle `bytes=X-` (no end), return `{ start, end, chunkSize, total }`
  - [ ] Throw `416` AppError nếu `start >= fileSize`
  - [ ] Clamp `end = Math.min(end, fileSize - 1)`
  - [ ] `streamAudio(res, filePath, mimetype, rangeResult | null)`:
    - [ ] Nếu `rangeResult === null`: `res.writeHead(200, ...)` + `createReadStream(path).pipe(res)`
    - [ ] Nếu có `rangeResult`: `res.writeHead(206, { Content-Range, Accept-Ranges, ... })` + `createReadStream(path, { start, end }).pipe(res)`
  - [ ] Handle stream errors: `stream.on('error', ...)` → log + end response
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/internals/range-stream.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-02.1 ~ TC-02.7

---

#### TASK-006: Tạo query-builder

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-01.x
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/internals/query-builder.ts`
  - [ ] `buildSongFilter(query)`: `$text: { $search: query.search }` nếu có search, ngược lại `{}`
  - [ ] `buildSongSort(sortBy, sortOrder)`: `title` hoặc `createdAt` với direction
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/internals/query-builder.ts` (tạo mới)

---

#### TASK-007: Tạo SongRepository

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/songs/song.repository.ts`
  - [ ] `find(filter, sort, skip, limit)`: `.lean()`, populate `uploadedBy` (name only)
  - [ ] `countDocuments(filter)`
  - [ ] `findById(id)`: full doc, populate `uploadedBy`
  - [ ] `create(dto)`: tạo song doc mới
  - [ ] `findByIdAndUpdate(id, update)`: trả về updated doc
  - [ ] `hardDelete(id)`: `deleteOne({ _id: id })`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/songs/song.repository.ts` (tạo mới)

---

#### TASK-008: Tạo PlaylistRepository

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/playlists/playlist.repository.ts`
  - [ ] `find(filter, sort, skip, limit)`: `.lean()`, populate `ownerId` (name), return với computed `songCount` (songs.length)
  - [ ] `countDocuments(filter)`
  - [ ] `findById(id)`: populate `ownerId` + `songs` (full SongListItem fields)
  - [ ] `create(dto)`: tạo playlist doc mới
  - [ ] `findByIdAndUpdate(id, update)`: trả về updated doc
  - [ ] `delete(id)`: `deleteOne({ _id: id })`
  - [ ] `pushSong(playlistId, songId)`: `findByIdAndUpdate(id, { $push: { songs: songId } })`
  - [ ] `pullSong(playlistId, songId)`: `findByIdAndUpdate(id, { $pull: { songs: songId } })`
  - [ ] `removeSongFromAll(songId)`: `updateMany({ songs: songId }, { $pull: { songs: songId } })` (cascade)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/playlists/playlist.repository.ts` (tạo mới)

---

#### TASK-009: Tạo SongService

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-01~02, TC-09~11
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-005, TASK-006, TASK-007
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/songs/song.service.ts`
  - [ ] `resolveCoverImage(coverFile?, coverUrl?, removeCover?)`: cùng pattern với blog
  - [ ] `deleteFileFromDisk(path)`: `fs.unlink` best-effort (log error, không throw)
  - [ ] `createSong(dto, files)`: validate coverImage + coverUrl conflict → resolve cover → `songRepo.create()`
  - [ ] `listSongs(query)`: buildFilter + buildSort → `Promise.all([find, count])` → map to `SongListItem[]`
  - [ ] `getSongById(id)`: findById → 404 if not found → map to `SongDetailItem`
  - [ ] `streamSong(id, req, res)`: findById → 404 → `fs.stat(path)` → 404 if missing → parseRange → streamAudio
  - [ ] `updateSong(id, dto, files?)`: findById → 404 → resolve cover → `findByIdAndUpdate`
  - [ ] `deleteSong(id)`: findById → 404 → `hardDelete` → `playlistRepo.removeSongFromAll` → `deleteFileFromDisk`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/songs/song.service.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-01.x, TC-02.x, TC-09.x, TC-10.x, TC-11.x

---

#### TASK-010: Tạo PlaylistService

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-03~06
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-007, TASK-008
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/playlists/playlist.service.ts`
  - [ ] `createPlaylist(userId, dto)`: `playlistRepo.create({ ownerId: userId, songs: [], ...dto })`
  - [ ] `listPlaylists(query)`: `Promise.all([find, count])` → map to `PlaylistListItem[]` (với songCount)
  - [ ] `getPlaylistById(id)`: findById → 404 → map to `PlaylistDetailItem` (với populated songs)
  - [ ] `updatePlaylist(id, userId, dto)`: findById → 404 → check owner (403) → update
  - [ ] `deletePlaylist(id, userId)`: findById → 404 → check owner (403) → delete
  - [ ] `addSong(playlistId, songId, userId)`: findById playlist → 404 → check owner (403) → `songRepo.findById(songId)` → 404 → check duplicate (409) → check songs.length < 500 (400) → `pushSong`
  - [ ] `removeSong(playlistId, songId, userId)`: findById → 404 → check owner (403) → check song in songs array (404) → `pullSong`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/playlists/playlist.service.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-03.x ~ TC-06.x

---

#### TASK-011: Tạo Controllers + Module + Mount routes

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 2.75h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-009, TASK-010
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/mini-spotify/songs/song.controller.ts`: 7 routes (GET /, POST /, GET /:id/stream, GET /:id, PATCH /:id, DELETE /:id)
  - [ ] Gắn middleware đúng cho từng route: `optionalAuthGuard` trên GET list/detail, `authGuard + adminGuard` trên write endpoints, stream endpoint không cần auth
  - [ ] Tạo `server/src/modules/apps/mini-spotify/playlists/playlist.controller.ts`: 7 routes
  - [ ] Tạo `server/src/modules/apps/mini-spotify/mini-spotify.module.ts`: `createMiniSpotifyModule()`, mount `songRouter` vào `/songs`, `playlistRouter` vào `/playlists`
  - [ ] Mount vào `server/src/loaders/modules.loader.ts`: `v1Router.use('/apps/mini-spotify', miniSpotifyRouter)`
  - [ ] Tạo i18n error keys vào translation files
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/songs/song.controller.ts` (tạo mới)
  - `server/src/modules/apps/mini-spotify/playlists/playlist.controller.ts` (tạo mới)
  - `server/src/modules/apps/mini-spotify/mini-spotify.module.ts` (tạo mới)
  - `server/src/loaders/modules.loader.ts` (sửa)
- **Test cần pass:** Smoke test tất cả endpoints

---

#### TASK-012: Doc standard API (Swagger)

- **Tham chiếu:** Skill: doc-standards-api
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Swagger cho 6 song endpoints (upload, list, detail, stream, update, delete)
  - [ ] Swagger cho stream: document `Range` header, `206` response, `416` error
  - [ ] Swagger cho 7 playlist endpoints

---

#### TASK-013: Review code backend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Chạy `/review-code` trên toàn bộ `modules/apps/mini-spotify/`
  - [ ] Fix tất cả issues

---

#### TASK-014: Review performance backend

- **Tham chiếu:** Skill: review-performance
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Verify `.lean()` trên tất cả read queries
  - [ ] Verify `Promise.all([find, count])` trong list endpoints
  - [ ] Verify populate không gây N+1 (single populate call)
  - [ ] Verify stream: `pipe()` không buffer toàn bộ file vào memory
  - [ ] Check `$pull` + `$push` atomic operations

---

#### TASK-015: Review security backend

- **Tham chiếu:** Skill: review-security
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Verify `audioFile.path` KHÔNG expose trong bất kỳ API response nào
  - [ ] Verify path traversal không thể xảy ra trong stream (path lấy từ DB, không từ user input)
  - [ ] Verify admin-only endpoints có đủ `AuthGuard + AdminGuard`
  - [ ] Verify owner-only operations check `ownerId === req.user.id`
  - [ ] Verify Multer MIME validation cho cả audioFile lẫn coverImage

---

### Phase 3: Frontend Development

#### TASK-016: Tạo dataSources + translations

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Tạo `client/src/dataSources/MiniSpotify/index.ts`: 13 functions (`listSongs`, `getSongById`, `createSong`, `updateSong`, `deleteSong`, `createPlaylist`, `listPlaylists`, `getPlaylistById`, `updatePlaylist`, `deletePlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`)
  - [ ] Stream URL: helper function trả về stream URL string (không fetch — dùng trực tiếp trong `<audio src>`)
  - [ ] Tạo `client/src/locales/en/mini-spotify.json` + `vi/mini-spotify.json`
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/MiniSpotify/index.ts` (tạo mới)
  - `client/src/locales/en/mini-spotify.json` (tạo mới)
  - `client/src/locales/vi/mini-spotify.json` (tạo mới)

---

#### TASK-017: Tạo Zustand music-player store

- **Tham chiếu:** TL3 - Mục 3.9, TL2 - TC-07, TC-08
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/stores/slices/music-player.ts`
  - [ ] State: `currentSong`, `currentPosition`, `isPlaying`, `volume`, `queue`, `history`
  - [ ] Actions: `play`, `pause`, `resume`, `next`, `prev`, `seek`, `setVolume`, `addToQueue`, `removeFromQueue`, `clearQueue`, `savePosition`
  - [ ] `play(song)`: nếu cùng bài → resume; nếu bài mới → push currentSong vào history, reset position = 0
  - [ ] `next()`: queue.shift() → play; nếu queue rỗng → stop
  - [ ] `prev()`: nếu position > 3 → seek(0); ngược lại → history.pop() → play
  - [ ] Persist vào localStorage (`music-player-storage`): `currentSong`, `currentPosition`, `volume`, `queue`
  - [ ] `isPlaying` KHÔNG persist (default `false` sau reload)
  - [ ] Tạo `client/src/hooks/useMusicPlayer.ts`: thin wrapper
- **Files sẽ tạo/sửa:**
  - `client/src/stores/slices/music-player.ts` (tạo mới)
  - `client/src/hooks/useMusicPlayer.ts` (tạo mới)

---

#### TASK-018: Tạo MusicPlayer component

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-07, TC-08
- **Ước lượng:** 4h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-017
- **Checklist:**
  - [ ] Tạo `client/src/components/MusicPlayer/index.tsx`: fixed bottom bar, `position: fixed; bottom: 0`
  - [ ] `<audio>` ref: `src={streamUrl(currentSong.id)}`, `onTimeUpdate → savePosition`, `onEnded → next()`
  - [ ] Sync `audio.currentTime` với store `seek()` action
  - [ ] Tạo `PlayerControls.tsx`: Prev / Play-Pause / Next buttons
  - [ ] Tạo `PlayerProgress.tsx`: progress bar, hiển thị `currentPosition / duration`, click để seek
  - [ ] Tạo `PlayerVolume.tsx`: volume slider (0–1)
  - [ ] Tạo `QueuePanel.tsx`: slide-up panel, danh sách bài trong queue, remove button từng bài
  - [ ] Handle `currentSong = null`: player ẩn hoặc disabled state
  - [ ] Handle TC-08.4: nếu sau restore bài không còn tồn tại → reset store
- **Files sẽ tạo/sửa:**
  - `client/src/components/MusicPlayer/` (tạo mới, nhiều files)

---

#### TASK-019: Tạo mini-spotify layout

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-018
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/layout.tsx`
  - [ ] Wrap children với `<div className="pb-24">` (space cho player bar)
  - [ ] Mount `<MusicPlayer />` (client component)
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/mini-spotify/layout.tsx` (tạo mới)

---

#### TASK-020: Tạo Browse Songs page

- **Tham chiếu:** TL1 - US-01, TL2 - TC-01.x
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016, TASK-017
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/page.tsx`
  - [ ] Tạo `client/src/views/MusicBrowse/index.tsx`
  - [ ] Tạo `client/src/views/MusicBrowse/mains/SongList/`: search input + list + pagination
  - [ ] Tạo `client/src/views/MusicBrowse/components/SongCard/`: cover, title, artist, duration, Play button, "Add to Queue" button
  - [ ] Click Play → `store.play(song)`; click Add to Queue → `store.addToQueue(song)`
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/mini-spotify/page.tsx` (tạo mới)
  - `client/src/views/MusicBrowse/` (tạo mới)

---

#### TASK-021: Tạo Playlist List + Create pages

- **Tham chiếu:** TL1 - US-03, US-04, TL2 - TC-03, TC-04
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/playlists/page.tsx`
  - [ ] Tạo `client/src/views/PlaylistList/` (grid + pagination + "New Playlist" button nếu logged in)
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/playlists/new/page.tsx` (auth required)
  - [ ] Tạo `client/src/views/PlaylistCreate/mains/PlaylistForm/`: name + description fields, React Hook Form + Zod
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/mini-spotify/playlists/page.tsx` (tạo mới)
  - `client/src/app/[locale]/apps/mini-spotify/playlists/new/page.tsx` (tạo mới)
  - `client/src/views/PlaylistList/` (tạo mới)
  - `client/src/views/PlaylistCreate/` (tạo mới)

---

#### TASK-022: Tạo Playlist Detail page

- **Tham chiếu:** TL1 - US-04, US-05, US-06, TL2 - TC-04~06
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-017, TASK-021
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/playlists/[id]/page.tsx`
  - [ ] Tạo `client/src/views/PlaylistDetail/mains/PlaylistContent/`: playlist info + song list
  - [ ] Nếu là owner: hiện nút "Remove" từng bài + "Delete Playlist" + "Edit" (name/desc)
  - [ ] Click bài → `store.play(song)`; "Add to Queue" → `store.addToQueue(song)`
  - [ ] "Play All" button → load tất cả vào queue, play bài đầu
  - [ ] Delete playlist → confirm dialog → redirect về `/playlists`
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/mini-spotify/playlists/[id]/page.tsx` (tạo mới)
  - `client/src/views/PlaylistDetail/` (tạo mới)

---

#### TASK-023: Tạo Admin Song Upload + Edit pages

- **Tham chiếu:** TL1 - US-09, US-10, TL2 - TC-09, TC-10
- **Ước lượng:** 4h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/admin/songs/new/page.tsx` (admin only)
  - [ ] Tạo `client/src/views/SongUpload/mains/SongUploadForm/`:
    - [ ] Audio file input (accept="audio/*")
    - [ ] Cover image upload OR URL input (mutually exclusive)
    - [ ] Fields: title, artist, album, genre, duration (manual input)
    - [ ] Submit: multipart/form-data
  - [ ] Tạo `client/src/app/[locale]/apps/mini-spotify/admin/songs/[id]/edit/page.tsx` (admin only)
  - [ ] Tạo `client/src/views/SongEdit/mains/SongEditForm/`: pre-fill, removeCover option
  - [ ] Admin delete song button trong Edit page: confirm dialog
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/mini-spotify/admin/songs/new/page.tsx` (tạo mới)
  - `client/src/app/[locale]/apps/mini-spotify/admin/songs/[id]/edit/page.tsx` (tạo mới)
  - `client/src/views/SongUpload/` (tạo mới)
  - `client/src/views/SongEdit/` (tạo mới)

---

#### TASK-024: Review code frontend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-022, TASK-023
- **Checklist:**
  - [ ] Chạy `/review-code` trên `components/MusicPlayer/`, `stores/slices/music-player.ts`, views/
  - [ ] Fix issues: React patterns, audio element cleanup, store subscriptions

---

#### TASK-025: Review performance frontend

- **Tham chiếu:** Skill: review-performance
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-024
- **Checklist:**
  - [ ] Verify `onTimeUpdate` không gây re-render quá nhiều (throttle hoặc dùng ref)
  - [ ] Verify `<audio>` element không leak memory (cleanup trong useEffect)
  - [ ] Verify server components cho list pages (SEO + initial load)

---

#### TASK-026: Review security frontend

- **Tham chiếu:** Skill: review-security
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-024
- **Checklist:**
  - [ ] Verify admin pages redirect nếu không phải admin role
  - [ ] Verify stream URL không expose file path thật (chỉ là `/api/v1/apps/mini-spotify/songs/:id/stream`)
  - [ ] Verify owner-only actions ẩn UI cho non-owner

---

### Phase 4: Testing & QA

#### TASK-027: Unit test — range-stream helper

- **Tham chiếu:** TL2 - TC-02.x
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-005
- **Checklist:**
  - [ ] Test no Range header → return null
  - [ ] Test `bytes=0-1023` → `{ start:0, end:1023, chunkSize:1024, total }`
  - [ ] Test `bytes=X-` (no end) → end = fileSize - 1
  - [ ] Test `bytes=0-0` → chunkSize = 1
  - [ ] Test end > fileSize → clamp to fileSize - 1
  - [ ] Test start >= fileSize → throw 416
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/internals/__tests__/range-stream.test.ts` (tạo mới)

---

#### TASK-028: Unit test — query-builder

- **Tham chiếu:** TL2 - TC-01.x
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-006
- **Checklist:**
  - [ ] Test no search → `{}`
  - [ ] Test with search → `{ $text: { $search: '...' } }`
  - [ ] Test sort combinations (title asc/desc, createdAt asc/desc)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/internals/__tests__/query-builder.test.ts` (tạo mới)

---

#### TASK-029: Unit test — SongService

- **Tham chiếu:** TL2 - TC-09~11
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-009
- **Checklist:**
  - [ ] Mock SongRepository, PlaylistRepository, fs module
  - [ ] Test `createSong`: happy path, coverUrl, coverFile, no cover, conflict coverFile + coverUrl → 400
  - [ ] Test `streamSong`: song not found 404, file missing 404
  - [ ] Test `deleteSong`: happy path + cascade (`playlistRepo.removeSongFromAll` called), not found 404
  - [ ] Test `updateSong`: success, removeCover, not found 404
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/songs/__tests__/song.service.test.ts` (tạo mới)

---

#### TASK-030: Unit test — PlaylistService + Joi schemas

- **Tham chiếu:** TL2 - TC-03~06, Mục 2.3
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-010, TASK-004
- **Checklist:**
  - [ ] Mock SongRepository, PlaylistRepository
  - [ ] Test `addSong`: success, duplicate 409, playlist full 400, song not found 404, non-owner 403
  - [ ] Test `removeSong`: success, song not in playlist 404, non-owner 403
  - [ ] Test `deletePlaylist`: success, non-owner 403
  - [ ] Test Joi `createSongSchema`: valid, missing title, missing artist, missing duration, invalid coverUrl
  - [ ] Test Joi `addSongToPlaylistSchema`: valid ObjectId, invalid format
  - [ ] Test Joi `listSongsQuerySchema`: defaults, limit > 100 → error
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/playlists/__tests__/playlist.service.test.ts` (tạo mới)
  - `server/src/validators/schemas/__tests__/mini-spotify.schema.test.ts` (tạo mới)

---

#### TASK-031: Integration test — Song endpoints

- **Tham chiếu:** TL2 - TC-01.x, TC-02.x, TC-09~11
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Setup: seed admin user + regular user, test audio file nhỏ (mp3)
  - [ ] `POST /songs`: upload mp3 + cover, upload mp3 + coverUrl, no cover, missing audio 400, non-admin 403
  - [ ] `GET /songs`: list, search by title, search by artist, pagination, sort
  - [ ] `GET /songs/:id`: found, not found 404, invalid id 400
  - [ ] `GET /songs/:id/stream`: no Range header (200), with Range (206), invalid Range (416), file missing (404)
  - [ ] `PATCH /songs/:id`: admin OK, non-admin 403, not found 404
  - [ ] `DELETE /songs/:id`: admin OK + cascade verified, non-admin 403
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/songs/__tests__/song.integration.test.ts` (tạo mới)

---

#### TASK-032: Integration test — Playlist endpoints

- **Tham chiếu:** TL2 - TC-03~06
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] `POST /playlists`: create, no auth 401
  - [ ] `GET /playlists`: list, pagination, no auth OK (public)
  - [ ] `GET /playlists/:id`: detail with populated songs, not found 404
  - [ ] `PATCH /playlists/:id`: owner OK, non-owner 403
  - [ ] `DELETE /playlists/:id`: owner OK, non-owner 403
  - [ ] `POST /playlists/:id/songs`: add, duplicate 409, song not found 404, non-owner 403
  - [ ] `DELETE /playlists/:id/songs/:songId`: remove, not in playlist 404, non-owner 403
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/mini-spotify/playlists/__tests__/playlist.integration.test.ts` (tạo mới)

---

## Dependency Graph

```
TASK-001 (models + constants)
    ├── TASK-007 (SongRepository)
    │       └── TASK-009 (SongService) ──────────────────────────────┐
    └── TASK-008 (PlaylistRepository)                                  │
            └── TASK-010 (PlaylistService) ──────────────────────────┤
                                                                       ↓
TASK-002 (uploadSongFiles)                               TASK-011 (controllers + module + mount)
TASK-003 (TS types)                                          │
    └── TASK-006 (query-builder) → TASK-009                 ├── TASK-012 (Swagger)
TASK-004 (Joi schemas) ──────────────→ TASK-011             ├── TASK-013 (review code BE)
TASK-005 (range-stream) ─────────────→ TASK-009             │       ├── TASK-014 (review perf)
                                                             │       └── TASK-015 (review security)
                                                             │
                                                             ├── TASK-016 (dataSources + i18n)
                                                             │       ├── TASK-017 (Zustand store)
                                                             │       │       ├── TASK-018 (MusicPlayer)
                                                             │       │       │       └── TASK-019 (layout)
                                                             │       │       └── TASK-020 (Browse page)
                                                             │       ├── TASK-021 (Playlist list + create)
                                                             │       │       └── TASK-022 (Playlist detail)
                                                             │       └── TASK-023 (Admin song pages)
                                                             │               └── TASK-024 (review code FE)
                                                             │                       ├── TASK-025 (review perf FE)
                                                             │                       └── TASK-026 (review sec FE)
                                                             │
                                                             └── Testing:
                                                                 ├── TASK-027 (unit: range-stream) ← TASK-005
                                                                 ├── TASK-028 (unit: query-builder) ← TASK-006
                                                                 ├── TASK-029 (unit: SongService) ← TASK-009
                                                                 ├── TASK-030 (unit: PlaylistService + schemas) ← TASK-010
                                                                 ├── TASK-031 (integration: songs)
                                                                 └── TASK-032 (integration: playlists)
```
