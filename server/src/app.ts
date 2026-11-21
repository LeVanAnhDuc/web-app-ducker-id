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

// Cần thiết để req.ip lấy đúng IP client thật từ x-forwarded-for; cấu hình
// hẹp (loopback) tránh bị spoof header khi không có proxy tin cậy.
app.set("trust proxy", config.app.trustProxy);

// Express 5 defaults to the "simple" parser, which leaves `status[$ne]=x` as a
// flat key that the Joi schemas strip without a word. "extended" (Express 4's
// default) parses it into an object, so the schema refuses the query operator
// with 400 as the requirements state.
app.set("query parser", "extended");

app.use(helmet());

app.use(
  cors({
    origin: config.app.corsOrigins,
    // Bắt buộc khi dùng cookie-based auth (httpOnly cookie chứa token).
    credentials: true
  })
);

// requestId và i18n chạy TRƯỚC body parser: body JSON hỏng / quá lớn bị
// express.json() từ chối ngay tại đây, và lỗi đó vẫn phải ra error envelope đã
// dịch (req.t) kèm X-Request-Id. Cả hai chỉ đọc header, không cần body.
app.use(requestId);

app.use(i18nMiddleware);

// limit: "10mb" — chống abuse gửi payload quá lớn gây tốn memory/DoS.
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());

// requestId đã gán ở trên, trước body parser.
app.use(RequestContext.middleware());

app.use(requestLogger);

setupSwagger(app);

export default app;
