# Dual-gate E2E verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng bước verification E2E (§4.3) thành dual-gate — `yarn e2e` (gate A) + subagent lái browser qua Playwright MCP (gate B) chạy song song, pass cả hai mới qua §4.3; fail → systematic-debugging → ghi `e2e-bugs.md` → fix → re-verify (max 3 vòng).

**Architecture:** Thay đổi thuần **prose/convention** trên 3 file: `.claude/CLAUDE.md` (§4.3 viết lại + §6.2 thêm artifact), `.claude/skills/e2e-scenario-coverage/SKILL.md` (hướng dẫn gate B + tag mutation-heavy + output `e2e-bugs.md`). Không có code/test runtime; "verify" mỗi task = đọc lại + grep kiểm anchor & tính nhất quán.

**Tech Stack:** Markdown (CLAUDE.md, SKILL.md). Không đụng `server/`, `client/src/`.

**Nguồn:** `docs/specs/e2e-mcp-dual-gate/design.md` (đã duyệt).

---

## File Structure

| File | Trách nhiệm | Hành động |
| ---- | ----------- | --------- |
| `.claude/CLAUDE.md` §4.3 | Định nghĩa dual-gate + vòng lặp fail | Modify (viết lại bullet "Vị trí" + thêm bullet gate B/loop) |
| `.claude/CLAUDE.md` §6.2 | Liệt kê artifact per-feature | Modify (thêm `e2e-bugs.md`) |
| `.claude/skills/e2e-scenario-coverage/SKILL.md` | Rubric + outputs E2E | Modify (thêm cột mutation-heavy + mục gate B + output `e2e-bugs.md`) |

> ⚠️ Isolation (§6.1): root `.claude/` KHÔNG phải git repo → không tạo worktree cho phần này. Chỉ `docs/` (chứa design.md/plan.md) là repo. Commit theo §7 (chờ user duyệt). Hỏi user về worktree cho `docs/` ở bước commit nếu cần.

---

## Task 1: Viết lại §4.3 — bullet "Vị trí" thành dual-gate

**Files:**
- Modify: `.claude/CLAUDE.md` (§4.3, bullet bắt đầu bằng `- **Vị trí**:`)

- [ ] **Step 1: Đọc lại §4.3 hiện tại để xác nhận anchor**

Run (Grep): pattern `- \*\*Vị trí\*\*:` trong `.claude/CLAUDE.md`
Expected: tìm thấy đúng 1 dòng bullet "Vị trí" trong §4.3.

- [ ] **Step 2: Thay bullet "Vị trí" bằng khối dual-gate**

Edit — old_string (nguyên bullet hiện tại):
```
- **Vị trí**: sau `superpowers:subagent-driven-development` + TDD, **trước** `superpowers:requesting-code-review`. Chạy `cd client && yarn e2e` trên app thật (BE :5000 + FE :3000 + Mongo/Redis đã chạy, DB đã seed) → phải xanh trước khi sang code-review.
```
new_string:
```
- **Vị trí**: sau `superpowers:subagent-driven-development` + TDD, **trước** `superpowers:requesting-code-review`.
- **Dual-gate (BẮT BUỘC) — pass CẢ 2 mới qua §4.3**: dispatch song song 2 subagent (1 message, 2 Agent call), cả hai cùng cover toàn bộ Scenario Matrix:
  - **Gate A — `yarn e2e`**: subagent chạy `cd client && yarn e2e` (scope feature) trên app thật → PASS/FAIL + output. Deterministic, là suite committed.
  - **Gate B — MCP walk**: subagent (general-purpose + Playwright MCP tools `browser_*`) nhận Scenario Matrix từ `docs/specs/<feature>/e2e.md`, lái browser thật walk từng case → PASS/FAIL per-scenario + bằng chứng (`browser_snapshot` / `browser_console_messages` / `browser_network_requests`). Bắt lỗi visual/UX/console/network mà assertion gate A sót.
  - **Contamination**: gate B login bằng **auth context riêng** (KHÔNG share storageState với A). Scenario **mutation-heavy** (cột `Gate` = `A only` trong matrix) → gate B chỉ verify read/render, KHÔNG mutate song song. Xem [[reference_e2e_suite_session_contamination]].
- **Khi fail (≥1 gate) — vòng lặp max 3**: `superpowers:systematic-debugging` chẩn đoán root cause TRƯỚC → ghi đầy đủ vào `docs/specs/<feature>/e2e-bugs.md` → quay về implement (`superpowers:subagent-driven-development`/TDD) fix → chạy lại CẢ 2 gate. Quá 3 vòng vẫn fail → DỪNG, trình `e2e-bugs.md` + trạng thái cho user. Cả 2 PASS → sang `requesting-code-review`.
```

- [ ] **Step 3: Verify anchor & nội dung**

Run (Grep): pattern `Dual-gate \(BẮT BUỘC\)` và `Gate B — MCP walk` trong `.claude/CLAUDE.md`
Expected: mỗi pattern khớp đúng 1 lần; bullet "Vị trí" cũ (có `Chạy .cd client && yarn e2e. trên app thật`) không còn.

---

## Task 2: Cập nhật "Tiền đề app-running" §4.3 cho 2 gate

**Files:**
- Modify: `.claude/CLAUDE.md` (§4.3, bullet `- **Tiền đề app-running ...`)

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `Tiền đề app-running` trong `.claude/CLAUDE.md`
Expected: tìm thấy 1 bullet (dòng `1. Agent kiểm tra ...` ngay dưới).

- [ ] **Step 2: Thêm câu mở đầu xác nhận check 1 lần cho cả 2 gate**

Edit — old_string:
```
- **Tiền đề app-running — agent TỰ CHECK trước khi chạy e2e**:
```
new_string:
```
- **Tiền đề app-running — agent TỰ CHECK MỘT LẦN trước khi dispatch 2 gate** (cả gate A lẫn gate B cùng cần app này):
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `TỰ CHECK MỘT LẦN trước khi dispatch 2 gate` trong `.claude/CLAUDE.md`
Expected: khớp 1 lần.

---

## Task 3: Thêm `e2e-bugs.md` vào artifact list §6.2

**Files:**
- Modify: `.claude/CLAUDE.md` (§6.2, dòng `- **`docs/specs/<feature>/`** chứa toàn bộ tài liệu feature: ...`)

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `chứa toàn bộ tài liệu feature` trong `.claude/CLAUDE.md`
Expected: tìm thấy 1 dòng liệt kê `design.md` + `plan.md` + `security-report.md` + `e2e.md`.

- [ ] **Step 2: Thêm `e2e-bugs.md` vào danh sách**

Edit — old_string:
```
- **`docs/specs/<feature>/`** chứa toàn bộ tài liệu feature: `design.md` (brainstorm) + `plan.md` + `security-report.md` (khi cần) + `e2e.md` (khi có E2E). KHÔNG còn full pipeline artifacts.
```
new_string:
```
- **`docs/specs/<feature>/`** chứa toàn bộ tài liệu feature: `design.md` (brainstorm) + `plan.md` + `security-report.md` (khi cần) + `e2e.md` (khi có E2E) + `e2e-bugs.md` (khi dual-gate §4.3 fail — append-only bug log mỗi vòng). KHÔNG còn full pipeline artifacts.
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `e2e-bugs\.md.*append-only` trong `.claude/CLAUDE.md`
Expected: khớp 1 lần.

---

## Task 4: SKILL.md — thêm cột `Gate` (tag mutation-heavy) vào rubric outputs

**Files:**
- Modify: `.claude/skills/e2e-scenario-coverage/SKILL.md` (mục "Outputs by flow step", dòng `design.md`)

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `## Outputs by flow step` trong `SKILL.md`
Expected: tìm thấy mục với 3 bullet (design.md / plan.md / e2e.md).

- [ ] **Step 2: Thêm hướng dẫn tag gate vào bullet design.md**

Edit — old_string:
```
- **design.md** (brainstorming): a `## E2E Scenario Matrix` section — the rubric table filled in (✅ scenarios / N/A reasons).
```
new_string:
```
- **design.md** (brainstorming): a `## E2E Scenario Matrix` section — the rubric table filled in (✅ scenarios / N/A reasons). Add a **`Gate`** column: default `A+B` (both gates run it); mark **`A only`** for mutation-heavy scenarios (revoke token, global state change) so gate B skips the mutation and only verifies read/render — avoids parallel session contamination (see CLAUDE.md §4.3 + [[reference_e2e_suite_session_contamination]]).
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `Add a \*\*.Gate.. column` trong `SKILL.md`
Expected: khớp 1 lần.

---

## Task 5: SKILL.md — thêm output `e2e-bugs.md` cho gate B fail

**Files:**
- Modify: `.claude/skills/e2e-scenario-coverage/SKILL.md` (mục "Outputs by flow step", thêm bullet thứ 4)

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `- \*\*e2e.md\*\* \(execution\)` trong `SKILL.md`
Expected: tìm thấy bullet e2e.md cuối mục Outputs.

- [ ] **Step 2: Thêm bullet e2e-bugs.md sau bullet e2e.md**

Edit — old_string:
```
- **e2e.md** (execution): final scenarios + any flagged follow-up gaps (e.g. "pager click-through needs >20 seeded users").
```
new_string:
```
- **e2e.md** (execution): final scenarios + any flagged follow-up gaps (e.g. "pager click-through needs >20 seeded users").
- **e2e-bugs.md** (dual-gate §4.3 fail): append-only log, 1 entry per fail round — `Round <n> — <date>`, `Gate fail` (A | B | cả hai), `Scenario`, `Triệu chứng` (observed vs expected), `Root cause` (từ systematic-debugging), `Fix đã làm` (file + tóm tắt), `Kết quả re-verify`. Written only when a gate fails; loop max 3 rounds then stop + report user.
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `e2e-bugs\.md.*dual-gate` trong `SKILL.md`
Expected: khớp 1 lần.

---

## Task 6: SKILL.md — mục mới "Gate B — driving the browser via Playwright MCP"

**Files:**
- Modify: `.claude/skills/e2e-scenario-coverage/SKILL.md` (thêm mục mới ngay trước "## Common mistakes")

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `## Common mistakes` trong `SKILL.md`
Expected: tìm thấy heading "## Common mistakes".

- [ ] **Step 2: Chèn mục mới trước "## Common mistakes"**

Edit — old_string:
```
## Common mistakes
```
new_string:
```
## Gate B — driving the browser via Playwright MCP

Gate B is the **second** §4.3 gate (runs in parallel with gate A `yarn e2e`; both must pass). A subagent drives a real browser via Playwright MCP tools to walk the SAME matrix, catching what test-file assertions miss (visual/UX/console/network).

- **Input**: the Scenario Matrix in `e2e.md`. Walk every `A+B` scenario; SKIP the mutation of `A only` rows (verify read/render only — gate A owns the mutation).
- **Auth**: log in with gate B's OWN context (`browser_navigate` to login + `browser_fill_form`), do NOT reuse gate A's storageState — prevents one gate's token revoke from killing the other's session.
- **Per scenario**: navigate → act (`browser_click`/`browser_type`/`browser_fill_form`) → assert via `browser_snapshot` (accessibility tree), and check `browser_console_messages` (no unexpected errors) + `browser_network_requests` (no failed calls). Verify i18n rows in BOTH locales (en + vi).
- **Output**: PASS/FAIL per scenario + evidence. On any FAIL, the flow runs systematic-debugging then writes `e2e-bugs.md` (see Outputs).
- **Do NOT** modify app code from gate B; flag a11y/DOM issues as follow-up (same rule as gate A).

## Common mistakes
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `## Gate B — driving the browser via Playwright MCP` trong `SKILL.md`
Expected: khớp 1 lần; nằm ngay trên "## Common mistakes".

---

## Task 7: SKILL.md — thêm red flag cho dual-gate

**Files:**
- Modify: `.claude/skills/e2e-scenario-coverage/SKILL.md` (mục "## Red flags — STOP", thêm bullet)

- [ ] **Step 1: Đọc anchor**

Run (Grep): pattern `## Red flags — STOP` trong `SKILL.md`
Expected: tìm thấy heading + danh sách bullet.

- [ ] **Step 2: Thêm bullet red flag dual-gate (sau bullet cuối)**

Edit — old_string:
```
- Changed an existing feature's behavior but didn't update its existing matrix + `e2e.md` + test file to match.
```
new_string:
```
- Changed an existing feature's behavior but didn't update its existing matrix + `e2e.md` + test file to match.
- Claimed §4.3 PASS with only gate A (`yarn e2e`) green — dual-gate requires gate B (MCP walk) green too.
- Ran gate B against a mutation-heavy scenario without the `A only` tag → parallel session contamination → false fail.
```

- [ ] **Step 3: Verify**

Run (Grep): pattern `dual-gate requires gate B` trong `SKILL.md`
Expected: khớp 1 lần.

---

## Task 8: Self-review tổng & trình diff cho user (commit gate §7)

**Files:** (read-only review)
- `.claude/CLAUDE.md`, `.claude/skills/e2e-scenario-coverage/SKILL.md`, `docs/specs/e2e-mcp-dual-gate/{design.md,plan.md}`

- [ ] **Step 1: Đọc lại §4.3 + §6.2 đã sửa**

Đọc `.claude/CLAUDE.md` §4.3 và §6.2 → xác nhận: dual-gate rõ ràng, vòng lặp max 3, contamination handling, e2e-bugs.md có trong artifact list. Không mâu thuẫn với phần còn lại của §4.3 (trigger/skip, reconcile-on-fix, artifact per-feature giữ nguyên).

- [ ] **Step 2: Đọc lại SKILL.md đã sửa**

Đọc `SKILL.md` → xác nhận: cột `Gate` (design.md), mục "Gate B", output e2e-bugs.md, 2 red flag mới đều nhất quán; không trùng lặp, không placeholder.

- [ ] **Step 3: Kiểm tham chiếu chéo**

Run (Grep): pattern `e2e-bugs` trên cả repo
Expected: xuất hiện ở CLAUDE.md §4.3 + §6.2, SKILL.md (2 chỗ), design.md, plan.md — nhất quán tên file.

- [ ] **Step 4: Trình diff tổng cho user duyệt (§7), KHÔNG tự commit**

Trình summary các file đã đổi + diff cho user. Chờ user duyệt. Hỏi luôn: có dùng worktree cho repo `docs/` khi commit design.md/plan.md/e2e-bugs.md không (root `.claude/` không phải repo). Sau duyệt mới `git commit` theo §7 + (tùy) `creating-github-pr`.
```