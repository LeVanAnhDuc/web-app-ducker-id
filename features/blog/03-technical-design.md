# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Blog là app đầu tiên trong App Store platform, đặt tại namespace `modules/apps/blog/` trên server và `app/[locale]/apps/blogs/` trên client. Server triển khai theo kiến trúc controller → service → repository, bổ sung 3 Mongoose collections mới (`blogs`, `blog_tags`, `blog_categories`) cùng một `query-builder` riêng để xử lý filter/search/sort. Cover image hỗ trợ cả Multer upload lẫn URL string; slug auto-generated từ title, unique và stable sau khi tạo. Visibility phân quyền theo `OptionalAuthGuard` (public read) + `AuthGuard` (write) + `AdminGuard` (hard delete). Client sử dụng Next.js App Router với dataSources và React Hook Form + Zod.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== CREATE BLOG FLOW ===

Client (Web)
    │
    ├── POST /api/v1/apps/blogs  (multipart/form-data hoặc JSON)
    │       │
    │   AuthGuard.middleware (verify idToken → req.user)
    │       │
    │   uploadBlogCover.single('coverImage') (Multer, optional)
    │       │
    │   validateRequest(createBlogSchema)
    │       │
    │   BlogController.createBlog()
    │       │
    │   BlogService.createBlog(userId, dto, file?)
    │       ├── generateSlug(title) → check uniqueness → slugify
    │       ├── resolveCoverImage(file?, coverUrl?) → { type, url }
    │       ├── blogRepo.create(blogDoc)
    │       └── ResponsePattern<BlogDetailResponse>

=== LIST BLOGS FLOW ===

Client (Web / Guest)
    │
    ├── GET /api/v1/apps/blogs?page=1&limit=20&search=xxx&categoryId=yyy
    │       │
    │   OptionalAuthGuard.middleware (req.user nếu có token, undefined nếu không)
    │       │
    │   validateRequest(listBlogsQuerySchema)
    │       │
    │   BlogController.listBlogs()
    │       │
    │   BlogService.listBlogs(query, req.user?)
    │       ├── buildBlogFilter(query, req.user) → FilterQuery<IBlog>
    │       │     ├── deletedAt: null (bắt buộc)
    │       │     ├── visibility: 'public' (guest) | 'public' OR authorId=self (user) | all (admin)
    │       │     ├── search: { title: { $regex } }
    │       │     ├── categoryId, tagId filter
    │       │     └── authorId filter
    │       ├── Promise.all([blogRepo.find(), blogRepo.countDocuments()])
    │       └── ResponsePattern<PaginatedResult<BlogListItem>>

=== GET BLOG DETAIL FLOW ===

Client
    │
    ├── GET /api/v1/apps/blogs/:slug
    │       │
    │   OptionalAuthGuard.middleware
    │       │
    │   BlogController.getBlogBySlug()
    │       │
    │   BlogService.getBlogBySlug(slug, req.user?)
    │       ├── blogRepo.findBySlug(slug)  → throws 404 if not found or deletedAt != null
    │       ├── if visibility === 'private': check owner OR admin → 404 if not
    │       └── ResponsePattern<BlogDetailResponse>

=== UPDATE BLOG FLOW ===

Client
    │
    ├── PATCH /api/v1/apps/blogs/:id
    │       │
    │   AuthGuard.middleware
    │       │
    │   uploadBlogCover.single('coverImage') (Multer, optional)
    │       │
    │   validateRequest(updateBlogSchema)
    │       │
    │   BlogController.updateBlog()
    │       │
    │   BlogService.updateBlog(id, userId, dto, file?)
    │       ├── blogRepo.findById(id) → 404 if not found
    │       ├── check authorId === userId → 403 if not (admin bypass: future)
    │       ├── resolveCoverImage(file?, dto.coverUrl?)
    │       └── blogRepo.findByIdAndUpdate(id, updates)
    │       └── ResponsePattern<BlogDetailResponse>

=== DELETE BLOG FLOW ===

Client
    │
    ├── DELETE /api/v1/apps/blogs/:id
    │       │
    │   AuthGuard.middleware
    │       │
    │   BlogController.deleteBlog()
    │       │
    │   BlogService.deleteBlog(id, req.user)
    │       ├── blogRepo.findById(id) → 404 if not found
    │       ├── if req.user.roles === 'admin':
    │       │     blogRepo.hardDelete(id)  → xóa vĩnh viễn
    │       └── else:
    │             check authorId === userId → 403 if not
    │             blogRepo.softDelete(id)  → set deletedAt = now
    │       └── ResponsePattern<{ message }>
```

---

## 3.3. Data Model

### Collection mới: `blogs`

```typescript
{
  _id:          ObjectId,
  authorId:     ObjectId,   // ref: USER — required, index
  title:        String,     // required, trim, maxlength: 200
  slug:         String,     // required, unique, lowercase, trim
  content:      String,     // required (plain text v1.0)
  coverImage: {
    type:       String,     // 'upload' | 'url' | null
    url:        String,     // relative path (upload) | absolute URL (url)
  } | null,
  tags:         ObjectId[], // ref: BLOG_TAG, default: []
  categories:   ObjectId[], // ref: BLOG_CATEGORY, default: []
  visibility:   String,     // 'public' | 'private', default: 'public'
  deletedAt:    Date | null, // null = active, Date = soft deleted
  createdAt:    Date,
  updatedAt:    Date
}
```

**Indexes:**
```javascript
{ slug: 1 }                           // unique
{ authorId: 1, createdAt: -1 }
{ authorId: 1, deletedAt: 1, createdAt: -1 }
{ visibility: 1, deletedAt: 1, createdAt: -1 }
{ tags: 1, deletedAt: 1 }
{ categories: 1, deletedAt: 1 }
{ title: 'text' }                     // text index cho search
```

### Collection mới: `blog_tags`

```typescript
{
  _id:          ObjectId,
  name:         String,     // required, unique (case-insensitive via lowercase), trim, maxlength: 50
  createdAt:    Date
}
```

**Indexes:**
```javascript
{ name: 1 }   // unique
```

### Collection mới: `blog_categories`

```typescript
{
  _id:          ObjectId,
  name:         String,     // required, unique (case-insensitive via lowercase), trim, maxlength: 50
  createdAt:    Date
}
```

**Indexes:**
```javascript
{ name: 1 }   // unique
```

### Thay đổi files hiện tại

**`server/src/constants/models.ts`** — thêm 3 model names:
```typescript
export const MODEL_NAMES = {
  // ... existing
  BLOG: 'Blog',
  BLOG_TAG: 'BlogTag',
  BLOG_CATEGORY: 'BlogCategory',
}
```

**`server/src/constants/enums.ts`** — thêm enums:
```typescript
export enum BLOG_VISIBILITY {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum BLOG_COVER_TYPE {
  UPLOAD = 'upload',
  URL = 'url',
}
```

**`server/src/middlewares/file-upload.ts`** — thêm `uploadBlogCover`:
```typescript
// Stored at: uploads/blogs/{YYYY-MM-DD}/{uuid}.{ext}
// Allowed: image/jpeg, image/jpg, image/png, image/webp, image/gif
// Max size: 5MB
// Field: 'coverImage' (single)
export const uploadBlogCover = multer({ storage, fileFilter, limits })
```

---

## 3.4. API Design

### Endpoint 1: Tạo blog mới

```
POST /api/v1/apps/blogs
Headers:
  Authorization: Bearer {idToken}
  Content-Type: multipart/form-data | application/json

Request Body (multipart/form-data):
  title        String  — required, 1–200 chars
  content      String  — required, min 1 char
  visibility   String  — optional, 'public'|'private', default 'public'
  tags[]       String  — optional, array of ObjectId strings (existing tag IDs)
  categories[] String  — optional, array of ObjectId strings (existing category IDs)
  coverImage   File    — optional, image file (jpg/png/webp/gif, max 5MB)
  coverUrl     String  — optional, URL string (mutually exclusive với coverImage)

Response 201:
{
  "data": {
    "id": "string",
    "title": "string",
    "slug": "string",
    "content": "string",
    "coverImage": { "type": "upload"|"url", "url": "string" } | null,
    "tags": [{ "id": "string", "name": "string" }],
    "categories": [{ "id": "string", "name": "string" }],
    "visibility": "public"|"private",
    "author": { "id": "string", "name": "string", "avatar": "string"|null },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "message": "Blog created successfully",
  "status": 201,
  "reasonStatusCode": "CREATED"
}

Response 400: Validation error (missing title, coverImage + coverUrl đồng thời, invalid ObjectId)
Response 401: Token missing or invalid
```

### Endpoint 2: Lấy danh sách blog

```
GET /api/v1/apps/blogs
Headers:
  Authorization: Bearer {idToken}  (optional)

Query Params:
  page         Number  — default 1, min 1
  limit        Number  — default 20, min 1, max 100
  search       String  — optional, search theo title (case-insensitive)
  categoryId   String  — optional, ObjectId
  tagId        String  — optional, ObjectId
  authorId     String  — optional, ObjectId (filter theo author)
  visibility   String  — optional, 'public'|'private' (chỉ owner/admin)
  sortBy       String  — optional, 'title'|'createdAt', default 'createdAt'
  sortOrder    String  — optional, 'asc'|'desc', default 'desc'

Visibility rules (enforced in query-builder):
  - Guest (no token):   chỉ public + deletedAt=null
  - User (token):       public + private của mình + deletedAt=null
  - Admin:              tất cả visibility + deletedAt=null

Response 200:
{
  "data": {
    "items": [BlogListItem],
    "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
  },
  "message": "OK",
  "status": 200,
  "reasonStatusCode": "OK"
}

BlogListItem: {
  id, title, slug, coverImage, tags, categories,
  visibility, author: { id, name, avatar },
  createdAt, updatedAt
}
// content KHÔNG có trong list item

Response 400: Invalid query params
```

### Endpoint 3: Lấy chi tiết blog theo slug

```
GET /api/v1/apps/blogs/:slug
Headers:
  Authorization: Bearer {idToken}  (optional)

Response 200:
{
  "data": BlogDetailResponse,
  "message": "OK",
  "status": 200,
  "reasonStatusCode": "OK"
}

BlogDetailResponse: { ...BlogListItem, content: string }

Response 404: Blog not found, or soft deleted, or private (non-owner/non-admin)
// Private blog → 404, NOT 403 (security by obscurity)
```

### Endpoint 4: Cập nhật blog

```
PATCH /api/v1/apps/blogs/:id
Headers:
  Authorization: Bearer {idToken}
  Content-Type: multipart/form-data | application/json

Request Body (all optional):
  title        String
  content      String
  visibility   String  — 'public'|'private'
  tags[]       String  — array of ObjectId (replaces existing)
  categories[] String  — array of ObjectId (replaces existing)
  coverImage   File    — new cover image upload
  coverUrl     String  — new cover URL
  removeCover  Boolean — true → xóa cover hiện tại, set null

Response 200: BlogDetailResponse
Response 400: Validation error
Response 401: Not authenticated
Response 403: Not the author
Response 404: Blog not found
```

### Endpoint 5: Xóa blog

```
DELETE /api/v1/apps/blogs/:id
Headers:
  Authorization: Bearer {idToken}

Response 200:
{
  "data": { "id": "string" },
  "message": "Blog deleted successfully",
  "status": 200,
  "reasonStatusCode": "OK"
}

Logic:
  - Admin: hard delete (xóa vĩnh viễn)
  - User (author): soft delete (set deletedAt = now)
  - User (non-author): 403

Response 401: Not authenticated
Response 403: Not the author (user role)
Response 404: Blog not found
```

### Endpoint 6: Tìm kiếm tag

```
GET /api/v1/apps/blogs/tags?search=xxx&limit=10
Headers: (không cần auth)

Response 200:
{
  "data": [{ "id": "string", "name": "string" }],
  "message": "OK",
  "status": 200,
  "reasonStatusCode": "OK"
}
```

### Endpoint 7: Tạo tag mới

```
POST /api/v1/apps/blogs/tags
Headers:
  Authorization: Bearer {idToken}

Request Body:
  name  String  — required, 1–50 chars

Response 201: { "data": { "id": "string", "name": "string" }, ... }
Response 400: Validation error
Response 409: Tag already exists (case-insensitive match)
Response 401: Not authenticated
```

### Endpoint 8: Tìm kiếm category

```
GET /api/v1/apps/blogs/categories?search=xxx&limit=10
Headers: (không cần auth)

Response 200:
{
  "data": [{ "id": "string", "name": "string" }],
  ...
}
```

### Endpoint 9: Tạo category mới

```
POST /api/v1/apps/blogs/categories
Headers:
  Authorization: Bearer {idToken}

Request Body:
  name  String  — required, 1–50 chars

Response 201: { "data": { "id": "string", "name": "string" }, ... }
Response 400: Validation error
Response 409: Category already exists (case-insensitive match)
Response 401: Not authenticated
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Slug Generation

```
1. Nhận title: "Hello World! (2026)"
2. Slugify: "hello-world-2026"  (kebab-case, remove special chars, lowercase)
3. Check blogs collection: { slug: "hello-world-2026", deletedAt: null }
4. Nếu trùng: append timestamp → "hello-world-2026-1709654321"
5. Lưu slug, KHÔNG thay đổi khi update title (SEO stability)
```

### Cover Image Resolution

```typescript
resolveCoverImage(file?, coverUrl?, removeCover?):
  if removeCover === true → return null
  if file exists → { type: 'upload', url: '/uploads/blogs/2026-03-05/uuid.jpg' }
  if coverUrl exists → { type: 'url', url: coverUrl }
  return undefined  // no change (update), hoặc null (create without cover)
```

### Visibility Filter in Query Builder (`internals/query-builder.ts`)

```typescript
buildBlogFilter(query, user?):
  filter.deletedAt = null  // luôn bắt buộc

  // Visibility
  if (!user):
    filter.visibility = 'public'
  else if (user.roles === 'admin'):
    // không filter visibility, nhưng apply nếu query.visibility có
    if (query.visibility) filter.visibility = query.visibility
  else:
    // User: public + private của mình
    if (query.visibility === 'private'):
      filter.visibility = 'private'
      filter.authorId = user.id
    else if (query.visibility === 'public'):
      filter.visibility = 'public'
    else:
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'private', authorId: user.id }
      ]

  // authorId filter
  if (query.authorId) filter.authorId = query.authorId

  // category / tag filter
  if (query.categoryId) filter.categories = query.categoryId
  if (query.tagId) filter.tags = query.tagId

  // text search trên title
  if (query.search) filter.title = { $regex: query.search, $options: 'i' }

  return filter
```

### Sort Builder

```typescript
buildBlogSort(sortBy, sortOrder):
  if (sortBy === 'title') return { title: sortOrder === 'asc' ? 1 : -1 }
  return { createdAt: sortOrder === 'asc' ? 1 : -1 }  // default
```

---

## 3.6. TypeScript Types

```typescript
// server/src/types/modules/blog.ts

export interface CreateBlogDto {
  title: string
  content: string
  visibility?: 'public' | 'private'
  tags?: string[]          // ObjectId strings
  categories?: string[]    // ObjectId strings
  coverUrl?: string
  removeCover?: boolean
}

export interface UpdateBlogDto extends Partial<CreateBlogDto> {}

export interface BlogQuery {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  tagId?: string
  authorId?: string
  visibility?: 'public' | 'private'
  sortBy?: 'title' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface BlogAuthorInfo {
  id: string
  name: string
  avatar: string | null
}

export interface BlogCoverImage {
  type: 'upload' | 'url'
  url: string
}

export interface BlogTagItem {
  id: string
  name: string
}

export interface BlogListItem {
  id: string
  title: string
  slug: string
  coverImage: BlogCoverImage | null
  tags: BlogTagItem[]
  categories: BlogTagItem[]
  visibility: 'public' | 'private'
  author: BlogAuthorInfo
  createdAt: string
  updatedAt: string
}

export interface BlogDetailItem extends BlogListItem {
  content: string
}

export interface TagQuery {
  search?: string
  limit?: number
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
```

---

## 3.7. Cấu trúc files (File Structure)

### Server

```
server/src/
├── constants/
│   ├── models.ts           (+) BLOG, BLOG_TAG, BLOG_CATEGORY
│   └── enums.ts            (+) BLOG_VISIBILITY, BLOG_COVER_TYPE
├── models/
│   ├── blog.ts             (NEW) Blog Mongoose model
│   ├── blog-tag.ts         (NEW) BlogTag Mongoose model
│   └── blog-category.ts    (NEW) BlogCategory Mongoose model
├── middlewares/
│   └── file-upload.ts      (+) uploadBlogCover
├── types/modules/
│   └── blog.ts             (NEW) TypeScript types
├── validators/schemas/
│   └── blog.ts             (NEW) Joi schemas
└── modules/apps/blog/
    ├── blog.module.ts              (NEW) createBlogModule()
    ├── blog.controller.ts          (NEW) BlogController
    ├── blog.service.ts             (NEW) BlogService
    ├── internals/
    │   └── query-builder.ts        (NEW) buildBlogFilter(), buildBlogSort()
    ├── repositories/
    │   ├── blog.repository.ts      (NEW) BlogRepository
    │   ├── blog-tag.repository.ts  (NEW) BlogTagRepository
    │   └── blog-category.repository.ts (NEW) BlogCategoryRepository
    └── sub-modules/
        ├── tags/
        │   ├── blog-tags.controller.ts  (NEW)
        │   └── blog-tags.service.ts     (NEW)
        └── categories/
            ├── blog-categories.controller.ts (NEW)
            └── blog-categories.service.ts    (NEW)
```

**Route mounting** (`server/src/loaders/modules.loader.ts`):
```typescript
// blog module
const { blogRouter } = createBlogModule({ authGuard, optionalAuthGuard, adminGuard })
v1Router.use('/apps/blogs', blogRouter)
```

**Routing trong BlogController** (single router, route order quan trọng):
```
blogRouter.get('/tags', ...)               // ← phải đứng TRƯỚC /:slug
blogRouter.post('/tags', authGuard, ...)
blogRouter.get('/categories', ...)
blogRouter.post('/categories', authGuard, ...)
blogRouter.post('/', authGuard, uploadBlogCover, validate, createBlog)
blogRouter.get('/', optionalAuthGuard, validate, listBlogs)
blogRouter.get('/:slug', optionalAuthGuard, getBlogBySlug)
blogRouter.patch('/:id', authGuard, uploadBlogCover, validate, updateBlog)
blogRouter.delete('/:id', authGuard, deleteBlog)
```

### Client

```
client/src/
├── app/[locale]/apps/blogs/
│   ├── page.tsx                          (NEW) Blog list page (newsfeed)
│   ├── [slug]/
│   │   └── page.tsx                      (NEW) Blog detail page
│   ├── new/
│   │   └── page.tsx                      (NEW) Create blog page (auth required)
│   └── [id]/edit/
│       └── page.tsx                      (NEW) Edit blog page (auth required)
├── views/
│   ├── BlogList/
│   │   ├── index.tsx                     (NEW) Server component
│   │   ├── mains/BlogListContent/        (NEW) List + filter + pagination
│   │   └── components/BlogCard/          (NEW)
│   ├── BlogDetail/
│   │   ├── index.tsx                     (NEW)
│   │   └── mains/BlogDetailContent/      (NEW)
│   ├── BlogCreate/
│   │   ├── index.tsx                     (NEW)
│   │   └── mains/BlogForm/               (NEW) shared với Edit
│   └── BlogEdit/
│       ├── index.tsx                     (NEW)
│       └── mains/BlogForm/               (NEW) reuse từ BlogCreate
├── dataSources/Blog/
│   └── index.ts                          (NEW) API functions
├── forms/Blog/
│   ├── index.ts                          (NEW) form props
│   ├── data.ts                           (NEW) default values
│   └── validations.ts                    (NEW) Zod schema
└── locales/
    ├── en/blog.json                      (NEW)
    └── vi/blog.json                      (NEW)
```

---

## 3.8. Validator Schemas (Joi)

```typescript
// server/src/validators/schemas/blog.ts

createBlogSchema: {
  title:      string, required, min(1), max(200)
  content:    string, required, min(1)
  visibility: string, valid('public', 'private'), default('public')
  tags:       array of ObjectId strings, optional, max 10 items
  categories: array of ObjectId strings, optional, max 10 items
  coverUrl:   string, uri, optional
  // coverImage: validated by Multer fileFilter
}

updateBlogSchema: {
  title:        string, min(1), max(200), optional
  content:      string, min(1), optional
  visibility:   string, valid('public', 'private'), optional
  tags:         array of ObjectId strings, optional
  categories:   array of ObjectId strings, optional
  coverUrl:     string, uri, optional
  removeCover:  boolean, optional
}

listBlogsQuerySchema: {
  page:       number, integer, min(1), default(1)
  limit:      number, integer, min(1), max(100), default(20)
  search:     string, max(100), optional
  categoryId: string ObjectId, optional
  tagId:      string ObjectId, optional
  authorId:   string ObjectId, optional
  visibility: string, valid('public', 'private'), optional
  sortBy:     string, valid('title', 'createdAt'), default('createdAt')
  sortOrder:  string, valid('asc', 'desc'), default('desc')
}

tagQuerySchema: {
  search:   string, max(50), optional
  limit:    number, integer, min(1), max(50), default(10)
}

createTagSchema: {
  name:   string, required, min(1), max(50)
}

createCategorySchema: {
  name:   string, required, min(1), max(50)
}
```

---

## 3.9. Dependencies & Integrations

| Dependency          | Loại     | Mô tả                                               | Ghi chú                               |
| ------------------- | -------- | --------------------------------------------------- | ------------------------------------- |
| `AuthGuard`         | Internal | Verify idToken → req.user                           | Đã có, tái sử dụng                    |
| `OptionalAuthGuard` | Internal | Không throw nếu không có token                      | Đã có (contact-admin v1.0), tái sử dụng |
| `AdminGuard`        | Internal | Check req.user.roles === 'admin', throw 403 if not | Đã có (login-history v2.0), tái sử dụng |
| `uploadBlogCover`   | Internal | Multer middleware, single image, max 5MB            | Thêm mới vào file-upload.ts           |
| `MongoDBRepository` | Internal | Base repository class                               | Đã có, extend                         |
| `slugify` (npm)     | External | Chuyển title → kebab-case slug                      | Cần install                           |

**Package cần install:**
```bash
yarn add slugify
yarn add @types/slugify --dev  # nếu cần (slugify có bundled types)
```

---

## 3.10. Migration & Deployment Strategy

**Feature flag:** Không. Blog là feature mới, không ảnh hưởng flow hiện tại.

**Rollback plan:**
- Nếu phát hiện lỗi: remove route mounting trong `modules.loader.ts` → tất cả blog endpoints trả 404
- Collections `blogs`, `blog_tags`, `blog_categories` có thể drop an toàn (không có foreign key constraint với các collection khác)
- `uploads/blogs/` directory: xóa bằng tay nếu cần

**Backward compatibility:** Các module hiện tại (auth, contact-admin, login-history) không bị ảnh hưởng. Blog hoàn toàn isolated trong namespace `apps/`.
