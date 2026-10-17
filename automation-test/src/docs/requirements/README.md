# docs/requirements/

**Điều phải chứng minh.** Một file mỗi module: `<module>.md` (vd `auth.md`).

```md
# AUTH — Đăng nhập, đăng ký, khoá tài khoản, phiên

- **REQ-AUTH-01** Màn đăng nhập hỏi email trước; địa chỉ đã đăng ký chuyển sang bước mật khẩu.
- **REQ-AUTH-02** …
```

- Tiêu đề `# <MODULE> — <tên>`; `<MODULE>` = tên thư mục module viết HOA bỏ gạch.
- Mỗi requirement một dòng `- **REQ-<MODULE>-NN** <điều phải đúng>`. Mã **cố định**, không đánh số lại, không dùng lại.
  Requirement bị bỏ: gạch `- ~~**REQ-…**~~ …` kèm `Bỏ (YYYY-MM-DD)`, không xoá.
- Viết điều **nên** đúng (theo `README.md` `## Features` của repo và quyết định), không phải điều app **đang** làm.
  Tính năng đã lên kế hoạch nhưng chưa build → `decisions/<module>.md` mục "Ngoài phạm vi".
- Feature mới thêm requirement ở đây **cùng branch** với code, trước test case phủ nó.
- Mỗi REQ phải có ít nhất một TC (`pnpm coverage:check` kiểm).
