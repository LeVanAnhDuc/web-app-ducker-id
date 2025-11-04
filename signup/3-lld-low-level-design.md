# LLD - Low-Level Design Document
## Tính năng Đăng ký người dùng (Sign Up)

---

**Document Type:** Low-Level Design (LLD)
**Target Audience:** Backend Developers, Frontend Developers
**Version:** 1.0
**Last Updated:** 2024-11-04
**Status:** Draft

---

## 1. API Specification

### 1.1. API Endpoint: Send OTP

#### Endpoint
```
POST /api/auth/signup/send-otp
```

#### Description
Gửi mã OTP đến email để xác thực email ownership. Đây là bước đầu tiên trong quy trình đăng ký.

#### Headers
```
Content-Type: application/json
```

#### Request Body
```typescript
interface SendOTPRequest {
  email: string;  // Valid email format, required
}
```

#### Request Example
```json
{
  "email": "user@example.com"
}
```

#### Success Response (200 OK)
```typescript
interface SendOTPResponse {
  success: true;
  message: string;
  data: {
    sessionId: string;      // UUID v4 format
    email: string;          // Email sent to (masked)
    expiresIn: number;      // Seconds until OTP expires (600)
    expiresAt: string;      // ISO timestamp
    canResendAt: string;    // ISO timestamp (60s cooldown)
  };
}
```

#### Success Response Example
```json
{
  "success": true,
  "message": "Mã OTP đã được gửi đến email của bạn",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "u***@example.com",
    "expiresIn": 600,
    "expiresAt": "2024-11-04T10:10:00.000Z",
    "canResendAt": "2024-11-04T10:01:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request - Invalid Email Format**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL_FORMAT",
    "message": "Email không hợp lệ",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Must be a valid email address"
    }
  }
}
```

**409 Conflict - Email Already Exists**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email đã được đăng ký",
    "details": {
      "field": "email",
      "suggestions": [
        "Đăng nhập vào tài khoản của bạn",
        "Sử dụng tính năng quên mật khẩu"
      ]
    }
  }
}
```

**429 Too Many Requests - Rate Limit Exceeded**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Bạn đã vượt quá số lần gửi OTP cho phép",
    "details": {
      "limit": 5,
      "remaining": 0,
      "resetAt": "2024-11-04T11:00:00.000Z",
      "retryAfter": 3600
    }
  }
}
```

**500 Internal Server Error - Email Service Failure**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_SERVICE_ERROR",
    "message": "Không thể gửi email. Vui lòng thử lại sau",
    "details": {
      "retryable": true,
      "retryAfter": 60
    }
  }
}
```

#### Status Codes Summary
| Code | Description | Scenario |
|------|-------------|----------|
| 200 | OK | OTP sent successfully |
| 400 | Bad Request | Invalid input data |
| 409 | Conflict | Email already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server/service error |
| 503 | Service Unavailable | Email service down |

---

### 1.2. API Endpoint: Verify OTP

#### Endpoint
```
POST /api/auth/signup/verify-otp
```

#### Description
Xác thực mã OTP được gửi đến email. Sau khi xác thực thành công, trả về token để tiếp tục bước 3.

#### Headers
```
Content-Type: application/json
```

#### Request Body
```typescript
interface VerifyOTPRequest {
  email: string;        // Must match email from step 1
  otp: string;          // 6-digit code
  sessionId: string;    // Session ID from step 1
}
```

#### Request Example
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Success Response (200 OK)
```typescript
interface VerifyOTPResponse {
  success: true;
  message: string;
  data: {
    verified: true;
    token: string;           // JWT token for step 3
    tokenExpiresIn: number;  // Token validity in seconds (1800)
    tokenExpiresAt: string;  // ISO timestamp
    nextStep: string;        // "complete_signup"
  };
}
```

#### Success Response Example
```json
{
  "success": true,
  "message": "Xác thực OTP thành công",
  "data": {
    "verified": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenExpiresIn": 1800,
    "tokenExpiresAt": "2024-11-04T10:30:00.000Z",
    "nextStep": "complete_signup"
  }
}
```

#### Error Responses

**400 Bad Request - Invalid OTP Format**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP_FORMAT",
    "message": "Mã OTP không hợp lệ",
    "details": {
      "field": "otp",
      "constraint": "Must be 6 digits"
    }
  }
}
```

**401 Unauthorized - Invalid OTP**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Mã OTP không chính xác",
    "details": {
      "attemptsRemaining": 2,
      "maxAttempts": 3,
      "lockoutWarning": "Sau 3 lần thử sai, bạn sẽ cần yêu cầu OTP mới"
    }
  }
}
```

**401 Unauthorized - OTP Expired**
```json
{
  "success": false,
  "error": {
    "code": "OTP_EXPIRED",
    "message": "Mã OTP đã hết hạn",
    "details": {
      "expiredAt": "2024-11-04T10:10:00.000Z",
      "action": "resend_otp"
    }
  }
}
```

**403 Forbidden - OTP Locked**
```json
{
  "success": false,
  "error": {
    "code": "OTP_LOCKED",
    "message": "Mã OTP đã bị khóa do nhập sai quá nhiều lần",
    "details": {
      "failedAttempts": 3,
      "action": "resend_otp",
      "reason": "Too many failed attempts"
    }
  }
}
```

**404 Not Found - Session Not Found**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Phiên làm việc không tồn tại hoặc đã hết hạn",
    "details": {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "action": "restart_signup"
    }
  }
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau",
    "details": {
      "limit": 10,
      "remaining": 0,
      "resetAt": "2024-11-04T11:00:00.000Z",
      "retryAfter": 3600
    }
  }
}
```

#### Status Codes Summary
| Code | Description | Scenario |
|------|-------------|----------|
| 200 | OK | OTP verified successfully |
| 400 | Bad Request | Invalid input format |
| 401 | Unauthorized | Invalid or expired OTP |
| 403 | Forbidden | OTP locked due to failed attempts |
| 404 | Not Found | Session not found/expired |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

### 1.3. API Endpoint: Resend OTP

#### Endpoint
```
POST /api/auth/signup/resend-otp
```

#### Description
Gửi lại mã OTP mới. OTP cũ sẽ bị vô hiệu hóa. Có cooldown 60 giây giữa các lần gửi.

#### Headers
```
Content-Type: application/json
```

#### Request Body
```typescript
interface ResendOTPRequest {
  email: string;
  sessionId: string;
}
```

#### Request Example
```json
{
  "email": "user@example.com",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Success Response (200 OK)
```typescript
interface ResendOTPResponse {
  success: true;
  message: string;
  data: {
    email: string;          // Masked email
    expiresIn: number;
    expiresAt: string;
    canResendAt: string;    // Next allowed resend time
    resendCount: number;    // Number of times OTP has been resent
  };
}
```

#### Success Response Example
```json
{
  "success": true,
  "message": "Mã OTP mới đã được gửi đến email của bạn",
  "data": {
    "email": "u***@example.com",
    "expiresIn": 600,
    "expiresAt": "2024-11-04T10:20:00.000Z",
    "canResendAt": "2024-11-04T10:11:00.000Z",
    "resendCount": 1
  }
}
```

#### Error Responses

**429 Too Many Requests - Cooldown Active**
```json
{
  "success": false,
  "error": {
    "code": "RESEND_COOLDOWN_ACTIVE",
    "message": "Vui lòng đợi trước khi gửi lại OTP",
    "details": {
      "canResendAt": "2024-11-04T10:11:00.000Z",
      "remainingSeconds": 45,
      "cooldownPeriod": 60
    }
  }
}
```

**429 Too Many Requests - Daily Limit**
```json
{
  "success": false,
  "error": {
    "code": "RESEND_LIMIT_EXCEEDED",
    "message": "Bạn đã vượt quá số lần gửi lại OTP cho phép",
    "details": {
      "dailyLimit": 5,
      "resetAt": "2024-11-05T00:00:00.000Z",
      "suggestion": "Vui lòng liên hệ hỗ trợ nếu bạn cần trợ giúp"
    }
  }
}
```

#### Status Codes Summary
| Code | Description | Scenario |
|------|-------------|----------|
| 200 | OK | OTP resent successfully |
| 400 | Bad Request | Invalid input |
| 404 | Not Found | Session not found |
| 429 | Too Many Requests | Cooldown or limit exceeded |
| 500 | Internal Server Error | Email service error |

---

### 1.4. API Endpoint: Complete Signup

#### Endpoint
```
POST /api/auth/signup/complete
```

#### Description
Hoàn tất đăng ký bằng cách tạo user account với thông tin đầy đủ. Yêu cầu token từ bước verify OTP.

#### Headers
```
Content-Type: application/json
Authorization: Bearer <token_from_verify_otp>
```

#### Request Body
```typescript
interface CompleteSignupRequest {
  fullName: string;         // 2-100 characters
  password: string;         // Min 8 chars, complexity requirements
  confirmPassword: string;  // Must match password
  phone?: string;           // Optional, E.164 format
  acceptTerms: boolean;     // Must be true
}
```

#### Request Example
```json
{
  "fullName": "Nguyễn Văn A",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phone": "+84912345678",
  "acceptTerms": true
}
```

#### Success Response (201 Created)
```typescript
interface CompleteSignupResponse {
  success: true;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      phone?: string;
      emailVerified: boolean;
      createdAt: string;
    };
    session?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}
```

#### Success Response Example
```json
{
  "success": true,
  "message": "Đăng ký thành công! Chào mừng bạn đến với hệ thống",
  "data": {
    "user": {
      "id": "user_2abc3def4ghi5jkl",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "+84912345678",
      "emailVerified": true,
      "createdAt": "2024-11-04T10:15:30.000Z"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400
    }
  }
}
```

#### Error Responses

**400 Bad Request - Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": {
      "fields": [
        {
          "field": "password",
          "message": "Mật khẩu phải có ít nhất 8 ký tự",
          "constraints": {
            "minLength": 8,
            "hasUppercase": true,
            "hasLowercase": true,
            "hasNumber": true,
            "hasSpecialChar": true
          }
        }
      ]
    }
  }
}
```

**400 Bad Request - Password Mismatch**
```json
{
  "success": false,
  "error": {
    "code": "PASSWORD_MISMATCH",
    "message": "Mật khẩu xác nhận không khớp",
    "details": {
      "field": "confirmPassword"
    }
  }
}
```

**401 Unauthorized - Invalid Token**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token không hợp lệ hoặc đã hết hạn",
    "details": {
      "action": "restart_signup"
    }
  }
}
```

**409 Conflict - Email Already Used**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_REGISTERED",
    "message": "Email đã được đăng ký bởi tài khoản khác",
    "details": {
      "reason": "Email was registered during verification process",
      "action": "login_or_recover"
    }
  }
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_CREATION_FAILED",
    "message": "Không thể tạo tài khoản. Vui lòng thử lại",
    "details": {
      "retryable": true
    }
  }
}
```

#### Status Codes Summary
| Code | Description | Scenario |
|------|-------------|----------|
| 201 | Created | Account created successfully |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Invalid/expired token |
| 409 | Conflict | Email already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database/server error |

---

### 1.5. API Endpoints Summary Table

| Endpoint | Method | Auth Required | Rate Limit | Cache |
|----------|--------|---------------|------------|-------|
| `/api/auth/signup/send-otp` | POST | No | 5/hour per IP | No |
| `/api/auth/signup/verify-otp` | POST | No | 10/hour per IP | No |
| `/api/auth/signup/resend-otp` | POST | No | 5/hour per email | No |
| `/api/auth/signup/complete` | POST | Yes (Bearer) | 5/hour per IP | No |

---

## 2. Sequence Diagrams

### 2.1. Sequence Diagram - Complete Signup Flow (Happy Path)

```
┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐
│Client│         │ FE   │         │ BE   │         │Redis │         │MongoDB│        │Email │
│      │         │(Next)│         │(Exp) │         │      │         │       │        │Service│
└──┬───┘         └──┬───┘         └──┬───┘         └──┬───┘         └───┬───┘        └──┬───┘
   │                │                │                │                 │                │
   │ 1. Visit       │                │                │                 │                │
   │ /signup page   │                │                │                 │                │
   ├───────────────>│                │                │                 │                │
   │                │                │                │                 │                │
   │                │ 2. Render form │                │                 │                │
   │<───────────────┤                │                │                 │                │
   │                │                │                │                 │                │
   │ 3. Enter email │                │                │                 │                │
   │ & submit       │                │                │                 │                │
   ├───────────────>│                │                │                 │                │
   │                │                │                │                 │                │
   │                │ 4. Client-side │                │                 │                │
   │                │ validation     │                │                 │                │
   │                │ (Zod)          │                │                 │                │
   │                │                │                │                 │                │
   │                │ 5. POST        │                │                 │                │
   │                │ /send-otp      │                │                 │                │
   │                ├───────────────>│                │                 │                │
   │                │                │                │                 │                │
   │                │                │ 6. Validate    │                 │                │
   │                │                │ email format   │                 │                │
   │                │                │                │                 │                │
   │                │                │ 7. Check rate  │                 │                │
   │                │                │ limit          │                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │<───────────────┤                 │                │
   │                │                │ OK             │                 │                │
   │                │                │                │                 │                │
   │                │                │ 8. Check email │                 │                │
   │                │                │ exists         │                 │                │
   │                │                ├────────────────┼────────────────>│                │
   │                │                │<───────────────┼─────────────────┤                │
   │                │                │ Email available│                 │                │
   │                │                │                │                 │                │
   │                │                │ 9. Generate    │                 │                │
   │                │                │ OTP (123456)   │                 │                │
   │                │                │ & hash         │                 │                │
   │                │                │                │                 │                │
   │                │                │ 10. Store OTP  │                 │                │
   │                │                │ & session      │                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │ SET otp:email  │                 │                │
   │                │                │ EX 600         │                 │                │
   │                │                │ SET session:id │                 │                │
   │                │                │<───────────────┤                 │                │
   │                │                │ OK             │                 │                │
   │                │                │                │                 │                │
   │                │                │ 11. Send OTP   │                 │                │
   │                │                │ email          │                 │                │
   │                │                ├────────────────┼─────────────────┼───────────────>│
   │                │                │                │                 │                │
   │                │                │                │                 │  12. Send via  │
   │                │                │                │                 │  SMTP/SES      │
   │                │                │                │                 │                │
   │                │ 13. 200 OK     │                │                 │<───────────────┤
   │                │ sessionId      │                │                 │  Sent          │
   │                │<───────────────┤                │                 │                │
   │                │                │                │                 │                │
   │ 14. Show OTP   │                │                │                 │                │
   │ input screen   │                │                │                 │                │
   │<───────────────┤                │                │                 │                │
   │                │                │                │                 │                │
   │ 15. User       │                │                │                 │                │
   │ receives email │                │                │                 │                │
   │ & enters OTP   │                │                │                 │                │
   ├───────────────>│                │                │                 │                │
   │                │                │                │                 │                │
   │                │ 16. POST       │                │                 │                │
   │                │ /verify-otp    │                │                 │                │
   │                ├───────────────>│                │                 │                │
   │                │                │                │                 │                │
   │                │                │ 17. Get session│                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │<───────────────┤                 │                │
   │                │                │ Session data   │                 │                │
   │                │                │                │                 │                │
   │                │                │ 18. Get OTP    │                 │                │
   │                │                │ hash           │                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │<───────────────┤                 │                │
   │                │                │ OTP hash       │                 │                │
   │                │                │                │                 │                │
   │                │                │ 19. Compare    │                 │                │
   │                │                │ OTP (bcrypt)   │                 │                │
   │                │                │ Match!         │                 │                │
   │                │                │                │                 │                │
   │                │                │ 20. Generate   │                 │                │
   │                │                │ JWT token      │                 │                │
   │                │                │                │                 │                │
   │                │                │ 21. Update     │                 │                │
   │                │                │ session        │                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │ verified=true  │                 │                │
   │                │                │                │                 │                │
   │                │ 22. 200 OK     │                │                 │                │
   │                │ token          │                │                 │                │
   │                │<───────────────┤                │                 │                │
   │                │                │                │                 │                │
   │ 23. Show info  │                │                │                 │                │
   │ form (step 3)  │                │                │                 │                │
   │<───────────────┤                │                │                 │                │
   │                │                │                │                 │                │
   │ 24. Fill form  │                │                │                 │                │
   │ & submit       │                │                │                 │                │
   ├───────────────>│                │                │                 │                │
   │                │                │                │                 │                │
   │                │ 25. Client     │                │                 │                │
   │                │ validation     │                │                 │                │
   │                │                │                │                 │                │
   │                │ 26. POST       │                │                 │                │
   │                │ /complete      │                │                 │                │
   │                │ + Bearer token │                │                 │                │
   │                ├───────────────>│                │                 │                │
   │                │                │                │                 │                │
   │                │                │ 27. Verify JWT │                 │                │
   │                │                │ token          │                 │                │
   │                │                │                │                 │                │
   │                │                │ 28. Get session│                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │<───────────────┤                 │                │
   │                │                │ email,verified │                 │                │
   │                │                │                │                 │                │
   │                │                │ 29. Validate   │                 │                │
   │                │                │ input data     │                 │                │
   │                │                │                │                 │                │
   │                │                │ 30. Hash       │                 │                │
   │                │                │ password       │                 │                │
   │                │                │ (bcrypt)       │                 │                │
   │                │                │                │                 │                │
   │                │                │ 31. Create user│                 │                │
   │                │                ├────────────────┼────────────────>│                │
   │                │                │ INSERT user    │                 │                │
   │                │                │<───────────────┼─────────────────┤                │
   │                │                │ User created   │                 │                │
   │                │                │                │                 │                │
   │                │                │ 32. Delete     │                 │                │
   │                │                │ session        │                 │                │
   │                │                ├───────────────>│                 │                │
   │                │                │ DEL session:id │                 │                │
   │                │                │                │                 │                │
   │                │                │ 33. Send       │                 │                │
   │                │                │ welcome email  │                 │                │
   │                │                ├────────────────┼─────────────────┼───────────────>│
   │                │                │                │                 │                │
   │                │ 34. 201 Created│                │                 │                │
   │                │ user + tokens  │                │                 │                │
   │                │<───────────────┤                │                 │                │
   │                │                │                │                 │                │
   │ 35. Redirect to│                │                │                 │                │
   │ dashboard      │                │                │                 │                │
   │<───────────────┤                │                │                 │                │
   │                │                │                │                 │                │
```

### 2.2. Sequence Diagram - Resend OTP Flow

```
┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐
│Client│         │  FE  │         │  BE  │         │Redis │         │Email │
└──┬───┘         └──┬───┘         └──┬───┘         └──┬───┘         └──┬───┘
   │                │                │                │                │
   │ 1. Click       │                │                │                │
   │ "Resend OTP"   │                │                │                │
   ├───────────────>│                │                │                │
   │                │                │                │                │
   │                │ 2. Check if    │                │                │
   │                │ cooldown active│                │                │
   │                │ (client-side)  │                │                │
   │                │                │                │                │
   │                │ 3. POST        │                │                │
   │                │ /resend-otp    │                │                │
   │                ├───────────────>│                │                │
   │                │                │                │                │
   │                │                │ 4. Check       │                │
   │                │                │ cooldown       │                │
   │                │                ├───────────────>│                │
   │                │                │ GET cooldown   │                │
   │                │                │<───────────────┤                │
   │                │                │ Active! (45s)  │                │
   │                │                │                │                │
   │                │ 5. 429 Error   │                │                │
   │                │ Cooldown active│                │                │
   │                │<───────────────┤                │                │
   │                │                │                │                │
   │ 6. Show error  │                │                │                │
   │ with countdown │                │                │                │
   │<───────────────┤                │                │                │
   │                │                │                │                │
   │ ... wait 45s...│                │                │                │
   │                │                │                │                │
   │ 7. Retry after │                │                │                │
   │ cooldown       │                │                │                │
   ├───────────────>│                │                │                │
   │                │                │                │                │
   │                │ 8. POST        │                │                │
   │                │ /resend-otp    │                │                │
   │                ├───────────────>│                │                │
   │                │                │                │                │
   │                │                │ 9. Check       │                │
   │                │                │ cooldown       │                │
   │                │                ├───────────────>│                │
   │                │                │<───────────────┤                │
   │                │                │ OK (expired)   │                │
   │                │                │                │                │
   │                │                │ 10. Invalidate │                │
   │                │                │ old OTP        │                │
   │                │                ├───────────────>│                │
   │                │                │ DEL old OTP    │                │
   │                │                │                │                │
   │                │                │ 11. Generate   │                │
   │                │                │ new OTP        │                │
   │                │                │                │                │
   │                │                │ 12. Store new  │                │
   │                │                │ OTP & cooldown │                │
   │                │                ├───────────────>│                │
   │                │                │ SET new OTP    │                │
   │                │                │ SET cooldown   │                │
   │                │                │                │                │
   │                │                │ 13. Send email │                │
   │                │                ├───────────────────────────────>│
   │                │                │                │                │
   │                │ 14. 200 OK     │                │                │
   │                │ OTP resent     │                │                │
   │                │<───────────────┤                │                │
   │                │                │                │                │
   │ 15. Show       │                │                │                │
   │ success msg    │                │                │                │
   │<───────────────┤                │                │                │
   │                │                │                │                │
```

### 2.3. Sequence Diagram - Error Scenarios

#### 2.3.1. OTP Verification Failed (3 attempts)

```
┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐
│Client│         │  FE  │         │  BE  │         │Redis │
└──┬───┘         └──┬───┘         └──┬───┘         └──┬───┘
   │                │                │                │
   │ Attempt 1: Wrong OTP (111111)   │                │
   ├───────────────>│                │                │
   │                ├───────────────>│                │
   │                │                ├───────────────>│
   │                │                │ INCR attempts  │
   │                │                │ attempts = 1   │
   │                │ 401: Invalid   │<───────────────┤
   │                │ 2 attempts left│                │
   │<───────────────┤<───────────────┤                │
   │                │                │                │
   │ Attempt 2: Wrong OTP (222222)   │                │
   ├───────────────>│                │                │
   │                ├───────────────>│                │
   │                │                ├───────────────>│
   │                │                │ INCR attempts  │
   │                │                │ attempts = 2   │
   │                │ 401: Invalid   │<───────────────┤
   │                │ 1 attempt left │                │
   │<───────────────┤<───────────────┤                │
   │                │                │                │
   │ Attempt 3: Wrong OTP (333333)   │                │
   ├───────────────>│                │                │
   │                ├───────────────>│                │
   │                │                ├───────────────>│
   │                │                │ INCR attempts  │
   │                │                │ attempts = 3   │
   │                │                │ DEL OTP (lock) │
   │                │ 403: OTP locked│<───────────────┤
   │                │ Must resend    │                │
   │<───────────────┤<───────────────┤                │
   │                │                │                │
   │ Show: Must request new OTP      │                │
   │<───────────────┤                │                │
   │                │                │                │
```

---

## 3. Class Diagram / Database Schema

### 3.1. Class Diagram - Backend Services

```
┌─────────────────────────────────────────────────────────────────┐
│                        SignupController                         │
├─────────────────────────────────────────────────────────────────┤
│ - authService: AuthService                                      │
│ - otpService: OTPService                                        │
│ - userService: UserService                                      │
│ - emailService: EmailService                                    │
├─────────────────────────────────────────────────────────────────┤
│ + sendOTP(req, res): Promise<Response>                          │
│ + verifyOTP(req, res): Promise<Response>                        │
│ + resendOTP(req, res): Promise<Response>                        │
│ + completeSignup(req, res): Promise<Response>                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              │
              ┌───────────────┼───────────────┬─────────────────┐
              │               │               │                 │
              ▼               ▼               ▼                 ▼
┌───────────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│   AuthService     │ │  OTPService  │ │UserService  │ │EmailService  │
├───────────────────┤ ├──────────────┤ ├─────────────┤ ├──────────────┤
│- jwtSecret: str   │ │- redis: Redis│ │- userModel  │ │- transporter │
│- tokenExpiry: num │ │- otpLength   │ │- bcrypt     │ │- templates   │
├───────────────────┤ ├──────────────┤ ├─────────────┤ ├──────────────┤
│+ generateToken()  │ │+ generate()  │ │+ create()   │ │+ sendOTP()   │
│+ verifyToken()    │ │+ verify()    │ │+ findByEmail│ │+ sendWelcome│
│+ hashPassword()   │ │+ store()     │ │+ exists()   │ │+ retry()     │
│+ comparePassword()│ │+ invalidate()│ │+ update()   │ └──────────────┘
└───────────────────┘ └──────────────┘ └─────────────┘
                              │                 │
                              │                 │
                              ▼                 ▼
                      ┌──────────────┐  ┌─────────────┐
                      │    Redis     │  │  MongoDB    │
                      ├──────────────┤  ├─────────────┤
                      │- host        │  │- uri        │
                      │- port        │  │- dbName     │
                      │- password    │  │- collections│
                      ├──────────────┤  ├─────────────┤
                      │+ get()       │  │+ find()     │
                      │+ set()       │  │+ insert()   │
                      │+ del()       │  │+ update()   │
                      │+ incr()      │  │+ delete()   │
                      │+ expire()    │  └─────────────┘
                      └──────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      SessionService                             │
├─────────────────────────────────────────────────────────────────┤
│ - redis: Redis                                                  │
│ - ttl: number = 1800                                            │
├─────────────────────────────────────────────────────────────────┤
│ + createSession(email: string): Promise<string>                 │
│ + getSession(sessionId: string): Promise<SessionData>           │
│ + updateSession(sessionId: string, data: object): Promise<void> │
│ + deleteSession(sessionId: string): Promise<void>               │
│ + validateSession(sessionId: string): Promise<boolean>          │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    RateLimitService                             │
├─────────────────────────────────────────────────────────────────┤
│ - redis: Redis                                                  │
├─────────────────────────────────────────────────────────────────┤
│ + checkIPLimit(ip: string, action: string): Promise<boolean>    │
│ + checkEmailLimit(email: string, action: string): Promise<bool> │
│ + incrementCounter(key: string): Promise<number>                │
│ + getRemainingAttempts(key: string): Promise<number>            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Database Schema - MongoDB

#### 3.2.1. Users Collection

```typescript
interface User {
  _id: ObjectId;                        // Auto-generated MongoDB ID
  email: string;                        // Unique, required, lowercase, indexed
  emailVerified: boolean;               // Set to true after OTP verification
  passwordHash: string;                 // bcrypt hash (cost factor 12)
  fullName: string;                     // Required, 2-100 chars
  phone?: string;                       // Optional, E.164 format
  role: 'user' | 'admin';              // Default: 'user'
  status: 'active' | 'suspended' | 'deleted'; // Default: 'active'

  // Timestamps
  createdAt: Date;                      // Auto-set on creation
  updatedAt: Date;                      // Auto-update on modification
  lastLogin?: Date;                     // Updated on each login

  // Metadata
  metadata: {
    signupIp?: string;                  // IP address during signup
    signupUserAgent?: string;           // User agent during signup
    signupSource?: string;              // 'web' | 'mobile' | 'api'
    emailVerifiedAt?: Date;             // Timestamp of email verification
  };

  // Soft delete
  deletedAt?: Date;                     // Set when user is soft-deleted
}

// Mongoose Schema Definition
const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: 'Invalid email format'
    }
  },
  emailVerified: {
    type: Boolean,
    default: false,
    required: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false  // Don't return in queries by default
  },
  fullName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    validate: {
      validator: (v: string) => !v || /^\+[1-9]\d{1,14}$/.test(v),
      message: 'Invalid phone format (use E.164)'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    required: false
  },
  metadata: {
    signupIp: String,
    signupUserAgent: String,
    signupSource: String,
    emailVerifiedAt: Date
  },
  deletedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,  // Auto-manage createdAt and updatedAt
  collection: 'users'
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ status: 1, role: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound index for admin queries
UserSchema.index({ status: 1, createdAt: -1 });

// Virtual for user age
UserSchema.virtual('accountAge').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Methods
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};
```

#### 3.2.2. OTP Verifications Collection (Optional - can be Redis only)

```typescript
interface OTPVerification {
  _id: ObjectId;
  email: string;                        // Indexed
  otpHash: string;                      // bcrypt hash of OTP
  sessionId: string;                    // UUID, unique, indexed
  attempts: number;                     // Failed verification attempts
  locked: boolean;                      // true after 3 failed attempts

  // Timestamps
  createdAt: Date;                      // Auto-set
  expiresAt: Date;                      // createdAt + 10 minutes
  verifiedAt?: Date;                    // Set when successfully verified

  // Metadata
  ipAddress: string;                    // IP address that requested OTP
  userAgent?: string;

  // Status
  verified: boolean;                    // false by default
  invalidatedAt?: Date;                 // Set when OTP is invalidated (resend)
}

const OTPVerificationSchema = new Schema<OTPVerification>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otpHash: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  locked: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }  // TTL index - auto-delete after expiry
  },
  verifiedAt: {
    type: Date,
    required: false
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  invalidatedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
  collection: 'otp_verifications'
});

// Indexes
OTPVerificationSchema.index({ email: 1, createdAt: -1 });
OTPVerificationSchema.index({ sessionId: 1 }, { unique: true });
OTPVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
OTPVerificationSchema.index({ verified: 1, locked: 1 });

// Methods
OTPVerificationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date();
};

OTPVerificationSchema.methods.canVerify = function(): boolean {
  return !this.locked && !this.verified && !this.isExpired();
};
```

#### 3.2.3. Signup Attempts Collection (Audit Log)

```typescript
interface SignupAttempt {
  _id: ObjectId;
  email?: string;                       // May be null for invalid requests
  ipAddress: string;                    // Required, indexed
  step: 'send_otp' | 'verify_otp' | 'resend_otp' | 'complete';
  success: boolean;

  // Error details
  errorCode?: string;                   // e.g., 'INVALID_OTP', 'EMAIL_EXISTS'
  errorMessage?: string;

  // Request metadata
  metadata: {
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    responseTime?: number;              // Milliseconds
  };

  // Timestamp
  createdAt: Date;
}

const SignupAttemptSchema = new Schema<SignupAttempt>({
  email: {
    type: String,
    required: false,
    lowercase: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  step: {
    type: String,
    required: true,
    enum: ['send_otp', 'verify_otp', 'resend_otp', 'complete']
  },
  success: {
    type: Boolean,
    required: true
  },
  errorCode: {
    type: String,
    required: false
  },
  errorMessage: {
    type: String,
    required: false
  },
  metadata: {
    userAgent: String,
    sessionId: String,
    requestId: String,
    responseTime: Number
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'signup_attempts'
});

// Indexes for analytics and rate limiting
SignupAttemptSchema.index({ email: 1, createdAt: -1 });
SignupAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
SignupAttemptSchema.index({ createdAt: -1 });
SignupAttemptSchema.index({ success: 1, step: 1 });
SignupAttemptSchema.index({ errorCode: 1, createdAt: -1 });

// Compound index for analytics
SignupAttemptSchema.index({ step: 1, success: 1, createdAt: -1 });
```

### 3.3. Redis Data Structures (Detailed)

#### 3.3.1. Session Data

```typescript
// Key pattern
const SESSION_KEY = `signup:session:{sessionId}`;

// Data structure: Hash
interface SessionData {
  email: string;
  step: '1' | '2' | '3';
  verified: 'true' | 'false';
  createdAt: string;              // ISO timestamp
  ipAddress: string;
  userAgent: string;
}

// Commands
await redis.hset(SESSION_KEY, {
  email: 'user@example.com',
  step: '1',
  verified: 'false',
  createdAt: new Date().toISOString(),
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
await redis.expire(SESSION_KEY, 1800);  // 30 minutes TTL

// Retrieve
const session = await redis.hgetall(SESSION_KEY);

// Update
await redis.hset(SESSION_KEY, 'verified', 'true');
await redis.hset(SESSION_KEY, 'step', '2');

// Delete
await redis.del(SESSION_KEY);
```

#### 3.3.2. OTP Storage

```typescript
// Key pattern
const OTP_KEY = `signup:otp:{email}:{sessionId}`;

// Data structure: String (bcrypt hash)
// Value example: "$2b$12$KIXMzZHqQ..."

// Store OTP
const otpHash = await bcrypt.hash(otp, 12);
await redis.set(OTP_KEY, otpHash, 'EX', 600);  // 10 minutes

// Verify OTP
const storedHash = await redis.get(OTP_KEY);
if (storedHash) {
  const isValid = await bcrypt.compare(inputOtp, storedHash);
  if (isValid) {
    await redis.del(OTP_KEY);  // Delete after successful verification
  }
}

// Invalidate OTP (for resend)
await redis.del(OTP_KEY);
```

#### 3.3.3. OTP Attempts Counter

```typescript
// Key pattern
const ATTEMPTS_KEY = `signup:otp:attempts:{sessionId}`;

// Data structure: String (integer counter)

// Increment attempts
const attempts = await redis.incr(ATTEMPTS_KEY);
await redis.expire(ATTEMPTS_KEY, 600);  // Match OTP expiry

// Check attempts
const currentAttempts = await redis.get(ATTEMPTS_KEY);
if (parseInt(currentAttempts) >= 3) {
  // Lock OTP
  await redis.del(`signup:otp:{email}:{sessionId}`);
  throw new Error('OTP_LOCKED');
}

// Reset attempts (after successful verification)
await redis.del(ATTEMPTS_KEY);
```

#### 3.3.4. Rate Limiting - IP Based

```typescript
// Key pattern
const IP_RATE_LIMIT_KEY = `signup:ratelimit:ip:{ip}:{action}`;
// Actions: 'send_otp', 'verify_otp', 'complete'

// Data structure: String (counter)

// Check and increment
const count = await redis.incr(IP_RATE_LIMIT_KEY);
if (count === 1) {
  await redis.expire(IP_RATE_LIMIT_KEY, 3600);  // 1 hour window
}

// Limits per action
const LIMITS = {
  send_otp: 5,
  verify_otp: 10,
  resend_otp: 5,
  complete: 5
};

if (count > LIMITS[action]) {
  const ttl = await redis.ttl(IP_RATE_LIMIT_KEY);
  throw new RateLimitError({
    limit: LIMITS[action],
    remaining: 0,
    resetAt: Date.now() + ttl * 1000
  });
}

// Get remaining attempts
const remaining = Math.max(0, LIMITS[action] - count);
```

#### 3.3.5. Rate Limiting - Email Based

```typescript
// Key pattern
const EMAIL_RATE_LIMIT_KEY = `signup:ratelimit:email:{email}:{action}`;

// Data structure: String (counter)
// Same logic as IP-based rate limiting

// Email-specific limits (stricter)
const EMAIL_LIMITS = {
  send_otp: 3,      // Max 3 OTP requests per hour per email
  resend_otp: 5     // Max 5 resends per day
};

// Increment counter
const count = await redis.incr(EMAIL_RATE_LIMIT_KEY);
if (count === 1) {
  // send_otp: 1 hour, resend_otp: 24 hours
  const expiry = action === 'resend_otp' ? 86400 : 3600;
  await redis.expire(EMAIL_RATE_LIMIT_KEY, expiry);
}

if (count > EMAIL_LIMITS[action]) {
  throw new RateLimitError(`Too many ${action} requests for this email`);
}
```

#### 3.3.6. Resend OTP Cooldown

```typescript
// Key pattern
const COOLDOWN_KEY = `signup:resend:cooldown:{email}`;

// Data structure: String (timestamp)

// Set cooldown
await redis.set(COOLDOWN_KEY, Date.now().toString(), 'EX', 60);

// Check cooldown
const cooldownTime = await redis.get(COOLDOWN_KEY);
if (cooldownTime) {
  const elapsed = Date.now() - parseInt(cooldownTime);
  const remaining = 60 - Math.floor(elapsed / 1000);
  throw new CooldownError({
    message: 'Please wait before resending OTP',
    remainingSeconds: remaining
  });
}
```

### 3.4. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        MONGODB                               │
│                                                              │
│  ┌──────────────────┐                                        │
│  │      Users       │                                        │
│  ├──────────────────┤                                        │
│  │ _id (PK)         │◄────────┐                             │
│  │ email (UK)       │         │                             │
│  │ emailVerified    │         │                             │
│  │ passwordHash     │         │                             │
│  │ fullName         │         │                             │
│  │ phone            │         │                             │
│  │ role             │         │                             │
│  │ status           │         │                             │
│  │ createdAt        │         │ Reference                   │
│  │ updatedAt        │         │ (audit only)                │
│  │ metadata         │         │                             │
│  └──────────────────┘         │                             │
│           △                   │                             │
│           │                   │                             │
│           │ Created After     │                             │
│           │ Verification      │                             │
│           │                   │                             │
│  ┌────────┴────────┐    ┌─────┴───────────┐                │
│  │OTP Verifications│    │ Signup Attempts │                │
│  ├─────────────────┤    ├─────────────────┤                │
│  │ _id (PK)        │    │ _id (PK)        │                │
│  │ email           │    │ email           │                │
│  │ sessionId (UK)  │    │ ipAddress       │                │
│  │ otpHash         │    │ step            │                │
│  │ attempts        │    │ success         │                │
│  │ locked          │    │ errorCode       │                │
│  │ expiresAt (TTL) │    │ errorMessage    │                │
│  │ verified        │    │ metadata        │                │
│  │ ipAddress       │    │ createdAt       │                │
│  │ createdAt       │    └─────────────────┘                │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         REDIS                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:session:{id}          [Hash, TTL: 30min]      │ │
│  │  ├─ email                                              │ │
│  │  ├─ step                                               │ │
│  │  ├─ verified                                           │ │
│  │  └─ createdAt                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:otp:{email}:{sid}     [String, TTL: 10min]    │ │
│  │  └─ bcrypt hash of OTP                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:otp:attempts:{sid}    [String, TTL: 10min]    │ │
│  │  └─ counter (0-3)                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:ratelimit:ip:{ip}:{action} [String, TTL: 1h]  │ │
│  │  └─ counter                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:ratelimit:email:{email} [String, TTL: 1h/24h] │ │
│  │  └─ counter                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  signup:resend:cooldown:{email} [String, TTL: 60s]    │ │
│  │  └─ timestamp                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Error Handling

### 4.1. Error Code Hierarchy

```typescript
// Error code format: CATEGORY_SPECIFIC_REASON

enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTH',
  AUTHORIZATION = 'AUTHZ',
  RATE_LIMIT = 'RATE_LIMIT',
  RESOURCE = 'RESOURCE',
  SERVICE = 'SERVICE',
  INTERNAL = 'INTERNAL'
}

// All error codes
enum SignupErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_OTP_FORMAT = 'INVALID_OTP_FORMAT',
  INVALID_PASSWORD_FORMAT = 'INVALID_PASSWORD_FORMAT',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  TERMS_NOT_ACCEPTED = 'TERMS_NOT_ACCEPTED',

  // Authentication errors (401)
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',

  // Authorization errors (403)
  OTP_LOCKED = 'OTP_LOCKED',
  SESSION_LOCKED = 'SESSION_LOCKED',

  // Resource errors (404, 409)
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  OTP_NOT_FOUND = 'OTP_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',

  // Rate limit errors (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RESEND_COOLDOWN_ACTIVE = 'RESEND_COOLDOWN_ACTIVE',
  RESEND_LIMIT_EXCEEDED = 'RESEND_LIMIT_EXCEEDED',
  TOO_MANY_FAILED_ATTEMPTS = 'TOO_MANY_FAILED_ATTEMPTS',

  // Service errors (500, 503)
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  ACCOUNT_CREATION_FAILED = 'ACCOUNT_CREATION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
```

### 4.2. Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: SignupErrorCode;
    message: string;                    // User-friendly message (Vietnamese)
    details?: {
      field?: string;                   // Field that caused error
      value?: any;                      // Invalid value (sanitized)
      constraint?: string;              // What was violated
      suggestions?: string[];           // Suggested actions
      [key: string]: any;               // Additional context
    };
    stack?: string;                     // Only in development
  };
  requestId?: string;                   // For support/debugging
  timestamp: string;                    // ISO timestamp
}
```

### 4.3. Custom Error Classes

```typescript
// Base error class
class AppError extends Error {
  constructor(
    public code: SignupErrorCode,
    public message: string,
    public statusCode: number,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Specific error classes
class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(
      SignupErrorCode.VALIDATION_ERROR,
      message,
      400,
      details
    );
  }
}

class AuthenticationError extends AppError {
  constructor(code: SignupErrorCode, message: string, details?: any) {
    super(code, message, 401, details);
  }
}

class RateLimitError extends AppError {
  constructor(message: string, details?: any) {
    super(
      SignupErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      429,
      details
    );
  }
}

class ResourceNotFoundError extends AppError {
  constructor(code: SignupErrorCode, message: string, details?: any) {
    super(code, message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(
      SignupErrorCode.EMAIL_ALREADY_EXISTS,
      message,
      409,
      details
    );
  }
}

class ServiceError extends AppError {
  constructor(code: SignupErrorCode, message: string, details?: any) {
    super(code, message, 500, details, false); // Not operational
  }
}
```

### 4.4. Error Handling Middleware

```typescript
// Global error handler
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] || uuidv4();

  // Log error
  logger.error('Error occurred', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ...err.toJSON(),
      requestId
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const validationError = new ValidationError(
      'Dữ liệu không hợp lệ',
      { fields: Object.values((err as any).errors).map((e: any) => ({
        field: e.path,
        message: e.message
      }))}
    );
    return res.status(400).json({
      ...validationError.toJSON(),
      requestId
    });
  }

  // Handle Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    const conflictError = new ConflictError(
      `${field} đã tồn tại`,
      { field }
    );
    return res.status(409).json({
      ...conflictError.toJSON(),
      requestId
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const authError = new AuthenticationError(
      SignupErrorCode.INVALID_TOKEN,
      'Token không hợp lệ'
    );
    return res.status(401).json({
      ...authError.toJSON(),
      requestId
    });
  }

  if (err.name === 'TokenExpiredError') {
    const authError = new AuthenticationError(
      SignupErrorCode.TOKEN_EXPIRED,
      'Token đã hết hạn'
    );
    return res.status(401).json({
      ...authError.toJSON(),
      requestId
    });
  }

  // Unknown error - send generic message
  const genericError = new ServiceError(
    SignupErrorCode.INTERNAL_SERVER_ERROR,
    'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau',
    { originalError: err.message }
  );

  return res.status(500).json({
    ...genericError.toJSON(),
    requestId
  });
};

export default errorHandler;
```

### 4.5. Error Handling Strategy by Scenario

| Scenario | Error Code | Status | Retry? | User Action |
|----------|-----------|--------|--------|-------------|
| Invalid email format | `INVALID_EMAIL_FORMAT` | 400 | No | Fix email |
| Email exists | `EMAIL_ALREADY_EXISTS` | 409 | No | Login or recover |
| OTP expired | `OTP_EXPIRED` | 401 | Yes | Resend OTP |
| Invalid OTP | `INVALID_OTP` | 401 | Yes (3x) | Re-enter OTP |
| OTP locked | `OTP_LOCKED` | 403 | No | Resend OTP |
| Rate limit | `RATE_LIMIT_EXCEEDED` | 429 | Yes (after cooldown) | Wait and retry |
| Session expired | `SESSION_NOT_FOUND` | 404 | No | Restart signup |
| Weak password | `INVALID_PASSWORD_FORMAT` | 400 | No | Use stronger password |
| Passwords don't match | `PASSWORD_MISMATCH` | 400 | No | Re-enter password |
| Email service down | `EMAIL_SERVICE_ERROR` | 500 | Yes (auto) | Wait or contact support |
| Database error | `DATABASE_ERROR` | 500 | Yes | Wait and retry |
| Invalid token | `INVALID_TOKEN` | 401 | No | Restart signup |

---

## 5. Validation Rules

### 5.1. Email Validation

```typescript
interface EmailValidationRules {
  required: true;
  format: 'RFC 5322 compliant';
  minLength: 5;
  maxLength: 254;
  allowedDomains?: string[];          // Optional whitelist
  blockedDomains?: string[];          // Optional blacklist (disposable emails)
}

// Implementation
const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  // Required
  if (!email || email.trim() === '') {
    errors.push('Email là bắt buộc');
    return { valid: false, errors };
  }

  // Trim and lowercase
  email = email.trim().toLowerCase();

  // Length
  if (email.length < 5) {
    errors.push('Email phải có ít nhất 5 ký tự');
  }
  if (email.length > 254) {
    errors.push('Email không được vượt quá 254 ký tự');
  }

  // Format (use validator.js)
  if (!validator.isEmail(email)) {
    errors.push('Email không đúng định dạng');
  }

  // Domain check (optional)
  const domain = email.split('@')[1];

  // Disposable email domains blacklist
  const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  if (disposableDomains.includes(domain)) {
    errors.push('Không thể sử dụng email tạm thời');
  }

  // Check MX record (optional, expensive)
  // const hasMX = await checkMXRecord(domain);
  // if (!hasMX) errors.push('Domain email không hợp lệ');

  return {
    valid: errors.length === 0,
    errors,
    sanitized: email
  };
};

// Zod schema (Frontend)
const emailSchema = z.string()
  .min(5, 'Email phải có ít nhất 5 ký tự')
  .max(254, 'Email không được vượt quá 254 ký tự')
  .email('Email không đúng định dạng')
  .toLowerCase()
  .trim();

// Joi schema (Backend)
const emailSchema = Joi.string()
  .email({ tlds: { allow: true } })
  .min(5)
  .max(254)
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Email không đúng định dạng',
    'string.min': 'Email phải có ít nhất 5 ký tự',
    'string.max': 'Email không được vượt quá 254 ký tự',
    'any.required': 'Email là bắt buộc'
  });
```

### 5.2. OTP Validation

```typescript
interface OTPValidationRules {
  required: true;
  format: 'numeric';
  length: 6;
  allowedChars: '0-9';
}

// Implementation
const validateOTP = (otp: string): ValidationResult => {
  const errors: string[] = [];

  // Required
  if (!otp || otp.trim() === '') {
    errors.push('Mã OTP là bắt buộc');
    return { valid: false, errors };
  }

  // Trim
  otp = otp.trim();

  // Length
  if (otp.length !== 6) {
    errors.push('Mã OTP phải có 6 chữ số');
  }

  // Numeric only
  if (!/^\d{6}$/.test(otp)) {
    errors.push('Mã OTP chỉ bao gồm số');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: otp
  };
};

// Zod schema
const otpSchema = z.string()
  .length(6, 'Mã OTP phải có 6 chữ số')
  .regex(/^\d{6}$/, 'Mã OTP chỉ bao gồm số')
  .trim();

// Joi schema
const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.length': 'Mã OTP phải có 6 chữ số',
    'string.pattern.base': 'Mã OTP chỉ bao gồm số',
    'any.required': 'Mã OTP là bắt buộc'
  });
```

### 5.3. Password Validation

```typescript
interface PasswordValidationRules {
  required: true;
  minLength: 8;
  maxLength: 128;
  requireUppercase: true;
  requireLowercase: true;
  requireNumber: true;
  requireSpecialChar: true;
  allowedSpecialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?';
  disallowedPatterns: string[];       // Common passwords, sequential chars
}

// Implementation
const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  const requirements: Record<string, boolean> = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  // Required
  if (!password) {
    errors.push('Mật khẩu là bắt buộc');
    return { valid: false, errors, requirements };
  }

  // Length
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  } else {
    requirements.minLength = true;
  }

  if (password.length > 128) {
    errors.push('Mật khẩu không được vượt quá 128 ký tự');
  }

  // Uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ hoa');
  } else {
    requirements.hasUppercase = true;
  }

  // Lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ thường');
  } else {
    requirements.hasLowercase = true;
  }

  // Number
  if (!/\d/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ số');
  } else {
    requirements.hasNumber = true;
  }

  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt');
  } else {
    requirements.hasSpecialChar = true;
  }

  // No whitespace
  if (/\s/.test(password)) {
    errors.push('Mật khẩu không được chứa khoảng trắng');
  }

  // Common passwords check
  const commonPasswords = ['Password123!', '12345678', 'Qwerty123!'];
  if (commonPasswords.includes(password)) {
    errors.push('Mật khẩu quá phổ biến. Vui lòng chọn mật khẩu khác');
  }

  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Mật khẩu không nên chứa ký tự lặp lại liên tiếp');
  }

  return {
    valid: errors.length === 0,
    errors,
    requirements,
    strength: calculatePasswordStrength(password)
  };
};

// Password strength calculator
const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;
  if (password.length >= 16) score++;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

// Zod schema with custom refinement
const passwordSchema = z.string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
  .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
  .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt')
  .refine(password => !/\s/.test(password), 'Mật khẩu không được chứa khoảng trắng');
```

### 5.4. Full Name Validation

```typescript
interface FullNameValidationRules {
  required: true;
  minLength: 2;
  maxLength: 100;
  allowedChars: 'letters, spaces, accents, hyphens, apostrophes';
  pattern: /^[a-zA-ZÀ-ỹ\s'-]+$/;
}

// Implementation
const validateFullName = (fullName: string): ValidationResult => {
  const errors: string[] = [];

  // Required
  if (!fullName || fullName.trim() === '') {
    errors.push('Họ và tên là bắt buộc');
    return { valid: false, errors };
  }

  // Trim and normalize spaces
  fullName = fullName.trim().replace(/\s+/g, ' ');

  // Length
  if (fullName.length < 2) {
    errors.push('Họ và tên phải có ít nhất 2 ký tự');
  }
  if (fullName.length > 100) {
    errors.push('Họ và tên không được vượt quá 100 ký tự');
  }

  // Allowed characters (letters, spaces, Vietnamese accents, hyphens, apostrophes)
  if (!/^[a-zA-ZÀ-ỹ\s'-]+$/.test(fullName)) {
    errors.push('Họ và tên chỉ được chứa chữ cái, dấu cách, dấu gạch ngang và dấu nháy đơn');
  }

  // At least 2 words (first name + last name)
  const words = fullName.split(' ').filter(w => w.length > 0);
  if (words.length < 2) {
    errors.push('Vui lòng nhập đầy đủ họ và tên');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: fullName
  };
};

// Zod schema
const fullNameSchema = z.string()
  .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
  .max(100, 'Họ và tên không được vượt quá 100 ký tự')
  .regex(/^[a-zA-ZÀ-ỹ\s'-]+$/, 'Họ và tên chỉ được chứa chữ cái')
  .refine(name => name.trim().split(' ').length >= 2, 'Vui lòng nhập đầy đủ họ và tên')
  .transform(name => name.trim().replace(/\s+/g, ' '));
```

### 5.5. Phone Number Validation (Optional)

```typescript
interface PhoneValidationRules {
  required: false;
  format: 'E.164';                    // +84912345678
  pattern: /^\+[1-9]\d{1,14}$/;
  allowedCountryCodes?: string[];     // ['84', '1'] for Vietnam, US
}

// Implementation
const validatePhone = (phone: string | undefined): ValidationResult => {
  const errors: string[] = [];

  // Optional field
  if (!phone || phone.trim() === '') {
    return { valid: true, errors: [], sanitized: undefined };
  }

  // Trim
  phone = phone.trim();

  // E.164 format: +[country code][number]
  if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
    errors.push('Số điện thoại phải có định dạng quốc tế (vd: +84912345678)');
  }

  // Vietnam-specific validation (optional)
  if (phone.startsWith('+84')) {
    // Vietnam phone numbers: +84 + 9-10 digits
    if (!/^\+84\d{9,10}$/.test(phone)) {
      errors.push('Số điện thoại Việt Nam không hợp lệ');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: phone
  };
};

// Zod schema
const phoneSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Số điện thoại phải có định dạng quốc tế')
  .optional()
  .or(z.literal(''));
```

### 5.6. Combined Validation Schema (Complete Signup)

```typescript
// Zod schema for complete signup (Frontend)
const completeSignupSchema = z.object({
  fullName: z.string()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự')
    .regex(/^[a-zA-ZÀ-ỹ\s'-]+$/, 'Họ và tên chỉ được chứa chữ cái')
    .refine(name => name.trim().split(' ').length >= 2, 'Vui lòng nhập đầy đủ họ và tên')
    .transform(name => name.trim().replace(/\s+/g, ' ')),

  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(128)
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
    .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt')
    .refine(password => !/\s/.test(password), 'Mật khẩu không được chứa khoảng trắng'),

  confirmPassword: z.string(),

  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Số điện thoại phải có định dạng quốc tế')
    .optional()
    .or(z.literal('')),

  acceptTerms: z.boolean()
    .refine(val => val === true, 'Bạn phải đồng ý với điều khoản sử dụng')
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword']
  }
);

// Joi schema (Backend)
const completeSignupSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ỹ\s'-]+$/)
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])[^\s]{8,}$/)
    .required(),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Mật khẩu xác nhận không khớp'
    }),

  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional()
    .allow(''),

  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Bạn phải đồng ý với điều khoản sử dụng'
    })
});
```

---

## 6. Caching / Session Strategy

### 6.1. Redis Caching Strategy

#### 6.1.1. Session Management

```typescript
/**
 * Session Storage Strategy
 *
 * Purpose: Store temporary signup state across multiple requests
 * Storage: Redis Hash
 * TTL: 30 minutes (1800 seconds)
 * Key Pattern: signup:session:{sessionId}
 */

interface SignupSession {
  email: string;
  step: 1 | 2 | 3;
  verified: boolean;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
}

class SessionService {
  private redis: Redis;
  private readonly SESSION_PREFIX = 'signup:session:';
  private readonly SESSION_TTL = 1800; // 30 minutes

  /**
   * Create new signup session
   */
  async createSession(data: {
    email: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<string> {
    const sessionId = uuidv4();
    const key = this.SESSION_PREFIX + sessionId;

    const session: SignupSession = {
      email: data.email.toLowerCase(),
      step: 1,
      verified: false,
      createdAt: new Date().toISOString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    };

    await this.redis.hset(key, session as any);
    await this.redis.expire(key, this.SESSION_TTL);

    return sessionId;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SignupSession | null> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    // Extend TTL on access (sliding expiration)
    await this.redis.expire(key, this.SESSION_TTL);

    return {
      email: data.email,
      step: parseInt(data.step) as 1 | 2 | 3,
      verified: data.verified === 'true',
      createdAt: data.createdAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    };
  }

  /**
   * Update session (e.g., mark as verified, change step)
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SignupSession>
  ): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;

    // Check if session exists
    const exists = await this.redis.exists(key);
    if (!exists) {
      throw new ResourceNotFoundError(
        SignupErrorCode.SESSION_NOT_FOUND,
        'Session not found or expired'
      );
    }

    // Update fields
    const updateData: any = {};
    if (updates.step !== undefined) updateData.step = updates.step.toString();
    if (updates.verified !== undefined) updateData.verified = updates.verified.toString();

    await this.redis.hset(key, updateData);

    // Extend TTL
    await this.redis.expire(key, this.SESSION_TTL);
  }

  /**
   * Delete session (after successful signup or cancellation)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;
    await this.redis.del(key);
  }

  /**
   * Validate session (exists, not expired, matches IP)
   */
  async validateSession(
    sessionId: string,
    ipAddress: string
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    // Optional: Check IP consistency
    if (session.ipAddress !== ipAddress) {
      logger.warn('Session IP mismatch', {
        sessionId,
        expectedIp: session.ipAddress,
        actualIp: ipAddress
      });
      // Optionally reject: return false;
    }

    return true;
  }
}
```

#### 6.1.2. OTP Caching Strategy

```typescript
/**
 * OTP Storage Strategy
 *
 * Purpose: Store OTP hash temporarily for verification
 * Storage: Redis String (bcrypt hash)
 * TTL: 10 minutes (600 seconds)
 * Key Pattern: signup:otp:{email}:{sessionId}
 *
 * Why Redis?
 * - Automatic expiration (TTL)
 * - Fast access
 * - No database cleanup needed
 * - Ephemeral data (no need to persist)
 */

class OTPService {
  private redis: Redis;
  private readonly OTP_PREFIX = 'signup:otp:';
  private readonly OTP_TTL = 600; // 10 minutes
  private readonly OTP_LENGTH = 6;

  /**
   * Generate and store OTP
   */
  async generateAndStore(
    email: string,
    sessionId: string
  ): Promise<string> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before storing (security best practice)
    const otpHash = await bcrypt.hash(otp, 12);

    // Store in Redis
    const key = this.getOTPKey(email, sessionId);
    await this.redis.set(key, otpHash, 'EX', this.OTP_TTL);

    // Return plain OTP to send via email
    return otp;
  }

  /**
   * Verify OTP
   */
  async verify(
    email: string,
    sessionId: string,
    inputOtp: string
  ): Promise<boolean> {
    const key = this.getOTPKey(email, sessionId);

    // Get stored hash
    const storedHash = await this.redis.get(key);
    if (!storedHash) {
      throw new AuthenticationError(
        SignupErrorCode.OTP_EXPIRED,
        'OTP đã hết hạn hoặc không tồn tại'
      );
    }

    // Compare
    const isValid = await bcrypt.compare(inputOtp, storedHash);

    if (isValid) {
      // Delete OTP after successful verification (one-time use)
      await this.redis.del(key);
    }

    return isValid;
  }

  /**
   * Invalidate OTP (e.g., when resending)
   */
  async invalidate(email: string, sessionId: string): Promise<void> {
    const key = this.getOTPKey(email, sessionId);
    await this.redis.del(key);
  }

  /**
   * Check if OTP exists and not expired
   */
  async exists(email: string, sessionId: string): Promise<boolean> {
    const key = this.getOTPKey(email, sessionId);
    const ttl = await this.redis.ttl(key);
    return ttl > 0;
  }

  /**
   * Get remaining TTL
   */
  async getTTL(email: string, sessionId: string): Promise<number> {
    const key = this.getOTPKey(email, sessionId);
    return await this.redis.ttl(key);
  }

  private getOTPKey(email: string, sessionId: string): string {
    return `${this.OTP_PREFIX}${email.toLowerCase()}:${sessionId}`;
  }
}
```

#### 6.1.3. Rate Limiting Strategy

```typescript
/**
 * Rate Limiting Strategy
 *
 * Purpose: Prevent abuse and brute force attacks
 * Storage: Redis String (counter)
 * TTL: 1 hour (3600s) or 24 hours (86400s) depending on action
 * Key Patterns:
 *   - signup:ratelimit:ip:{ip}:{action}
 *   - signup:ratelimit:email:{email}:{action}
 */

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ip:send_otp': { limit: 5, windowSeconds: 3600 },        // 5 per hour
  'ip:verify_otp': { limit: 10, windowSeconds: 3600 },     // 10 per hour
  'ip:complete': { limit: 5, windowSeconds: 3600 },        // 5 per hour
  'email:send_otp': { limit: 3, windowSeconds: 3600 },     // 3 per hour
  'email:resend_otp': { limit: 5, windowSeconds: 86400 },  // 5 per day
};

class RateLimitService {
  private redis: Redis;
  private readonly PREFIX = 'signup:ratelimit:';

  /**
   * Check and increment rate limit
   * Returns true if limit not exceeded, throws error if exceeded
   */
  async checkAndIncrement(
    type: 'ip' | 'email',
    identifier: string,
    action: string
  ): Promise<void> {
    const config = RATE_LIMITS[`${type}:${action}`];
    if (!config) {
      throw new Error(`Unknown rate limit config: ${type}:${action}`);
    }

    const key = `${this.PREFIX}${type}:${identifier}:${action}`;

    // Get current count
    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    // Check limit
    if (count >= config.limit) {
      const ttl = await this.redis.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);

      throw new RateLimitError(
        `Bạn đã vượt quá số lần ${action} cho phép`,
        {
          limit: config.limit,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          retryAfter: ttl
        }
      );
    }

    // Increment
    const newCount = await this.redis.incr(key);

    // Set TTL on first increment
    if (newCount === 1) {
      await this.redis.expire(key, config.windowSeconds);
    }
  }

  /**
   * Get remaining attempts
   */
  async getRemaining(
    type: 'ip' | 'email',
    identifier: string,
    action: string
  ): Promise<number> {
    const config = RATE_LIMITS[`${type}:${action}`];
    if (!config) return 0;

    const key = `${this.PREFIX}${type}:${identifier}:${action}`;
    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    return Math.max(0, config.limit - count);
  }

  /**
   * Reset rate limit (admin/testing purposes)
   */
  async reset(
    type: 'ip' | 'email',
    identifier: string,
    action?: string
  ): Promise<void> {
    if (action) {
      const key = `${this.PREFIX}${type}:${identifier}:${action}`;
      await this.redis.del(key);
    } else {
      // Reset all actions for this identifier
      const pattern = `${this.PREFIX}${type}:${identifier}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
```

#### 6.1.4. OTP Attempts Tracking

```typescript
/**
 * OTP Attempts Tracking Strategy
 *
 * Purpose: Track failed OTP verification attempts
 * Storage: Redis String (counter)
 * TTL: 10 minutes (same as OTP)
 * Key Pattern: signup:otp:attempts:{sessionId}
 * Max Attempts: 3
 */

class OTPAttemptsService {
  private redis: Redis;
  private readonly ATTEMPTS_PREFIX = 'signup:otp:attempts:';
  private readonly MAX_ATTEMPTS = 3;
  private readonly ATTEMPTS_TTL = 600; // 10 minutes

  /**
   * Record failed attempt
   * Returns remaining attempts
   * Throws error if max attempts reached
   */
  async recordFailedAttempt(sessionId: string): Promise<number> {
    const key = this.ATTEMPTS_PREFIX + sessionId;

    // Increment counter
    const attempts = await this.redis.incr(key);

    // Set TTL on first attempt
    if (attempts === 1) {
      await this.redis.expire(key, this.ATTEMPTS_TTL);
    }

    const remaining = this.MAX_ATTEMPTS - attempts;

    // Check if locked
    if (attempts >= this.MAX_ATTEMPTS) {
      throw new AuthenticationError(
        SignupErrorCode.OTP_LOCKED,
        'Mã OTP đã bị khóa do nhập sai quá nhiều lần',
        {
          failedAttempts: attempts,
          action: 'resend_otp'
        }
      );
    }

    return remaining;
  }

  /**
   * Get remaining attempts
   */
  async getRemaining(sessionId: string): Promise<number> {
    const key = this.ATTEMPTS_PREFIX + sessionId;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts) : 0;
    return Math.max(0, this.MAX_ATTEMPTS - count);
  }

  /**
   * Check if locked
   */
  async isLocked(sessionId: string): Promise<boolean> {
    const key = this.ATTEMPTS_PREFIX + sessionId;
    const attempts = await this.redis.get(key);
    const count = attempts ? parseInt(attempts) : 0;
    return count >= this.MAX_ATTEMPTS;
  }

  /**
   * Reset attempts (after resend OTP)
   */
  async reset(sessionId: string): Promise<void> {
    const key = this.ATTEMPTS_PREFIX + sessionId;
    await this.redis.del(key);
  }
}
```

#### 6.1.5. Resend OTP Cooldown

```typescript
/**
 * Resend OTP Cooldown Strategy
 *
 * Purpose: Prevent rapid OTP resend requests
 * Storage: Redis String (timestamp)
 * TTL: 60 seconds
 * Key Pattern: signup:resend:cooldown:{email}
 */

class ResendCooldownService {
  private redis: Redis;
  private readonly COOLDOWN_PREFIX = 'signup:resend:cooldown:';
  private readonly COOLDOWN_SECONDS = 60;

  /**
   * Set cooldown
   */
  async setCooldown(email: string): Promise<void> {
    const key = this.COOLDOWN_PREFIX + email.toLowerCase();
    const timestamp = Date.now().toString();
    await this.redis.set(key, timestamp, 'EX', this.COOLDOWN_SECONDS);
  }

  /**
   * Check if cooldown is active
   * Throws error if active
   */
  async checkCooldown(email: string): Promise<void> {
    const key = this.COOLDOWN_PREFIX + email.toLowerCase();
    const cooldownTime = await this.redis.get(key);

    if (cooldownTime) {
      const ttl = await this.redis.ttl(key);
      const canResendAt = new Date(Date.now() + ttl * 1000);

      throw new RateLimitError(
        'Vui lòng đợi trước khi gửi lại OTP',
        {
          code: SignupErrorCode.RESEND_COOLDOWN_ACTIVE,
          canResendAt: canResendAt.toISOString(),
          remainingSeconds: ttl,
          cooldownPeriod: this.COOLDOWN_SECONDS
        }
      );
    }
  }

  /**
   * Get remaining cooldown time
   */
  async getRemainingTime(email: string): Promise<number> {
    const key = this.COOLDOWN_PREFIX + email.toLowerCase();
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
}
```

### 6.2. Cache Invalidation Strategy

```typescript
/**
 * Cache Invalidation Rules
 *
 * 1. Session:
 *    - Auto-expire after 30 minutes (TTL)
 *    - Manually delete after successful signup
 *    - Manually delete on explicit cancellation
 *
 * 2. OTP:
 *    - Auto-expire after 10 minutes (TTL)
 *    - Manually delete after successful verification (one-time use)
 *    - Manually delete when resending new OTP
 *
 * 3. OTP Attempts:
 *    - Auto-expire after 10 minutes (same as OTP)
 *    - Manually reset when resending new OTP
 *    - Manually reset after successful verification
 *
 * 4. Rate Limits:
 *    - Auto-expire after window period (1 hour or 24 hours)
 *    - No manual invalidation (let it expire naturally)
 *
 * 5. Resend Cooldown:
 *    - Auto-expire after 60 seconds
 *    - No manual invalidation
 */

class CacheInvalidationService {
  /**
   * Cleanup after successful signup
   */
  async cleanupAfterSignup(
    email: string,
    sessionId: string
  ): Promise<void> {
    await Promise.all([
      // Delete session
      this.sessionService.deleteSession(sessionId),

      // Delete OTP (if any remaining)
      this.otpService.invalidate(email, sessionId),

      // Delete OTP attempts
      this.otpAttemptsService.reset(sessionId),

      // Note: Rate limits and cooldowns will expire naturally
    ]);
  }

  /**
   * Cleanup when resending OTP
   */
  async cleanupForResend(
    email: string,
    sessionId: string
  ): Promise<void> {
    await Promise.all([
      // Invalidate old OTP
      this.otpService.invalidate(email, sessionId),

      // Reset OTP attempts
      this.otpAttemptsService.reset(sessionId),

      // Session remains active
    ]);
  }

  /**
   * Cleanup expired sessions (cron job)
   * Note: Redis TTL handles this automatically
   * This is just for logging/monitoring
   */
  async cleanupExpiredSessions(): Promise<void> {
    // Redis automatically deletes expired keys
    // This method can be used for logging/metrics

    const pattern = 'signup:session:*';
    const keys = await this.redis.keys(pattern);

    logger.info('Active signup sessions', {
      count: keys.length
    });
  }
}
```

### 6.3. Caching Best Practices

```typescript
/**
 * Best Practices Summary
 *
 * 1. Use Redis for all ephemeral data (sessions, OTP, rate limits)
 * 2. Always set TTL to prevent memory leaks
 * 3. Use appropriate data structures:
 *    - Hash for structured data (sessions)
 *    - String for simple counters and flags
 * 4. Implement sliding expiration for sessions (extend TTL on access)
 * 5. Use consistent key naming patterns
 * 6. Handle Redis connection failures gracefully
 * 7. Monitor Redis memory usage
 * 8. Use pipeline for multiple operations
 * 9. Implement proper error handling for cache misses
 * 10. Log all cache operations for debugging
 */

// Redis connection with retry logic
const createRedisClient = (): Redis => {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err });
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  return redis;
};

// Graceful degradation when Redis is down
const safeRedisOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    logger.error('Redis operation failed', { error });
    return fallback;
  }
};
```

---

**Document Version:** 1.0
**Last Updated:** 2024-11-04
**Author:** Development Team
**Status:** Draft - Ready for Implementation
