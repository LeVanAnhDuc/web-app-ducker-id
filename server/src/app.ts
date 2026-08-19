// libs
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
// others
import { setupSwagger } from "@/libs/swagger";
import config from "@/constants/env";
import { requestId, requestLogger } from "@/middlewares";
import { i18nMiddleware } from "./i18n";
import { RequestContext } from "@/utils/request-context";

const app = express();

// Tin tưởng reverse proxy/LB theo cấu hình TRUST_PROXY (default "loopback").
// Cần thiết để req.ip lấy đúng IP client thật từ x-forwarded-for; cấu hình
// hẹp (loopback) tránh bị spoof header khi không có proxy tin cậy.
app.set("trust proxy", config.TRUST_PROXY);

// Tự động set các HTTP security headers để chống các tấn công phổ biến:
// - X-Content-Type-Options: nosniff — chống MIME sniffing
// - X-Frame-Options: SAMEORIGIN — chống clickjacking
// - Strict-Transport-Security — ép dùng HTTPS
// - X-XSS-Protection — chống XSS (trình duyệt cũ)
// - Loại bỏ header X-Powered-By — ẩn thông tin server
app.use(helmet());

app.use(
  cors({
    origin: config.CORS_ORIGINS,
    // credentials: true — cho phép gửi cookie/authorization header trong cross-origin request.
    // Bắt buộc khi dùng cookie-based auth (httpOnly cookie chứa token).
    credentials: true
  })
);

// Parse request body dạng application/json. limit: "10mb" giới hạn kích thước body tối đa 10MB
// — chống abuse gửi payload quá lớn gây tốn memory/DoS.
app.use(express.json({ limit: "10mb" }));

// Parse body dạng application/x-www-form-urlencoded (form submission truyền thống).
// - extended: true — dùng thư viện qs thay vì querystring, hỗ trợ parse nested object (vd: user[name]=John).
//   - limit: "10mb" — cùng giới hạn size như JSON body.
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookie từ incoming request headers.
// Cho phép truy cập cookie qua req.cookies.
// Cần thiết cho JWT httpOnly cookie, session cookie, hoặc custom auth cookies.
app.use(cookieParser());

// Middleware tự viết — gán một unique ID cho mỗi request (thường là UUID).
// Dùng để tracing/debugging: khi log error có thể trace lại chính xác request nào gây lỗi.
app.use(requestId);
app.use(RequestContext.middleware());

// Middleware tự viết — log thông tin mỗi request đến (method, URL, status code, thời gian xử lý...). Phục vụ monitoring và debug.
app.use(requestLogger);

// Middleware xử lý internationalization — detect ngôn ngữ từ request (header Accept-Language hoặc query param)
// và set ngôn ngữ cho response message. Cho phép API trả message lỗi/thành công theo ngôn ngữ của client.
app.use(i18nMiddleware);

// Mount Swagger UI — tạo trang document API tự động, cho phép developer xem và test API trực tiếp trên trình duyệt.
setupSwagger(app);

export default app;
