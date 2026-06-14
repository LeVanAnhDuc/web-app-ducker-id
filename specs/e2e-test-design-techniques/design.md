# Design — Test-Design Techniques cho `e2e-scenario-coverage`

## Vấn đề

Skill `e2e-scenario-coverage` hiện có **12-category rubric** ép walk đủ các vùng coverage (happy / authN / authZ / validation / empty / boundary / filter / data-render / i18n / error-loading / mutation / a11y), mỗi row `✅` hoặc `N/A`. Rubric này giải bài toán **breadth** (vùng nào phải đụng tới) rất tốt — không còn "happy-path + vài filter rồi thôi".

Nhưng nó **không** nói cách derive *case cụ thể + test data* bên trong mỗi vùng. Kết quả: một row như "validation ✅" có thể chỉ có 1 case hời hợt, một row "boundary ✅" không thật sự test biên. Đó là tầng **depth** mà 1 tester thật dùng kỹ thuật thiết kế test để làm: Equivalence Partitioning (EP), Boundary Value Analysis (BVA), Decision Table, State Transition, Error Guessing.

**Mục tiêu:** bổ sung tầng depth (5 kỹ thuật) vào skill, giữ nguyên rubric làm tầng breadth, với cùng cơ chế forcing-function (no silent gaps) — nhưng ở cấp **case/test-data**, không chỉ cấp vùng.

## Quyết định kiến trúc (đã chốt với user)

1. **Augment, không replace** — giữ 12-category rubric làm tầng BREADTH; thêm 5 kỹ thuật làm tầng DEPTH. Không tổ chức lại skill quanh kỹ thuật.
2. **Inline annotation + giá trị cụ thể** — không sinh formal table riêng (decision table / STT / EP partition table) cho mọi feature. Mỗi scenario ghi `[technique]` tag + liệt kê giá trị derive ngay tại chỗ trong matrix.
3. **Forcing function có điều kiện** — khi một row `✅` và technique trigger của nó áp dụng được, scenarios của row đó **phải** mang `[technique]` tag + giá trị cụ thể, hoặc ghi N/A kèm lý do cho class/boundary bỏ qua. Cùng kỷ luật no-silent-gap, nay ở cấp case.
4. **State Transition = technique, KHÔNG thêm row 13** — rubric giữ 12 row. State Transition là kỹ thuật derive, kích hoạt cho feature stateful; ép thêm ≥1 **invalid-transition** case.
5. **Error Guessing = method chính thức của completeness critic** — không phải row riêng; là lăng kính "cái gì lạ làm vỡ feature" đứng sau subagent completeness critic + 1 checklist gotcha mồi.
6. **Tất cả trong SKILL.md** — không tách `references/`. Chấp nhận file dài hơn (~150-170 dòng).

## Mô hình hai tầng

| Tầng | Trả lời câu hỏi | Cơ chế |
| --- | --- | --- |
| **Breadth** (đã có) | *Phải cover vùng nào?* | 12-category rubric — mỗi row `✅`/`N/A` |
| **Depth** (mới) | *Derive case + data nghiêm túc thế nào trong mỗi vùng?* | 5 kỹ thuật — áp inline, có tag, có giá trị cụ thể |

Rubric bảo "ghé thăm validation". Technique bảo: validation chưa xong cho tới khi đã thể hiện các EP class + BVA boundary với **giá trị thật**.

## Artifact load-bearing: Technique → Category Trigger Map

Đây là phần cốt lõi làm forcing-function chạy được — nó cho biết **khi nào** một kỹ thuật trở thành bắt buộc:

| Kỹ thuật | Kích hoạt khi… | Bắt buộc ở row | Ví dụ output derive |
| --- | --- | --- | --- |
| **Equivalence Partitioning (EP)** | input có domain chia valid/invalid class | 4 (validation), 7 (filter/search) | email: `valid` / `empty` / `no-@` / `>254 ký tự` → 1 case/class |
| **Boundary Value Analysis (BVA)** | input ordered / numeric / length-bounded | 6 (pagination), 4 (validation) | `page = 0 (min−1) / 1 (min) / last / last+1 (beyond)`; password len `7/8/9` quanh min=8 |
| **Decision Table** | ≥2 điều kiện **cùng** quyết định outcome | 3 (authz), 7 (combined filters), 11 (mutation preconditions) | role × ownership → 4 rule (admin+own, admin+other, user+own, user+other) |
| **State Transition** | feature có state / multi-step / entity lifecycle | 11 (mutation) + mọi flow | token: issued→refreshed→revoked; **+ ≥1 invalid transition** (dùng revoked token, submit step 3 trước step 2) |
| **Error Guessing** | luôn luôn (catch-all, experience-based) | feeds row 10 + completeness critic | double-submit, back-button giữa flow, trailing space, emoji/unicode, session hết hạn giữa action |

**Forcing rule:** row `✅` + technique trigger áp dụng được → scenarios của row mang `[technique]` tag + giá trị cụ thể, HOẶC ghi lý do class/boundary nào N/A. Audit bằng chính trigger map: row claim `✅` mà thiếu tag bắt buộc = gap.

## Format matrix sau khi đổi (tối thiểu)

Scenarios vẫn nằm inline trong row rubric của nó; chỉ thêm tag + giá trị. Không thêm bảng, không thêm cột.

Ví dụ row pagination:

> **6. Boundary / pagination** ✅ — `?page=0` (min−1 → clamp/empty) · `?page=1` (min, happy) · `?page=last` · `?page=last+1` (beyond → empty state) **[BVA]**

Ví dụ row authz với combo điều kiện:

> **3. AuthZ** ✅ — Decision Table role × ownership: admin+own ✅ sửa được · admin+other ✅ · user+own ✅ · user+other → 403 **[Decision Table]**

## Tích hợp vào flow phát triển feature

- **brainstorming** → matrix row mang technique tag + giá trị derive (vì chọn inline).
- **writing-plans** → mỗi tagged scenario thành 1 test; giá trị derive thành input parametrized của test (các giá trị BVA → 1 `test.each`).
- **§4.3 dual-gate** → cả 2 gate walk cùng matrix đã enrich → technique tự động chảy qua; Gate B (MCP walk) là nơi error-guessing check visual/console/network phát huy.

## Thay đổi cụ thể trên file

### `.claude/skills/e2e-scenario-coverage/SKILL.md`

- Thêm section **"Test-Design Techniques (tầng depth)"**: trigger map + 5 đoạn định nghĩa ngắn mỗi kỹ thuật kèm 1 ví dụ derive.
- Thêm **Forcing rule** vào nguyên tắc core (cùng chỗ no-silent-gap hiện có).
- Cập nhật section **Completeness critic**: nêu rõ Error Guessing là method của nó + checklist gotcha mồi (double-submit, back-button, unicode/emoji, trailing space, session expiry giữa action, concurrent edit).
- Cập nhật bảng **Common mistakes**: thêm "row ✅ nhưng không có technique tag dù trigger áp dụng", "validation chỉ 1 case không partition EP", "boundary không test min±1/max±1".
- Cập nhật **Red flags**: thêm "feature stateful nhưng không có invalid-transition case", "combo điều kiện nhưng không enumerate Decision Table rule".
- Cập nhật section **Outputs by flow step**: matrix trong design.md nay mang technique tag inline.

### `.claude/CLAUDE.md` (doc sync)

- §4.3 và §4.1 hiện ghi "walk đủ 12 nhóm" → thêm 1 dòng: matrix nay còn mang case derive bằng 5 kỹ thuật test-design (EP/BVA/Decision Table/State Transition/Error Guessing), có technique tag + giá trị cụ thể.

## Phạm vi — KHÔNG làm

- Không đổi 12-category rubric (giữ nguyên 12 row).
- Không thêm row 13 cho stateful.
- Không sinh formal artifact (decision table / STT / EP table) riêng — chỉ inline.
- Không tách `references/`.
- Không đụng test file hay app code; đây là thay đổi skill + doc thuần.

## Verification (skill-edit, không phải feature FE)

Đây là chỉnh skill methodology, không đụng `client/src/**` → **không** chạy §4.3 dual-gate E2E. Verify bằng:

1. Đọc lại SKILL.md sau sửa: trigger map đầy đủ 5 kỹ thuật, mỗi kỹ thuật có when-trigger + ví dụ; forcing rule rõ ràng.
2. Dogfood: lấy 1 feature đã có matrix (vd `admin-users-list`) → thử áp trigger map → xác nhận nó bắt được gap thật (vd row 6 pagination cũ thiếu `page=0` min−1, row 4 validation chưa partition). Ghi nhận trong phần review, không cần sửa lại spec feature cũ.
3. Self-review spec: không placeholder, không mâu thuẫn, scope gọn trong 1 file SKILL.md + 1 doc-sync.
