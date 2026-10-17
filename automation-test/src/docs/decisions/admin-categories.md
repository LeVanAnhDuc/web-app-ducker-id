# ADMINCATEGORIES — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- Client: `client/src/views/AdminCategories/**`, `client/src/views/AdminApps/components/CategoryMultiSelect`,
  `CategoryChips`; copy trong `client/src/locales/{en,vi}/adminCategories.json`.
- Server: `server/src/modules/category/**`, rule trong `server/src/validators/schemas/category.ts`.

Chuyển đổi từ E2E Scenario Matrix và các bổ sung của completeness-critic trong
`docs/specs/category-management/design.md` §6 (feature này không viết `e2e.md` riêng). "[row N]" trong tiêu đề spec và
"dòng N" trong test case là dòng của ma trận đó.

Đọc thêm ngày 2026-10-14 (lượt chuẩn hóa `/write-tests`, không chạy app):

- `README.md` `## Features` (mục "Admin — categories"), `docs/specs/category-management/design.md` §3.4 (bảng endpoint,
  mã lỗi) và DR-21 (rate limit).
- Server: `server/src/modules/category/category.routes.ts`, `services/*.ts`, `dtos/*.ts`,
  `server/src/middlewares/common/rate-limiter.middleware.ts`, `server/src/constants/redis/rate-limit/index.ts`,
  `server/src/i18n/locales/{en,vi}/category.json`.
- Client: `client/src/views/AdminCategories/**` (toast trong `hooks/`, announce trong `mains/`),
  `client/src/hooks/useCreateCategory.ts`, `client/src/locales/{en,vi}/adminCategories.json`, `admin.json`.

## Quyết định chốt

- **Q1** File test case này phủ `REQ-ADMINCATEGORIES-01` … `REQ-ADMINCATEGORIES-04`, cộng thêm các case app ↔ category của
  `REQ-ADMINAPPS-02` (1–5 category có thứ tự) — các spec category sở hữu những case đó.
- **Q2** Dòng 2 (AuthN) / dòng 3 (AuthZ) của ma trận không có case riêng ở đây: chúng là TC-AUTHZ-004 … -006.
- **Q3** Dòng 10 "SSR fallback of the public categories" thuộc module APPS.
- **Q4** TC-ADMINCATEGORIES-043: ma trận thiết kế (dòng 7) yêu cầu empty state khi lọc theo category đã xoá; hành vi
  đã ship là bỏ bộ lọc cũ và hiện danh sách không lọc — test ghi nhận hành vi quan sát được.
- Q5 (tự quyết 2026-10-14, cần user duyệt): rate limit mutation 120 / 60 s theo IP + admin (design DR-21, code
  `categoryMutationByIpAndUser`) có phải requirement không? → Có: thêm REQ-ADMINCATEGORIES-05, kiểm ở tầng API bằng một
  admin throwaway (không làm nghẽn `admin@test.com`) → REQ-ADMINCATEGORIES-05 (TC-ADMINCATEGORIES-077).
- Q6 (tự quyết 2026-10-14, cần user duyệt): toast "Category created / saved / deleted" và câu announce cho screen
  reader (tạo, lưu, xoá, "moved to position N") chỉ thấy trong code, docs không nói — hành vi mong muốn hay thừa? → Coi
  là mong muốn (không mâu thuẫn docs; cùng hướng a11y với dòng 12 của ma trận) → REQ-ADMINCATEGORIES-02/03/04
  (TC-ADMINCATEGORIES-071, -072).
- Q7 (tự quyết 2026-10-14, cần user duyệt): design §3.4 ghi `appId` trùng trong `reassignments` → 400
  `CATEGORY_REASSIGN_INVALID`; code từ chối ở Joi (`unique("appId")`) với `VALIDATION_ERROR`. Theo docs hay theo code?
  → Theo docs (status 400 giống nhau, chỉ khác mã); test đánh dấu BUG-ADMINCATEGORIES-02 (đã sửa 2026-10-15, fix/open-bugs) → REQ-ADMINCATEGORIES-04
  (TC-ADMINCATEGORIES-078).
- Q8 (tự quyết 2026-10-14, cần user duyệt): Q4 ghi nhận hành vi đã ship khác ma trận thiết kế; lượt này có lật lại
  thành bug không? → Không: Q4 là quyết định đã chốt trước đó và kỳ vọng test cũ được giữ nguyên → REQ-ADMINCATEGORIES-04
  (TC-ADMINCATEGORIES-043).
- Q9 (tự quyết 2026-10-14, cần user duyệt): danh sách công khai `GET /apps/categories` (shape, cache 60 s, rate limit
  theo IP) đã được module APPS phủ (TC-APPS-038 … -040, -065, -066); quyền của `/admin/categories*` thuộc
  TC-AUTHZ-004 … -006. Có thêm case ở đây không? → Không thêm; giữ TC-ADMINCATEGORIES-048 có sẵn (không xoá test cũ)
  → REQ-ADMINCATEGORIES-01.

## Tài khoản test

- Mọi case chạy bằng admin seed (`admin@test.com`), riêng TC-ADMINCATEGORIES-048 gọi danh sách công khai (không Bearer).
- **Seed nền:** Content (1 app: Blog), Internal Tools (2), Identity (1: IDMS Portal), Productivity (2: Team Calendar —
  inactive — và Notes), theo đúng thứ tự đó.
- Spec mượn app seed (snapshot → đổi `categoryIds` → khôi phục), chỉ tạo category tên `E2E …` và xoá chúng sau khi chạy
  (`utils/categories.ts`, phiên admin mở trong `beforeAll` bằng `adminContext()`).
- TC-ADMINCATEGORIES-077 (rate limit) dùng một tài khoản throwaway được nâng lên admin (`createAccount` +
  `promoteToAdmin`), mọi request nhắm một id không tồn tại nên không đổi dữ liệu nào.

## Ngoài phạm vi

- Dòng 6 "more than 6 orphans (scroll)" vẫn hoãn: seed có 6 app và mượn hết sẽ làm hỏng các spec khác.
- Nút Back khi dialog đang mở và session hết hạn giữa lúc sửa là N/A (design §6).

## Tech debt liên quan

- BUG-ADMINCATEGORIES-01 (`../../defects/admin-categories.md`): đóng sheet bằng Escape từng để focus ở `<body>`
  (TC-ADMINCATEGORIES-068) (đã sửa 2026-10-15, fix/open-bugs).
- BUG-ADMINCATEGORIES-02 (`../../defects/admin-categories.md`): `appId` trùng từng trả `VALIDATION_ERROR` thay vì
  `CATEGORY_REASSIGN_INVALID` (TC-ADMINCATEGORIES-078) (đã sửa 2026-10-15, fix/open-bugs).
