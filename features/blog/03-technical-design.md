# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Blog là app đầu tiên trong App Store platform, đặt tại namespace `modules/apps/blog/` trên server và `app/[locale]/apps/blogs/` trên client. Server triển khai theo kiến trúc controller → service → repository, bổ sung 3 Mongoose collections mới (`blogs`, `blog_tags`, `blog_categories`) cùng `blog.helper.ts` chứa slug generation, cover image resolution, file deletion, và query filter/sort builder. Cover image hỗ trợ cả Multer upload lẫn URL string; slug auto-generated từ title, unique và stable sau khi tạo. Visibility phân quyền theo `optionalAuth` (public read) + `authGuard` (write). Sub-modules (tags, categories) có routes/controller/service riêng, mount qua `router.use()` trong blog routes. Client sử dụng Next.js App Router với dataSources và React Hook Form + Zod.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
=== CREATE BLOG FLOW ===

Client (Web)
    │
    ├── POST /api/v1/apps/blogs  (multipart/form-data hoặc JSON)
    │       │
    │   authGuard (verify idToken → req.user)
    │       │
    │   uploadBlogCover (Multer, optional)
    │       │
    │   bodyPipe(createBlogSchema)
    │       │
    │   BlogController.createBlog()
    │       │
    │   BlogService.createBlog(userId, dto, file?)
    │       ├── generateBaseSlug(title) → check slugExists() → appendTimestampToSlug() nếu trùng
    │       ├── resolveCoverImage(file?, coverUrl?) → { type, url } | null
    │       ├── blogRepo.create(blogDoc)
    │       └── toBlogDetailDto(doc) → BlogDetailDto

=== LIST BLOGS FLOW ===

Client (Web / Guest)
    │
    ├── GET /api/v1/apps/blogs?page=1&limit=20&search=xxx&categoryId=yyy
    │       │
    │   optionalAuth (req.user nếu có token, undefined nếu không)
    │       │
    │   queryPipe(listBlogsQuerySchema)
    │       │
    │   BlogController.listBlogs()
    │       │
    │   BlogService.listBlogs(query, req.user?)
    │       ├── buildBlogFilter(query, req.user) → FilterQuery<BlogDocument>
    │       │     ├── deletedAt: null (bắt buộc)
    │       │     ├── visibility: 'public' (guest) | 'public' OR authorId=self (user) | all (admin)
    │       │     ├── search: { title: { $regex } }
    │       │     ├── categoryId, tagId filter
    │       │     └── authorId filter
    │       ├── buildBlogSort(sortBy, sortOrder)
    │       ├── Promise.all([blogRepo.find(), blogRepo.countDocuments()])
    │       └── PaginatedResult<BlogListItemDto>

=== GET BLOG DETAIL FLOW ===

Client
    │
    ├── GET /api/v1/apps/blogs/:slug
    │       │
    │   optionalAuth
    │       │
    │   BlogController.getBlogBySlug()
    │       │
    │   BlogService.getBlogBySlug(slug, req.user?)
    │       ├── blogRepo.findBySlug(slug)  → throws 404 if not found or deletedAt != null
    │       ├── if visibility === 'private': check owner OR admin → 404 if not
    │       └── toBlogDetailDto(doc) → BlogDetailDto

=== UPDATE BLOG FLOW ===

Client
    │
    ├── PATCH /api/v1/apps/blogs/:id
    │       │
    │   authGuard
    │       │
    │   uploadBlogCover (Multer, optional)
    │       │
    │   paramsPipe(blogIdParamSchema) + bodyPipe(updateBlogSchema)
    │       │
    │   BlogController.updateBlog()
    │       │
    │   BlogService.updateBlog(id, userId, dto, file?)
    │       ├── blogRepo.findById(id) → 404 if not found
    │       ├── check authorId === userId → 403 if not
    │       ├── resolveCoverImage(file?, dto.coverUrl?, dto.removeCover?)
    │       ├── if cover changed & old cover was upload → deleteUploadedFile()
    │       └── blogRepo.findByIdAndUpdate(id, updates)
    │       └── toBlogDetailDto(doc) → BlogDetailDto

=== DELETE BLOG FLOW ===

Client
    │
    ├── DELETE /api/v1/apps/blogs/:id
    │       │
    │   authGuard
    │       │
    │   paramsPipe(blogIdParamSchema)
    │       │
    │   BlogController.deleteBlog()
    │       │
    │   BlogService.deleteBlog(id, req.user)
    │       ├── blogRepo.findById(id) → 404 if not found
    │       ├── if req.user.roles === 'admin':
    │       │     deleteUploadedFile() nếu cover là upload
    │       │     blogRepo.hardDelete(id)  → xóa vĩnh viễn
    │       └── else:
    │             check authorId === userId → 403 if not
    │             blogRepo.softDelete(id)  → set deletedAt = now
    │       └── toDeleteBlogDto(id) → DeleteBlogDto
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
  content:      String,     // required
  coverImage: {
    type:       String,     // 'upload' | 'url' — enum từ BLOG_COVER_TYPE
    url:        String,     // required, trim
  } | null,                 // sub-schema { _id: false }, default: null
  tags:         ObjectId[], // ref: BLOG_TAG, default: []
  categories:   ObjectId[], // ref: BLOG_CATEGORY, default: []
  visibility:   String,     // enum từ BLOG_VISIBILITY, required, default: 'public'
  deletedAt:    Date | null, // null = active, Date = soft deleted, default: null
  createdAt:    Date,       // timestamps: true
  updatedAt:    Date        // timestamps: true
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
  name:         String,     // required, unique, trim, lowercase, maxlength: 50
  createdAt:    Date        // timestamps: { createdAt: true, updatedAt: false }
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
  name:         String,     // required, unique, trim, lowercase, maxlength: 50
  createdAt:    Date        // timestamps: { createdAt: true, updatedAt: false }
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

**`server/src/constants/modules/blog/index.ts`** — constants riêng module blog:
```typescript
export const BLOG_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private"
} as const;

export const BLOG_COVER_TYPE = {
  UPLOAD: "upload",
  URL: "url"
} as const;

export const BLOG_CONFIG = {
  COVER_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  COVER_UPLOAD_DIR: "uploads/blogs"
} as const;
```

**`server/src/middlewares/`** — export `uploadBlogCover`:
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
  tags[]       String  — optional, array of ObjectId strings (existing tag IDs), max 10
  categories[] String  — optional, array of ObjectId strings (existing category IDs), max 5
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
  "message": "blog:success.created",
  "status": 201,
  "reasonStatusCode": "CREATED"
}

Response 400: Validation error (missing title, coverImage + coverUrl đồng thời — COVER_IMAGE_CONFLICT)
Response 401: Token missing or invalid
```

### Endpoint 2: Lấy danh sách blog

```
GET /api/v1/apps/blogs
Headers:
  Authorization: Bearer {idToken}  (optional)

Query Params:
  page         Number  — default 1, min 1
  limit        Number  — default 20, min 1, max 50 (schema max 50, service cũng cap MAX_LIMIT=50)
  search       String  — optional, search theo title (case-insensitive regex), max 100 chars
  categoryId   String  — optional, ObjectId
  tagId        String  — optional, ObjectId
  authorId     String  — optional, ObjectId (filter theo author)
  visibility   String  — optional, 'public'|'private' (chỉ owner/admin)
  sortBy       String  — optional, 'title'|'createdAt', default 'createdAt'
  sortOrder    String  — optional, 'asc'|'desc', default 'desc'

Visibility rules (enforced in buildBlogFilter):
  - Guest (no token):   chỉ public + deletedAt=null
  - User (token):       public + private của mình + deletedAt=null
  - Admin:              tất cả visibility + deletedAt=null

Response 200:
{
  "data": {
    "items": [BlogListItemDto],
    "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
  },
  "message": "blog:success.listed",
  "status": 200,
  "reasonStatusCode": "OK"
}

BlogListItemDto: {
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
  "data": BlogDetailDto,
  "message": "blog:success.found",
  "status": 200,
  "reasonStatusCode": "OK"
}

BlogDetailDto: { ...BlogListItemDto, content: string }

Response 404: Blog not found, or soft deleted, or private (non-owner/non-admin)
// Private blog → 404, NOT 403 (security by obscurity)
```

### Endpoint 4: Cập nhật blog

```
PATCH /api/v1/apps/blogs/:id
Headers:
  Authorization: Bearer {idToken}
  Content-Type: multipart/form-data | application/json

Params: id — validated bởi blogIdParamSchema (ObjectId pattern)

Request Body (all optional):
  title        String
  content      String
  visibility   String  — 'public'|'private'
  tags[]       String  — array of ObjectId (replaces existing), max 10
  categories[] String  — array of ObjectId (replaces existing), max 5
  coverImage   File    — new cover image upload
  coverUrl     String  — new cover URL
  removeCover  Boolean — true → xóa cover hiện tại, set null

Response 200: BlogDetailDto
Response 400: Validation error
Response 401: Not authenticated
Response 403: Not the author (FORBIDDEN)
Response 404: Blog not found (BLOG_NOT_FOUND)
```

### Endpoint 5: Xóa blog

```
DELETE /api/v1/apps/blogs/:id
Headers:
  Authorization: Bearer {idToken}

Params: id — validated bởi blogIdParamSchema (ObjectId pattern)

Response 200:
{
  "data": { "id": "string" },
  "message": "blog:success.deleted",
  "status": 200,
  "reasonStatusCode": "OK"
}

Logic:
  - Admin: deleteUploadedFile() nếu cover là upload → hard delete (xóa vĩnh viễn)
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

Query Params:
  search   String — optional, max 50 chars, tìm theo name (regex, case-insensitive)
  limit    Number — optional, min 1, max 50, default 10

Logic:
  - Nếu search rỗng hoặc không có → findPopular(limit) (sort createdAt desc)
  - Nếu có search → search(query, limit) (sort name asc)

Response 200:
{
  "data": [{ "id": "string", "name": "string" }],
  "message": "blog:success.tagsFound",
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

Logic: normalize name (lowercase + trim) → check findByName() → 409 nếu trùng → create

Response 201: { "data": { "id": "string", "name": "string" }, "message": "blog:success.tagCreated", ... }
Response 400: Validation error
Response 409: Tag already exists (TAG_ALREADY_EXISTS)
Response 401: Not authenticated
```

### Endpoint 8: Tìm kiếm category

```
GET /api/v1/apps/blogs/categories?search=xxx&limit=10
Headers: (không cần auth)

Query Params:
  search   String — optional, max 50 chars
  limit    Number — optional, min 1, max 50, default 10

Logic: tương tự tag search — findPopular() hoặc search()

Response 200:
{
  "data": [{ "id": "string", "name": "string" }],
  "message": "blog:success.categoriesFound",
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

Logic: normalize name (lowercase + trim) → check findByName() → 409 nếu trùng → create

Response 201: { "data": { "id": "string", "name": "string" }, "message": "blog:success.categoryCreated", ... }
Response 400: Validation error
Response 409: Category already exists (CATEGORY_ALREADY_EXISTS)
Response 401: Not authenticated
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Slug Generation (`blog.helper.ts`)

```
1. Nhận title: "Hello World! (2026)"
2. generateBaseSlug(title): slugify(title, { lower: true, strict: true, trim: true }) → "hello-world-2026"
3. Check blogRepo.slugExists(base) → boolean
4. Nếu trùng: appendTimestampToSlug(base) → "hello-world-2026-1709654321" (Math.floor(Date.now() / 1000))
5. Lưu slug, KHÔNG thay đổi khi update title (SEO stability)
```

### Cover Image Resolution (`blog.helper.ts`)

```typescript
resolveCoverImage(file?, coverUrl?, removeCover?):
  if removeCover === true → return null
  if file exists → normalize path → { type: BLOG_COVER_TYPE.UPLOAD, url: '/uploads/blogs/...' }
  if coverUrl exists → { type: BLOG_COVER_TYPE.URL, url: coverUrl }
  return undefined  // no change (update), hoặc null (create without cover)
```

### Delete Uploaded File (`blog.helper.ts`)

```typescript
deleteUploadedFile(filePath):
  // Dùng khi update cover (replace old upload) hoặc admin hard delete blog có upload cover
  absolutePath = path.join(process.cwd(), filePath)
  if fs.existsSync(absolutePath) → fs.unlinkSync(absolutePath)
  // ignore errors silently
```

### Visibility Filter in Query Builder (`blog.helper.ts`)

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
      filter.authorId = new Types.ObjectId(user.userId)
    else if (query.visibility === 'public'):
      filter.visibility = 'public'
    else:
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'private', authorId: new Types.ObjectId(user.userId) }
      ]

  // authorId filter
  if (query.authorId) filter.authorId = new Types.ObjectId(query.authorId)

  // category / tag filter
  if (query.categoryId) filter.categories = new Types.ObjectId(query.categoryId)
  if (query.tagId) filter.tags = new Types.ObjectId(query.tagId)

  // text search trên title
  if (query.search) filter.title = { $regex: query.search, $options: 'i' }

  return filter
```

### Sort Builder (`blog.helper.ts`)

```typescript
buildBlogSort(sortBy = 'createdAt', sortOrder = 'desc'):
  const order: SortOrder = sortOrder === 'asc' ? 1 : -1
  if (sortBy === 'title') return { title: order }
  return { createdAt: order }  // default
```

---

## 3.6. TypeScript Types

```typescript
// server/src/types/modules/blog.ts

// ─── Derived types from constants ─────────────────────────────────────────
export type BlogVisibility = (typeof BLOG_VISIBILITY)[keyof typeof BLOG_VISIBILITY];
export type BlogCoverType = (typeof BLOG_COVER_TYPE)[keyof typeof BLOG_COVER_TYPE];

// ─── Mongoose Document types ──────────────────────────────────────────────
export interface BlogTagDocument extends Document {
  name: string;
  createdAt: Date;
}

export interface BlogCategoryDocument extends Document {
  name: string;
  createdAt: Date;
}

export interface BlogCoverImageDoc {
  type: BlogCoverType;
  url: string;
}

export interface BlogDocument extends Document {
  authorId: Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  coverImage: BlogCoverImageDoc | null;
  tags: Types.ObjectId[];
  categories: Types.ObjectId[];
  visibility: BlogVisibility;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────
export interface CreateBlogDto {
  title: string;
  content: string;
  visibility?: BlogVisibility;
  tags?: string[];
  categories?: string[];
  coverUrl?: string;
}

export interface UpdateBlogDto {
  title?: string;
  content?: string;
  visibility?: BlogVisibility;
  tags?: string[];
  categories?: string[];
  coverUrl?: string;
  removeCover?: boolean;
}

export interface BlogQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  visibility?: BlogVisibility;
  sortBy?: 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TagQuery {
  search?: string;
  limit?: number;
}

export interface CreateTagDto {
  name: string;
}

export interface CreateCategoryDto {
  name: string;
}

// ─── Response types ───────────────────────────────────────────────────────
export interface BlogAuthorInfo {
  id: string;
  name: string;
  avatar: string | null;
}

export interface BlogCoverImage {
  type: BlogCoverType;
  url: string;
}

export interface BlogTagItem {
  id: string;
  name: string;
}

export interface BlogListItem {
  id: string;
  title: string;
  slug: string;
  coverImage: BlogCoverImage | null;
  tags: BlogTagItem[];
  categories: BlogTagItem[];
  visibility: BlogVisibility;
  author: BlogAuthorInfo;
  createdAt: string;
  updatedAt: string;
}

export interface BlogDetailItem extends BlogListItem {
  content: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Typed Request interfaces ─────────────────────────────────────────────
export interface CreateBlogRequest extends Omit<Request, 'body' | 'user'> {
  body: CreateBlogDto;
  user: JwtUserPayload;
  file?: Express.Multer.File;
}

export interface ListBlogsRequest extends Omit<Request, 'query'> {
  query: BlogQuery;
}

export interface GetBlogBySlugRequest extends Omit<Request, 'params'> {
  params: { slug: string };
}

export interface UpdateBlogRequest extends Omit<Request, 'params' | 'body' | 'user'> {
  params: { id: string };
  body: UpdateBlogDto;
  user: JwtUserPayload;
  file?: Express.Multer.File;
}

export interface DeleteBlogRequest extends Omit<Request, 'params' | 'user'> {
  params: { id: string };
  user: JwtUserPayload;
}

export interface BlogIdParamRequest extends Omit<Request, 'params'> {
  params: { id: string };
}

export interface SearchTagsRequest extends Omit<Request, 'query'> {
  query: TagQuery;
}

export interface CreateTagRequest extends Omit<Request, 'body' | 'user'> {
  body: CreateTagDto;
  user: JwtUserPayload;
}

export interface SearchCategoriesRequest extends Omit<Request, 'query'> {
  query: TagQuery;
}

export interface CreateCategoryRequest extends Omit<Request, 'body' | 'user'> {
  body: CreateCategoryDto;
  user: JwtUserPayload;
}
```

---

## 3.7. Cấu trúc files (File Structure)

### Server

```
server/src/
├── constants/
│   ├── models.ts                       (+) BLOG, BLOG_TAG, BLOG_CATEGORY
│   └── modules/blog/
│       └── index.ts                    (NEW) BLOG_VISIBILITY, BLOG_COVER_TYPE, BLOG_CONFIG
├── models/
│   ├── blog.ts                         (NEW) Blog Mongoose model
│   ├── blog-tag.ts                     (NEW) BlogTag Mongoose model
│   └── blog-category.ts               (NEW) BlogCategory Mongoose model
├── middlewares/
│   └── (barrel export)                 (+) uploadBlogCover
├── types/modules/
│   └── blog.ts                         (NEW) Document types, DTOs, Response types, Typed Request interfaces
├── validators/schemas/
│   └── blog.ts                         (NEW) Joi schemas
└── modules/apps/blog/
    ├── blog.module.ts                  (NEW) createBlogModule(authGuard, optionalAuth)
    ├── blog.controller.ts              (NEW) BlogController
    ├── blog.routes.ts                  (NEW) createBlogRoutes() — main router + sub-module mount
    ├── blog.service.ts                 (NEW) BlogService
    ├── blog.helper.ts                  (NEW) slug, cover image, query builder, file deletion helpers
    ├── dtos/
    │   ├── index.ts                    (NEW) barrel export
    │   ├── blog-list-item.dto.ts       (NEW) BlogListItemDto + toBlogListItemDto()
    │   ├── blog-detail.dto.ts          (NEW) BlogDetailDto + toBlogDetailDto()
    │   ├── delete-blog.dto.ts          (NEW) DeleteBlogDto + toDeleteBlogDto()
    │   ├── tag-item.dto.ts             (NEW) TagItemDto + toTagItemDto()
    │   └── category-item.dto.ts        (NEW) CategoryItemDto + toCategoryItemDto()
    ├── repositories/
    │   ├── blog.repository.ts          (NEW) BlogRepository type + MongoBlogRepository
    │   ├── blog-tag.repository.ts      (NEW) BlogTagRepository type + MongoBlogTagRepository
    │   └── blog-category.repository.ts (NEW) BlogCategoryRepository type + MongoBlogCategoryRepository
    └── sub-modules/
        ├── tags/
        │   ├── blog-tags.routes.ts     (NEW) createBlogTagsRoutes()
        │   ├── blog-tags.controller.ts (NEW) BlogTagsController
        │   └── blog-tags.service.ts    (NEW) BlogTagsService
        └── categories/
            ├── blog-categories.routes.ts     (NEW) createBlogCategoriesRoutes()
            ├── blog-categories.controller.ts (NEW) BlogCategoriesController
            └── blog-categories.service.ts    (NEW) BlogCategoriesService
```

**Route mounting** (`server/src/loaders/modules.loader.ts`):
```typescript
// blog module
const { blogRouter } = createBlogModule(auth, optionalAuth);
v1Router.use('/apps/blogs', blogRouter);
```

**Module factory** (`blog.module.ts`) — wiring:
```typescript
export const createBlogModule = (authGuard, optionalAuth) => {
  // Repositories
  const blogRepo = new MongoBlogRepository();
  const tagRepo = new MongoBlogTagRepository();
  const categoryRepo = new MongoBlogCategoryRepository();

  // Services
  const blogService = new BlogService(blogRepo);
  const tagsService = new BlogTagsService(tagRepo);
  const categoriesService = new BlogCategoriesService(categoryRepo);

  // Controllers
  const tagsController = new BlogTagsController(tagsService);
  const categoriesController = new BlogCategoriesController(categoriesService);
  const blogController = new BlogController(blogService);

  // Sub-module routes
  const tagsRouter = createBlogTagsRoutes(tagsController, authGuard);
  const categoriesRouter = createBlogCategoriesRoutes(categoriesController, authGuard);

  // Main router (mounts sub-module routers internally)
  return {
    blogRouter: createBlogRoutes(blogController, authGuard, optionalAuth, {
      tagsRouter, categoriesRouter
    })
  };
};
```

**Routing trong `blog.routes.ts`** (sub-module mount + main routes):
```
router.use('/tags', tagsRouter)                     // ← mount sub-module TRƯỚC /:slug
router.use('/categories', categoriesRouter)         // ← mount sub-module TRƯỚC /:slug
router.post('/', authGuard, uploadBlogCover, bodyPipe(createBlogSchema), ...)
router.get('/', optionalAuth, queryPipe(listBlogsQuerySchema), ...)
router.get('/:slug', optionalAuth, ...)
router.patch('/:id', authGuard, uploadBlogCover, paramsPipe(blogIdParamSchema), bodyPipe(updateBlogSchema), ...)
router.delete('/:id', authGuard, paramsPipe(blogIdParamSchema), ...)
```

**Sub-module routing trong `blog-tags.routes.ts`**:
```
router.get('/', queryPipe(tagQuerySchema), ...)
router.post('/', authGuard, bodyPipe(createTagSchema), ...)
```

**Sub-module routing trong `blog-categories.routes.ts`**:
```
router.get('/', queryPipe(tagQuerySchema), ...)
router.post('/', authGuard, bodyPipe(createCategorySchema), ...)
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

// Shared: OBJECTID_PATTERN = /^[a-fA-F0-9]{24}$/
// Shared: objectIdSchema = Joi.string().pattern(OBJECTID_PATTERN)

createBlogSchema: {                        // stripUnknown: true
  title:      string, required, min(1), max(200), trim
  content:    string, required, min(1)
  visibility: string, valid(...BLOG_VISIBILITY values), default('public')
  tags:       array of objectIdSchema, optional, max 10 items
  categories: array of objectIdSchema, optional, max 5 items
  coverUrl:   string, uri, optional
  // coverImage: validated by Multer fileFilter
}

updateBlogSchema: {                        // stripUnknown: true
  title:        string, min(1), max(200), optional, trim
  content:      string, min(1), optional
  visibility:   string, valid(...BLOG_VISIBILITY values), optional
  tags:         array of objectIdSchema, optional, max 10
  categories:   array of objectIdSchema, optional, max 5
  coverUrl:     string, uri, optional
  removeCover:  boolean, optional
}

listBlogsQuerySchema: {                    // stripUnknown: true
  page:       number, integer, min(1), default(1)
  limit:      number, integer, min(1), max(50), default(20)
  search:     string, trim, max(100), optional
  categoryId: objectIdSchema, optional
  tagId:      objectIdSchema, optional
  authorId:   objectIdSchema, optional
  visibility: string, valid(...BLOG_VISIBILITY values), optional
  sortBy:     string, valid('title', 'createdAt'), default('createdAt')
  sortOrder:  string, valid('asc', 'desc'), default('desc')
}

tagQuerySchema: {                          // stripUnknown: true
  search:   string, trim, max(50), optional
  limit:    number, integer, min(1), max(50), default(10)
}

createTagSchema: {
  name:   string, required, min(1), max(50)
}

createCategorySchema: {
  name:   string, required, min(1), max(50)
}

blogIdParamSchema: {
  id:   string, required, pattern(OBJECTID_PATTERN)
}
```

---

## 3.9. DTOs (Data Transfer Objects)

### `dtos/blog-list-item.dto.ts`

```typescript
export type BlogListItemDto = BlogListItem;  // re-export từ types

export const toBlogListItemDto = (doc: Record<string, unknown>): BlogListItemDto => {
  // Map authorId (populated) → BlogAuthorInfo { id, name, avatar }
  //   avatar: prepend USER_CONFIG.BASE_URL nếu có
  // Map tags (populated) → BlogTagItem[] { id, name }
  // Map categories (populated) → BlogTagItem[] { id, name }
  // Map coverImage → BlogCoverImage | null
  // Return: { id, title, slug, coverImage, tags, categories, visibility, author, createdAt, updatedAt }
};
```

### `dtos/blog-detail.dto.ts`

```typescript
export type BlogDetailDto = BlogDetailItem;

export const toBlogDetailDto = (doc): BlogDetailDto => {
  const base = toBlogListItemDto(doc);
  return { ...base, content: doc.content };
};
```

### `dtos/delete-blog.dto.ts`

```typescript
export interface DeleteBlogDto { id: string; }
export const toDeleteBlogDto = (id: string): DeleteBlogDto => ({ id });
```

### `dtos/tag-item.dto.ts`

```typescript
export type TagItemDto = BlogTagItem;
export const toTagItemDto = (doc: { _id; name }) => ({ id: doc._id.toString(), name: doc.name });
```

### `dtos/category-item.dto.ts`

```typescript
export type CategoryItemDto = BlogTagItem;
export const toCategoryItemDto = (doc: { _id; name }) => ({ id: doc._id.toString(), name: doc.name });
```

### `dtos/index.ts` — barrel export

```typescript
export type { BlogListItemDto } from "./blog-list-item.dto";
export { toBlogListItemDto } from "./blog-list-item.dto";
export type { BlogDetailDto } from "./blog-detail.dto";
export { toBlogDetailDto } from "./blog-detail.dto";
export type { DeleteBlogDto } from "./delete-blog.dto";
export { toDeleteBlogDto } from "./delete-blog.dto";
export type { TagItemDto } from "./tag-item.dto";
export { toTagItemDto } from "./tag-item.dto";
export type { CategoryItemDto } from "./category-item.dto";
export { toCategoryItemDto } from "./category-item.dto";
```

---

## 3.10. Dependencies & Integrations

| Dependency          | Loại     | Mô tả                                               | Ghi chú                               |
| ------------------- | -------- | --------------------------------------------------- | ------------------------------------- |
| `authGuard`         | Internal | Verify idToken → req.user                           | Đã có, tái sử dụng                    |
| `optionalAuth`      | Internal | Không throw nếu không có token                      | Đã có, tái sử dụng                    |
| `uploadBlogCover`   | Internal | Multer middleware, single image, max 5MB            | Export từ `@/middlewares`              |
| `bodyPipe`/`queryPipe`/`paramsPipe` | Internal | Joi validation pipes              | Đã có, tái sử dụng                    |
| `asyncHandler`      | Internal | Wrap async controller handlers                      | Đã có, tái sử dụng                    |
| `asyncDatabaseHandler` | Internal | Wrap Mongoose queries trong repositories         | Đã có, tái sử dụng                    |
| `OkSuccess`/`CreatedSuccess` | Internal | Response pattern classes                  | Đã có, tái sử dụng                    |
| `NotFoundError`/`ForbiddenError`/`BadRequestError`/`ConflictRequestError` | Internal | Error classes | Đã có |
| `USER_CONFIG`       | Internal | Base URL cho avatar trong DTO mapper                | Đã có                                 |
| `slugify` (npm)     | External | Chuyển title → kebab-case slug                      | Cần install                           |

**Package cần install:**
```bash
yarn add slugify
yarn add @types/slugify --dev  # nếu cần (slugify có bundled types)
```

---

## 3.11. Migration & Deployment Strategy

**Feature flag:** Không. Blog là feature mới, không ảnh hưởng flow hiện tại.

**Rollback plan:**
- Nếu phát hiện lỗi: remove route mounting trong `modules.loader.ts` → tất cả blog endpoints trả 404
- Collections `blogs`, `blog_tags`, `blog_categories` có thể drop an toàn (không có foreign key constraint với các collection khác)
- `uploads/blogs/` directory: xóa bằng tay nếu cần

**Backward compatibility:** Các module hiện tại (auth, contact-admin, login-history) không bị ảnh hưởng. Blog hoàn toàn isolated trong namespace `apps/`.
