# HLD - High-Level Design Document
## Tính năng Đăng ký người dùng (Sign Up)

---

**Document Type:** High-Level Design (HLD)
**Target Audience:** Team Lead, Senior Developers, Architects
**Version:** 1.0
**Last Updated:** 2024-11-04
**Status:** Draft

---

## 1. Solution Overview / Technical Proposal

### 1.1. Giới thiệu

Tài liệu này mô tả thiết kế kỹ thuật cấp cao (High-Level Design) cho tính năng đăng ký người dùng (Sign Up) của hệ thống Apartment Management. Tính năng này cho phép người dùng mới tạo tài khoản thông qua quy trình xác thực 3 bước với OTP email.

### 1.2. Mục tiêu kỹ thuật

- **Bảo mật cao:** Xác thực email thực tế thông qua OTP, bảo vệ chống spam và tài khoản giả
- **Trải nghiệm người dùng tốt:** Quy trình rõ ràng, phản hồi nhanh, xử lý lỗi thân thiện
- **Khả năng mở rộng:** Thiết kế cho phép xử lý nhiều đăng ký đồng thời
- **Độ tin cậy:** Xử lý lỗi graceful, retry mechanism, monitoring đầy đủ
- **Tái sử dụng:** Components và services có thể tái sử dụng cho các tính năng khác

### 1.3. Phạm vi

**Trong phạm vi (In-scope):**
- Giao diện đăng ký 3 bước (email → OTP → thông tin cá nhân)
- Backend APIs cho xác thực email và tạo tài khoản
- OTP generation, storage, và validation
- Email service integration (gửi OTP và welcome email)
- Rate limiting và security measures
- Session management cho quy trình đăng ký
- Logging và monitoring

**Ngoài phạm vi (Out-of-scope):**
- Social login (Google, Facebook, etc.)
- SMS OTP verification
- Passwordless authentication
- Account verification qua link (chỉ sử dụng OTP)
- Multi-language support (sẽ xử lý ở phase sau)

### 1.4. Giải pháp đề xuất

#### Approach: Multi-Step Form với Session-Based State Management

**Lý do lựa chọn:**

1. **Security-First Design:**
   - OTP-based verification đảm bảo email ownership
   - Session-based flow giới hạn phạm vi attack surface
   - Rate limiting ở mọi layer (IP, email, session)

2. **Progressive Disclosure:**
   - Người dùng chỉ cần nhập thông tin cần thiết cho mỗi bước
   - Giảm cognitive load và tỷ lệ abandon
   - Validation ngay lập tức ở mỗi bước

3. **Separation of Concerns:**
   - Frontend: UI/UX và client-side validation
   - Backend: Business logic, data persistence, security
   - Email Service: Isolated microservice (có thể scale độc lập)
   - Cache Layer (Redis): Session, rate limiting, OTP storage

4. **Error Recovery:**
   - Người dùng có thể quay lại bước trước
   - Resend OTP mechanism
   - Session timeout handling
   - Clear error messages

---

## 2. System Architecture

### 2.1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js Frontend (Port 3000)                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │  Step 1 Page │  │  Step 2 Page │  │  Step 3 Page │     │ │
│  │  │ (Enter Email)│  │  (Enter OTP) │  │ (User Info)  │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │          │                  │                  │            │ │
│  │          └──────────────────┴──────────────────┘            │ │
│  │                            │                                │ │
│  │                  ┌─────────▼──────────┐                     │ │
│  │                  │  React Hook Form   │                     │ │
│  │                  │  + Zod Validation  │                     │ │
│  │                  └─────────┬──────────┘                     │ │
│  │                            │                                │ │
│  │                  ┌─────────▼──────────┐                     │ │
│  │                  │   TanStack Query   │                     │ │
│  │                  │   (API Client)     │                     │ │
│  │                  └─────────┬──────────┘                     │ │
│  │                            │                                │ │
│  │                  ┌─────────▼──────────┐                     │ │
│  │                  │   Axios HTTP       │                     │ │
│  │                  │   Client           │                     │ │
│  │                  └─────────┬──────────┘                     │ │
│  └────────────────────────────┼────────────────────────────────┘ │
└────────────────────────────────┼──────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────▼──────────────────────────────────┐
│                      APPLICATION LAYER                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         Express.js Backend API (Port 8000)                  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │              Middleware Stack                       │   │  │
│  │  │  • Helmet (Security Headers)                        │   │  │
│  │  │  • CORS                                             │   │  │
│  │  │  • Body Parser                                      │   │  │
│  │  │  • Cookie Parser                                    │   │  │
│  │  │  • Express Rate Limit                               │   │  │
│  │  │  • Error Handler                                    │   │  │
│  │  │  • Request Logger (Winston)                         │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                            │                                │  │
│  │  ┌─────────────────────────▼───────────────────────────┐   │  │
│  │  │           Auth Routes & Controllers                 │   │  │
│  │  │                                                      │   │  │
│  │  │  POST /api/auth/signup/send-otp                     │   │  │
│  │  │  POST /api/auth/signup/verify-otp                   │   │  │
│  │  │  POST /api/auth/signup/complete                     │   │  │
│  │  │  POST /api/auth/signup/resend-otp                   │   │  │
│  │  └──────────────────────┬───────────────────────────────┘   │  │
│  │                         │                                   │  │
│  │  ┌──────────────────────▼────────────────────────────────┐ │  │
│  │  │              Service Layer                           │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │  │
│  │  │  │ AuthService  │  │ OTPService   │  │UserService │ │ │  │
│  │  │  └──────────────┘  └──────────────┘  └────────────┘ │ │  │
│  │  └───────────────────────┬───────────────────────────────┘ │  │
│  └──────────────────────────┼─────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌─────────────────┐   ┌──────────────────┐
│  DATA LAYER   │    │   CACHE LAYER   │   │  EXTERNAL SVCS   │
│               │    │                 │   │                  │
│  ┌─────────┐  │    │  ┌───────────┐  │   │ ┌──────────────┐ │
│  │ MongoDB │  │    │  │   Redis   │  │   │ │Email Service │ │
│  │         │  │    │  │           │  │   │ │  (Nodemailer)│ │
│  │ • Users │  │    │  │• Sessions │  │   │ │              │ │
│  │ • OTPs  │  │    │  │• OTP Cache│  │   │ │ SMTP Config  │ │
│  │ • Logs  │  │    │  │• Rate Lim │  │   │ │   or SES     │ │
│  └─────────┘  │    │  └───────────┘  │   │ └──────────────┘ │
└───────────────┘    └─────────────────┘   └──────────────────┘
```

### 2.2. Technology Stack

#### Frontend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 15.3.2 | React framework with SSR/SSG |
| UI Library | React | 19.0.0 | Component-based UI |
| Language | TypeScript | 5.x | Type safety |
| State Management | Zustand | 5.0.8 | Global state (signup flow) |
| Server State | TanStack Query | 5.90.2 | API data fetching & caching |
| Form Handling | React Hook Form | 7.63.0 | Form state management |
| Validation | Zod | 4.1.11 | Schema validation |
| HTTP Client | Axios | 1.12.2 | API requests |
| UI Components | Radix UI | Various | Accessible components |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| OTP Input | input-otp | 1.4.2 | OTP input component |

#### Backend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | Latest LTS | JavaScript runtime |
| Framework | Express.js | 4.19.2 | Web framework |
| Language | TypeScript | 5.4.5 | Type safety |
| Database | MongoDB | 8.3.1 | Primary database |
| ODM | Mongoose | 8.3.1 | MongoDB object modeling |
| Cache | Redis | 4.6.13 | Session, rate limiting, OTP |
| Password Hash | Bcrypt | 5.1.1 | Password hashing |
| JWT | jsonwebtoken | 9.0.2 | Token generation |
| Email | Nodemailer | 6.9.14 | Email sending |
| Validation | Joi / class-validator | 17.13.3 / 0.14.1 | Request validation |
| Rate Limiting | express-rate-limit | 7.5.0 | API rate limiting |
| Security | Helmet | 7.1.0 | Security headers |
| Logging | Winston | 3.18.3 | Structured logging |

#### Infrastructure
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Reverse Proxy | Nginx | Load balancing, SSL termination |
| Process Manager | PM2 | Node.js process management |
| Monitoring | (TBD) | Application monitoring |
| Email Service | SMTP/AWS SES | Email delivery |

### 2.3. Communication Flow

#### 2.3.1. Request/Response Flow - Step 1 (Send OTP)
```
Client                    Backend API              Redis              MongoDB          Email Service
  │                           │                      │                   │                   │
  │ POST /signup/send-otp     │                      │                   │                   │
  ├──────────────────────────►│                      │                   │                   │
  │  { email: "user@..." }    │                      │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 1. Validate email    │                   │                   │
  │                           │    format            │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 2. Check rate limit  │                   │                   │
  │                           ├─────────────────────►│                   │                   │
  │                           │◄─────────────────────┤                   │                   │
  │                           │   OK/Rate limited    │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 3. Check email exists                    │                   │
  │                           ├──────────────────────┼──────────────────►│                   │
  │                           │◄─────────────────────┼───────────────────┤                   │
  │                           │    Email available   │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 4. Generate OTP      │                   │                   │
  │                           │    (6 digits)        │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 5. Hash OTP          │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 6. Store in Redis    │                   │                   │
  │                           ├─────────────────────►│                   │                   │
  │                           │  SET otp:{email}     │                   │                   │
  │                           │  EX 600 (10 min)     │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 7. Create session    │                   │                   │
  │                           ├─────────────────────►│                   │                   │
  │                           │  SET session:{id}    │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 8. Send OTP email    │                   │                   │
  │                           ├──────────────────────┼───────────────────┼──────────────────►│
  │                           │                      │                   │                   │
  │                           │                      │                   │    9. Send email  │
  │                           │                      │                   │       to SMTP     │
  │                           │                      │                   │                   │
  │◄──────────────────────────┤                      │                   │                   │
  │  { success: true,         │                      │                   │                   │
  │    sessionId: "...",      │                      │                   │                   │
  │    expiresIn: 600 }       │                      │                   │                   │
  │                           │                      │                   │                   │
```

#### 2.3.2. Request/Response Flow - Step 2 (Verify OTP)
```
Client                    Backend API              Redis              MongoDB
  │                           │                      │                   │
  │ POST /signup/verify-otp   │                      │                   │
  ├──────────────────────────►│                      │                   │
  │  { email, otp,            │                      │                   │
  │    sessionId }            │                      │                   │
  │                           │                      │                   │
  │                           │ 1. Validate session  │                   │
  │                           ├─────────────────────►│                   │
  │                           │◄─────────────────────┤                   │
  │                           │  Session data        │                   │
  │                           │                      │                   │
  │                           │ 2. Check attempts    │                   │
  │                           ├─────────────────────►│                   │
  │                           │◄─────────────────────┤                   │
  │                           │  Attempts < 3        │                   │
  │                           │                      │                   │
  │                           │ 3. Get OTP hash      │                   │
  │                           ├─────────────────────►│                   │
  │                           │◄─────────────────────┤                   │
  │                           │  OTP hash            │                   │
  │                           │                      │                   │
  │                           │ 4. Compare OTP       │                   │
  │                           │    bcrypt.compare()  │                   │
  │                           │                      │                   │
  │                           │ 5. Update session    │                   │
  │                           ├─────────────────────►│                   │
  │                           │  Mark verified=true  │                   │
  │                           │                      │                   │
  │                           │ 6. Generate token    │                   │
  │                           │    (JWT)             │                   │
  │                           │                      │                   │
  │◄──────────────────────────┤                      │                   │
  │  { success: true,         │                      │                   │
  │    token: "..." }         │                      │                   │
  │                           │                      │                   │
```

#### 2.3.3. Request/Response Flow - Step 3 (Complete Signup)
```
Client                    Backend API              Redis              MongoDB          Email Service
  │                           │                      │                   │                   │
  │ POST /signup/complete     │                      │                   │                   │
  ├──────────────────────────►│                      │                   │                   │
  │  { token, fullName,       │                      │                   │                   │
  │    password, phone }      │                      │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 1. Verify JWT token  │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 2. Get session       │                   │                   │
  │                           ├─────────────────────►│                   │                   │
  │                           │◄─────────────────────┤                   │                   │
  │                           │  { email, verified } │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 3. Validate input    │                   │                   │
  │                           │    (password rules)  │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 4. Hash password     │                   │                   │
  │                           │    bcrypt.hash()     │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 5. Create user       │                   │                   │
  │                           ├──────────────────────┼──────────────────►│                   │
  │                           │  INSERT INTO users   │                   │                   │
  │                           │◄─────────────────────┼───────────────────┤                   │
  │                           │  User created        │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 6. Delete session    │                   │                   │
  │                           ├─────────────────────►│                   │                   │
  │                           │  DEL session:{id}    │                   │                   │
  │                           │                      │                   │                   │
  │                           │ 7. Send welcome email│                   │                   │
  │                           ├──────────────────────┼───────────────────┼──────────────────►│
  │                           │                      │                   │                   │
  │◄──────────────────────────┤                      │                   │                   │
  │  { success: true,         │                      │                   │                   │
  │    userId: "...",         │                      │                   │                   │
  │    email: "..." }         │                      │                   │                   │
  │                           │                      │                   │                   │
```

---

## 3. User Flow / State Diagram

### 3.1. User Flow Diagram

```
                              ┌──────────────┐
                              │    START     │
                              │ (Visit /signup)│
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  STEP 1      │
                              │ Enter Email  │
                              └──────┬───────┘
                                     │
                          ┌──────────┼──────────┐
                          │                     │
                   Valid Email            Invalid Email
                          │                     │
                          ▼                     ▼
                  ┌───────────────┐      ┌──────────────┐
                  │Check if email │      │ Show error   │
                  │already exists │      │ Stay Step 1  │
                  └───────┬───────┘      └──────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
           Email Exists        Email Available
                │                   │
                ▼                   ▼
        ┌──────────────┐    ┌───────────────┐
        │ Show error   │    │ Generate OTP  │
        │ Link to login│    │ Send to email │
        └──────────────┘    └───────┬───────┘
                                    │
                             ┌──────▼───────┐
                             │   STEP 2     │
                             │  Enter OTP   │
                             └──────┬───────┘
                                    │
                          ┌─────────┼─────────┐
                          │                   │
                    Valid OTP          Invalid OTP
                          │                   │
                          ▼                   ▼
                  ┌───────────────┐    ┌──────────────────┐
                  │  OTP Correct  │    │ Increment attempt│
                  │ Mark verified │    │  Show error      │
                  └───────┬───────┘    └────────┬─────────┘
                          │                     │
                          │              Attempts < 3 ─┐
                          │                     │      │
                          │              Attempts >= 3 │
                          │                     │      │
                          │                     ▼      │
                          │              ┌──────────────▼─┐
                          │              │  Lock OTP      │
                          │              │  Request resend│
                          │              └────────────────┘
                          │
                   ┌──────▼───────┐
                   │   STEP 3     │
                   │ Enter Info   │
                   │ (Name, Pass) │
                   └──────┬───────┘
                          │
                          │
                ┌─────────┴──────────┐
                │                    │
          Valid Data          Invalid Data
                │                    │
                ▼                    ▼
        ┌───────────────┐     ┌─────────────┐
        │ Create User   │     │ Show errors │
        │ Hash Password │     │ Stay Step 3 │
        │ Save to DB    │     └─────────────┘
        └───────┬───────┘
                │
         ┌──────▼───────┐
         │  Send Welcome│
         │     Email    │
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │   SUCCESS    │
         │ (Redirect to │
         │  login/dash) │
         └──────────────┘


┌─────────────── Error Handling Flows ───────────────┐
│                                                     │
│  OTP Expired?                                       │
│     └─► Show "Expired" → Enable "Resend OTP"       │
│                                                     │
│  Session Timeout?                                   │
│     └─► Show "Session Expired" → Restart Step 1    │
│                                                     │
│  Email Service Down?                                │
│     └─► Retry 3 times → Show error → Log incident  │
│                                                     │
│  Network Error?                                     │
│     └─► Show connection error → Enable retry       │
│                                                     │
│  Rate Limit Exceeded?                               │
│     └─► Show "Too many attempts" + wait time       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.2. State Diagram (Frontend State Management)

```
┌────────────────────────────────────────────────────────────┐
│                   Signup State Machine                      │
└────────────────────────────────────────────────────────────┘

     ┌───────────────┐
     │  IDLE/INITIAL │
     │  step = 1     │
     │  email = null │
     └───────┬───────┘
             │
             │ User enters email
             │ setEmail(email)
             │
     ┌───────▼────────┐
     │ SENDING_OTP    │
     │ loading = true │
     └───────┬────────┘
             │
        ┌────┴─────┐
        │          │
   Success      Error
        │          │
        ▼          ▼
 ┌──────────┐  ┌────────────┐
 │OTP_SENT  │  │ OTP_ERROR  │
 │step = 2  │  │ Show error │
 │sessionId │  │ Stay step 1│
 │expiresAt │  └────────────┘
 └────┬─────┘
      │
      │ User enters OTP
      │ verifyOTP(otp)
      │
 ┌────▼─────────┐
 │VERIFYING_OTP │
 │loading = true│
 └────┬─────────┘
      │
 ┌────┴─────┐
 │          │
Success   Error
 │          │
 ▼          ▼
┌────────────┐  ┌──────────────┐
│OTP_VERIFIED│  │OTP_INVALID   │
│step = 3    │  │attempts++    │
│token set   │  │Show error    │
└────┬───────┘  │Stay step 2   │
     │          └──────────────┘
     │
     │ User submits form
     │ completeSignup(data)
     │
┌────▼────────────┐
│CREATING_ACCOUNT │
│loading = true   │
└────┬────────────┘
     │
┌────┴─────┐
│          │
Success  Error
│          │
▼          ▼
┌──────────┐  ┌─────────────┐
│ SUCCESS  │  │SIGNUP_ERROR │
│Redirect  │  │Show error   │
│          │  │Stay step 3  │
└──────────┘  └─────────────┘


┌──────── Additional State Transitions ────────┐
│                                               │
│  Any state + Session Timeout                  │
│     └─► IDLE (Reset all state)                │
│                                               │
│  OTP_SENT + Timer Expired                     │
│     └─► OTP_EXPIRED (Enable resend)           │
│                                               │
│  OTP_INVALID + attempts >= 3                  │
│     └─► OTP_LOCKED (Force resend)             │
│                                               │
│  Any state + User clicks "Back"               │
│     └─► Previous step (preserve data)         │
│                                               │
└───────────────────────────────────────────────┘
```

### 3.3. Backend State Flow (Session State)

```
Redis Session State:

signup:session:{sessionId} = {
  email: string,
  step: 1 | 2 | 3,
  verified: boolean,
  createdAt: timestamp,
  expiresAt: timestamp,
  ipAddress: string
}

State Transitions:

1. POST /send-otp
   └─► Create session: { email, step: 1, verified: false }

2. POST /verify-otp (success)
   └─► Update session: { step: 2, verified: true }

3. POST /complete (success)
   └─► Delete session (cleanup)

4. Timeout (30 minutes)
   └─► Auto-delete session (Redis TTL)
```

---

## 4. Database Schema (High-Level)

### 4.1. MongoDB Collections

#### 4.1.1. Users Collection
```typescript
interface User {
  _id: ObjectId;                    // Auto-generated
  email: string;                    // Unique, indexed, lowercase
  emailVerified: boolean;           // true after OTP verification
  passwordHash: string;             // bcrypt hash
  fullName: string;
  phone?: string;                   // Optional
  role: 'user' | 'admin';          // Default: 'user'
  status: 'active' | 'suspended';  // Default: 'active'
  createdAt: Date;                 // Auto timestamp
  updatedAt: Date;                 // Auto timestamp
  lastLogin?: Date;
  metadata: {
    signupIp?: string;
    signupUserAgent?: string;
  };
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ status: 1, role: 1 });
```

#### 4.1.2. OTP Verifications Collection (Optional - can use Redis only)
```typescript
interface OTPVerification {
  _id: ObjectId;
  email: string;                   // Indexed
  otpHash: string;                 // bcrypt hash of OTP
  sessionId: string;               // Unique, indexed
  attempts: number;                // Failed attempts count
  locked: boolean;                 // true after 3 failed attempts
  createdAt: Date;                 // Auto timestamp
  expiresAt: Date;                 // TTL index for auto-deletion
  verified: boolean;               // true after successful verification
  ipAddress: string;
}

// Indexes
db.otp_verifications.createIndex({ email: 1 });
db.otp_verifications.createIndex({ sessionId: 1 }, { unique: true });
db.otp_verifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
db.otp_verifications.createIndex({ createdAt: -1 });
```

#### 4.1.3. Signup Attempts Collection (Audit Log)
```typescript
interface SignupAttempt {
  _id: ObjectId;
  email?: string;                  // Indexed
  ipAddress: string;               // Indexed
  step: 'send_otp' | 'verify_otp' | 'complete'; // Current step
  success: boolean;
  errorCode?: string;              // e.g., 'INVALID_OTP', 'EMAIL_EXISTS'
  errorMessage?: string;
  metadata: {
    userAgent?: string;
    sessionId?: string;
  };
  createdAt: Date;                 // Auto timestamp
}

// Indexes
db.signup_attempts.createIndex({ email: 1, createdAt: -1 });
db.signup_attempts.createIndex({ ipAddress: 1, createdAt: -1 });
db.signup_attempts.createIndex({ createdAt: -1 });
db.signup_attempts.createIndex({ success: 1, step: 1 });
```

### 4.2. Redis Data Structures

#### 4.2.1. Session Storage
```
Key: signup:session:{sessionId}
Type: Hash
TTL: 1800 seconds (30 minutes)

Fields:
  email: string
  step: string (1|2|3)
  verified: string (true|false)
  createdAt: string (ISO timestamp)
  ipAddress: string

Commands:
  HSET signup:session:abc123 email "user@example.com" step "1" verified "false"
  EXPIRE signup:session:abc123 1800
  HGETALL signup:session:abc123
  DEL signup:session:abc123
```

#### 4.2.2. OTP Storage
```
Key: signup:otp:{email}:{sessionId}
Type: String (bcrypt hash)
TTL: 600 seconds (10 minutes)

Value: $2b$12$... (bcrypt hash of 6-digit OTP)

Commands:
  SET signup:otp:user@ex.com:abc123 "$2b$12$..." EX 600
  GET signup:otp:user@ex.com:abc123
  DEL signup:otp:user@ex.com:abc123
```

#### 4.2.3. OTP Attempts Tracking
```
Key: signup:otp:attempts:{sessionId}
Type: String (counter)
TTL: 600 seconds (10 minutes)

Value: 0|1|2|3...

Commands:
  INCR signup:otp:attempts:abc123
  EXPIRE signup:otp:attempts:abc123 600
  GET signup:otp:attempts:abc123
```

#### 4.2.4. Rate Limiting - IP Based
```
Key: signup:ratelimit:ip:{ip}:{action}
Type: String (counter)
TTL: 3600 seconds (1 hour)

Actions: send_otp, verify_otp, complete

Value: 0|1|2|3...

Commands:
  INCR signup:ratelimit:ip:192.168.1.1:send_otp
  EXPIRE signup:ratelimit:ip:192.168.1.1:send_otp 3600
  GET signup:ratelimit:ip:192.168.1.1:send_otp
```

#### 4.2.5. Rate Limiting - Email Based
```
Key: signup:ratelimit:email:{email}:send_otp
Type: String (counter)
TTL: 3600 seconds (1 hour)

Value: 0|1|2|3...

Commands:
  INCR signup:ratelimit:email:user@ex.com:send_otp
  EXPIRE signup:ratelimit:email:user@ex.com:send_otp 3600
  GET signup:ratelimit:email:user@ex.com:send_otp
```

#### 4.2.6. Resend OTP Cooldown
```
Key: signup:resend:cooldown:{email}
Type: String (timestamp)
TTL: 60 seconds

Value: ISO timestamp of last send

Commands:
  SET signup:resend:cooldown:user@ex.com "2024-11-04T10:00:00Z" EX 60
  GET signup:resend:cooldown:user@ex.com
```

### 4.3. Data Relationships

```
┌─────────────────┐
│     Users       │
│                 │
│  _id (PK)       │◄─────┐
│  email (UNIQUE) │      │
│  passwordHash   │      │
│  fullName       │      │ Reference
│  ...            │      │ (for audit)
└─────────────────┘      │
                         │
                         │
              ┌──────────┴───────┐
              │                  │
    ┌─────────▼────────┐  ┌──────▼──────────┐
    │ OTP Verifications│  │ Signup Attempts │
    │                  │  │                 │
    │  email           │  │  email          │
    │  sessionId       │  │  ipAddress      │
    │  otpHash         │  │  step           │
    │  attempts        │  │  success        │
    │  expiresAt       │  │  createdAt      │
    └──────────────────┘  └─────────────────┘
```

### 4.4. Data Flow & Lifecycle

```
┌────────────────────────────────────────────────────┐
│           Data Lifecycle During Signup             │
└────────────────────────────────────────────────────┘

Step 1: Send OTP
┌──────────────────────────────────────────────────┐
│ Redis                                            │
│  • CREATE session (30 min TTL)                   │
│  • CREATE OTP hash (10 min TTL)                  │
│  • INCREMENT rate limit counter (1 hour TTL)     │
│                                                  │
│ MongoDB                                          │
│  • INSERT signup_attempt record                  │
└──────────────────────────────────────────────────┘

Step 2: Verify OTP
┌──────────────────────────────────────────────────┐
│ Redis                                            │
│  • READ session data                             │
│  • READ & COMPARE OTP hash                       │
│  • UPDATE session (verified = true)              │
│  • DELETE OTP hash after success                 │
│  • INCREMENT attempts counter on failure         │
│                                                  │
│ MongoDB                                          │
│  • INSERT signup_attempt record                  │
└──────────────────────────────────────────────────┘

Step 3: Complete Signup
┌──────────────────────────────────────────────────┐
│ MongoDB                                          │
│  • INSERT new user document                      │
│  • INSERT signup_attempt record (success)        │
│                                                  │
│ Redis                                            │
│  • DELETE session data (cleanup)                 │
│  • DELETE any remaining OTP data                 │
└──────────────────────────────────────────────────┘

Automatic Cleanup
┌──────────────────────────────────────────────────┐
│ Redis TTL (automatic)                            │
│  • Session expires after 30 minutes              │
│  • OTP expires after 10 minutes                  │
│  • Rate limits reset after 1 hour                │
│  • Cooldowns reset after 60 seconds              │
│                                                  │
│ MongoDB TTL Index (automatic)                    │
│  • OTP records deleted after expiry              │
│  • Old signup_attempts archived (manual cron)    │
└──────────────────────────────────────────────────┘
```

---

## 5. Risks & Impact on Existing Features

### 5.1. Technical Risks

#### 5.1.1. HIGH RISK: Email Service Dependency

**Risk Description:**
- Toàn bộ signup flow phụ thuộc vào email service (Nodemailer + SMTP)
- Nếu email service down, người dùng không thể đăng ký

**Impact:**
- Complete signup flow breakdown
- Loss of new user acquisitions
- Negative user experience

**Mitigation Strategies:**
1. **Redundancy:**
   - Implement fallback email provider (AWS SES backup)
   - Use queue system (Bull/Redis) for retry mechanism
   - Maximum 3 retry attempts with exponential backoff

2. **Monitoring & Alerting:**
   - Monitor email delivery success rate
   - Alert when delivery rate drops below 95%
   - Track email service response times

3. **Graceful Degradation:**
   - Show clear error message to users
   - Offer alternative contact method
   - Log all failed attempts for manual follow-up

**Code Example:**
```typescript
// Email service with retry
async sendOTPEmail(email: string, otp: string) {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.emailService.send({
        to: email,
        subject: 'Your OTP Code',
        html: this.otpTemplate(otp)
      });
      return { success: true };
    } catch (error) {
      if (i === maxRetries - 1) {
        await this.logEmailFailure(email, error);
        throw new EmailServiceError('Failed to send OTP');
      }
      await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

#### 5.1.2. MEDIUM RISK: Redis Availability

**Risk Description:**
- Session data, OTP, rate limiting lưu trên Redis
- Redis down = không thể verify OTP, lose session state

**Impact:**
- In-progress signups bị fail
- Users phải restart signup process
- Rate limiting không hoạt động (potential abuse)

**Mitigation Strategies:**
1. **High Availability Setup:**
   - Redis Sentinel hoặc Redis Cluster
   - Master-Slave replication
   - Automatic failover

2. **Fallback Mechanism:**
   - Store critical data (OTP) in MongoDB as backup
   - Session recreation từ temporary tokens
   - Graceful degradation của rate limiting

3. **Data Persistence:**
   - Enable Redis persistence (RDB + AOF)
   - Regular backups
   - Data recovery procedures

#### 5.1.3. MEDIUM RISK: MongoDB Performance

**Risk Description:**
- Large volume of concurrent signups có thể overwhelm database
- Unoptimized queries slow down signup process

**Impact:**
- Slow response times (> 1 second)
- Timeout errors
- Poor user experience

**Mitigation Strategies:**
1. **Query Optimization:**
   - Proper indexing (email, createdAt)
   - Use lean() queries khi không cần full documents
   - Limit returned fields

2. **Connection Pooling:**
   - Configure Mongoose connection pool
   - Monitor connection usage
   - Implement connection timeouts

3. **Caching Strategy:**
   - Cache email existence checks in Redis (short TTL)
   - Reduce redundant DB queries

#### 5.1.4. LOW-MEDIUM RISK: Race Conditions

**Risk Description:**
- Concurrent requests với cùng email có thể bypass duplicate check
- Multiple OTP generation cho cùng session

**Impact:**
- Duplicate user accounts
- Confused OTP state
- Data inconsistency

**Mitigation Strategies:**
1. **Database Constraints:**
   - Unique index on email field (MongoDB)
   - Catch duplicate key errors

2. **Distributed Locking:**
   - Use Redis SETNX for locks
   - Lock email during signup process

```typescript
async acquireSignupLock(email: string): Promise<boolean> {
  const lockKey = `signup:lock:${email}`;
  const acquired = await this.redis.set(
    lockKey,
    '1',
    'EX', 300,  // 5 minutes
    'NX'        // Only if not exists
  );
  return acquired === 'OK';
}
```

3. **Idempotency:**
   - Generate idempotency keys for critical operations
   - Handle duplicate requests gracefully

### 5.2. Security Risks

#### 5.2.1. HIGH RISK: Brute Force / Credential Stuffing

**Risk Description:**
- Attackers có thể brute force OTP codes
- Automated bots create fake accounts

**Impact:**
- System abuse
- Database pollution
- Resource exhaustion

**Mitigation Strategies:**
1. **Rate Limiting (Already Implemented):**
   - 5 OTP requests per hour per IP
   - 3 OTP requests per hour per email
   - 3 failed OTP attempts per session

2. **Additional Protections:**
   - Implement CAPTCHA for Step 1 (optional)
   - Device fingerprinting
   - IP reputation checking

3. **Monitoring:**
   - Alert on unusual signup patterns
   - Auto-ban suspicious IPs
   - Daily audit of signup attempts

#### 5.2.2. MEDIUM RISK: Email Enumeration

**Risk Description:**
- Attackers có thể enumerate registered emails
- Different responses cho existing vs non-existing emails

**Impact:**
- Privacy leak
- Targeted phishing attacks

**Mitigation Strategies:**
1. **Consistent Responses:**
   - Same success message cho existing và non-existing emails
   - Delay responses để avoid timing attacks

```typescript
// Bad: Reveals email existence
if (emailExists) {
  return res.status(409).json({ error: 'Email already exists' });
}

// Good: Generic message, handle silently
if (emailExists) {
  await this.sendEmailAlreadyRegisteredNotification(email);
}
return res.status(200).json({
  success: true,
  message: 'If email exists, OTP has been sent'
});
```

2. **Rate Limiting:**
   - Prevent mass email enumeration attempts

#### 5.2.3. MEDIUM RISK: Session Hijacking

**Risk Description:**
- SessionId theft qua XSS, network sniffing
- Attacker complete signup với stolen session

**Impact:**
- Unauthorized account creation
- Email compromise

**Mitigation Strategies:**
1. **Secure Session Management:**
   - HTTPS only (strict)
   - Secure, HttpOnly cookies
   - Short session lifetime (30 minutes)
   - Rotate session IDs after OTP verification

2. **Additional Validation:**
   - Verify IP address consistency
   - User agent validation
   - Require re-verification for suspicious activity

### 5.3. Impact on Existing Features

#### 5.3.1. Authentication System

**Current State:**
- (Giả sử) Hiện tại có basic login với email/password
- Có thể có JWT-based authentication

**Impact of New Signup:**
- **POSITIVE:** Cải thiện security với email verification
- **POSITIVE:** Consistent user data (verified emails)
- **NEUTRAL:** Authentication flow không đổi (vẫn email/password)

**Required Changes:**
```typescript
// Before: Direct user creation
async createUser(email, password) {
  return User.create({ email, password });
}

// After: Must set emailVerified flag
async createUser(email, password) {
  return User.create({
    email,
    password,
    emailVerified: true  // From OTP verification
  });
}

// Login flow: Check email verification
async login(email, password) {
  const user = await User.findOne({ email });

  if (!user.emailVerified) {
    throw new Error('Email not verified');
  }

  // Continue with authentication...
}
```

**Testing Required:**
- Verify login flow works với verified emails
- Test rejected login cho unverified emails (edge case)
- Integration test signup → login flow

#### 5.3.2. User Management

**Current State:**
- Admin panel có thể có CRUD cho users
- Có thể có user listing, search

**Impact:**
- **POSITIVE:** Thêm verified status indicator
- **NEUTRAL:** CRUD operations không đổi
- **CAUTION:** Admin-created users cần handle emailVerified flag

**Required Changes:**
- Update admin UI để show email verification status
- Admin create user: có thể bypass OTP (set verified=true)
- Bulk import users: cần strategy cho verification

#### 5.3.3. Email Notifications

**Current State:**
- Có thể đã có email notifications cho các features khác

**Impact:**
- **POSITIVE:** Tái sử dụng email infrastructure
- **CAUTION:** Ensure email service có thể handle increased load
- **CAUTION:** Email templates cần consistent branding

**Required Changes:**
- Consolidate email service
- Shared email template system
- Queue management cho multiple email types

#### 5.3.4. Rate Limiting Infrastructure

**Current State:**
- Có thể đã có rate limiting cho API endpoints

**Impact:**
- **POSITIVE:** Tái sử dụng rate limiting middleware
- **CAUTION:** Cần separate limits cho signup vs other endpoints
- **NEUTRAL:** Không conflict nếu properly scoped

**Implementation:**
```typescript
// Shared rate limiter, different configs
const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.ip + ':signup'
});

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => req.ip + ':api'
});
```

#### 5.3.5. Database & Performance

**Current State:**
- Existing database load
- Current connection pool settings

**Impact:**
- **CAUTION:** Additional load từ signup operations
- **CAUTION:** New indexes có thể affect write performance
- **POSITIVE:** Redis caching giảm DB load

**Monitoring Required:**
- Database query performance
- Connection pool usage
- Index performance (email lookups)
- Redis memory usage

**Load Testing Targets:**
- 100 concurrent signups
- Sustained 50 signups/minute
- Peak load: 200 signups in 5 minutes

### 5.4. Risk Mitigation Summary Table

| Risk | Severity | Probability | Impact | Mitigation | Owner |
|------|----------|-------------|---------|------------|-------|
| Email service failure | HIGH | MEDIUM | HIGH | Retry, fallback provider, monitoring | Backend Lead |
| Redis downtime | MEDIUM | LOW | MEDIUM | HA setup, MongoDB backup | DevOps |
| DB performance | MEDIUM | MEDIUM | MEDIUM | Indexing, connection pool, caching | Backend Dev |
| Race conditions | MEDIUM | LOW | MEDIUM | Distributed locks, unique constraints | Backend Dev |
| Brute force attacks | HIGH | HIGH | HIGH | Rate limiting, CAPTCHA, monitoring | Security Lead |
| Email enumeration | MEDIUM | MEDIUM | LOW | Consistent responses, rate limiting | Backend Dev |
| Session hijacking | MEDIUM | LOW | HIGH | HTTPS, secure cookies, IP validation | Backend Dev |
| Auth system impact | LOW | LOW | MEDIUM | Integration testing | QA Lead |
| Existing features | LOW | LOW | LOW | Regression testing | QA Team |

### 5.5. Rollback Plan

Nếu có critical issues sau deployment:

**Phase 1: Immediate (< 5 minutes)**
- Disable signup routes (return maintenance message)
- Keep existing login working
- Alert team

**Phase 2: Short-term (< 1 hour)**
- Rollback to previous version
- Verify database state
- Clean up incomplete signup sessions

**Phase 3: Investigation**
- Analyze logs and errors
- Identify root cause
- Plan fix or alternative approach

**Feature Flag Strategy:**
```typescript
// Implement feature flag
const SIGNUP_ENABLED = process.env.FEATURE_SIGNUP_ENABLED === 'true';

if (!SIGNUP_ENABLED) {
  return res.status(503).json({
    error: 'Signup temporarily unavailable'
  });
}
```

---

## 6. Deployment Strategy

### 6.1. Phased Rollout

**Phase 1: Internal Testing (1 week)**
- Deploy to staging environment
- Team testing với real email addresses
- Load testing với 100 concurrent users

**Phase 2: Beta Release (1 week)**
- Feature flag enabled cho 10% users
- Monitor metrics closely
- Gather user feedback

**Phase 3: Full Release**
- Gradual rollout: 25% → 50% → 100%
- Monitor và adjust based on performance

### 6.2. Success Metrics

- Signup completion rate > 70%
- Average signup time < 5 minutes
- Email delivery rate > 99%
- API response time < 500ms
- Error rate < 1%
- Zero security incidents

---

**Document Version:** 1.0
**Last Updated:** 2024-11-04
**Prepared by:** Development Team
**Reviewed by:** [To be assigned]
**Approved by:** [To be assigned]
