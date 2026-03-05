# TÀI LIỆU 2: TEST CASE & ACCEPTANCE CRITERIA

> Map với từng User Story ở Tài liệu 1.

---

## 2.1. Quy ước đọc

**Format test scenario:**
- **GIVEN:** Điều kiện ban đầu
- **WHEN:** Hành động thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại:** 🟢 Happy Path | 🟡 Edge Case | 🔴 Error Case

**Trạng thái:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Tạo blog mới

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** POST /apps/blogs với title, content, visibility=public, tags, categories **THEN** 201, blog được tạo với slug tự động, status=published, authorId=userId | ⚪ |
| TC-01.2 | 🟢 Happy | **GIVEN** user tạo blog **WHEN** gửi kèm cover image file (upload) **THEN** file được lưu server, `coverImage.type=upload`, `coverImage.url` là path trên server | ⚪ |
| TC-01.3 | 🟢 Happy | **GIVEN** user tạo blog **WHEN** gửi `coverImage.url` là URL bên ngoài **THEN** blog được tạo với `coverImage.type=url`, `coverImage.url` là URL đó | ⚪ |
| TC-01.4 | 🟢 Happy | **GIVEN** user tạo blog **WHEN** visibility=private **THEN** blog được tạo, không hiển thị trong danh sách public | ⚪ |
| TC-01.5 | 🟢 Happy | **GIVEN** user tạo blog với tags có sẵn và tags mới **WHEN** submit **THEN** tags có sẵn được link theo _id, tags mới được tạo và link | ⚪ |
| TC-01.6 | 🟡 Edge  | **GIVEN** user tạo blog **WHEN** title trùng với blog đã tồn tại **THEN** slug được tạo với suffix timestamp để đảm bảo unique (VD: `my-blog-1709123456`) | ⚪ |
| TC-01.7 | 🟡 Edge  | **GIVEN** user tạo blog **WHEN** không có cover image **THEN** blog được tạo với `coverImage: null` | ⚪ |
| TC-01.8 | 🟡 Edge  | **GIVEN** user tạo blog **WHEN** title có ký tự đặc biệt (tiếng Việt, emoji) **THEN** slug được generate đúng dạng kebab-case ASCII | ⚪ |
| TC-01.9 | 🟡 Edge  | **GIVEN** user gửi cả cover image file VÀ coverImage.url **WHEN** submit **THEN** ưu tiên file upload, bỏ qua URL | ⚪ |
| TC-01.10| 🔴 Error | **GIVEN** request không có token **WHEN** POST /apps/blogs **THEN** 401 Unauthorized | ⚪ |
| TC-01.11| 🔴 Error | **GIVEN** user gửi thiếu field bắt buộc (title hoặc content) **WHEN** POST **THEN** 400 Bad Request với chi tiết field lỗi | ⚪ |
| TC-01.12| 🔴 Error | **GIVEN** user upload cover image **WHEN** file vượt quá giới hạn kích thước **THEN** 400 với message lỗi file | ⚪ |
| TC-01.13| 🔴 Error | **GIVEN** user gửi `visibility=invalid` **WHEN** POST **THEN** 400 Bad Request | ⚪ |

### US-02: Xem danh sách blog

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** có nhiều blog public **WHEN** GET /apps/blogs (guest, không filter) **THEN** 200, trả về danh sách blog public (không có private của người khác), phân trang mặc định | ⚪ |
| TC-02.2 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** GET /apps/blogs **THEN** thấy blog public của tất cả + blog private của chính mình (không thấy private của người khác) | ⚪ |
| TC-02.3 | 🟢 Happy | **GIVEN** admin đã đăng nhập **WHEN** GET /apps/blogs **THEN** thấy tất cả blog kể cả private của mọi user | ⚪ |
| TC-02.4 | 🟢 Happy | **GIVEN** có blogs **WHEN** GET /apps/blogs?search=keyword **THEN** chỉ trả về blogs có title chứa keyword (case-insensitive) | ⚪ |
| TC-02.5 | 🟢 Happy | **GIVEN** có blogs với nhiều categories **WHEN** GET /apps/blogs?categoryId=abc **THEN** chỉ trả về blogs thuộc category đó | ⚪ |
| TC-02.6 | 🟢 Happy | **GIVEN** có blogs **WHEN** GET /apps/blogs?tagId=xyz **THEN** chỉ trả về blogs có tag đó | ⚪ |
| TC-02.7 | 🟢 Happy | **GIVEN** có blogs **WHEN** GET /apps/blogs?sortBy=title&sortOrder=asc **THEN** trả về theo alphabet A-Z | ⚪ |
| TC-02.8 | 🟢 Happy | **GIVEN** có blogs **WHEN** GET /apps/blogs?authorId=userId **THEN** chỉ trả về blogs của author đó (context: trang hồ sơ user) | ⚪ |
| TC-02.9 | 🟢 Happy | **GIVEN** có 35 blogs **WHEN** GET /apps/blogs?page=2&limit=10 **THEN** trả về records 11–20, meta: `{ total, page: 2, limit: 10, totalPages: 4 }` | ⚪ |
| TC-02.10| 🟡 Edge  | **GIVEN** không có blog nào **WHEN** GET /apps/blogs **THEN** `{ items: [], meta: { total: 0, ... } }`, không phải 404 | ⚪ |
| TC-02.11| 🟡 Edge  | **GIVEN** guest truy cập **WHEN** GET /apps/blogs?authorId=userA **THEN** chỉ thấy blogs public của userA, không thấy private | ⚪ |
| TC-02.12| 🟡 Edge  | **GIVEN** blog đã soft delete **WHEN** GET /apps/blogs **THEN** blog đó KHÔNG xuất hiện (kể cả với owner) | ⚪ |
| TC-02.13| 🟡 Edge  | **GIVEN** limit=500 **WHEN** GET /apps/blogs **THEN** tự động cap về 50 (blog list cap thấp hơn do content nặng hơn) | ⚪ |
| TC-02.14| 🔴 Error | **GIVEN** sortBy=invalid_field **WHEN** GET /apps/blogs **THEN** 400 Bad Request | ⚪ |

### US-03: Xem chi tiết blog theo slug

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** blog public tồn tại **WHEN** GET /apps/blogs/:slug (guest) **THEN** 200, trả về đầy đủ thông tin: title, content, slug, coverImage, tags, categories, author info, createdAt | ⚪ |
| TC-03.2 | 🟢 Happy | **GIVEN** blog private của userA **WHEN** GET /apps/blogs/:slug với token của userA **THEN** 200, trả về đầy đủ thông tin | ⚪ |
| TC-03.3 | 🟢 Happy | **GIVEN** blog private của userA **WHEN** GET /apps/blogs/:slug với token admin **THEN** 200 | ⚪ |
| TC-03.4 | 🟡 Edge  | **GIVEN** blog private của userA **WHEN** GET /apps/blogs/:slug với token của userB **THEN** 404 (không expose sự tồn tại) | ⚪ |
| TC-03.5 | 🟡 Edge  | **GIVEN** blog private **WHEN** GET /apps/blogs/:slug không có token **THEN** 404 | ⚪ |
| TC-03.6 | 🟡 Edge  | **GIVEN** blog đã soft delete **WHEN** GET /apps/blogs/:slug **THEN** 404 (kể cả owner — soft deleted là ẩn hoàn toàn) | ⚪ |
| TC-03.7 | 🔴 Error | **GIVEN** slug không tồn tại **WHEN** GET /apps/blogs/:slug **THEN** 404 Not Found | ⚪ |

### US-04: Cập nhật blog

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** user là author của blog **WHEN** PATCH /apps/blogs/:id với title mới **THEN** 200, blog được update, slug KHÔNG thay đổi | ⚪ |
| TC-04.2 | 🟢 Happy | **GIVEN** user update blog **WHEN** thay đổi visibility từ public → private **THEN** blog ẩn khỏi public list ngay sau đó | ⚪ |
| TC-04.3 | 🟢 Happy | **GIVEN** user update blog **WHEN** thêm/xóa tags và categories **THEN** tags/categories được update đúng | ⚪ |
| TC-04.4 | 🟢 Happy | **GIVEN** user update blog **WHEN** upload cover image mới **THEN** ảnh cũ được xóa (nếu là upload), ảnh mới được lưu | ⚪ |
| TC-04.5 | 🟡 Edge  | **GIVEN** user update blog **WHEN** chỉ gửi một số fields (partial update) **THEN** chỉ fields đó được update, fields khác giữ nguyên | ⚪ |
| TC-04.6 | 🟡 Edge  | **GIVEN** user update blog **WHEN** xóa cover image (gửi `coverImage: null`) **THEN** coverImage được set null, file cũ bị xóa nếu là upload | ⚪ |
| TC-04.7 | 🔴 Error | **GIVEN** userB cố update blog của userA **WHEN** PATCH /apps/blogs/:id **THEN** 403 Forbidden | ⚪ |
| TC-04.8 | 🔴 Error | **GIVEN** admin cố update blog của user **WHEN** PATCH /apps/blogs/:id **THEN** 403 Forbidden (admin không có quyền sửa) | ⚪ |
| TC-04.9 | 🔴 Error | **GIVEN** blog đã soft delete **WHEN** PATCH /apps/blogs/:id **THEN** 404 Not Found | ⚪ |
| TC-04.10| 🔴 Error | **GIVEN** không có token **WHEN** PATCH /apps/blogs/:id **THEN** 401 Unauthorized | ⚪ |

### US-05: Xóa mềm blog (User)

| ID      | Loại     | Scenario                                                                                                                                                              | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** user là author **WHEN** DELETE /apps/blogs/:id **THEN** 200, `deletedAt` được set, blog ẩn khỏi tất cả public queries | ⚪ |
| TC-05.2 | 🟢 Happy | **GIVEN** blog vừa soft delete **WHEN** GET /apps/blogs (public list) **THEN** blog không xuất hiện | ⚪ |
| TC-05.3 | 🟢 Happy | **GIVEN** blog vừa soft delete **WHEN** GET /apps/blogs/:slug **THEN** 404 | ⚪ |
| TC-05.4 | 🟡 Edge  | **GIVEN** user soft delete blog **WHEN** cố soft delete lần 2 **THEN** 404 (đã bị xóa) | ⚪ |
| TC-05.5 | 🔴 Error | **GIVEN** userB cố xóa blog của userA **WHEN** DELETE /apps/blogs/:id **THEN** 403 Forbidden | ⚪ |
| TC-05.6 | 🔴 Error | **GIVEN** không có token **WHEN** DELETE /apps/blogs/:id **THEN** 401 | ⚪ |

### US-06: Hard delete blog (Admin)

| ID      | Loại     | Scenario                                                                                                                                                              | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-06.1 | 🟢 Happy | **GIVEN** admin **WHEN** DELETE /apps/blogs/:id/hard (hoặc admin flag) **THEN** 200, blog bị xóa vĩnh viễn khỏi DB | ⚪ |
| TC-06.2 | 🟢 Happy | **GIVEN** admin hard delete blog đã soft delete **WHEN** DELETE **THEN** 200, xóa vĩnh viễn | ⚪ |
| TC-06.3 | 🟢 Happy | **GIVEN** admin hard delete blog có cover image upload **WHEN** DELETE **THEN** file ảnh trên disk cũng bị xóa | ⚪ |
| TC-06.4 | 🔴 Error | **GIVEN** user thường gọi admin hard delete API **WHEN** DELETE **THEN** 403 Forbidden | ⚪ |
| TC-06.5 | 🔴 Error | **GIVEN** blog không tồn tại **WHEN** admin DELETE **THEN** 404 Not Found | ⚪ |

### US-07: Tìm kiếm / tạo Tag và Category

| ID      | Loại     | Scenario                                                                                                                                                              | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-07.1 | 🟢 Happy | **GIVEN** có tags trong DB **WHEN** GET /apps/blogs/tags?search=tech **THEN** trả về danh sách tags có name chứa "tech" (case-insensitive) | ⚪ |
| TC-07.2 | 🟢 Happy | **GIVEN** tag "technology" chưa tồn tại **WHEN** POST /apps/blogs/tags `{ name: "technology" }` **THEN** 201, tag được tạo với slug tự động, createdBy=userId | ⚪ |
| TC-07.3 | 🟢 Happy | **GIVEN** tag "technology" đã tồn tại **WHEN** POST /apps/blogs/tags `{ name: "Technology" }` **THEN** 409 Conflict hoặc trả về tag hiện có (tùy design) | ⚪ |
| TC-07.4 | 🟢 Happy | **GIVEN** có categories **WHEN** GET /apps/blogs/categories?search=travel **THEN** trả về danh sách categories khớp | ⚪ |
| TC-07.5 | 🟢 Happy | **GIVEN** category chưa tồn tại **WHEN** POST /apps/blogs/categories **THEN** 201, category được tạo | ⚪ |
| TC-07.6 | 🟡 Edge  | **GIVEN** search với query rỗng **WHEN** GET /apps/blogs/tags?search= **THEN** trả về top N tags phổ biến nhất (sorted by usageCount desc) | ⚪ |
| TC-07.7 | 🟡 Edge  | **GIVEN** tạo tag **WHEN** name có khoảng trắng thừa ("  tech  ") **THEN** được trim và lowercase trước khi lưu | ⚪ |
| TC-07.8 | 🔴 Error | **GIVEN** không có token **WHEN** POST /apps/blogs/tags **THEN** 401 | ⚪ |
| TC-07.9 | 🔴 Error | **GIVEN** name rỗng hoặc chỉ có khoảng trắng **WHEN** POST /apps/blogs/tags **THEN** 400 Bad Request | ⚪ |

---

## 2.3. Validation Rules

**Blog (POST/PATCH):**

| Field       | Rule                                                                               | Validate tại |
| ----------- | ---------------------------------------------------------------------------------- | ------------ |
| title       | Required (create), string, min 3, max 200 ký tự, trim                            | Controller   |
| content     | Required (create), string, min 10, max 50000 ký tự                               | Controller   |
| visibility  | Required (create), enum: `public` \| `private`, default: `public`                | Controller   |
| tags        | Optional, array of ObjectId strings, max 10 tags                                  | Controller   |
| categories  | Optional, array of ObjectId strings, max 5 categories                             | Controller   |
| coverImage.type | Optional, enum: `upload` \| `url`                                            | Controller   |
| coverImage.url  | Required nếu type=url, valid URL format                                      | Controller   |
| coverImage file | Max 5MB, chỉ jpg/jpeg/png/webp/gif                                          | Controller   |

**Blog List Query (GET /apps/blogs):**

| Param      | Rule                                                                               | Validate tại |
| ---------- | ---------------------------------------------------------------------------------- | ------------ |
| page       | Optional, integer >= 1, default: 1                                                 | Controller   |
| limit      | Optional, integer 1–50, default: 20, cap tại 50                                   | Controller   |
| search     | Optional, string, trim, max 100 ký tự                                             | Controller   |
| categoryId | Optional, valid ObjectId                                                           | Controller   |
| tagId      | Optional, valid ObjectId                                                           | Controller   |
| authorId   | Optional, valid ObjectId                                                           | Controller   |
| sortBy     | Optional, enum: `createdAt` \| `title`, default: `createdAt`                      | Controller   |
| sortOrder  | Optional, enum: `asc` \| `desc`, default: `desc`                                  | Controller   |

**Tag / Category (POST):**

| Field | Rule                                          | Validate tại |
| ----- | --------------------------------------------- | ------------ |
| name  | Required, string, min 1, max 50 ký tự, trim  | Controller   |

---

## 2.4. Visibility & Authorization Matrix

| Action              | Guest | User (own) | User (other) | Admin |
| ------------------- | ----- | ---------- | ------------ | ----- |
| List public blogs   | ✅    | ✅         | ✅           | ✅    |
| List private blogs  | ❌    | ✅ (own)   | ❌           | ✅    |
| Detail public blog  | ✅    | ✅         | ✅           | ✅    |
| Detail private blog | ❌    | ✅ (own)   | ❌ (→ 404)  | ✅    |
| Create blog         | ❌    | ✅         | —            | ✅    |
| Update blog         | ❌    | ✅ (own)   | ❌ (→ 403)  | ❌ (→ 403) |
| Soft delete blog    | ❌    | ✅ (own)   | ❌ (→ 403)  | ❌    |
| Hard delete blog    | ❌    | ❌         | ❌           | ✅    |

---

## 2.5. Concurrent & Race Conditions

| Tình huống                                     | Rủi ro                          | Hành vi mong đợi                                   |
| ---------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| 2 user tạo blog cùng lúc với title giống nhau  | Slug bị trùng                   | Unique index trên slug → retry với suffix khác    |
| User delete blog trong khi đang update         | Update một blog đã xóa         | Update kiểm tra `deletedAt` trước, trả 404        |
| 2 user tạo cùng 1 tag tên giống nhau đồng thời | Duplicate tag                   | Unique index trên tag name → một bên nhận 409     |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí                                                                              |
| ----- | ----------- | ------------------------------------------------------------------------------------- |
| NF-01 | Performance | GET list response < 500ms với 100k blogs (full text index cho search)                |
| NF-02 | Security    | Private blog không bị expose qua list API, detail trả 404 thay vì 403 để không leak |
| NF-03 | Security    | Update/Delete: verify authorId === req.user.userId trước khi thực hiện              |
| NF-04 | SEO         | Slug unique, không thay đổi sau khi update title (stable URL)                       |
| NF-05 | Scalability | Module trong `modules/apps/blog/` — tách biệt khỏi core modules, dễ extract sau     |
| NF-06 | Data        | Tags/categories: unique index trên `name` (lowercase) để tránh duplicate            |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Authorization matrix đúng với tất cả role/action combinations
- [ ] Private blog không xuất hiện trong public list và trả 404 khi truy cập detail
- [ ] Soft delete ẩn blog khỏi tất cả public queries
- [ ] Slug unique và stable sau update title
- [ ] Unit test coverage >= 80%
- [ ] Swagger/OpenAPI documentation cho tất cả endpoints
- [ ] Không có bug severity Critical hoặc High còn open
