# Security report — access-control

> 05.10.2026 · Phạm vi: `git diff origin/main...feat/access-control` — `GET`/`PATCH /admin/entitlements`,
> `AccessPolicy` áp ở `/apps`, favorite, recent, home stats, `/oauth/authorize`; client ma trận.
> Checklist: `.claude/skills/standard-security` §1–§3 (OWASP Top 10 A01/A03/A04/A05, ASVS V4 Access Control, V5 Validation).

## Kết luận

Không có lỗ hổng chặn merge. Hai rủi ro được chấp nhận có ghi lý do (R-1, R-2).

## Kiểm tra

| # | Hạng mục | Kết quả |
| - | --- | --- |
| 1 | **AuthZ ở server (A01, ASVS V4.1)** | ✅ Router `/admin/entitlements` gắn `authGuard, adminGuard` ở mức router — không route nào lọt. Mọi quyết định "user có vào app không" chạy ở server qua `canAccessApp` / `buildAccessFilter`; client chỉ hiển thị. |
| 2 | **Một quy tắc, không lệch giữa các điểm áp** | ✅ Launcher list, favorite add/list, recent list/stats/record, `/oauth/authorize` cùng dùng `AccessPolicy.resolveScope` + helper thuần; helper có bảng quyết định role × override trong unit test. Trước feature, launcher và authorize dùng hai quy tắc khác nhau. |
| 3 | **Fail-closed** | ✅ `resolveScope` lỗi DB → exception → request thất bại (500 / authorize không cấp code). Không có nhánh "lỗi thì cho qua". |
| 4 | **Validation (A03, ASVS V5)** | ✅ Joi: `userIds` 1–50 ObjectId (regex) không trùng; `changes` 1–200, `granted` `boolean().strict()`, không trùng cặp. `stripUnknown` bỏ field lạ. |
| 5 | **NoSQL/operator injection** | ✅ `?userIds[$ne]=x` được qs parse thành object → Joi `array.base` → 400. Repository chỉ nhận chuỗi đã qua regex ObjectId và bọc `new Types.ObjectId(...)`; không có `$where` hay object do user dựng. |
| 6 | **Mass assignment** | ✅ `bulkWrite` chỉ `$set` `effect` (tính ở server) và `updatedBy` (lấy từ token, không từ body). |
| 7 | **Atomic batch** | ✅ Validate toàn bộ user/app trước khi ghi; một id lạ → 404, không ghi gì (unit test "404s on an unknown app in the last change and writes nothing"). |
| 8 | **Rate limiting** | ✅ `PATCH` có `entitlementMutationByIpAndUser` (60 / phút / IP+admin). `GET` không có — xem R-2. |
| 9 | **Idempotency** | ✅ `PATCH` idempotent theo thiết kế (upsert/xoá theo cặp unique). Client chặn double-submit đồng bộ (`e2e-bugs.md` Round 1). |
| 10 | **Không lộ sự tồn tại** | ✅ Favorite/recent của app bị deny trả **404** như app không tồn tại, không phải 403. |
| 11 | **Leo thang đặc quyền** | ✅ Override `allow` chỉ cho vào app; claim `roles` trong token không đổi. Quyền chi tiết trong app vệ tinh là việc của app đó (Non-Goals). |
| 12 | **Logging (§1)** | ✅ Body PATCH chỉ có ObjectId + boolean; không log token/secret mới. |
| 13 | **Client (§3)** | ✅ Không `dangerouslySetInnerHTML`; `userIds` đi qua axios `params` (được encode); không secret mới trong bundle; endpoint qua `CONSTANTS.END_POINTS`. |
| 14 | **Dependencies** | ✅ Không thêm dependency. |

## Rủi ro chấp nhận

- **R-1 — Revoke không thu hồi token đang sống.** User đang ở trong app vệ tinh lúc bị deny vẫn dùng
  access token tới khi hết hạn (TTL 15 phút, đúng ngưỡng §2). Lần SSO kế tiếp bị chặn. Đóng hẳn cần
  `/oauth/revoke` hoặc back-channel logout — đã ghi ở `unfinished-features.md` mục 1 và 7 (DR-8).
- **R-2 — `GET /admin/entitlements` không rate limit.** Chỉ admin gọi được, mỗi lần tối đa 50 user,
  hai query có index. Thêm limiter sẽ làm chậm thao tác chọn user của chính admin mà không giảm rủi ro thực.
