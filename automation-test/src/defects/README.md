# defects/

**App đang sai ở đâu.** Một file mỗi module: `<module>.md`.

```md
# AUTH — Bug log

## Đang mở

| Bug                         | Mức | TC          | Tóm tắt |
| --------------------------- | --- | ----------- | ------- |
| [BUG-AUTH-01](#bug-auth-01) | Cao | TC-AUTH-056 | …       |

### BUG-AUTH-01

- **TC:** TC-AUTH-056 · **Requirement:** REQ-AUTH-14
- **Mức:** Cao · **Phát hiện:** 2026-10-10
- **Bước tái hiện:** …
- **Mong đợi:** …
- **Thực tế:** …

## Đã sửa

_(chưa có)_
```

- Mức: **Cao** = chặn đăng nhập / rò dữ liệu, **Trung bình** = tính năng sai, **Thấp** = hiển thị / biên.
- Spec đánh dấu bằng comment `// BUG: defects/<module>.md#bug-<module>-nn` **ngay trên** `test.fail()`.
- App được sửa → test đỏ vì "pass ngoài dự kiến" → bỏ comment + `test.fail()`, chuyển mục `### BUG-…` xuống
  `## Đã sửa` kèm PR sửa.
- Mã bug cố định, không dùng lại. Bug trước 2026-10-13 có dòng `**Mã cũ:**` (BUG-NNN) — xem `docs/id-migration.md`.
- `pnpm coverage:check` kiểm hai chiều: comment trỏ bug có thật và đang mở; bug đang mở có spec đánh dấu.
