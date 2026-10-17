# Lượt regression — YYYY-MM-DD

| Mục            | Giá trị                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| Commit         | `<git rev-parse --short HEAD>` trên `<branch>`                             |
| Đích           | `E2E_BASE_URL` (client) · `E2E_API_URL` (API) · Mongo `DB_NAME` · Redis    |
| Lệnh           | `pnpm test`                                                                |
| Thời gian chạy |                                                                            |
| Truy vết       | `pnpm coverage:check` → N/N requirement, N test case, N case `@smoke` (P0) |

## Kết quả

| Project   | Pass | Fail | Fail dự kiến (bug đã biết) | Skip |
| --------- | ---- | ---- | -------------------------- | ---- |
| session   |      |      |                            |      |
| app — e2e |      |      |                            |      |
| app — api |      |      |                            |      |
| teardown  |      |      |                            |      |
| **Tổng**  |      |      |                            |      |

## Lỗi

| Test (TC) | Nguyên nhân: test / app / môi trường | Xử lý |
| --------- | ------------------------------------ | ----- |

## Bug còn mở

Mã `BUG-<MODULE>-NN` trong `src/defects/<module>.md` mà lượt này gặp dưới dạng fail dự kiến (`test.fail()`).

## Ghi chú
