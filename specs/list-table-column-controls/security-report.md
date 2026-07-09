# Security Report — List Table Column Controls

**Verdict: ✅ PASS (skip deep review — no attack surface)**

## Scope

Feature thuần FE: thêm `sortable`/`width`/`hideBelow` cho `ListColumn`, controlled-sort cho `ListTable`, hook `useClientSortedRows`, wire client-side sort vào AdminApps. KHÔNG đụng `server/src/**`.

## Đánh giá bề mặt tấn công (theo §4.5)

| Trục                | Đánh giá                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AuthN / AuthZ       | Không đổi. Admin route guard + BE 403 cho non-admin giữ nguyên (verify ở E2E #2/#3, không regress).                                                             |
| Input validation    | `sortBy`/`sortOrder` đọc từ URL query. `sortOrder` đã validate ở `useListQuery` (chỉ nhận `asc`/`desc`, else `undefined`). `sortBy` chỉ dùng làm **key tra `accessors[sortBy]`** (object property lookup) → key lạ → `undefined` → không sort. KHÔNG có injection sink, KHÔNG `eval`, KHÔNG dùng để build query/DOM/HTML. |
| Data exposure       | Không. Sort client-side reorder mảng đã fetch; không request thêm, không lộ field mới.                                                                          |
| Injection           | N/A — không có SQL/NoSQL/command/HTML sink. `width` inline style là chuỗi CSS tĩnh do dev khai báo (không phải user input).                                     |
| XSS                 | N/A — `cell`/`header` render qua React (auto-escape); không `dangerouslySetInnerHTML`.                                                                          |

## Kết luận

Không có finding. Không cần dispatch security-audit sâu (đúng tiêu chí skip §4.5: không chạm auth/input-nhạy-cảm/data). E2E dual-gate đã xác nhận không console error / không failed request. **PASS** → được sang bước tạo PR.
