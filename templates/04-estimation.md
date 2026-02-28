# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                            |
| ---------------------------- | ---------------------------------- |
| **Tổng thời gian ước lượng** | _[X ngày/tuần]_                    |
| **Số developer**             | _[X người]_                        |
| **Ngày bắt đầu dự kiến**     | _[DD/MM/YYYY]_                     |
| **Ngày hoàn thành dự kiến**  | _[DD/MM/YYYY]_                     |
| **Hệ số buffer**             | _[VD: 1.3x — thêm 30% cho rủi ro]_ |

---

## 4.2. Phân rã công việc (Work Breakdown)

> **Hướng dẫn:** Chia nhỏ theo phase. Mỗi task không nên lớn hơn 1 ngày. Cột "Tham chiếu" link đến mục tương ứng ở các tài liệu khác để biết chi tiết.

### Phase 1: Setup & Foundation

| Task                              | Tham chiếu      | Ước lượng | Assignee | Ghi chú |
| --------------------------------- | --------------- | --------- | -------- | ------- |
| _[VD: Tạo DB migration]_          | _TL3 - Mục 3.3_ | _[2h]_    | _[Tên]_  |         |
| _[VD: Setup Elasticsearch index]_ | _TL3 - Mục 3.2_ | _[4h]_    | _[Tên]_  |         |

### Phase 2: Backend Development

| Task                                     | Tham chiếu                 | Ước lượng | Assignee | Ghi chú |
| ---------------------------------------- | -------------------------- | --------- | -------- | ------- |
| _[VD: Implement Search API]_             | _TL3 - Mục 3.4_            | _[1d]_    | _[Tên]_  |         |
| _[VD: Implement validation rules]_       | _TL2 - Mục 2.3_            | _[4h]_    | _[Tên]_  |         |
| _[VD: Error handling & circuit breaker]_ | _TL2 - Mục 2.2 (🔴 Error)_ | _[4h]_    | _[Tên]_  |         |

### Phase 3: Frontend Development

| Task                                | Tham chiếu             | Ước lượng | Assignee | Ghi chú |
| ----------------------------------- | ---------------------- | --------- | -------- | ------- |
| _[VD: UI Component - Search bar]_   | _TL1 - US-01_          | _[1d]_    | _[Tên]_  |         |
| _[VD: UI Component - Filter panel]_ | _TL1 - US-02_          | _[1d]_    | _[Tên]_  |         |
| _[VD: Empty state & error states]_  | _TL2 - Mục 2.2 (🟡🔴)_ | _[4h]_    | _[Tên]_  |         |

### Phase 4: Testing & QA

| Task                              | Tham chiếu             | Ước lượng | Assignee | Ghi chú |
| --------------------------------- | ---------------------- | --------- | -------- | ------- |
| _[VD: Unit tests]_                | _TL2 - DoD_            | _[1d]_    | _[Tên]_  |         |
| _[VD: Integration tests]_         | _TL2 - Mục 2.2_        | _[4h]_    | _[Tên]_  |         |
| _[VD: Edge case + error testing]_ | _TL2 - Mục 2.2 (🟡🔴)_ | _[1d]_    | _[Tên]_  |         |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer) |
| ----------------------- | ------------------------ | --------------------- |
| 1. Setup & Foundation   | _[Xh]_                   | _[X × hệ số]_         |
| 2. Backend Development  | _[Xh]_                   | _[X × hệ số]_         |
| 3. Frontend Development | _[Xh]_                   | _[X × hệ số]_         |
| 4. Testing & QA         | _[Xh]_                   | _[X × hệ số]_         |
| **TỔNG**                | **_[Xh]_**               | **_[Xh]_**            |
