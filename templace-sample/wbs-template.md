# 📋 WORK BREAKDOWN STRUCTURE (WBS) — Template

> **Hướng dẫn sử dụng:** Thay thế nội dung trong `{...}` bằng thông tin thực tế. Xoá ghi chú hướng dẫn *(in nghiêng)* sau khi hoàn thành.

---

# 📋 WORK BREAKDOWN STRUCTURE (WBS)
## Tính năng: {Tên tính năng}

**Tài liệu tham chiếu:** {Tên FRA} — v{X.0}  
**Ngày tạo:** {DD/MM/YYYY}  
**Cập nhật lần cuối:** {DD/MM/YYYY}  

---

## Nguyên tắc phân pha

- Mỗi phase tập trung **{1 nhóm API / 1 mục tiêu rõ ràng}**.
- Mỗi sub-task ≤ **{N} giờ** cho 1 {level} dev ({tech stack}).
- {Ràng buộc đặc biệt — vd: Lockout & Rate limiting đã implement → không có phase riêng.}
- {Ràng buộc hạ tầng — vd: Message Queue để phase cuối — phase 1–N dùng sync.}

---

## 🔷 PHASE 1 — {Tên phase}

**Scope:** {Mô tả ngắn phase này làm gì}  
**APIs liên quan:** {Danh sách endpoint — vd: `POST /login` · `GET /me/history`}  
**Tham chiếu FRA:** {FR-0X, FR-0Y}

| Task | Mô tả | Ước tính |
|---|---|---|
| P1-T1 | {Mô tả task — mức module/tính năng, KHÔNG mức code} | {X}h |
| P1-T2 | {Task} | {X}h |
| P1-TN | Viết unit test + integration test | {X}h |
| | **Tổng Phase 1** | **~{X}h** |

**Definition of Done:**
- {Tiêu chí ngắn gọn — tham chiếu FRA/System Design thay vì copy chi tiết}
- *Ví dụ: "API hoạt động đúng theo **FRA FR-02** (tất cả branches)."*
- *Ví dụ: "Model có đủ fields mới (xem **System Design Section 3.1**)."*

---

## 🔷 PHASE 2 — {Tên phase}

**Scope:** {Mô tả}
**APIs liên quan:** {Endpoints}
**Tham chiếu FRA:** {FR-0X}

| Task | Mô tả | Ước tính |
|---|---|---|
| P2-T1 | {Task} | {X}h |
| P2-TN | Viết unit test + integration test | {X}h |
| | **Tổng Phase 2** | **~{X}h** |

**Definition of Done:**
- {Tiêu chí ngắn gọn — tham chiếu FRA/System Design}

---

*Lặp lại cho mỗi phase...*

---

## 🔷 PHASE N — {Tên phase cuối}

**Scope:** {Mô tả}  
**APIs liên quan:** {Endpoints}  
**Tham chiếu FRA:** {FR-0X, NFR-0X}

| Task | Mô tả | Ước tính |
|---|---|---|
| PN-T1 | {Task} | {X}h |
| PN-TN | {Task} | {X}h |
| | **Tổng Phase N** | **~{X}h** |

**Definition of Done:**
- {Tiêu chí}

---

## 📊 TỔNG KẾT

| Phase | Tên | Tasks | Giờ | Tích luỹ |
|---|---|---|---|---|
| 1 | {Tên} | {N} | {X}h | {X}h |
| 2 | {Tên} | {N} | {X}h | {X}h |
| N | {Tên} | {N} | {X}h | **{Tổng}h** |

> **Tổng: ~{X} giờ ≈ {Y} ngày làm việc ≈ ~{Z} tuần** ({số lượng} {level} dev)

---

## PHỤ LỤC: Dependency Graph

*Vẽ quan hệ phụ thuộc giữa các phase. Dùng text-based diagram.*

```
Phase 1 ({Tên ngắn})
  ↓
  ├→ Phase 2 ({Tên}) ──→ Phase 4 ({Tên})
  ├→ Phase 3 ({Tên}) ──→ Phase 5 ({Tên})
  └→ Phase 6 ({Tên})
       ↓
Phase N ({Tên}) ←── phụ thuộc {Phase X + Y} hoàn thành
```

**Gợi ý nếu có {N} dev:** *(Tuỳ chọn)*
- Dev A: Phase {X} → {Y} → {Z}
- Dev B: (chờ Phase {X} xong) → Phase {M} → {N}
- Tổng thời gian: **~{X} tuần** thay vì {Y} tuần

---
---

# 📐 HƯỚNG DẪN SỬ DỤNG TEMPLATE

## Nguyên tắc viết WBS

1. **WBS là tài liệu triển khai, KHÔNG phải phân tích yêu cầu.**
   - FRA trả lời "Cần làm gì" (What) — WBS trả lời "Chia nhỏ và làm theo thứ tự nào" (How to organize).
   - WBS vẫn KHÔNG viết code / pseudo-code — đó là Technical Design.

2. **Mỗi task phải:**
   - Có **mô tả rõ ràng** — dev đọc hiểu được cần làm gì.
   - Có **ước tính thời gian** — tuân thủ giới hạn đã đặt (vd: ≤ 4h).
   - **Tham chiếu FRA** — biết task này implement yêu cầu nào.

3. **Mỗi phase phải có Definition of Done:**
   - Liệt kê các tiêu chí **có thể verify** (không mơ hồ).
   - **Tham chiếu FRA/System Design** thay vì copy business rules — tránh trùng lặp và mất đồng bộ.
   - Dev và reviewer dùng DoD để confirm phase hoàn thành.

## Cấu trúc mỗi Phase

```
🔷 PHASE {N} — {Tên ngắn gọn, rõ mục tiêu}

  Scope:           → Phase này hoàn thành thì được gì?
  APIs liên quan:  → Endpoint nào được tạo mới / sửa?
  Tham chiếu FRA:  → FR/NFR nào được implement?

  Bảng tasks:      → Chi tiết từng việc + ước tính
  Definition of Done: → Khi nào coi là xong?
```

## Quy tắc phân chia Phase

| Nguyên tắc | Mô tả |
|---|---|
| **1 phase = 1 mục tiêu** | Mỗi phase tập trung vào 1 nhóm API hoặc 1 tính năng cụ thể |
| **Phase độc lập nhất có thể** | Giảm dependency giữa các phase để có thể làm song song |
| **Phase có giá trị riêng** | Mỗi phase hoàn thành → deliverable có thể test/demo được |
| **Test luôn nằm trong phase** | Unit test + integration test nằm cùng phase với code, không tách riêng |
| **Hạ tầng mới → phase riêng** | Nếu cần setup hạ tầng mới (MQ, Redis, ...) → tách phase riêng, thường để cuối |

## Quy tắc ước tính thời gian

| Loại task | Thời gian tham khảo |
|---|---|
| Thiết kế & tạo DB schema / collection | 2–3h |
| Tạo utility nhỏ (parse, format, mask) | 1–2h |
| Tạo module nghiệp vụ (logic phức tạp) | 3–4h |
| Tạo endpoint (controller + validation) | 2–3h |
| Tạo email template HTML | 2h |
| Unit test cho 1 module | 2–3h |
| Integration test cho 1–2 endpoints | 3–4h |
| Tích hợp vào luồng hiện có (sửa endpoint cũ) | 2–3h |
| Setup hạ tầng mới (queue, worker) | 3–4h |

*Ước tính dựa trên junior dev. Điều chỉnh theo level thực tế của team.*

## Chống trùng lặp

| Nội dung | Cách viết trong WBS |
|---|---|
| Business rules / edge cases | Tham chiếu **FRA** — KHÔNG copy chi tiết |
| Model fields / API spec | Tham chiếu **System Design** — KHÔNG copy |
| Timeline / giờ | WBS là nguồn gốc — FRA KHÔNG copy bảng phases |
| Definition of Done | Viết ngắn gọn + link FRA/System Design sections |

**Nguyên tắc:** WBS chỉ chứa thông tin về **phân chia task + timeline**. Tất cả chi tiết nghiệp vụ và kỹ thuật → tham chiếu FRA/System Design.

---

## Mối quan hệ giữa FRA → WBS → Technical Design

```
FRA (What)
 ├─ FR-01, FR-02, ... → nghiệp vụ cần gì
 ├─ NFR-01, ...       → phi chức năng cần gì
 └─ Edge Cases        → tình huống đặc biệt cần xử lý
       ↓
WBS (Organize)
 ├─ Phase 1, 2, ...   → chia nhỏ thành phases
 ├─ Tasks P1-T1, ...  → chia nhỏ thành tasks
 ├─ Ước tính          → timeline
 └─ Dependencies      → thứ tự làm
       ↓
Technical Design (How)
 ├─ DB Schema         → thiết kế chi tiết
 ├─ API Contracts     → request/response
 ├─ Sequence Diagrams → luồng xử lý
 └─ Code structure    → tên module, hàm, class
```
