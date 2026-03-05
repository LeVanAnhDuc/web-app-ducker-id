# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                          |
| ----------------- | --------------------------------- |
| **Tên feature**   | Blog (App trong App Store)        |
| **Người yêu cầu** | Owner                             |
| **Ngày tạo**      | 05/03/2026                        |
| **Phiên bản**     | v1.0                              |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

> Dự án là một **App Store** platform. Blog là một trong nhiều ứng dụng (apps) trong store này. Các app khác trong tương lai có thể là mini-tiktok, chatbox, v.v. Mỗi app nằm trong domain riêng (`apps/blogs/`, `apps/mini-tiktok/`, ...) để dễ scale và quản lý độc lập.

**Tình trạng hiện tại:**
Hệ thống chưa có app nào trong store. Blog là app đầu tiên được xây dựng — đặt nền móng cho kiến trúc app-store.

**Vấn đề:**
User chưa có kênh để chia sẻ nội dung với cộng đồng. Cần một module blog đơn giản, dễ mở rộng, phục vụ newsfeed và trang hồ sơ user.

---

## 1.3. Mục tiêu (Objectives)

- Xây dựng CRUD blog cơ bản: Create, Read (list + detail), Update, Delete
- Hỗ trợ visibility: `public` (ai cũng xem) và `private` (chỉ mình xem)
- Hỗ trợ tags và categories do user tự tạo và tái sử dụng
- Hỗ trợ cover image (upload lên server hoặc nhập URL)
- Hỗ trợ SEO thông qua slug tự động sinh từ title
- Soft delete (30 ngày) cho user; hard delete cho admin
- Thiết kế kiến trúc scalable: dễ thêm tính năng mới (rich text, comments, likes, view count...) và dễ thêm app mới vào store

---

## 1.4. Đối tượng người dùng (Target Users)

| Role  | Mô tả                               | Nhu cầu chính                                                       |
| ----- | ----------------------------------- | ------------------------------------------------------------------- |
| Guest | Chưa đăng nhập                      | Xem danh sách blog public, tìm kiếm, filter                        |
| User  | Đã đăng nhập                        | Tạo, sửa, xóa blog của mình; xem blog public + private của mình   |
| Admin | Quản trị viên                       | Xem tất cả blog (kể cả private), hard delete bất kỳ blog           |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                     | Ghi chú                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| US-01 | Là một **user**, tôi muốn **tạo blog mới** với title, content, cover image, tags, categories, visibility để **chia sẻ nội dung** | Published ngay, không có draft          |
| US-02 | Là một **guest/user/admin**, tôi muốn **xem danh sách blog public** (filter, search, sort, phân trang) để **khám phá nội dung** | Trên newsfeed hoặc trang hồ sơ user     |
| US-03 | Là một **guest/user/admin**, tôi muốn **xem chi tiết một blog** qua slug để **đọc nội dung đầy đủ và SEO**                    | Private chỉ owner + admin mới xem được  |
| US-04 | Là một **user**, tôi muốn **cập nhật blog của mình** (title, content, cover image, tags, categories, visibility) để **chỉnh sửa** | Chỉ author mới được sửa                 |
| US-05 | Là một **user**, tôi muốn **xóa mềm blog của mình** để **gỡ bài** (có thể restore sau — future)                               | Soft delete, ẩn khỏi public sau 30 ngày |
| US-06 | Là một **admin**, tôi muốn **hard delete bất kỳ blog** để **xử lý nội dung vi phạm**                                         | Xóa vĩnh viễn, không thể restore        |
| US-07 | Là một **user**, tôi muốn **tìm kiếm hoặc tạo tag/category** khi viết blog để **phân loại nội dung**                          | Search existing → reuse; không có → tạo mới |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

**Blog CRUD:**
- `POST /api/v1/apps/blogs` — Tạo blog mới (auth required)
- `GET /api/v1/apps/blogs` — Danh sách blog (public filter/search/sort/pagination)
- `GET /api/v1/apps/blogs/:slug` — Chi tiết blog theo slug
- `PATCH /api/v1/apps/blogs/:id` — Cập nhật blog (chỉ author)
- `DELETE /api/v1/apps/blogs/:id` — Xóa blog (user: soft delete; admin: hard delete)

**Tags & Categories:**
- `GET /api/v1/apps/blogs/tags?search=xxx` — Tìm kiếm tag hiện có
- `POST /api/v1/apps/blogs/tags` — Tạo tag mới
- `GET /api/v1/apps/blogs/categories?search=xxx` — Tìm kiếm category hiện có
- `POST /api/v1/apps/blogs/categories` — Tạo category mới

**Filter & Search trên list:**
- Search: text search trên title
- Filter: category, tag, visibility (owner/admin), authorId (user profile context)
- Sort: theo alphabet (title A-Z/Z-A), theo time (createdAt asc/desc)

**Cover Image:**
- Upload file lên server (multipart/form-data)
- Hoặc nhập URL trực tiếp

**SEO:**
- Slug tự động sinh từ title, unique trong hệ thống
- Slug được dùng cho URL (`/apps/blogs/:slug`)

**Visibility:**
- `public`: ai cũng xem được
- `private`: chỉ author + admin xem được

**Soft Delete (User):**
- `deletedAt` được set, blog ẩn khỏi public queries
- Sau 30 ngày: auto hard delete (implement logic sau — v1.0 chỉ set `deletedAt`)

**Hard Delete (Admin):**
- Xóa vĩnh viễn khỏi DB, không thể restore

### Ngoài phạm vi (Out of Scope)

- Draft/schedule post (tạo xong là published)
- Rich text editor (v1.0 chỉ plain text)
- View count
- Comments
- Like / reaction
- Restore từ soft delete (future)
- Auto hard delete sau 30 ngày (future — chỉ set `deletedAt` trong v1.0)
- Notification khi có blog mới
- Export blog
- Blog analytics

### Cân nhắc cho tương lai (Future Considerations)

- Rich text / Markdown editor
- Draft & schedule publishing
- View count
- Comments & reactions
- Restore blog từ trash (30 ngày)
- Auto hard delete job (cron)
- Mini-tiktok, chatbox và các app khác trong store
- Notification

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Server module: `server/src/modules/apps/blog/` — nằm trong namespace `apps/` để phân biệt với core modules
- Client routes: `client/src/app/[locale]/apps/blogs/...`
- API prefix: `/api/v1/apps/blogs/...`
- Tuân theo kiến trúc module hiện tại (controller → service → repository)
- Slug phải unique, auto-generated từ title (kebab-case + timestamp suffix nếu trùng)
- Tags và categories lưu trong collection riêng (`blog_tags`, `blog_categories`) để tái sử dụng cross-user
- Soft delete: chỉ set `deletedAt`, chưa implement auto hard delete
- Admin hard delete: xóa vĩnh viễn ngay lập tức, không qua trash
- Cover image: hỗ trợ cả upload (Multer) và URL string
- Package manager: YARN

**Giả định:**

- Blog chỉ có 1 author (không hỗ trợ co-author)
- Slug được generate lúc tạo và không thay đổi khi update title (tránh SEO broken links)
- Private blog: ẩn hoàn toàn khỏi list public, nhưng owner/admin vẫn có thể GET detail qua slug
- Tags và categories: không có hierarchy (flat structure) trong v1.0
- `AdminGuard` đã tồn tại (từ login-history v2.0), dùng lại
