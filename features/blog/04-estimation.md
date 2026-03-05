# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                          |
| ---------------------------- | -------------------------------- |
| **Tổng thời gian ước lượng** | ~10 ngày (có buffer 1.3x)        |
| **Số developer**             | 1 người                          |
| **Ngày bắt đầu dự kiến**    | 06/03/2026                       |
| **Ngày hoàn thành dự kiến**  | 20/03/2026                       |
| **Hệ số buffer**             | 1.3x (thêm 30%)                  |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Install slugify package (`yarn add slugify`) | TL3 - Mục 3.9 | 15m | |
| Thêm `BLOG`, `BLOG_TAG`, `BLOG_CATEGORY` vào `constants/models.ts` | TL3 - Mục 3.3 | 15m | |
| Thêm `BLOG_VISIBILITY`, `BLOG_COVER_TYPE` vào `constants/enums.ts` | TL3 - Mục 3.3 | 15m | |
| Tạo Mongoose model `blog.ts` + indexes | TL3 - Mục 3.3 | 1h | Sub-document coverImage, refs tags/categories |
| Tạo Mongoose model `blog-tag.ts` + unique index | TL3 - Mục 3.3 | 30m | |
| Tạo Mongoose model `blog-category.ts` + unique index | TL3 - Mục 3.3 | 30m | |
| Thêm `uploadBlogCover` vào `middlewares/file-upload.ts` | TL3 - Mục 3.3 | 45m | single image, jpg/png/webp/gif, 5MB |
| Tạo TypeScript types (`types/modules/blog.ts`) | TL3 - Mục 3.6 | 45m | |

### Phase 2: Backend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo Joi validation schemas (`validators/schemas/blog.ts`) | TL3 - Mục 3.8 | 1h | 6 schemas: create, update, listQuery, tagQuery, createTag, createCategory |
| Tạo `BlogRepository` (`repositories/blog.repository.ts`) | TL3 - Mục 3.7 | 1.5h | find, countDocuments, findBySlug, findById, findByIdAndUpdate, hardDelete, softDelete |
| Tạo `BlogTagRepository` + `BlogCategoryRepository` | TL3 - Mục 3.7 | 1h | search by name regex, findByName (exact lowercase), create |
| Tạo `internals/query-builder.ts`: `buildBlogFilter()`, `buildBlogSort()` | TL3 - Mục 3.5 | 1.5h | visibility logic (guest/user/admin), search, filter |
| Tạo `BlogService`: `createBlog()`, `listBlogs()`, `getBlogBySlug()`, `updateBlog()`, `deleteBlog()` | TL3 - Mục 3.5 | 3h | slug generation, resolveCoverImage, soft/hard delete logic |
| Tạo `BlogTagsService` + `BlogCategoriesService` | TL3 - Mục 3.7 | 1h | search, create (409 on duplicate) |
| Tạo `BlogController` (9 routes trong single router, đúng thứ tự) | TL3 - Mục 3.7 | 2h | route order, middleware chain, asyncHandler |
| Tạo `blog.module.ts`: `createBlogModule()` + mount vào `modules.loader.ts` | TL3 - Mục 3.7 | 45m | inject authGuard, optionalAuthGuard, adminGuard |
| Tạo i18n translation keys (error messages) | TL3 - Mục 3.4 | 30m | |
| **Doc standard API (Swagger)** _(bắt buộc)_ | Skill: doc-standards-api | 2h | 9 endpoints |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 1h | lean(), Promise.all, index usage, N+1 (populate) |
| **Review security** _(bắt buộc)_ | Skill: review-security | 1h | authZ, file upload, visibility bypass |

### Phase 3: Frontend Development

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Tạo `dataSources/Blog/index.ts`: 9 API functions | TL1 - US-01~07 | 1h | |
| Tạo `forms/Blog/`: Zod schema, default values, form props | TL3 - Mục 3.7 | 1h | dùng cho Create + Edit |
| Tạo translation files `locales/en/blog.json` + `vi/blog.json` | TL3 - Mục 3.7 | 30m | |
| Tạo Blog List page (`apps/blogs/page.tsx`) + `views/BlogList/` (list + filter + pagination + BlogCard) | TL1 - US-02 | 3h | |
| Tạo Blog Detail page (`apps/blogs/[slug]/page.tsx`) + `views/BlogDetail/` | TL1 - US-03 | 2h | |
| Tạo Blog Create page (`apps/blogs/new/page.tsx`) + `views/BlogCreate/` (form, tag/category combobox, cover image upload) | TL1 - US-01 | 3h | Tag/category search+create inline |
| Tạo Blog Edit page (`apps/blogs/[id]/edit/page.tsx`) + `views/BlogEdit/` (reuse BlogForm) | TL1 - US-04 | 2h | |
| Tích hợp Delete blog (soft/hard delete button) trong Detail page | TL1 - US-05, US-06 | 1h | confirm dialog |
| **Review code** _(bắt buộc)_ | Skill: review-code | 1h | React patterns, component reuse |
| **Review performance** _(bắt buộc)_ | Skill: review-performance | 30m | Core Web Vitals, bundle size |
| **Review security** _(bắt buộc)_ | Skill: review-security | 30m | XSS (content render), auth page protection |

### Phase 4: Testing & QA

| Task | Tham chiếu | Ước lượng | Ghi chú |
| ---- | ---------- | --------- | ------- |
| Unit test: `query-builder.ts` — visibility rules (guest/user/admin), search, filter combinations | TL2 - Mục 2.3 | 1.5h | |
| Unit test: `generateSlug()` + `resolveCoverImage()` — edge cases | TL2 - TC-01, TC-03 | 1h | collision handling, removeCover, both sources |
| Unit test: service methods (createBlog, listBlogs, getBlogBySlug, updateBlog, deleteBlog) | TL2 - TC-01~05 | 2.5h | Mock repositories |
| Unit test: BlogTagsService + BlogCategoriesService (duplicate 409) | TL2 - TC-06, TC-07 | 1h | |
| Unit test: Joi validation schemas (createBlog, updateBlog, listQuery) | TL2 - Mục 2.3 | 1h | |
| Integration test: POST /apps/blogs — create với file upload, URL, no cover, invalid | TL2 - TC-01.x | 1.5h | |
| Integration test: GET /apps/blogs — visibility filter (guest/user/admin), search, pagination, sort | TL2 - TC-02.x | 1.5h | |
| Integration test: GET /apps/blogs/:slug — public, private (owner/admin/other/guest) | TL2 - TC-03.x | 1h | |
| Integration test: PATCH /apps/blogs/:id — update fields, cover change, author-only | TL2 - TC-04.x | 1h | |
| Integration test: DELETE /apps/blogs/:id — soft delete (user), hard delete (admin), non-author 403 | TL2 - TC-05.x, TC-06.x | 1h | |
| Integration test: Tags & Categories CRUD (search, create, 409 duplicate) | TL2 - TC-07.x, TC-08.x | 1h | |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) | Trạng thái |
| ----------------------- | ------------------------ | -------------------------- | ---------- |
| 1. Setup & Foundation   | 4h                       | ~5h                        | ⬜ Todo    |
| 2. Backend Development  | 16h                      | ~21h                       | ⬜ Todo    |
| 3. Frontend Development | 15.5h                    | ~20h                       | ⬜ Todo    |
| 4. Testing & QA         | 13h                      | ~17h                       | ⬜ Todo    |
| **TỔNG**                | **~48.5h**               | **~63h (~8 ngày)**         |            |
