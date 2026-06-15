# Security Report — unified-list-experience

> §4.5 review. Feature is FE-only nhưng tiêu thụ **input user qua URL query params** (search/filter/page/sort) → review bắt buộc (không skip). Date: 2026-06-15.

## Verdict: ✅ PASS

Không có finding Critical/High/Med. Không chặn step 5 (PR).

## Scope reviewed
Toàn bộ diff feature vs `origin/main` (client): `useListQuery` hook, `src/components/list/*` shell, 8 trang list/table migrate, declarative `ListFilterDef` config, i18n `list` namespace. Trục: input validation / injection / XSS / unsafe redirect / data exposure.

## Findings

| # | Severity | Area | Kết luận |
| --- | --- | --- | --- |
| 1 | — | XSS sink | KHÔNG có URL-param value nào tới `dangerouslySetInnerHTML`, raw DOM, hay unsafe redirect. Mọi giá trị param chảy vào (a) controlled input React-escaped, (b) text render escaped, hoặc (c) API query params. |
| 2 | — | Tampered params | `select`-type filter được **allow-list validate** trong `useListQuery` (`filters` memo: value không thuộc `def.options` bị drop) TRƯỚC khi vào API params; consumer còn guard thêm bằng type-predicate (`isAppStatus`/`isContactStatus`/`isContactCategory`/`isLoginHistoryStatus`/`Method`). `page` validate integer (`parsePage`), `sortOrder` allow-list `asc|desc`. Param lạ → fallback default, không crash. |
| 3 | — | Free-text search | Search là free-text (không allow-list được) → đẩy thẳng API query param; **BE là validation authority** cho free-text. FE render qua React escaping. Không injection sink phía FE. |
| 4 | — | Data exposure | Không log/expose dữ liệu nhạy cảm; không thêm endpoint/mutation mới (read-heavy). Không env/secret mới. |

## Notes
- Không đổi auth/authz (AuthGuard không bị feature đụng).
- Verdict nguồn: code review §4 (general-purpose reviewer) bao trục security; xác minh bằng đọc code thực tế (không suy đoán).
