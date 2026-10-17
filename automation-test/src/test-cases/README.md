# test-cases/

**Kiểm thế nào.** Một file mỗi module: `<module>.md`. Bối cảnh của module (nguồn, dữ liệu test, dữ kiện server) nằm ở
`docs/decisions/<module>.md`, không lặp ở đây.

```md
### TC-AUTH-014 — Locked account shows how long it stays locked

- **Requirement:** REQ-AUTH-09
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (active → locked), giá trị biên (lần thử 9 / 10)
- **Tiền điều kiện:** một tài khoản throwaway
- **Bước:**
  1. Nhập sai mật khẩu 10 lần.
- **Mong đợi:** lần thứ 10 hiện thông báo khoá kèm thời gian còn lại; mật khẩu đúng bị từ chối tới khi hết khoá.
- **Kiểm chứng thêm:** response 429 `LOGIN_LOCKED`
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`
```

- Mã `TC-<MODULE>-NNN` cố định. Tiêu đề TC (tiếng Anh) = **tên test** trong spec.
- Nhãn `**Requirement:**`, `**Layer:**`, `**Priority:**`, `**Automated:**` giữ tiếng Anh — `coverage:check` đọc chúng.
- `Automated`: đường dẫn tính từ `src/`, hoặc `manual — <lý do>`. Spec đó phải có test gắn tag `@TC-<MODULE>-NNN`.
- **Priority:** P0 = hỏng là chặn người dùng hoặc rò dữ liệu (gắn `@smoke`), P1 = luồng phụ quan trọng, P2 = biên hiếm.
- **Layer:** `api` cho tổ hợp input / biên / bảo mật / rate limit / giao thức; `e2e` cho luồng người dùng thật. Không
  lặp tổ hợp đã phủ ở API.
