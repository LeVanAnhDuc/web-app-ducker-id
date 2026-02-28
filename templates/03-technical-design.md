# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

> **Hướng dẫn:** Tóm tắt 3-5 câu về approach kỹ thuật tổng thể. Ai đọc phần này phải hiểu ngay "dùng gì, làm gì".

_[VD: Feature sử dụng Elasticsearch cho search, Redis cache cho filter options, và Server-Sent Events để cập nhật kết quả real-time. Frontend dùng React component mới tích hợp vào trang listing hiện tại.]_

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

> **Hướng dẫn:** Vẽ sơ đồ kiến trúc hoặc mô tả bằng text. Chỉ ra các component liên quan và data flow giữa chúng.

```
[Mô tả hoặc vẽ ASCII diagram]

VD:
Client (React) → API Gateway → Search Service → Elasticsearch
                              → Product Service → PostgreSQL
                              → Cache Layer (Redis)
```

---

## 3.3. Data Model

> **Hướng dẫn:** Chỉ mô tả các thay đổi/bổ sung so với data model hiện tại. Nếu không thay đổi DB thì ghi rõ "Không thay đổi".

### Bảng mới (nếu có)

```sql
-- Mô tả schema
CREATE TABLE table_name (
    id         UUID PRIMARY KEY,
    ...
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Thay đổi bảng hiện tại (nếu có)

```sql
-- Mô tả migration
ALTER TABLE existing_table ADD COLUMN new_column TYPE;
```

### Index mới (nếu có)

```sql
CREATE INDEX idx_name ON table_name (column);
```

---

## 3.4. API Design

> **Hướng dẫn:** Mô tả các endpoint mới hoặc thay đổi. Dùng format REST hoặc GraphQL tùy dự án.

### Endpoint 1: _[Tên]_

```
[METHOD] /api/v1/resource

Headers:
  Authorization: Bearer {token}

Request Body:
{
  "field": "type — mô tả"
}

Response 200:
{
  "data": { ... },
  "meta": { "total": 100, "page": 1 }
}

Response 4xx/5xx:
{
  "error": { "code": "ERROR_CODE", "message": "Mô tả lỗi" }
}
```

_[Lặp lại cho các endpoint khác]_

---

## 3.5. Luồng xử lý chính (Main Flow)

> **Hướng dẫn:** Mô tả step-by-step luồng xử lý chính (happy path) từ góc nhìn kỹ thuật. Có thể dùng sequence diagram hoặc numbered steps.

```
1. User gửi request → API Gateway
2. Gateway validate token → forward đến Service A
3. Service A query DB → xử lý business logic
4. Service A trả response → Gateway → Client
5. Client render kết quả
```

---

## 3.6. Dependencies & Integrations

> **Hướng dẫn:** Liệt kê tất cả phụ thuộc bên ngoài: third-party API, service nội bộ của team khác, library mới...

| Dependency              | Loại     | Mô tả                      | Owner/Team       |
| ----------------------- | -------- | -------------------------- | ---------------- |
| _[VD: Payment Service]_ | Internal | _[Gọi API verify payment]_ | _[Team Billing]_ |
| _[VD: SendGrid]_        | External | _[Gửi email notification]_ | _[N/A]_          |

---

## 3.7. Migration & Deployment Strategy

**Feature flag:** _[Có/Không. Nếu có, tên flag là gì]_

**Rollback plan:**
_[Nếu phát hiện lỗi nghiêm trọng → Tắt feature flag / Revert migration bằng script X / ...]_
