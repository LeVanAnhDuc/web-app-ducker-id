# IMPLEMENTATION PLAN: Blog (App Store — v1.0)

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 30         |
| Hoàn thành   | 0/30       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 06/03/2026 |

---

## Thứ tự implement

### Phase 1: Setup & Foundation

#### TASK-001: Install slugify + thêm constants

- **Tham chiếu:** TL3 - Mục 3.3, 3.9
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] `yarn add slugify` trong `server/`
  - [ ] Thêm `BLOG`, `BLOG_TAG`, `BLOG_CATEGORY` vào `server/src/constants/models.ts`
  - [ ] Thêm `BLOG_VISIBILITY`, `BLOG_COVER_TYPE` vào `server/src/constants/enums.ts`
- **Files sẽ tạo/sửa:**
  - `server/src/constants/models.ts` (sửa)
  - `server/src/constants/enums.ts` (sửa)

---

#### TASK-002: Tạo Mongoose models (Blog, BlogTag, BlogCategory)

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `server/src/models/blog-tag.ts`: schema `{ name: String unique }`, export `BlogTagModel`
  - [ ] Tạo `server/src/models/blog-category.ts`: schema `{ name: String unique }`, export `BlogCategoryModel`
  - [ ] Tạo `server/src/models/blog.ts`: schema với `coverImage` sub-document, refs sang `blog_tags`/`blog_categories`, `deletedAt`, timestamps
  - [ ] Thêm tất cả indexes vào từng model (xem TL3 - Mục 3.3)
  - [ ] Verify model names khớp với `MODEL_NAMES` constants
- **Files sẽ tạo/sửa:**
  - `server/src/models/blog.ts` (tạo mới)
  - `server/src/models/blog-tag.ts` (tạo mới)
  - `server/src/models/blog-category.ts` (tạo mới)

---

#### TASK-003: Thêm uploadBlogCover middleware

- **Tham chiếu:** TL3 - Mục 3.3
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Thêm `uploadBlogCover` vào `server/src/middlewares/file-upload.ts`
  - [ ] `diskStorage`: destination = `uploads/blogs/{YYYY-MM-DD}/`, filename = `{uuid}.{ext}`
  - [ ] `fileFilter`: allowed MIME = `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
  - [ ] `limits`: fileSize = 5MB
  - [ ] Export `uploadBlogCover` (single field `'coverImage'`)
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/file-upload.ts` (sửa)

---

#### TASK-004: Tạo TypeScript types

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `server/src/types/modules/blog.ts`
  - [ ] Định nghĩa: `CreateBlogDto`, `UpdateBlogDto`, `BlogQuery`, `BlogAuthorInfo`, `BlogCoverImage`, `BlogTagItem`, `BlogListItem`, `BlogDetailItem`, `TagQuery`, `PaginatedResult<T>`
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/blog.ts` (tạo mới)

---

### Phase 2: Backend Development

#### TASK-005: Tạo Joi validation schemas

- **Tham chiếu:** TL3 - Mục 3.8, TL2 - Mục 2.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `server/src/validators/schemas/blog.ts`
  - [ ] `createBlogSchema`: title required, content required, visibility enum, tags/categories array of ObjectId, coverUrl uri, mutual exclusion với coverImage (chỉ validate ở service level)
  - [ ] `updateBlogSchema`: tất cả optional, removeCover boolean
  - [ ] `listBlogsQuerySchema`: page, limit, search, categoryId, tagId, authorId, visibility, sortBy, sortOrder với defaults
  - [ ] `tagQuerySchema`: search optional, limit default 10 max 50
  - [ ] `createTagSchema`: name required 1-50
  - [ ] `createCategorySchema`: name required 1-50
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/blog.ts` (tạo mới)
- **Test cần pass:** TL2 - Mục 2.3 (validation rules)

---

#### TASK-006: Tạo BlogTagRepository + BlogCategoryRepository

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/repositories/blog-tag.repository.ts`
    - [ ] `search(query: string, limit: number)`: regex search theo name
    - [ ] `findByName(name: string)`: exact match lowercase
    - [ ] `create(name: string)`: lowercase normalize, tạo doc mới
  - [ ] Tạo `server/src/modules/apps/blog/repositories/blog-category.repository.ts` (cùng pattern)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/repositories/blog-tag.repository.ts` (tạo mới)
  - `server/src/modules/apps/blog/repositories/blog-category.repository.ts` (tạo mới)

---

#### TASK-007: Tạo BlogRepository

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-002
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/repositories/blog.repository.ts`
  - [ ] `find(filter, sort, skip, limit)`: `.lean()`, populate author name/avatar, populate tag/category names
  - [ ] `countDocuments(filter)`: count với cùng filter
  - [ ] `findBySlug(slug)`: trả về full doc kèm populated fields
  - [ ] `findById(id)`: tìm theo `_id`, không filter `deletedAt` (để service tự check)
  - [ ] `findByIdAndUpdate(id, update)`: trả về updated doc
  - [ ] `softDelete(id)`: set `deletedAt = new Date()`
  - [ ] `hardDelete(id)`: `deleteOne({ _id: id })`
  - [ ] `create(dto)`: tạo blog doc mới
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/repositories/blog.repository.ts` (tạo mới)

---

#### TASK-008: Tạo query-builder

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/internals/query-builder.ts`
  - [ ] `buildBlogFilter(query, user?)`: implement visibility logic (guest/user/admin), deletedAt=null bắt buộc, search regex, categoryId/tagId/authorId filter
  - [ ] `buildBlogSort(sortBy, sortOrder)`: trả về Mongoose sort object
  - [ ] Edge cases: user filter `visibility=private` → force `authorId=self`; admin không bị restrict
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/internals/query-builder.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-02.x (visibility rules trong list)

---

#### TASK-009: Tạo BlogTagsService + BlogCategoriesService

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-07, TC-08
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-006
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/sub-modules/tags/blog-tags.service.ts`
    - [ ] `searchTags(query, limit)`: gọi repo.search()
    - [ ] `createTag(name)`: lowercase → check duplicate → 409 if exists → create
  - [ ] Tạo `server/src/modules/apps/blog/sub-modules/categories/blog-categories.service.ts` (cùng pattern)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/sub-modules/tags/blog-tags.service.ts` (tạo mới)
  - `server/src/modules/apps/blog/sub-modules/categories/blog-categories.service.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-07.x, TC-08.x

---

#### TASK-010: Tạo BlogService

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-01~06
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-007, TASK-008
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/blog.service.ts`
  - [ ] `generateSlug(title)`: slugify → check uniqueness → append timestamp if collision
  - [ ] `resolveCoverImage(file?, coverUrl?, removeCover?)`: trả về `BlogCoverImage | null | undefined`
  - [ ] `createBlog(userId, dto, file?)`: validate coverImage + coverUrl không đồng thời → generate slug → resolve cover → blogRepo.create()
  - [ ] `listBlogs(query, user?)`: buildBlogFilter → Promise.all([find, count]) → map to BlogListItem[]
  - [ ] `getBlogBySlug(slug, user?)`: findBySlug → 404 if not found/deletedAt → check visibility → return BlogDetailItem
  - [ ] `updateBlog(id, userId, dto, file?)`: findById → 404 → check author (403) → resolve cover → update
  - [ ] `deleteBlog(id, user)`: findById → 404 → admin: hardDelete; user: check author (403) → softDelete
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/blog.service.ts` (tạo mới)
- **Test cần pass:** TL2 - TC-01.x ~ TC-06.x

---

#### TASK-011: Tạo BlogController + BlogModule + mount routes

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-01~08
- **Ước lượng:** 2.75h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-005, TASK-009, TASK-010
- **Checklist:**
  - [ ] Tạo `server/src/modules/apps/blog/sub-modules/tags/blog-tags.controller.ts`: `GET /tags`, `POST /tags`
  - [ ] Tạo `server/src/modules/apps/blog/sub-modules/categories/blog-categories.controller.ts`: `GET /categories`, `POST /categories`
  - [ ] Tạo `server/src/modules/apps/blog/blog.controller.ts`: single `blogRouter`, route order đúng (tags/categories trước `/:slug`)
  - [ ] Gắn middleware chain: `optionalAuthGuard`, `authGuard`, `uploadBlogCover`, `validateRequest`, `asyncHandler`
  - [ ] Tạo `server/src/modules/apps/blog/blog.module.ts`: `createBlogModule({ authGuard, optionalAuthGuard, adminGuard })`
  - [ ] Mount vào `server/src/loaders/modules.loader.ts`: `v1Router.use('/apps/blogs', blogRouter)`
  - [ ] Tạo i18n keys (error messages) vào translation files
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/blog.controller.ts` (tạo mới)
  - `server/src/modules/apps/blog/blog.module.ts` (tạo mới)
  - `server/src/modules/apps/blog/sub-modules/tags/blog-tags.controller.ts` (tạo mới)
  - `server/src/modules/apps/blog/sub-modules/categories/blog-categories.controller.ts` (tạo mới)
  - `server/src/loaders/modules.loader.ts` (sửa)
- **Test cần pass:** TL2 - TC-01.x ~ TC-08.x (smoke test)

---

#### TASK-012: Doc standard API (Swagger)

- **Tham chiếu:** Skill: doc-standards-api
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Swagger cho `POST /apps/blogs`
  - [ ] Swagger cho `GET /apps/blogs`
  - [ ] Swagger cho `GET /apps/blogs/:slug`
  - [ ] Swagger cho `PATCH /apps/blogs/:id`
  - [ ] Swagger cho `DELETE /apps/blogs/:id`
  - [ ] Swagger cho `GET /apps/blogs/tags`, `POST /apps/blogs/tags`
  - [ ] Swagger cho `GET /apps/blogs/categories`, `POST /apps/blogs/categories`

---

#### TASK-013: Review code backend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Chạy `/review-code` trên toàn bộ module `modules/apps/blog/`
  - [ ] Fix tất cả issues được tìm thấy

---

#### TASK-014: Review performance backend

- **Tham chiếu:** Skill: review-performance
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Verify `.lean()` được dùng trong tất cả read queries
  - [ ] Verify `Promise.all([find, count])` trong listBlogs
  - [ ] Verify indexes được dùng đúng trong query-builder
  - [ ] Check N+1 risk khi populate author/tags/categories
  - [ ] Fix issues nếu có

---

#### TASK-015: Review security backend

- **Tham chiếu:** Skill: review-security
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013
- **Checklist:**
  - [ ] Verify private blog → 404 (không leak existence)
  - [ ] Verify author-only update/delete (không thể bypass bằng admin role cho update)
  - [ ] Verify file upload: MIME + extension validation, path traversal không thể
  - [ ] Verify visibility filter không thể bypass qua query params
  - [ ] Fix issues nếu có

---

### Phase 3: Frontend Development

#### TASK-016: Tạo dataSources + forms + translations

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Tạo `client/src/dataSources/Blog/index.ts`: 9 functions (`createBlog`, `listBlogs`, `getBlogBySlug`, `updateBlog`, `deleteBlog`, `searchTags`, `createTag`, `searchCategories`, `createCategory`)
  - [ ] Tạo `client/src/forms/Blog/validations.ts`: Zod schema cho create/edit form
  - [ ] Tạo `client/src/forms/Blog/data.ts`: default values
  - [ ] Tạo `client/src/forms/Blog/index.ts`: form prop types
  - [ ] Tạo `client/src/locales/en/blog.json` + `vi/blog.json`: translation keys
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/Blog/index.ts` (tạo mới)
  - `client/src/forms/Blog/validations.ts` (tạo mới)
  - `client/src/forms/Blog/data.ts` (tạo mới)
  - `client/src/forms/Blog/index.ts` (tạo mới)
  - `client/src/locales/en/blog.json` (tạo mới)
  - `client/src/locales/vi/blog.json` (tạo mới)

---

#### TASK-017: Tạo Blog List page

- **Tham chiếu:** TL1 - US-02, TL2 - TC-02.x
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/blogs/page.tsx` (server component, fetch + pass messages)
  - [ ] Tạo `client/src/views/BlogList/index.tsx`
  - [ ] Tạo `client/src/views/BlogList/mains/BlogListContent/` (filter bar + list + pagination)
  - [ ] Tạo `client/src/views/BlogList/components/BlogCard/` (title, cover, author, tags, date)
  - [ ] Filter: search input, categoryId, tagId, sortBy/sortOrder
  - [ ] Pagination: page + totalPages
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/blogs/page.tsx` (tạo mới)
  - `client/src/views/BlogList/` (tạo mới, nhiều files)

---

#### TASK-018: Tạo Blog Detail page

- **Tham chiếu:** TL1 - US-03, TL2 - TC-03.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/blogs/[slug]/page.tsx`
  - [ ] Tạo `client/src/views/BlogDetail/index.tsx`
  - [ ] Tạo `client/src/views/BlogDetail/mains/BlogDetailContent/` (title, cover, content, tags, author, date)
  - [ ] Hiển thị nút Edit/Delete nếu là author (so sánh với auth store)
  - [ ] Handle 404 gracefully
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/blogs/[slug]/page.tsx` (tạo mới)
  - `client/src/views/BlogDetail/` (tạo mới)

---

#### TASK-019: Tạo Blog Create page

- **Tham chiếu:** TL1 - US-01, TL2 - TC-01.x
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/blogs/new/page.tsx` (auth required, redirect if not logged in)
  - [ ] Tạo `client/src/views/BlogCreate/index.tsx`
  - [ ] Tạo `client/src/views/BlogCreate/mains/BlogForm/`: React Hook Form + Zod
    - [ ] Fields: title, content (textarea), visibility toggle, cover image upload OR URL input
    - [ ] Tag combobox: search existing → select; không có → "Create tag"
    - [ ] Category combobox: cùng pattern với tag
    - [ ] Submit: multipart/form-data nếu có file, application/json nếu dùng URL
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/blogs/new/page.tsx` (tạo mới)
  - `client/src/views/BlogCreate/` (tạo mới)

---

#### TASK-020: Tạo Blog Edit page

- **Tham chiếu:** TL1 - US-04, TL2 - TC-04.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-019
- **Checklist:**
  - [ ] Tạo `client/src/app/[locale]/apps/blogs/[id]/edit/page.tsx` (auth required + author check)
  - [ ] Tạo `client/src/views/BlogEdit/index.tsx` (fetch blog by id → pre-fill BlogForm)
  - [ ] Reuse `BlogForm` component từ `BlogCreate/mains/BlogForm/`
  - [ ] Thêm "Remove cover" button nếu có cover hiện tại (set `removeCover=true`)
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/apps/blogs/[id]/edit/page.tsx` (tạo mới)
  - `client/src/views/BlogEdit/` (tạo mới)

---

#### TASK-021: Tích hợp Delete blog

- **Tham chiếu:** TL1 - US-05, US-06, TL2 - TC-05.x, TC-06.x
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-018
- **Checklist:**
  - [ ] Thêm Delete button vào `BlogDetail` (chỉ hiển thị cho author/admin)
  - [ ] Confirm dialog trước khi xóa
  - [ ] Sau khi xóa thành công: redirect về `/apps/blogs`
  - [ ] Toast notification: "Blog deleted" (soft) hoặc "Blog permanently deleted" (hard)
- **Files sẽ tạo/sửa:**
  - `client/src/views/BlogDetail/mains/BlogDetailContent/` (sửa — thêm delete button + confirm dialog)

---

#### TASK-022: Review code frontend

- **Tham chiếu:** Skill: review-code
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-021
- **Checklist:**
  - [ ] Chạy `/review-code` trên tất cả views/Blog\*
  - [ ] Fix issues: React patterns, component reuse, naming

---

#### TASK-023: Review performance frontend

- **Tham chiếu:** Skill: review-performance
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-022
- **Checklist:**
  - [ ] Verify server components render list/detail (SEO)
  - [ ] Verify không có unnecessary re-renders trong BlogForm
  - [ ] Check bundle size impact

---

#### TASK-024: Review security frontend

- **Tham chiếu:** Skill: review-security
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-022
- **Checklist:**
  - [ ] Verify content render không XSS (plain text v1.0 — safe)
  - [ ] Verify Create/Edit pages redirect nếu không authed
  - [ ] Verify delete/edit button không hiển thị cho non-author

---

### Phase 4: Testing & QA

#### TASK-025: Unit test — query-builder

- **Tham chiếu:** TL2 - Mục 2.3, TC-02.x
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-008
- **Checklist:**
  - [ ] Test visibility filter: guest → chỉ public
  - [ ] Test visibility filter: user → public + private of self
  - [ ] Test visibility filter: admin → tất cả
  - [ ] Test user `visibility=private` query → force authorId=self
  - [ ] Test search regex, categoryId, tagId, authorId filter
  - [ ] Test sort: title asc/desc, createdAt asc/desc
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/internals/__tests__/query-builder.test.ts` (tạo mới)

---

#### TASK-026: Unit test — slug + cover helpers

- **Tham chiếu:** TL2 - TC-01, TC-04
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-010
- **Checklist:**
  - [ ] Test `generateSlug`: normal title, special chars, collision (timestamp suffix)
  - [ ] Test `resolveCoverImage`: file only, URL only, removeCover, neither
  - [ ] Test coverImage + coverUrl conflict → validation error
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/__tests__/blog.service.helpers.test.ts` (tạo mới)

---

#### TASK-027: Unit test — BlogService methods

- **Tham chiếu:** TL2 - TC-01~06
- **Ước lượng:** 2.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-010
- **Checklist:**
  - [ ] Mock BlogRepository, BlogTagRepository, BlogCategoryRepository
  - [ ] Test `createBlog`: happy path, slug collision, no cover, URL cover, file cover
  - [ ] Test `listBlogs`: pagination, empty result
  - [ ] Test `getBlogBySlug`: found public, found private (owner/admin/other → 404), soft deleted → 404
  - [ ] Test `updateBlog`: success, not author 403, not found 404
  - [ ] Test `deleteBlog`: user soft delete, admin hard delete, not author 403, not found 404
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/__tests__/blog.service.test.ts` (tạo mới)

---

#### TASK-028: Unit test — TagsService + CategoriesService + Joi schemas

- **Tham chiếu:** TL2 - TC-07, TC-08, Mục 2.3
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-009, TASK-005
- **Checklist:**
  - [ ] Test `createTag`: success, duplicate 409 (case-insensitive)
  - [ ] Test `createCategory`: cùng pattern
  - [ ] Test `createBlogSchema`: valid, missing title, missing content, invalid coverUrl, invalid tag ObjectId
  - [ ] Test `updateBlogSchema`: tất cả optional, invalid types
  - [ ] Test `listBlogsQuerySchema`: defaults, invalid page, limit > 100
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/__tests__/blog-tags.service.test.ts` (tạo mới)
  - `server/src/validators/schemas/__tests__/blog.schema.test.ts` (tạo mới)

---

#### TASK-029: Integration test — Blog CRUD endpoints

- **Tham chiếu:** TL2 - TC-01.x ~ TC-06.x
- **Ước lượng:** 5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] Setup: seed user + admin accounts, test DB
  - [ ] `POST /apps/blogs`: file upload, URL cover, no cover, missing title (400), no auth (401)
  - [ ] `GET /apps/blogs`: guest chỉ thấy public, user thấy public + private của mình, admin thấy tất cả, pagination, search, filter, sort
  - [ ] `GET /apps/blogs/:slug`: public OK, private owner OK, private other 404, private guest 404, admin OK, soft deleted 404
  - [ ] `PATCH /apps/blogs/:id`: author OK, non-author 403, not found 404, update cover, remove cover
  - [ ] `DELETE /apps/blogs/:id`: user soft delete (deletedAt set), admin hard delete (doc gone), non-author 403
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/__tests__/blog.integration.test.ts` (tạo mới)

---

#### TASK-030: Integration test — Tags & Categories endpoints

- **Tham chiếu:** TL2 - TC-07.x, TC-08.x
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-011
- **Checklist:**
  - [ ] `GET /apps/blogs/tags?search=xxx`: returns matching tags
  - [ ] `POST /apps/blogs/tags`: create, duplicate 409 (case-insensitive), no auth 401, missing name 400
  - [ ] `GET /apps/blogs/categories?search=xxx`: cùng pattern
  - [ ] `POST /apps/blogs/categories`: cùng pattern
- **Files sẽ tạo/sửa:**
  - `server/src/modules/apps/blog/__tests__/blog-tags.integration.test.ts` (tạo mới)

---

## Dependency Graph

```
TASK-001 (constants + install)
    ├── TASK-002 (models)
    │       ├── TASK-006 (tag/category repos)
    │       │       └── TASK-009 (tag/category services)
    │       │               └── TASK-011 (controller + module + mount) ←──┐
    │       └── TASK-007 (blog repo)                                       │
    │               └── TASK-010 (blog service) ──────────────────────────┘
    ├── TASK-003 (uploadBlogCover)          ↑ (TASK-011 depends on 005, 009, 010)
    ├── TASK-004 (TS types)
    │       └── TASK-008 (query-builder) ───→ TASK-010
    └── TASK-005 (Joi schemas) ─────────────→ TASK-011

TASK-011 (all backend wired)
    ├── TASK-012 (Swagger)
    ├── TASK-013 (review code BE)
    │       ├── TASK-014 (review performance)
    │       └── TASK-015 (review security)
    ├── TASK-016 (dataSources + forms + i18n)
    │       ├── TASK-017 (list page)
    │       ├── TASK-018 (detail page)
    │       │       └── TASK-021 (delete button)
    │       │               └── TASK-022 (review code FE)
    │       │                       ├── TASK-023 (review perf FE)
    │       │                       └── TASK-024 (review security FE)
    │       ├── TASK-019 (create page)
    │       │       └── TASK-020 (edit page)
    └── Testing (can start after TASK-011):
        ├── TASK-025 (unit: query-builder) ← TASK-008
        ├── TASK-026 (unit: slug + cover) ← TASK-010
        ├── TASK-027 (unit: blog service) ← TASK-010
        ├── TASK-028 (unit: tags service + schemas) ← TASK-009, TASK-005
        ├── TASK-029 (integration: blog CRUD)
        └── TASK-030 (integration: tags & categories)
```
