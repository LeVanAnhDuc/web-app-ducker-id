# tests/

**Trả lời câu hỏi:** kịch bản kiểm thử và kỳ vọng.

```
tests/
├── seed.spec.ts                 seed cho agent planner/generator (playwright-test MCP)
├── setup/                       user.setup.ts, admin.setup.ts (đăng nhập một lần → .auth/), cleanup.teardown.ts
├── e2e/<module>/<topic>.e2e.ts  qua trình duyệt: luồng người dùng, message, điều hướng, trạng thái nút
├── e2e/infra/                   smoke hạ tầng, không gắn test case
└── api/<module>/<topic>.api.ts  qua HTTP: tổ hợp input, biên, bảo mật, rate limit, giao thức
```

**Đặt tên:** `<module>` viết thường (`auth`, `admin-users`), `<topic>` là **chủ đề** (`lockout`, `rate-limit`),
không phải tên ticket hay branch.

## Quy tắc

- Import `test`, `expect` từ `@/fixtures`; type (`Page`…) từ `@playwright/test`.
- Khai phiên bằng `test.use({ role: "user" | "admin" | "guest" })` (mặc định `user`).
- Tên test = tiêu đề TC trong `test-cases/<module>.md`. Tag qua `{ tag: ["@TC-<MODULE>-NNN", …] }`, không viết trong tên.
  Case P0 gắn thêm `@smoke`.
- Không locator thô cho phần đã có page object/component; không `request` trần (dùng fixture `api` / `newApi`).
- Không `waitForTimeout`. Chờ bằng `expect(...).toBeVisible()`, `waitForURL`, `waitForResponse`, `page.clock`.
- Mỗi test độc lập: chạy riêng được bằng `pnpm test -g "@TC-<MODULE>-NNN"`.
- Tài khoản seed chỉ đọc; đổi trạng thái tài khoản → `createAccount()`; mã một lần → `plantCode()`.
- App sai so với requirement → `test.fail()` kèm comment `// BUG: defects/<module>.md#bug-<module>-nn` ngay trên.
  **Không sửa kỳ vọng cho khớp bug.**
- Fixture chỉ một file dùng → `test.extend` cục bộ đầu file đó.
- Chờ lâu (rate limit, lockout) → `test.describe.configure({ timeout: … })` đầu file, ghi lý do.
