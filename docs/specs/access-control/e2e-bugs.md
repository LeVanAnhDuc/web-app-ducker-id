# E2E bugs — access-control

Append-only. Một mục cho mỗi vòng gate fail.

## Round 1 — 05.10.2026

- **Gate fail:** A (`e2e/admin-entitlements/matrix.e2e.ts`)
- **Scenario:** #11 Mutation / state — "a double-clicked Save sends one request" ([ST] invalid transition).
- **Triệu chứng:** double-click Save gửi **2** `PATCH /admin/entitlements` (kỳ vọng 1). Kết quả cuối vẫn đúng
  vì server idempotent, nhưng có request thừa và toast success hai lần.
- **Root cause:** nút Save chỉ bị `disabled={isSaving}` sau khi React re-render với `isPending = true`.
  Cả hai click của một double-click được xử lý trước lần render đó, nên `form.handleSubmit(handleSave)`
  chạy hai lần và gọi `mutate` hai lần.
- **Fix đã làm:** `client/src/views/AdminEntitlements/mains/AdminEntitlementsMatrix/index.tsx` — thêm
  `isSubmittingRef` chặn đồng bộ trong `handleSave`, set `true` trước `mutate`, trả về `false` ở `onSettled`.
- **Kết quả re-verify:** `admin-entitlements/` 38 passed, 2 skipped (`fixme` có chủ đích).

### Ghi chú môi trường (không phải bug của feature)

Lần chạy đầu `admin.setup.ts` nhận `429` ở `POST /auth/login`: rate limit đăng nhập (30 / 15 phút)
đếm theo IP trên Redis cloud **dùng chung** giữa mọi worktree và session; mọi Playwright chạy qua
`localhost` đều là IP `::1` nên tiêu chung một bucket. Worktree này chạy client với
`API_SERVER_URL=http://127.0.0.1:5400` và `E2E_BASE_URL=http://127.0.0.1:3400` để có bucket
`::ffff:127.0.0.1` riêng.
