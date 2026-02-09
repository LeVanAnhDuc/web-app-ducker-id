# 📋 FEATURE REQUIREMENTS ANALYSIS (FRA) — Template

> **Hướng dẫn sử dụng:** Thay thế nội dung trong `{...}` bằng thông tin thực tế. Xoá ghi chú hướng dẫn *(in nghiêng)* sau khi hoàn thành. Section đánh dấu `[Tuỳ chọn]` có thể bỏ nếu không áp dụng.

---

# 📋 FEATURE REQUIREMENTS ANALYSIS
## Tính năng: {Tên tính năng}

**Phiên bản:** {1.0 — Draft | 2.0 — Confirmed | ...}  
**Ngày tạo:** {DD/MM/YYYY}  
**Cập nhật lần cuối:** {DD/MM/YYYY}  
**Trạng thái:** {Đang phân tích | Đã xác nhận yêu cầu | Sẵn sàng Technical Design}  
**Tài liệu liên quan:** {Tên các FRA/doc khác mà feature này phụ thuộc hoặc bổ sung — nếu có}  

---

## 1. TÓM TẮT (Executive Summary)

*Mô tả ngắn gọn 3-5 câu: tính năng làm gì, giải quyết vấn đề gì, phục vụ ai.*

*Nếu feature bổ sung lên feature đã implement → ghi rõ: feature này thêm gì mới, KHÔNG thay đổi gì đã có.*

{Mô tả tổng quan}

**Đối tượng:**
- **{Role 1}:** {Mô tả ngắn vai trò / cách sử dụng}
- **{Role N}:** {Mô tả ngắn}

**Bối cảnh kỹ thuật:**
{Liệt kê ngắn gọn 1-2 dòng: tech stack chính + hạ tầng đã có. KHÔNG viết bảng chi tiết — bảng chi tiết nằm ở System Design.}

> 📎 Chi tiết tech stack: xem **[System Design](./{feature-name}-system-design.md) Section 1**.

---

## 2. USER STORIES

| ID | Role | User Story | Priority |
|---|---|---|---|
| US-01 | {Role} | Là {role}, tôi muốn {hành động} để {mục đích/giá trị}. | **Must** |
| US-02 | {Role} | Là {role}, tôi muốn {hành động} để {mục đích/giá trị}. | **Should** |
| US-0N | {Role} | Là {role}, tôi muốn {hành động} để {mục đích/giá trị}. | **Could** |

*Priority theo MoSCoW: **Must** (bắt buộc) · **Should** (nên có) · **Could** (có thì tốt) · **Won't** (không làm lần này)*

---

## 3. FUNCTIONAL REQUIREMENTS

*Mỗi FR mô tả 1 nhóm chức năng ở mức nghiệp vụ. KHÔNG viết pseudo-code, tên hàm, hay logic implementation.*

### FR-01: {Tên nhóm chức năng}

{Mô tả tổng quan chức năng này làm gì.}

**Dữ liệu cần xử lý / lưu trữ:** *(nếu có)*

| Trường | Mô tả | Bắt buộc |
|---|---|---|
| `{field_name}` | {Mô tả} | ✅ / ⬜ |

**Enum / Giá trị cố định:** *(nếu có)*

| Giá trị | Mô tả | Áp dụng cho |
|---|---|---|
| `{VALUE}` | {Mô tả} | {Ngữ cảnh} |

**Quy tắc nghiệp vụ:** *(nếu có)*
- {Quy tắc 1}
- {Quy tắc 2}

---

### FR-02: {Tương tác với tính năng đã có} — [Tuỳ chọn: khi feature bổ sung lên feature khác]

> **{Tính năng X} đã implement trong {Feature Y}. Feature này KHÔNG thay đổi cơ chế đó — chỉ {ghi log / bổ sung / ...}.**

*Mô tả tính năng đã có (tóm tắt) + feature mới tương tác với nó như thế nào.*

---

### FR-0N: {Giao diện / Màn hình} — [Tuỳ chọn: nếu feature có UI]

*Mô tả ở mức yêu cầu — KHÔNG phải wireframe.*

**Vị trí truy cập:** {Đường dẫn / nơi user truy cập}  
**Phân quyền:** {Ai được xem/dùng}

**Trang danh sách / Màn hình chính:**

| Cột / Thành phần | Ghi chú |
|---|---|
| {Tên cột} | {Mô tả, format hiển thị} |

- {Quy tắc sắp xếp, phân trang, lọc}
- {Hành vi tương tác — vd: click vào dòng → xem detail}

---

## 4. NON-FUNCTIONAL REQUIREMENTS

*Chọn các NFR phù hợp, bỏ cái không liên quan. Nếu feature bổ sung lên feature khác → ghi rõ "nhất quán với {Feature X}".*

### NFR-01: Hiệu suất (Performance)
- {Yêu cầu response time, throughput, ảnh hưởng đến luồng chính}

### NFR-02: Bảo mật (Security)
- {Yêu cầu mã hoá, phân quyền, data masking}
- *Nếu kế thừa từ feature khác → ghi: "Nhất quán với {Feature X} — {mô tả cụ thể}"*

### NFR-03: Độ tin cậy (Reliability)
- {Graceful degradation, retry, không block luồng chính}

### NFR-04: Lưu trữ dữ liệu (Data Retention)
- {Thời gian lưu, chính sách archive/purge}

### NFR-05: Khả năng mở rộng (Scalability) — [Tuỳ chọn]
- {Indexing, sharding, async processing}

---

## 5. EDGE CASES & XỬ LÝ LỖI

| # | Tình huống | Hệ quả | Cách xử lý đề xuất |
|---|---|---|---|
| EC-01 | {Tình huống bất thường} | {Hệ quả nếu không xử lý} | {Xử lý ở mức nghiệp vụ. Nếu liên quan feature khác → ghi "nhất quán với {Feature X}"} |
| EC-0N | ... | ... | ... |

---

## 6. API ENDPOINTS

*Overview — chi tiết request/response để ở Technical Design.*

| # | Method | Endpoint | Mô tả | Auth | Mới/Sửa |
|---|---|---|---|---|---|
| 1 | {GET/POST} | `{/api/v1/...}` | {Mô tả ngắn} | {Public/User/Admin} | **Mới** / Sửa |

*Cột "Mới/Sửa" giúp phân biệt endpoint hoàn toàn mới vs endpoint hiện có được bổ sung logic.*

---

## 7. PHÂN PHA TRIỂN KHAI

> 📎 Xem chi tiết tại **[{feature-name}-wbs.md](./{feature-name}-wbs.md)**

*KHÔNG copy bảng phases/giờ vào đây — dữ liệu chỉ nằm ở WBS để tránh không đồng bộ khi cập nhật.*

---

## 8. GIẢ ĐỊNH ĐÃ XÁC NHẬN

| # | Giả định | Trạng thái |
|---|---|---|
| A-01 | {Giả định} | ✅ Confirmed / ⚠️ Cần xác nhận |

---

## 9. RỦI RO TIỀM ẨN

| # | Rủi ro | Mức độ | Giải pháp giảm thiểu |
|---|---|---|---|
| R-01 | {Rủi ro} | 🔴 Cao / 🟡 TB / 🟢 Thấp | {Giải pháp} |

---

## 10. CROSS-REFERENCE — [Tuỳ chọn: khi feature bổ sung lên feature khác]

> *Bảng đối chiếu: feature khác đã liệt kê gì trong "Out of Scope" mà feature này implement.*

| {Feature X} Out of Scope Item | Feature này cover? |
|---|---|
| {Mục} | ✅ / ⚠️ Partial / ❌ Vẫn out of scope |

---

## 11. CÂU HỎI CẦN LÀM RÕ — [Chỉ ở bản Draft — xoá khi Confirmed]

### Q1 — {Chủ đề}
{Câu hỏi chi tiết}

---

*Review bởi: {Danh sách stakeholders}*  
*Bước tiếp theo: {vd: Technical Design Document}*

---
---

# 📐 HƯỚNG DẪN SỬ DỤNG TEMPLATE

## Quy trình

```
Bước 1 (Draft)    → Điền thông tin + Section 11 (Câu hỏi)
Bước 2 (Review)   → Stakeholder trả lời câu hỏi
Bước 3 (Confirmed)→ Cập nhật câu trả lời vào sections. Xoá Section 11
Bước 4            → Chuyển sang Technical Design
```

## Khi nào dùng section nào

| Section | Bắt buộc | Ghi chú |
|---|---|---|
| 1. Tóm tắt | ✅ | Luôn có |
| 2. User Stories | ✅ | Luôn có |
| 3. Functional Requirements | ✅ | Luôn có |
| 4. Non-Functional Requirements | ✅ | Chọn NFR phù hợp |
| 5. Edge Cases | ✅ | Càng chi tiết càng tốt |
| 6. API Endpoints | ✅ | Nếu feature có API |
| 7. Phân pha | ✅ | Chỉ link tới WBS — KHÔNG copy bảng phases/giờ |
| 8. Giả định | ✅ | Luôn có |
| 9. Rủi ro | ✅ | Luôn có |
| 10. Cross-reference | ⬜ | Chỉ khi bổ sung lên feature khác |
| 11. Câu hỏi | ⬜ | Chỉ ở bản Draft |

## Ranh giới FRA vs Technical Design vs WBS

| Nội dung | FRA ✅ | System Design ✅ | WBS ✅ |
|---|---|---|---|
| User stories, business rules | ✅ Nguồn gốc | Tham chiếu FRA | Tham chiếu FRA |
| Edge cases & cách xử lý | ✅ Nguồn gốc | Tham chiếu FRA | Tham chiếu FRA |
| Tech stack chi tiết | ❌ Tóm tắt 1 dòng | ✅ Nguồn gốc | ❌ |
| API endpoint overview | ✅ Bảng ngắn | ✅ Chi tiết request/response | ❌ |
| Database schema, Redis keys | ❌ | ✅ Nguồn gốc | ❌ |
| Sequence diagrams | ❌ | ✅ Nguồn gốc | ❌ |
| Error codes mapping | ❌ | ✅ Nguồn gốc | ❌ |
| Timeline, ước tính giờ | ❌ Link WBS | ❌ | ✅ Nguồn gốc |
| Definition of Done | ❌ | ❌ | ✅ Tham chiếu FRA |

**Nguyên tắc chống trùng lặp:** Mỗi nội dung chỉ có **1 nguồn gốc**. Các tài liệu khác dùng **tham chiếu** (link), KHÔNG copy.

## Feature bổ sung lên feature đã implement

Khi feature mới bổ sung/mở rộng feature cũ:
- **Section 1:** Ghi rõ feature này thêm gì, KHÔNG thay đổi gì.
- **Bối cảnh kỹ thuật:** Tóm tắt 1-2 dòng + link System Design (KHÔNG viết bảng chi tiết).
- **FR:** Có section riêng mô tả tương tác với feature cũ + ghi rõ "KHÔNG thay đổi cơ chế đó".
- **NFR:** Ghi "nhất quán với {Feature X}" thay vì định nghĩa lại.
- **Edge Cases:** Ghi "nhất quán với {Feature X}" khi xử lý giống feature cũ.
- **API Endpoints:** Dùng cột "Mới/Sửa" để phân biệt.
- **Section 10:** Bảng cross-reference với feature cũ.
