# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Mini-Spotify là app thứ hai trong App Store platform, đặt tại `modules/apps/mini-spotify/` (server) và `app/[locale]/apps/mini-spotify/` (client). Server có 2 sub-module chính: **songs** (admin-managed, CRUD + HTTP range streaming) và **playlists** (user-managed, CRUD + song management). Điểm kỹ thuật đặc biệt là endpoint stream audio xử lý `Range` header để hỗ trợ seek, trả `206 Partial Content`. Queue và Playback Persistence hoàn toàn client-side (Zustand + localStorage). Global music player là component fixed-bottom được mount trong layout của mini-spotify app.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== UPLOAD SONG FLOW (Admin) ===

Client (Admin)
    │
    ├── POST /api/v1/apps/mini-spotify/songs  (multipart/form-data)
    │       │
    │   AuthGuard → AdminGuard
    │       │
    │   uploadSongFiles.fields([audioFile, coverImage]) (Multer)
    │       │
    │   validateRequest(createSongSchema)
    │       │
    │   SongController.createSong()
    │       │
    │   SongService.createSong(dto, files)
    │       ├── resolveCoverImage(files.coverImage?, dto.coverUrl?)
    │       ├── songRepo.create(songDoc)
    │       └── ResponsePattern<SongDetailItem>

=== STREAM AUDIO FLOW ===

Browser (<audio src="/api/v1/apps/mini-spotify/songs/:id/stream">)
    │
    ├── GET /api/v1/apps/mini-spotify/songs/:id/stream
    │   Headers: Range: bytes=1048576-   (seek to ~1MB)
    │       │
    │   OptionalAuthGuard (public, no auth required)
    │       │
    │   SongController.streamSong()
    │       │
    │   SongService.streamSong(id, req, res)
    │       ├── songRepo.findById(id) → 404 if not found
    │       ├── fs.stat(song.audioFile.path) → 404 if file missing
    │       ├── parseRangeHeader(rangeHeader, fileSize)
    │       │     ├── No Range header → stream full file (200)
    │       │     ├── Valid range → return { start, end, chunkSize }
    │       │     └── start > fileSize → 416 Range Not Satisfiable
    │       ├── res.writeHead(206, {
    │       │     'Content-Range': 'bytes start-end/total',
    │       │     'Accept-Ranges': 'bytes',
    │       │     'Content-Length': chunkSize,
    │       │     'Content-Type': song.audioFile.mimetype
    │       │   })
    │       └── fs.createReadStream(path, { start, end }).pipe(res)

=== PLAYLIST FLOW ===

Client (User)
    │
    ├── POST /api/v1/apps/mini-spotify/playlists
    │       │ AuthGuard → PlaylistController.createPlaylist()
    │       │ PlaylistService.create(userId, dto)
    │       └── playlistRepo.create({ ownerId: userId, songs: [] })
    │
    ├── POST /api/v1/apps/mini-spotify/playlists/:id/songs
    │       │ AuthGuard → PlaylistController.addSong()
    │       │ PlaylistService.addSong(playlistId, songId, userId)
    │       │   ├── playlistRepo.findById → 404
    │       │   ├── check owner → 403
    │       │   ├── songRepo.findById(songId) → 404
    │       │   ├── check duplicate → 409
    │       │   └── playlistRepo.pushSong(playlistId, songId)  [$push]
    │       └── ResponsePattern<PlaylistDetailItem>
    │
    └── DELETE /api/v1/apps/mini-spotify/songs/:id  (Admin cascade)
            │ AdminGuard → SongController.deleteSong()
            │ SongService.deleteSong(id)
            │   ├── songRepo.findById → 404
            │   ├── songRepo.hardDelete(id)
            │   ├── playlistRepo.removeSongFromAll(id)  [$pull cascade]
            │   └── deleteFileFromDisk(song.audioFile.path) [best-effort]
            └── ResponsePattern<{ id }>
```

---

## 3.3. Data Model

### Collection mới: `songs`

```typescript
{
  _id:          ObjectId,
  title:        String,     // required, trim, maxlength: 200
  artist:       String,     // required, trim, maxlength: 100
  album:        String,     // optional, trim, maxlength: 100, default: null
  genre:        String,     // optional, trim, maxlength: 50, default: null
  duration:     Number,     // required, integer (giây), min: 1
  audioFile: {
    path:       String,     // relative path trên disk: uploads/mini-spotify/audio/...
    mimetype:   String,     // VD: 'audio/mpeg', 'audio/wav'
    size:       Number,     // bytes
  },
  coverImage: {
    type:       String,     // 'upload' | 'url'
    url:        String,     // relative path (upload) | absolute URL (url)
  } | null,
  uploadedBy:   ObjectId,   // ref: USER
  createdAt:    Date,
  updatedAt:    Date
}
```

**Indexes:**
```javascript
{ title: 'text', artist: 'text' }   // text search trên cả 2 fields
{ createdAt: -1 }
{ artist: 1, createdAt: -1 }
```

### Collection mới: `playlists`

```typescript
{
  _id:          ObjectId,
  name:         String,     // required, trim, maxlength: 100
  description:  String,     // optional, trim, maxlength: 300, default: null
  ownerId:      ObjectId,   // ref: USER, required
  songs:        ObjectId[], // ref: Song, max 500, default: []
  createdAt:    Date,
  updatedAt:    Date
}
```

**Indexes:**
```javascript
{ ownerId: 1, createdAt: -1 }
{ createdAt: -1 }
```

### Thay đổi files hiện tại

**`server/src/constants/models.ts`** — thêm:
```typescript
export const MODEL_NAMES = {
  // ... existing
  SONG: 'Song',
  PLAYLIST: 'Playlist',
}
```

**`server/src/middlewares/file-upload.ts`** — thêm `uploadSongFiles`:
```typescript
// audioFile: stored at uploads/mini-spotify/audio/{YYYY-MM-DD}/{uuid}.{ext}
//   MIME: starts with 'audio/' — tất cả format
//   Size: không giới hạn
// coverImage: stored at uploads/mini-spotify/covers/{YYYY-MM-DD}/{uuid}.{ext}
//   MIME: image/jpeg, image/jpg, image/png, image/webp, image/gif
//   Size: 5MB
export const uploadSongFiles = multer({...}).fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
])
```

---

## 3.4. API Design

### Endpoint 1: Upload bài hát (Admin)

```
POST /api/v1/apps/mini-spotify/songs
Headers:
  Authorization: Bearer {idToken}
  Content-Type: multipart/form-data

Request Body:
  audioFile    File    — required, audio/* MIME
  title        String  — required, 1–200 chars
  artist       String  — required, 1–100 chars
  duration     Number  — required, integer (giây)
  album        String  — optional
  genre        String  — optional
  coverImage   File    — optional, image file (max 5MB)
  coverUrl     String  — optional, URI (mutually exclusive với coverImage)

Response 201:
{
  "data": SongDetailItem,
  "message": "Song uploaded successfully",
  "status": 201,
  "reasonStatusCode": "CREATED"
}

Response 400: Validation error | missing audioFile | both coverImage + coverUrl
Response 401: Unauthenticated
Response 403: Non-admin
```

### Endpoint 2: Danh sách bài hát

```
GET /api/v1/apps/mini-spotify/songs
Query: page, limit, search, sortBy (title|createdAt), sortOrder (asc|desc)

Response 200:
{
  "data": {
    "items": [SongListItem],
    "meta": { total, page, limit, totalPages }
  }
}

SongListItem: { id, title, artist, album, genre, duration, coverImage, createdAt }
// audioFile path KHÔNG expose trong list/detail response
```

### Endpoint 3: Chi tiết bài hát

```
GET /api/v1/apps/mini-spotify/songs/:id

Response 200: { "data": SongDetailItem }
SongDetailItem: { ...SongListItem, uploadedBy: { id, name } }

Response 404: Not found
Response 400: Invalid ObjectId
```

### Endpoint 4: Stream audio ⭐

```
GET /api/v1/apps/mini-spotify/songs/:id/stream
Headers:
  Range: bytes=0-     (optional, từ browser <audio>)

Response 206 (với Range header):
  Content-Range: bytes {start}-{end}/{total}
  Accept-Ranges: bytes
  Content-Length: {chunkSize}
  Content-Type: {audio/mpeg | audio/wav | ...}
  Body: binary chunk

Response 200 (không có Range header):
  Content-Length: {totalSize}
  Content-Type: {mimetype}
  Body: toàn bộ file

Response 416: Range Not Satisfiable (start > fileSize)
Response 404: Song not found | file missing on disk
```

### Endpoint 5: Cập nhật bài hát (Admin)

```
PATCH /api/v1/apps/mini-spotify/songs/:id
Headers: Authorization: Bearer {idToken}
Content-Type: multipart/form-data | application/json

Body (all optional):
  title, artist, album, genre, duration
  coverImage   File    — new cover upload
  coverUrl     String  — new cover URL
  removeCover  Boolean — true → set coverImage = null

Response 200: SongDetailItem
Response 403: Non-admin | Response 404: Not found
```

### Endpoint 6: Xóa bài hát (Admin + cascade)

```
DELETE /api/v1/apps/mini-spotify/songs/:id
Headers: Authorization: Bearer {idToken}

Response 200: { "data": { "id": "string" } }
// Cascade: song tự động bị $pull khỏi tất cả playlists
// Audio file trên disk bị xóa (best-effort)

Response 403: Non-admin | Response 404: Not found
```

### Endpoint 7: Tạo playlist

```
POST /api/v1/apps/mini-spotify/playlists
Headers: Authorization: Bearer {idToken}

Body:
  name         String  — required, 1–100 chars
  description  String  — optional, max 300 chars

Response 201:
{
  "data": PlaylistDetailItem
}

PlaylistDetailItem: { id, name, description, owner: { id, name }, songs: [], createdAt }
```

### Endpoint 8: Danh sách playlist

```
GET /api/v1/apps/mini-spotify/playlists
Query: page, limit

Response 200:
{
  "data": {
    "items": [PlaylistListItem],
    "meta": { total, page, limit, totalPages }
  }
}

PlaylistListItem: { id, name, description, owner: { id, name }, songCount, createdAt }
// songCount thay vì full songs array (performance)
```

### Endpoint 9: Chi tiết playlist

```
GET /api/v1/apps/mini-spotify/playlists/:id

Response 200:
{
  "data": PlaylistDetailItem
}
// songs: populated array [SongListItem] — đầy đủ thông tin từng bài

Response 404: Not found
```

### Endpoint 10: Cập nhật playlist (name/description)

```
PATCH /api/v1/apps/mini-spotify/playlists/:id
Headers: Authorization: Bearer {idToken}

Body (optional):
  name         String
  description  String

Response 200: PlaylistDetailItem
Response 403: Non-owner | Response 404: Not found
```

### Endpoint 11: Xóa playlist

```
DELETE /api/v1/apps/mini-spotify/playlists/:id
Headers: Authorization: Bearer {idToken}

Response 200: { "data": { "id": "string" } }
Response 403: Non-owner | Response 404: Not found
```

### Endpoint 12: Thêm bài vào playlist

```
POST /api/v1/apps/mini-spotify/playlists/:id/songs
Headers: Authorization: Bearer {idToken}

Body:
  songId  String  — required, valid ObjectId

Response 200: PlaylistDetailItem (với songs đã updated)
Response 404: Playlist not found | Song not found
Response 403: Non-owner
Response 409: Song already in playlist
```

### Endpoint 13: Xóa bài khỏi playlist

```
DELETE /api/v1/apps/mini-spotify/playlists/:id/songs/:songId

Response 200: PlaylistDetailItem
Response 404: Playlist not found | Song not in playlist
Response 403: Non-owner
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### HTTP Range Streaming (`internals/range-stream.ts`)

```typescript
interface RangeResult {
  start: number
  end: number
  chunkSize: number
  total: number
}

parseRangeHeader(rangeHeader: string | undefined, fileSize: number): RangeResult | null:
  if (!rangeHeader) → return null  (caller sends full file 200)

  // rangeHeader = "bytes=1048576-"
  const [start, endStr] = rangeHeader.replace('bytes=', '').split('-')
  const startNum = parseInt(start)
  const endNum = endStr ? parseInt(endStr) : fileSize - 1

  if (startNum > fileSize - 1) → throw 416 error
  endNum = Math.min(endNum, fileSize - 1)

  return { start: startNum, end: endNum, chunkSize: endNum - startNum + 1, total: fileSize }

streamAudio(filePath, mimetype, rangeResult | null, res):
  if rangeResult is null:
    res.writeHead(200, { 'Content-Type': mimetype, 'Content-Length': fileSize, 'Accept-Ranges': 'bytes' })
    fs.createReadStream(filePath).pipe(res)
  else:
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimetype,
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
```

### Cover Image Resolution

```typescript
resolveCoverImage(coverFile?, coverUrl?, removeCover?):
  if removeCover → return null
  if coverFile → { type: 'upload', url: '/uploads/mini-spotify/covers/...' }
  if coverUrl → { type: 'url', url: coverUrl }
  return undefined  // no change on update
```

### Cascade Delete (song → playlists)

```typescript
SongService.deleteSong(id):
  song = await songRepo.findById(id)  // 404 if not found
  await songRepo.hardDelete(id)
  await playlistRepo.removeSongFromAll(id)   // Playlist.updateMany({ songs: id }, { $pull: { songs: id } })
  deleteFileFromDisk(song.audioFile.path)    // best-effort, log error if fails
```

### Query Builder (`internals/query-builder.ts`)

```typescript
buildSongFilter(query):
  filter = {}
  if (query.search):
    filter.$text = { $search: query.search }   // MongoDB text index trên title + artist
  return filter

buildSongSort(sortBy, sortOrder):
  if (sortBy === 'title') return { title: sortOrder === 'asc' ? 1 : -1 }
  return { createdAt: sortOrder === 'asc' ? 1 : -1 }
```

---

## 3.6. TypeScript Types

```typescript
// server/src/types/modules/mini-spotify.ts

export interface CreateSongDto {
  title: string
  artist: string
  album?: string
  genre?: string
  duration: number        // giây
  coverUrl?: string
  removeCover?: boolean
}

export interface UpdateSongDto extends Partial<CreateSongDto> {}

export interface SongQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'title' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface SongCoverImage {
  type: 'upload' | 'url'
  url: string
}

export interface SongListItem {
  id: string
  title: string
  artist: string
  album: string | null
  genre: string | null
  duration: number
  coverImage: SongCoverImage | null
  createdAt: string
}

export interface SongDetailItem extends SongListItem {
  uploadedBy: { id: string; name: string }
}

export interface CreatePlaylistDto {
  name: string
  description?: string
}

export interface UpdatePlaylistDto extends Partial<CreatePlaylistDto> {}

export interface PlaylistListItem {
  id: string
  name: string
  description: string | null
  owner: { id: string; name: string }
  songCount: number
  createdAt: string
}

export interface PlaylistDetailItem {
  id: string
  name: string
  description: string | null
  owner: { id: string; name: string }
  songs: SongListItem[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedResult<T> {
  items: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Client-side (Zustand)
export interface MusicPlayerState {
  currentSong: SongListItem | null
  currentPosition: number       // giây
  isPlaying: boolean
  volume: number                // 0–1
  queue: SongListItem[]         // bài tiếp theo
  history: SongListItem[]       // bài đã phát
}
```

---

## 3.7. Cấu trúc files (File Structure)

### Server

```
server/src/
├── constants/
│   └── models.ts               (+) SONG, PLAYLIST
├── models/
│   ├── song.ts                 (NEW) Song Mongoose model
│   └── playlist.ts             (NEW) Playlist Mongoose model
├── middlewares/
│   └── file-upload.ts          (+) uploadSongFiles
├── types/modules/
│   └── mini-spotify.ts         (NEW) TypeScript types
├── validators/schemas/
│   └── mini-spotify.ts         (NEW) Joi schemas
└── modules/apps/mini-spotify/
    ├── mini-spotify.module.ts          (NEW) createMiniSpotifyModule()
    ├── internals/
    │   ├── query-builder.ts            (NEW) buildSongFilter(), buildSongSort()
    │   └── range-stream.ts             (NEW) parseRangeHeader(), streamAudio()
    ├── songs/
    │   ├── song.controller.ts          (NEW) song routes (6 endpoints + stream)
    │   ├── song.service.ts             (NEW) SongService
    │   └── song.repository.ts          (NEW) SongRepository
    └── playlists/
        ├── playlist.controller.ts      (NEW) playlist routes (7 endpoints)
        ├── playlist.service.ts         (NEW) PlaylistService
        └── playlist.repository.ts      (NEW) PlaylistRepository
```

**Route mounting** (`server/src/loaders/modules.loader.ts`):
```typescript
const { miniSpotifyRouter } = createMiniSpotifyModule({ authGuard, optionalAuthGuard, adminGuard })
v1Router.use('/apps/mini-spotify', miniSpotifyRouter)
```

**Routing** trong `mini-spotify.module.ts`:
```typescript
// songRouter
miniSpotifyRouter.use('/songs', songRouter)

// song routes (order matters: /stream trước /:id để tránh conflict — nhưng 'stream' không phải ObjectId nên OK)
songRouter.get('/', optionalAuthGuard, validate(listSongsQuery), listSongs)
songRouter.post('/', authGuard, adminGuard, uploadSongFiles, validate(createSong), createSong)
songRouter.get('/:id/stream', streamSong)          // no auth, public
songRouter.get('/:id', getSongById)
songRouter.patch('/:id', authGuard, adminGuard, uploadSongFiles, validate(updateSong), updateSong)
songRouter.delete('/:id', authGuard, adminGuard, deleteSong)

// playlistRouter
miniSpotifyRouter.use('/playlists', playlistRouter)

playlistRouter.get('/', optionalAuthGuard, listPlaylists)
playlistRouter.post('/', authGuard, validate(createPlaylist), createPlaylist)
playlistRouter.get('/:id', getPlaylistById)
playlistRouter.patch('/:id', authGuard, validate(updatePlaylist), updatePlaylist)
playlistRouter.delete('/:id', authGuard, deletePlaylist)
playlistRouter.post('/:id/songs', authGuard, validate(addSong), addSong)
playlistRouter.delete('/:id/songs/:songId', authGuard, removeSong)
```

### Client

```
client/src/
├── app/[locale]/apps/mini-spotify/
│   ├── layout.tsx                         (NEW) Wrap với MusicPlayerProvider + PlayerBar fixed bottom
│   ├── page.tsx                           (NEW) Browse songs
│   ├── playlists/
│   │   ├── page.tsx                       (NEW) Playlists list
│   │   ├── new/page.tsx                   (NEW) Create playlist (auth)
│   │   └── [id]/page.tsx                  (NEW) Playlist detail
│   └── admin/
│       └── songs/
│           ├── new/page.tsx               (NEW) Upload song (admin)
│           └── [id]/edit/page.tsx         (NEW) Edit song (admin)
├── views/
│   ├── MusicBrowse/
│   │   ├── index.tsx                      (NEW) Server component
│   │   ├── mains/SongList/               (NEW) list + search + pagination
│   │   └── components/SongCard/          (NEW)
│   ├── PlaylistList/
│   │   ├── index.tsx                      (NEW)
│   │   └── mains/PlaylistGrid/           (NEW)
│   ├── PlaylistDetail/
│   │   ├── index.tsx                      (NEW)
│   │   └── mains/PlaylistContent/        (NEW) song list + add/remove buttons
│   ├── PlaylistCreate/
│   │   └── mains/PlaylistForm/           (NEW)
│   ├── SongUpload/                        (NEW) Admin upload form
│   └── SongEdit/                         (NEW) Admin edit form
├── components/
│   └── MusicPlayer/
│       ├── index.tsx                      (NEW) Fixed bottom player bar
│       ├── PlayerControls.tsx             (NEW) Play/Pause/Prev/Next
│       ├── PlayerProgress.tsx             (NEW) Progress bar + seek
│       ├── PlayerVolume.tsx               (NEW) Volume slider
│       └── QueuePanel.tsx                 (NEW) Slide-up queue list
├── stores/slices/
│   └── music-player.ts                    (NEW) Zustand slice: state + actions + localStorage persistence
├── hooks/
│   └── useMusicPlayer.ts                  (NEW) Convenience hook
└── dataSources/MiniSpotify/
    └── index.ts                           (NEW) 13 API functions
```

**MusicPlayer Layout** (`app/[locale]/apps/mini-spotify/layout.tsx`):
```typescript
// Server component wrapper
// Client: MusicPlayerBar component fixed at bottom
// pages render trong main content area với padding-bottom để không bị che
export default function MiniSpotifyLayout({ children }) {
  return (
    <div className="pb-24">   {/* space cho player bar */}
      {children}
      <MusicPlayer />          {/* fixed bottom, client component */}
    </div>
  )
}
```

---

## 3.8. Validator Schemas (Joi)

```typescript
// server/src/validators/schemas/mini-spotify.ts

createSongSchema: {
  title:      string, required, min(1), max(200)
  artist:     string, required, min(1), max(100)
  album:      string, optional, max(100)
  genre:      string, optional, max(50)
  duration:   number, integer, min(1), required
  coverUrl:   string, uri, optional
  // audioFile: validated by Multer fileFilter
  // coverImage: validated by Multer fileFilter
}

updateSongSchema: {
  title:        string, min(1), max(200), optional
  artist:       string, min(1), max(100), optional
  album:        string, max(100), optional
  genre:        string, max(50), optional
  duration:     number, integer, min(1), optional
  coverUrl:     string, uri, optional
  removeCover:  boolean, optional
}

listSongsQuerySchema: {
  page:       number, integer, min(1), default(1)
  limit:      number, integer, min(1), max(100), default(20)
  search:     string, max(100), optional
  sortBy:     string, valid('title', 'createdAt'), default('createdAt')
  sortOrder:  string, valid('asc', 'desc'), default('desc')
}

createPlaylistSchema: {
  name:         string, required, min(1), max(100)
  description:  string, max(300), optional
}

updatePlaylistSchema: {
  name:         string, min(1), max(100), optional
  description:  string, max(300), optional
}

addSongToPlaylistSchema: {
  songId:   string, ObjectId pattern, required
}

listPlaylistsQuerySchema: {
  page:   number, integer, min(1), default(1)
  limit:  number, integer, min(1), max(100), default(20)
}
```

---

## 3.9. Zustand Store — Music Player

```typescript
// client/src/stores/slices/music-player.ts

interface MusicPlayerStore {
  // State
  currentSong: SongListItem | null
  currentPosition: number       // giây, saved khi unmount/beforeunload
  isPlaying: boolean
  volume: number                // 0–1, default 0.8
  queue: SongListItem[]
  history: SongListItem[]       // max 50 entries

  // Actions
  play: (song: SongListItem) => void          // set currentSong, clear position nếu bài mới
  pause: () => void
  resume: () => void
  next: () => void                             // queue.shift() → play; nếu queue rỗng → stop
  prev: () => void                             // history.pop() → play; nếu position > 3s → seek(0)
  seek: (position: number) => void
  setVolume: (volume: number) => void
  addToQueue: (song: SongListItem) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  savePosition: (position: number) => void     // called từ audio element timeupdate
}

// Persistence: localStorage key 'music-player-storage'
// Persist fields: currentSong, currentPosition, volume, queue
// KHÔNG persist: isPlaying (luôn false sau reload), history
```

---

## 3.10. Dependencies & Integrations

| Dependency          | Loại     | Mô tả                                                | Ghi chú                               |
| ------------------- | -------- | ---------------------------------------------------- | ------------------------------------- |
| `AuthGuard`         | Internal | Verify idToken → req.user                            | Tái sử dụng                           |
| `OptionalAuthGuard` | Internal | Không throw nếu không có token                       | Tái sử dụng                           |
| `AdminGuard`        | Internal | Check req.user.roles === 'admin'                     | Tái sử dụng                           |
| `uploadSongFiles`   | Internal | Multer fields: audioFile + coverImage                | Thêm mới vào file-upload.ts           |
| `MongoDBRepository` | Internal | Base repo                                            | Tái sử dụng, extend                   |
| Node.js `fs`        | Built-in | `fs.stat`, `fs.createReadStream` cho streaming       | Không cần package mới                 |
| `<audio>` HTML5     | Browser  | Native audio element, hỗ trợ Range requests tự động  | Không cần thêm library                |

**Không cần install thêm package** — tất cả dependencies đã có hoặc là built-in Node.js.

---

## 3.11. Migration & Deployment Strategy

**Feature flag:** Không. Mini-Spotify hoàn toàn isolated trong namespace `apps/`.

**Rollback plan:**
- Remove route mounting trong `modules.loader.ts` → tất cả endpoints trả 404
- Collections `songs`, `playlists` có thể drop an toàn
- `uploads/mini-spotify/` directory: xóa bằng tay

**Backward compatibility:** Các module hiện tại (auth, blog, contact-admin, login-history) không bị ảnh hưởng.

**Lưu ý về disk storage:**
- Audio files có thể rất lớn — cần monitor disk usage
- `uploads/mini-spotify/audio/` nên được backup riêng
- Future: xem xét cloud storage (S3, Cloudinary) khi scale
