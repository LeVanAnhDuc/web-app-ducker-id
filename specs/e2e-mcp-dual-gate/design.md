# Design — Dual-gate E2E verification (yarn e2e + Playwright MCP)

> Ngày: 2026-06-14
> Loại: thay đổi flow/convention (§4.3 + skill `e2e-scenario-coverage`)
> Trạng thái: design đã duyệt, chờ writing-plans

## 1. Mục tiêu

Nâng bước verification E2E (§4.3) từ **1 gate** (`yarn e2e`) lên **2 gate chạy song song**, cả hai cùng cover toàn bộ Scenario Matrix của feature. **Pass cả 2 mới tính §4.3 PASS.** Mục đích: tăng độ chính xác — gate thứ 2 (agent lái browser thật) bắt được lỗi visual/UX/console/network mà assertion của test file không cover.

## 2. Hai gate

| Gate             | Cơ chế                                                                                                                     | Bản chất                               | Coverage                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **A — yarn e2e** | Chạy `client/e2e/<feature>/*.e2e.ts` bằng Playwright test runner (`cd client && yarn e2e`)                                 | Deterministic, reproducible, committed | Toàn bộ matrix                                  |
| **B — MCP walk** | Subagent (general-purpose + Playwright MCP tools) lái browser thật, walk từng scenario trong `docs/specs/<feature>/e2e.md` | Interactive, "đôi mắt" độc lập         | Toàn bộ matrix, **trừ** mutation-heavy (xem §5) |

Giá trị gate B: test file chỉ assert đúng cái nó được code để assert. Agent lái browser thật quan sát được render thực tế, console error, network fail, lệch UX — những thứ assertion gate A có thể sót.

## 3. Dispatch song song

Sau khi viết xong test file (bước E2E §4.3), main loop:

1. **Tiền đề app-running** — chạy nguyên self-check §4.3 **một lần** trước khi dispatch: BE :5000, FE :3000, Mongo, Redis đang chạy, DB đã seed. Chưa chạy → hỏi user (a) tự run / (b) agent run (theo §4.3). Cả 2 gate cùng cần app này.
2. **Dispatch 2 subagent cùng lúc** (1 message, 2 Agent call):
   - **Agent A**: `cd client && yarn e2e` (scope feature) → trả PASS/FAIL + output.
   - **Agent B**: nhận Scenario Matrix từ `e2e.md`, lái browser qua Playwright MCP tools walk từng case → trả PASS/FAIL per-scenario + bằng chứng (`browser_snapshot` / `browser_console_messages` / `browser_network_requests`).

## 4. Vòng lặp khi fail (max 3 vòng)

```
Chạy 2 gate song song
        │
   ┌────┴─── cả 2 PASS ──► §4.3 PASS ──► sang superpowers:requesting-code-review
   │
  ≥1 FAIL
   │
   ▼
superpowers:systematic-debugging   ← chẩn đoán ROOT CAUSE trước (bắt buộc)
   │
   ▼
Ghi đầy đủ vào docs/specs/<feature>/e2e-bugs.md
   │
   ▼
Quay về implement (superpowers:subagent-driven-development / TDD) để fix
   │
   ▼
Chạy lại CẢ 2 gate  ──►  (lặp, đếm vòng)
   │
  vòng > 3 ──► DỪNG, trình e2e-bugs.md + trạng thái cho user quyết định
```

Thứ tự bắt buộc khi fail: **systematic-debugging → ghi bug log đầy đủ → fix → re-verify**. Không fix vội trước khi chẩn đoán root cause.

## 5. Contamination (chạy song song trên cùng 1 DB/app)

Quyết định: **tách auth context + gate B skip mutation-heavy**.

- Gate B login bằng **context/auth riêng**, KHÔNG share storageState với gate A — tránh việc test này revoke token phá session test kia (xem [[reference_e2e_suite_session_contamination]]).
- Scenario **mutation-heavy** (vd change-password revoke refresh token, đổi state global) được đánh dấu trong matrix `e2e.md` là **"gate A only"** — gate B chỉ verify read/render của scenario đó, KHÔNG thực hiện mutation song song.
- Đánh dấu này là một cột/ghi chú trong Scenario Matrix; skill `e2e-scenario-coverage` sẽ hướng dẫn cách tag.

## 6. Format `docs/specs/<feature>/e2e-bugs.md`

Append-only, mỗi vòng fail 1 entry:

```markdown
## Round <n> — <YYYY-MM-DD>

- **Gate fail**: A (yarn e2e) | B (MCP) | cả hai
- **Scenario**: <tên case trong matrix>
- **Triệu chứng**: <observed vs expected>
- **Root cause** (từ systematic-debugging): <...>
- **Fix đã làm**: <file + tóm tắt>
- **Kết quả re-verify**: PASS / vẫn FAIL → round kế
```

## 7. Nơi thay đổi đáp xuống

- **`.claude/CLAUDE.md` §4.3** — viết lại bước E2E thành dual-gate + vòng lặp fail. (Root config, không thuộc repo nào.)
- **`.claude/skills/e2e-scenario-coverage/SKILL.md`** — bổ sung: (1) cách gate B walk matrix qua MCP, (2) tag mutation-heavy "gate A only", (3) ghi `e2e-bugs.md`. (Root config.)
- **`docs/specs/<feature>/e2e-bugs.md`** — artifact mới per-feature (repo `docs/`), bổ sung vào §6.2.

## 8. Phạm vi & non-goals

- KHÔNG đổi trigger §4.3: vẫn gate theo hành vi user quan sát được (skip cosmetic/refactor/BE-only/docs).
- KHÔNG thay `requesting-code-review` — dual-gate vẫn đứng trước code review như cũ.
- KHÔNG tạo suite test mới — gate B dùng lại chính Scenario Matrix đã có.

```

```
