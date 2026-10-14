# OPS — công cụ vận hành

- **REQ-OPS-01** `/health` báo trạng thái MongoDB và Redis.
- **REQ-OPS-02** Swagger UI ở `/api-docs` và tài liệu ở `/api-docs.json`.
- **REQ-OPS-03** Mọi lỗi API dùng envelope `{ code, message, timestamp, path }`, dịch theo locale của từng request.
- **REQ-OPS-04** Mọi response của API mang security header của Helmet (`X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, HSTS, CSP) và không có `X-Powered-By`.
- **REQ-OPS-05** Mọi response mang `X-Request-Id`: id do caller gửi (≤ 128 ký tự) được trả lại nguyên văn, thiếu hoặc
  dài hơn thì server sinh UUID mới cho từng request.
- **REQ-OPS-06** CORS chỉ trả `Access-Control-Allow-Origin` cho các origin trong `CORS_ORIGINS` của server, kèm
  `Access-Control-Allow-Credentials: true`; origin khác không được phép.
