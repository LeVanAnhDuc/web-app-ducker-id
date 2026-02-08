# Cấu Trúc Dự Án Backend - Apartment Web Server

> **Phiên bản**: 1.0.0
> **Framework**: Express.js + TypeScript
> **Cập nhật**: 2025-02-08

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
3. [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
4. [Chi Tiết Các Thư Mục](#chi-tiết-các-thư-mục)
5. [Module Structure Pattern](#module-structure-pattern)
6. [Quy Ước Đặt Tên](#quy-ước-đặt-tên)
7. [Flow Xử Lý Request](#flow-xử-lý-request)
8. [Best Practices](#best-practices)

---

## 🎯 Tổng Quan

Dự án backend được xây dựng theo kiến trúc **Modular Monolith**, tập trung vào:

- **Separation of Concerns**: Tách biệt rõ ràng các layer (Controller, Service, Repository)
- **Domain-Driven Design**: Tổ chức code theo tính năng/domain thay vì theo loại file
- **Type Safety**: Sử dụng TypeScript nghiêm ngặt với strict mode
- **Scalability**: Dễ dàng mở rộng và bảo trì
- **Security First**: Áp dụng OWASP Top 10 standards

---

## 🛠️ Công Nghệ Sử Dụng

### Core Technologies

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|-----------|----------|
| **Node.js** | Latest LTS | Runtime environment |
| **TypeScript** | ^5.4.5 | Type-safe programming |
| **Express.js** | ^4.19.2 | Web framework |
| **MongoDB** | ^8.3.1 (Mongoose) | Database |
| **Redis** | ^4.6.13 | Caching & Session |

### Security & Validation

- **helmet** (^7.1.0): HTTP headers security
- **joi** (^17.13.3): Request validation
- **bcrypt** (^5.1.1): Password hashing
- **jsonwebtoken** (^9.0.2): JWT authentication

### Utilities

- **winston** (^3.18.3): Logging
- **i18next** (^25.6.1): Internationalization (EN/VI)
- **nodemailer** (^6.9.14): Email service
- **express-rate-limit** (^7.5.0): Rate limiting

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Jest**: Testing framework
- **Nodemon**: Development auto-reload

---

## 📁 Cấu Trúc Thư Mục

```
server/
├── src/
│   ├── app/                    # Application layer
│   │   ├── constants/          # App-wide constants
│   │   ├── middlewares/        # Custom middlewares
│   │   ├── services/           # Shared services (Email, SMS, etc.)
│   │   ├── types/              # App-level types
│   │   └── utils/              # App-level utilities
│   │
│   ├── database/               # Database connections & configurations
│   │   ├── mongodb/            # MongoDB setup
│   │   ├── redis/              # Redis setup
│   │   └── seeders/            # Database seeders
│   │
│   ├── i18n/                   # Internationalization
│   │   ├── locales/            # Translation files (en, vi)
│   │   ├── config.ts           # i18n configuration
│   │   ├── index.ts            # Main export
│   │   └── middleware.ts       # i18n middleware
│   │
│   ├── infra/                  # Infrastructure layer
│   │   ├── configs/            # Application configs
│   │   ├── http/               # HTTP status codes & phrases
│   │   ├── middlewares/        # Infrastructure middlewares
│   │   ├── repositories/       # Base repository pattern
│   │   ├── responses/          # Response handlers (success/error)
│   │   └── utils/              # Infrastructure utilities
│   │
│   ├── loaders/                # Application loaders
│   │   ├── database.loader.ts  # MongoDB loader
│   │   ├── redis.loader.ts     # Redis loader
│   │   └── index.ts            # Loader orchestrator
│   │
│   ├── modules/                # Feature modules (Domain)
│   │   ├── authentication/     # Authentication module
│   │   ├── login/              # Login module
│   │   ├── login-history/      # Login history tracking
│   │   ├── logout/             # Logout module
│   │   ├── signup/             # Signup module
│   │   ├── token/              # Token management
│   │   └── user/               # User management
│   │
│   ├── routes/                 # API routes
│   │   └── v1.routes.ts        # API v1 routes
│   │
│   ├── types/                  # Global type definitions
│   │   ├── global.d.ts         # Global types
│   │   ├── i18next.d.ts        # i18next types
│   │   └── index.d.ts          # Type exports
│   │
│   ├── __tests__/              # Test files
│   │   └── setup.ts            # Test configuration
│   │
│   ├── app.ts                  # Express app configuration
│   └── server.ts               # Server entry point
│
├── .env                        # Environment variables
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── jest.config.js              # Jest configuration
├── nodemon.json                # Nodemon configuration
├── package.json                # Dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

---

## 📂 Chi Tiết Các Thư Mục

### 1. `src/app/` - Application Layer

Layer chứa logic ứng dụng và shared resources.

```
app/
├── constants/              # Constants dùng chung
│   ├── models.ts           # Model names, collection names
│   └── time.ts             # Time-related constants
│
├── middlewares/            # Custom middlewares
│   ├── auth.ts             # Authentication middleware
│   └── validation.ts       # Validation middleware
│
├── services/               # Shared business services
│   ├── EmailTransport.ts   # Email service
│   └── implements/         # Service implementations
│       └── AuthToken.ts    # JWT token service
│
├── types/                  # App-level types
│   ├── auth.ts             # Authentication types
│   └── databases/          # Database-related types
│       ├── jwt.ts          # JWT payload types
│       └── mongodb.ts      # MongoDB types
│
└── utils/                  # App-level utilities
    ├── date/               # Date utilities
    ├── email/              # Email utilities
    │   ├── sender.ts       # Email sender
    │   └── template-helper.ts
    └── store/              # Data store utilities
```

**Mục đích:**
- Chứa các tiện ích và service dùng chung cho toàn bộ ứng dụng
- Constants để tránh magic numbers/strings
- Middlewares tùy chỉnh cho authentication, validation
- Shared business logic không thuộc về module cụ thể nào

---

### 2. `src/database/` - Database Layer

Quản lý kết nối và cấu hình database.

```
database/
├── mongodb/
│   ├── constants.ts        # MongoDB constants
│   ├── mongodb.config.ts   # MongoDB configuration
│   ├── mongodb.database.ts # MongoDB connection
│   ├── mongodb.events.ts   # MongoDB event handlers
│   ├── mongodb.health.ts   # Health check
│   └── index.ts            # Main export
│
├── redis/
│   ├── redis.config.ts     # Redis configuration
│   ├── redis.database.ts   # Redis connection
│   ├── redis.events.ts     # Redis event handlers
│   ├── redis.health.ts     # Health check
│   └── index.ts            # Main export
│
└── seeders/
    └── index.ts            # Database seeders
```

**Mục đích:**
- Centralized database connections
- Health check cho monitoring
- Event handling (connection, error, etc.)
- Seeders để test data

---

### 3. `src/i18n/` - Internationalization

Quản lý đa ngôn ngữ (English, Tiếng Việt).

```
i18n/
├── locales/
│   ├── en/                 # English translations
│   │   └── index.ts
│   └── vi/                 # Vietnamese translations
│       └── index.ts
│
├── config.ts               # i18n configuration
├── index.ts                # Main export
└── middleware.ts           # i18n middleware
```

**Format translation files:**
```typescript
// i18n/locales/en/auth.json
{
  "errors": {
    "invalidCredentials": "Invalid email or password",
    "emailExists": "Email already registered"
  },
  "success": {
    "loginSuccess": "Login successful"
  }
}
```

**Usage:**
```typescript
// Trong code
throw new UnauthorizedError(t("auth:errors.invalidCredentials"));
```

---

### 4. `src/infra/` - Infrastructure Layer

Layer cơ sở hạ tầng, chứa các thành phần kỹ thuật.

```
infra/
├── configs/                # Configuration files
│   ├── cookie.ts           # Cookie configuration
│   ├── env.ts              # Environment variables
│   ├── logger.ts           # Logger configuration
│   ├── security.ts         # Security configs
│   └── swagger/            # Swagger/OpenAPI docs
│       ├── common.schemas.ts
│       ├── index.ts
│       └── swagger.setup.ts
│
├── http/                   # HTTP utilities
│   ├── status-codes.ts     # HTTP status codes
│   └── reason-phrases.ts   # HTTP reason phrases
│
├── middlewares/            # Infrastructure middlewares
│   ├── error-handler.ts    # Global error handler
│   ├── mongoose-error-handler.ts
│   └── request-logger.ts   # Request logging
│
├── repositories/           # Base repository pattern
│   └── base.repo.ts        # Generic CRUD operations
│
├── responses/              # Response handlers
│   ├── error.ts            # Custom error classes
│   └── success.ts          # Success response format
│
└── utils/                  # Infrastructure utilities
    ├── async-handler.ts    # Async error wrapper
    ├── logger.ts           # Winston logger
    └── retry.ts            # Retry mechanism
```

**Mục đích:**
- Tách biệt technical concerns khỏi business logic
- Centralized error handling
- Logging và monitoring
- Configuration management

---

### 5. `src/modules/` - Feature Modules (Domain Layer)

**Đây là phần quan trọng nhất** - chứa business logic theo từng tính năng.

#### Module Structure Pattern

Mỗi module tuân theo cấu trúc chuẩn:

```
modules/{feature}/
├── controller.ts           # Request/Response handling
├── service/                # Business logic
│   ├── index.ts            # Service exports
│   ├── shared.ts           # Shared logic
│   └── {subfeature}/       # Sub-services
│       ├── send.service.ts
│       └── verify.service.ts
│
├── repository.ts           # Database operations (optional)
├── model.ts                # Mongoose model (optional)
├── routes.ts               # Module routes
├── schema.ts               # Joi validation schemas
├── types.ts                # Module-specific types
│
├── store/                  # Data store (Redis, cache)
│   └── index.ts
│
└── swagger/                # API documentation
    ├── index.ts
    ├── paths.ts
    └── schemas.ts
```

#### Ví dụ: Signup Module

```
modules/signup/
├── controller.ts           # sendOtp, verifyOtp, completeSignup
│
├── service/
│   ├── index.ts            # Export all services
│   ├── shared.ts           # Shared helper functions
│   ├── validators.ts       # Custom validators
│   │
│   ├── otp/                # OTP sub-services
│   │   ├── send.service.ts     # Gửi OTP
│   │   ├── verify.service.ts   # Xác thực OTP
│   │   └── resend.service.ts   # Gửi lại OTP
│   │
│   └── signup/
│       └── check-email.service.ts
│
├── store/
│   ├── index.ts
│   └── session.store.ts    # Redis session management
│
├── routes.ts               # POST /signup/send-otp, etc.
├── schema.ts               # Joi validation
├── types.ts                # SignupRequest, OtpSession, etc.
│
└── swagger/
    ├── index.ts
    ├── paths.ts            # API endpoints docs
    └── schemas.ts          # Request/Response schemas
```

#### Các Module Hiện Tại

1. **authentication/** - Authentication core logic
2. **login/** - Login với OTP và Magic Link
3. **login-history/** - Lưu lịch sử đăng nhập
4. **logout/** - Logout và xóa session
5. **signup/** - Đăng ký tài khoản với OTP
6. **token/** - Refresh token, verify token
7. **user/** - Quản lý user profile

---

### 6. `src/loaders/` - Application Loaders

Khởi tạo các services khi server start.

```
loaders/
├── database.loader.ts      # Kết nối MongoDB
├── redis.loader.ts         # Kết nối Redis
└── index.ts                # loadAll(), closeAll()
```

**Execution Flow:**
```typescript
// server.ts
await loadAll();  // Load tất cả dependencies
app.listen(PORT);

// Graceful shutdown
await closeAll(); // Đóng tất cả connections
```

---

### 7. `src/routes/` - API Routes

Định nghĩa các API endpoints.

```
routes/
└── v1.routes.ts            # API v1 routes
```

**Route Structure:**
```typescript
// v1.routes.ts
const router = Router();

router.use("/signup", signupRoutes);
router.use("/login", loginRoutes);
router.use("/logout", logoutRoutes);
router.use("/token", tokenRoutes);
router.use("/user", userRoutes);

export default router;
```

**Final URL Pattern:**
```
http://localhost:3000/api/v1/signup/send-otp
                      \_____/ \___/ \______/
                        base   ver   module
```

---

## 🏗️ Module Structure Pattern

### Layer Responsibilities

#### 1. Controller Layer (`controller.ts`)

**Nhiệm vụ:**
- Nhận request từ client
- Validate input (Joi schema)
- Gọi Service layer
- Trả response về client

**Ví dụ:**
```typescript
// modules/signup/controller.ts
import type { Request, Response } from "express";
import { sendOtpService } from "./service";
import { sendSuccess } from "@/infra/responses/success";

export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  const language = req.language || "en";

  await sendOtpService(email, language);

  sendSuccess(res, null, 200, "OTP sent successfully");
};
```

#### 2. Service Layer (`service/`)

**Nhiệm vụ:**
- Chứa business logic
- Xử lý các quy tắc nghiệp vụ
- Gọi Repository/Store để thao tác data
- Không phụ thuộc vào HTTP (Request/Response)

**Ví dụ:**
```typescript
// modules/signup/service/otp/send.service.ts
import { generateOtp } from "@/app/utils/otp";
import { sendOtpEmail } from "@/app/services/EmailTransport";
import { storeOtp } from "../../store";

export const sendOtpService = async (
  email: string,
  language: string
): Promise<void> => {
  // Business logic
  const otp = generateOtp();

  // Store in Redis
  await storeOtp(email, otp, 300); // 5 minutes

  // Send email
  await sendOtpEmail(email, otp, language);
};
```

#### 3. Repository Layer (`repository.ts`)

**Nhiệm vụ:**
- Truy cập database (MongoDB)
- CRUD operations
- Query complex
- Không chứa business logic

**Ví dụ:**
```typescript
// modules/user/repository.ts
import { UserModel } from "./model";
import type { User } from "./types";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return UserModel.findOne({ email }).lean();
  }

  async create(userData: Partial<User>): Promise<User> {
    return UserModel.create(userData);
  }

  async updateById(id: string, data: Partial<User>): Promise<User | null> {
    return UserModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }
}
```

#### 4. Store Layer (`store/`)

**Nhiệm vụ:**
- Thao tác với Redis (cache, session)
- Key management
- TTL (Time To Live) handling

**Ví dụ:**
```typescript
// modules/signup/store/index.ts
import { redis } from "@/database/redis";

const REDIS_KEYS = {
  OTP: "signup:otp",
  SESSION: "signup:session"
};

export const storeOtp = async (
  email: string,
  otp: string,
  ttl: number
): Promise<void> => {
  const key = `${REDIS_KEYS.OTP}:${email}`;
  await redis.setEx(key, ttl, otp);
};

export const getOtp = async (email: string): Promise<string | null> => {
  const key = `${REDIS_KEYS.OTP}:${email}`;
  return redis.get(key);
};
```

#### 5. Schema Layer (`schema.ts`)

**Nhiệm vụ:**
- Validation với Joi
- Định nghĩa request body schema
- Error messages

**Ví dụ:**
```typescript
// modules/signup/schema.ts
import Joi from "joi";

export const signupSchema = {
  sendOtp: Joi.object({
    email: Joi.string().email().required()
  }),

  verifyOtp: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required()
  }),

  completeSignup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).required()
  })
};
```

---

## 🔄 Flow Xử Lý Request

### Request Processing Flow

```
Client Request
    ↓
Express App (app.ts)
    ↓
Middlewares (helmet, cors, body-parser)
    ↓
i18n Middleware (detect language)
    ↓
API Routes (/api/v1/*)
    ↓
Module Routes (/signup/send-otp)
    ↓
Validation Middleware (Joi schema)
    ↓
Controller (parse request)
    ↓
Service (business logic)
    ↓
Repository/Store (database operations)
    ↓
Service (process data)
    ↓
Controller (format response)
    ↓
Success Response Handler
    ↓
Client Response
```

### Error Handling Flow

```
Error Thrown (anywhere)
    ↓
Async Handler Wrapper (catch)
    ↓
Error Middleware (handleMongooseError)
    ↓
Error Middleware (handleError)
    ↓
Logger (log error details)
    ↓
Error Response Handler
    ↓
Client Response (formatted error)
```

### Ví dụ Complete Flow: Send OTP

```
1. POST /api/v1/signup/send-otp
   Body: { email: "user@example.com" }

2. i18nMiddleware → Detect language: "en"

3. Validation Middleware
   ↓ Joi.validate(req.body, schema.sendOtp)
   ↓ Valid ✓

4. Controller: sendOtp(req, res)
   ↓ Extract: email, language
   ↓ Call service

5. Service: sendOtpService(email, language)
   ↓ Check rate limit (Redis)
   ↓ Generate OTP (6 digits)
   ↓ Store OTP in Redis (TTL: 5 min)
   ↓ Send email via Nodemailer

6. Controller: sendSuccess(res, null, 200, "OTP sent")

7. Response:
   {
     "statusCode": 200,
     "message": "OTP sent successfully",
     "data": null
   }
```

---

## 📝 Quy Ước Đặt Tên

### Files & Directories

| Loại | Convention | Ví dụ |
|------|-----------|--------|
| **Files** | kebab-case | `send-otp.service.ts` |
| **Directories** | kebab-case | `login-history/` |
| **Components** | PascalCase | `UserController.ts` (nếu dùng class) |
| **Test files** | `*.test.ts` | `auth.test.ts` |
| **Type files** | `.d.ts` | `global.d.ts` |

### Code Conventions

| Loại | Convention | Ví dụ |
|------|-----------|--------|
| **Variables** | camelCase | `userName`, `isActive` |
| **Functions** | camelCase | `sendOtp`, `validateUser` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Types/Interfaces** | PascalCase | `User`, `LoginRequest` |
| **Enums** | PascalCase | `UserRole`, `Status` |
| **Private methods** | `_prefixed` | `_checkRateLimit()` |

### Module Naming Pattern

```typescript
// Module: signup
signup/
├── controller.ts           // Exports: sendOtp, verifyOtp
├── service/
│   └── otp/
│       ├── send.service.ts // Exports: sendOtpService
│       └── verify.service.ts // Exports: verifyOtpService
├── routes.ts               // Exports: default router
├── schema.ts               // Exports: signupSchema
└── types.ts                // Exports: SignupRequest, OtpSession
```

---

## 🎨 Best Practices

### 1. TypeScript Strict Mode

**Luôn bật strict mode:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. Layer Separation

**❌ Không được:**
- Controller gọi trực tiếp Repository
- Service phụ thuộc vào HTTP (Request/Response)
- Business logic trong Controller

**✅ Phải:**
- Controller → Service → Repository/Store
- Service chỉ làm việc với pure data
- Business logic tập trung trong Service

### 3. Error Handling

**Sử dụng custom error classes:**
```typescript
// infra/responses/error.ts
export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

// Usage
throw new BadRequestError("Invalid email format");
```

### 4. Async/Await Pattern

**Luôn sử dụng async/await:**
```typescript
// ✅ Good
const fetchUser = async (id: string): Promise<User> => {
  try {
    const user = await UserModel.findById(id);
    return user;
  } catch (error) {
    Logger.error("Fetch user failed", { id, error });
    throw error;
  }
};

// ❌ Bad - Promise chains
const fetchUser = (id: string) => {
  return UserModel.findById(id)
    .then(user => user)
    .catch(error => {
      // Handle error
    });
};
```

### 5. Environment Variables

**Luôn sử dụng .env cho config:**
```typescript
// infra/configs/env.ts
import dotenv from "dotenv";
dotenv.config();

export default {
  APP_PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI!,
  REDIS_HOST: process.env.REDIS_HOST!,
  JWT_SECRET: process.env.JWT_SECRET!
};
```

### 6. Logging

**Sử dụng Winston logger:**
```typescript
import { Logger } from "@/infra/utils/logger";

// Different log levels
Logger.info("User logged in", { userId, email });
Logger.warn("Rate limit exceeded", { ip, endpoint });
Logger.error("Database connection failed", { error });
Logger.debug("Debug information", { data });
```

### 7. API Versioning

**Luôn version APIs:**
```
/api/v1/signup/send-otp  ✓
/api/v2/signup/send-otp  ✓ (future)
/signup/send-otp         ✗ (no version)
```

### 8. Swagger Documentation

**Document tất cả endpoints:**
```typescript
// modules/signup/swagger/paths.ts
/**
 * @swagger
 * /api/v1/signup/send-otp:
 *   post:
 *     summary: Send OTP to email
 *     tags: [Signup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOtpRequest'
 */
```

---

## 🚀 Scripts & Commands

### Development

```bash
# Start development server
npm run dev

# Type check (watch mode)
npm run dev:check

# Type check (one-time)
npm run type-check
```

### Production

```bash
# Build project
npm run build

# Start production server
npm start
```

### Code Quality

```bash
# Lint
npm run lint

# Lint and fix
npm run lint:fix

# Format code
npm run format

# Format check
npm run format:check
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Database

```bash
# Seed database
npm run seed

# Clear database
npm run seed:clear
```

---

## 📊 Database Schema Examples

### MongoDB Collections

```typescript
// User Collection
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  fullName: String,
  role: String (enum: "user", "admin"),
  isActive: Boolean,
  isEmailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// Login History Collection
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  ip: String,
  userAgent: String,
  loginMethod: String (enum: "password", "otp", "magic-link"),
  success: Boolean,
  createdAt: Date
}
```

### Redis Keys Pattern

```typescript
// OTP keys
signup:otp:{email} → "123456" (TTL: 5 min)
login:otp:{email} → "654321" (TTL: 5 min)

// Session keys
session:{token} → { userId, createdAt, ... } (TTL: 7 days)

// Rate limiting
rate-limit:{ip}:{endpoint} → count (TTL: 1 hour)

// Cooldown
otp-cooldown:{email} → "1" (TTL: 1 min)
```

---

## 🔐 Security Checklist

- ✅ Helmet.js cho security headers
- ✅ CORS configuration
- ✅ Rate limiting (express-rate-limit + Redis)
- ✅ Input validation (Joi)
- ✅ Password hashing (bcrypt)
- ✅ JWT với expiry time
- ✅ Environment variables cho secrets
- ✅ HTTPS in production
- ✅ MongoDB injection prevention
- ✅ XSS protection

---

## 📞 Support & Maintenance

### Logging Locations

```
logs/
├── error.log           # Error logs
├── combined.log        # All logs
└── exceptions.log      # Uncaught exceptions
```

### Health Check Endpoints

```
GET /health             # Server health
GET /health/mongodb     # MongoDB status
GET /health/redis       # Redis status
```

### Monitoring

- Winston logs → File rotation daily
- Error tracking → Sentry (future)
- Performance monitoring → New Relic (future)

---

## 📚 Tài Liệu Tham Khảo

### Internal Documentation

- `.claude/CLAUDE.md` - Project guidelines
- `.claude/rules/ESSENTIALS.md` - Essential coding rules
- `.claude/rules/typescript.md` - TypeScript guidelines
- `.claude/rules/api-design.md` - API design standards
- `.claude/rules/security.md` - Security best practices

### External Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Redis Documentation](https://redis.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🎓 Kết Luận

Dự án backend này được xây dựng theo các nguyên tắc:

1. **Modular Architecture**: Dễ mở rộng và bảo trì
2. **Type Safety**: TypeScript strict mode
3. **Security First**: OWASP standards
4. **Clean Code**: Separation of concerns
5. **Scalability**: Ready for microservices migration

**Khi thêm feature mới:**
1. Tạo module mới trong `src/modules/`
2. Tuân theo module structure pattern
3. Implement Controller → Service → Repository layers
4. Thêm validation schemas (Joi)
5. Document API với Swagger
6. Viết tests
7. Update routes trong `v1.routes.ts`

---

**Cập nhật lần cuối**: 2025-02-08
**Version**: 1.0.0
