# Test Specification Document
## Tính năng Đăng ký người dùng (Sign Up)

---

**Document Type:** Test Specification (Test Plan + Test Cases)
**Target Audience:** QA Engineers, Testers, Test Automation Engineers
**Version:** 1.0
**Last Updated:** 2024-11-04
**Status:** Draft

---

## Table of Contents

1. [Test Strategy](#1-test-strategy)
2. [Test Scenarios](#2-test-scenarios)
3. [Test Cases](#3-test-cases)
4. [Regression Test Plan](#4-regression-test-plan)
5. [Automation Scope](#5-automation-scope)

---

## 1. Test Strategy

### 1.1. Testing Levels Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                          │
│                                                              │
│                      ▲  E2E Tests                            │
│                     ╱ ╲  (10%)                               │
│                    ╱   ╲  UI + API + DB                      │
│                   ╱─────╲                                    │
│                  ╱       ╲                                   │
│                 ╱         ╲  Integration Tests               │
│                ╱           ╲  (30%)                          │
│               ╱─────────────╲  API + Service + DB            │
│              ╱               ╲                               │
│             ╱                 ╲                              │
│            ╱                   ╲  Unit Tests                 │
│           ╱                     ╲  (60%)                     │
│          ╱───────────────────────╲  Functions + Classes      │
│         ╱                         ╲                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2. Unit Testing Strategy

**Scope:** Individual functions, methods, and utilities

**Tools:**
- Frontend: Jest + React Testing Library
- Backend: Jest + Supertest

**Coverage Target:** 80%+ for business logic

**What to Test:**

#### Backend Unit Tests

1. **OTPService**
   ```typescript
   describe('OTPService', () => {
     describe('generate()', () => {
       it('should generate 6-digit OTP')
       it('should generate different OTP each time')
       it('should only contain numeric characters')
     });

     describe('verify()', () => {
       it('should return true for correct OTP')
       it('should return false for incorrect OTP')
       it('should throw error for expired OTP')
     });

     describe('invalidate()', () => {
       it('should delete OTP from Redis')
     });
   });
   ```

2. **Validation Functions**
   ```typescript
   describe('validateEmail()', () => {
     it('should accept valid email')
     it('should reject email without @')
     it('should reject email without domain')
     it('should reject email with spaces')
     it('should convert email to lowercase')
     it('should trim whitespace')
     it('should reject disposable email domains')
   });

   describe('validatePassword()', () => {
     it('should accept password with all requirements')
     it('should reject password < 8 chars')
     it('should reject password without uppercase')
     it('should reject password without lowercase')
     it('should reject password without number')
     it('should reject password without special char')
     it('should reject password with whitespace')
     it('should calculate password strength correctly')
   });
   ```

3. **RateLimitService**
   ```typescript
   describe('RateLimitService', () => {
     it('should allow requests within limit')
     it('should block requests exceeding limit')
     it('should reset counter after window expires')
     it('should track separate limits for IP and email')
   });
   ```

#### Frontend Unit Tests

1. **Form Components**
   ```typescript
   describe('SignupStep1', () => {
     it('should render email input')
     it('should show validation error for invalid email')
     it('should disable submit button when invalid')
     it('should call onSubmit with valid email')
   });

   describe('SignupStep2', () => {
     it('should render OTP input with 6 digits')
     it('should show countdown timer')
     it('should enable resend button after cooldown')
     it('should call onSubmit with OTP')
   });
   ```

2. **Validation Schemas (Zod)**
   ```typescript
   describe('signupSchemas', () => {
     describe('emailSchema', () => {
       it('should validate correct email')
       it('should reject invalid email formats')
     });

     describe('passwordSchema', () => {
       it('should validate strong password')
       it('should reject weak passwords')
     });
   });
   ```

3. **Custom Hooks**
   ```typescript
   describe('useOTPTimer', () => {
     it('should countdown from initial time')
     it('should call onExpire when timer reaches 0')
     it('should reset timer on demand')
   });
   ```

**Test Execution:**
- Run on every commit (CI/CD)
- Must pass before merging PR
- Generate coverage report

---

### 1.3. Integration Testing Strategy

**Scope:** API endpoints + Services + Database + Redis

**Tools:**
- Backend: Jest + Supertest + MongoDB Memory Server + ioredis-mock
- API Testing: Postman/Newman

**Coverage Target:** All API endpoints, all happy paths, all error paths

**What to Test:**

#### API Integration Tests

1. **POST /api/auth/signup/send-otp**
   ```typescript
   describe('POST /api/auth/signup/send-otp', () => {
     it('should send OTP for valid email')
     it('should return sessionId and expiresAt')
     it('should store OTP in Redis')
     it('should create session in Redis')
     it('should send email via email service')
     it('should return 409 for existing email')
     it('should return 400 for invalid email format')
     it('should return 429 when rate limit exceeded')
     it('should increment rate limit counter')
     it('should log signup attempt to MongoDB')
   });
   ```

2. **POST /api/auth/signup/verify-otp**
   ```typescript
   describe('POST /api/auth/signup/verify-otp', () => {
     it('should verify correct OTP')
     it('should return JWT token on success')
     it('should update session verified=true')
     it('should delete OTP after successful verification')
     it('should return 401 for incorrect OTP')
     it('should increment attempts counter on failure')
     it('should return 403 after 3 failed attempts')
     it('should return 401 for expired OTP')
     it('should return 404 for invalid session')
   });
   ```

3. **POST /api/auth/signup/resend-otp**
   ```typescript
   describe('POST /api/auth/signup/resend-otp', () => {
     it('should resend OTP after cooldown expires')
     it('should invalidate old OTP')
     it('should reset attempts counter')
     it('should set new cooldown')
     it('should return 429 during cooldown period')
     it('should return 429 after exceeding daily limit')
   });
   ```

4. **POST /api/auth/signup/complete**
   ```typescript
   describe('POST /api/auth/signup/complete', () => {
     it('should create user with valid data')
     it('should hash password before storing')
     it('should set emailVerified=true')
     it('should delete session after success')
     it('should send welcome email')
     it('should return user data and tokens')
     it('should return 401 for invalid token')
     it('should return 400 for validation errors')
     it('should return 409 if email already registered')
   });
   ```

#### Service Integration Tests

```typescript
describe('Signup Flow Integration', () => {
  it('should complete full signup flow', async () => {
    // 1. Send OTP
    const sendResponse = await sendOTP(email);
    expect(sendResponse.sessionId).toBeDefined();

    // 2. Verify OTP is in Redis
    const otp = await getOTPFromRedis(email, sessionId);
    expect(otp).toBeDefined();

    // 3. Verify OTP
    const verifyResponse = await verifyOTP(email, otp, sessionId);
    expect(verifyResponse.token).toBeDefined();

    // 4. Complete signup
    const completeResponse = await completeSignup(userData, token);
    expect(completeResponse.user.id).toBeDefined();

    // 5. Verify user in database
    const user = await getUserFromDB(email);
    expect(user.emailVerified).toBe(true);

    // 6. Verify session deleted
    const session = await getSessionFromRedis(sessionId);
    expect(session).toBeNull();
  });
});
```

**Test Execution:**
- Run on every PR
- Run before deployment to staging
- Use test database and mock Redis

---

### 1.4. End-to-End (E2E) Testing Strategy

**Scope:** Complete user flows through UI

**Tools:**
- Playwright or Cypress
- Real browser automation

**Coverage Target:** Critical user journeys

**What to Test:**

#### E2E Test Scenarios

1. **Happy Path: Complete Signup**
   ```typescript
   test('User can complete signup successfully', async ({ page }) => {
     // Navigate to signup
     await page.goto('/signup');

     // Step 1: Enter email
     await page.fill('input[name="email"]', 'test@example.com');
     await page.click('button[type="submit"]');

     // Wait for OTP screen
     await page.waitForSelector('input[name="otp"]');

     // Get OTP from test email inbox (using email testing service)
     const otp = await getOTPFromTestMailbox('test@example.com');

     // Step 2: Enter OTP
     await page.fill('input[name="otp"]', otp);
     await page.click('button[type="submit"]');

     // Wait for user info form
     await page.waitForSelector('input[name="fullName"]');

     // Step 3: Fill user info
     await page.fill('input[name="fullName"]', 'Test User');
     await page.fill('input[name="password"]', 'SecurePass123!');
     await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
     await page.check('input[name="acceptTerms"]');
     await page.click('button[type="submit"]');

     // Verify redirect to success page or dashboard
     await page.waitForURL('/dashboard');
     expect(page.url()).toContain('/dashboard');
   });
   ```

2. **Error Path: Invalid OTP**
   ```typescript
   test('User sees error for invalid OTP', async ({ page }) => {
     // ... navigate to OTP screen

     // Enter wrong OTP
     await page.fill('input[name="otp"]', '999999');
     await page.click('button[type="submit"]');

     // Verify error message
     await expect(page.locator('.error-message')).toContainText('Mã OTP không chính xác');

     // Verify attempts remaining shown
     await expect(page.locator('.attempts-remaining')).toContainText('2');
   });
   ```

3. **Resend OTP Flow**
   ```typescript
   test('User can resend OTP after cooldown', async ({ page }) => {
     // ... navigate to OTP screen

     // Verify resend button disabled initially
     const resendButton = page.locator('button:has-text("Gửi lại OTP")');
     await expect(resendButton).toBeDisabled();

     // Wait for cooldown (or use test helper to skip time)
     await page.waitForTimeout(60000);

     // Verify resend button enabled
     await expect(resendButton).toBeEnabled();

     // Click resend
     await resendButton.click();

     // Verify success message
     await expect(page.locator('.success-message')).toContainText('Mã OTP mới đã được gửi');
   });
   ```

**Test Execution:**
- Run on staging environment before production deployment
- Run nightly for smoke tests
- Can run subset on every deployment

---

### 1.5. Performance Testing Strategy

**Scope:** Load testing for concurrent signups

**Tools:** Apache JMeter or k6

**Test Scenarios:**

1. **Load Test: Normal Load**
   - 50 concurrent users signing up
   - Duration: 10 minutes
   - Expected: All requests succeed, avg response time < 500ms

2. **Stress Test: Peak Load**
   - 200 concurrent users
   - Duration: 5 minutes
   - Expected: System remains stable, some requests may fail gracefully

3. **Spike Test: Sudden Traffic**
   - 0 → 100 users in 10 seconds
   - Expected: System handles spike without crashes

**Metrics to Monitor:**
- Response time (p50, p95, p99)
- Error rate
- Database connections
- Redis memory usage
- Email delivery rate

---

### 1.6. Security Testing Strategy

**Scope:** Security vulnerabilities and attack scenarios

**What to Test:**

1. **Rate Limiting**
   - Verify rate limits enforced for all endpoints
   - Test IP-based and email-based limits
   - Verify 429 responses when exceeded

2. **OTP Security**
   - Verify OTP locked after 3 failed attempts
   - Verify OTP expires after 10 minutes
   - Verify OTP is one-time use (deleted after verification)
   - Test OTP brute force protection

3. **Input Validation**
   - Test SQL injection attempts
   - Test XSS payloads in inputs
   - Test command injection
   - Test path traversal attempts

4. **Session Security**
   - Verify session expires after 30 minutes
   - Verify session cannot be hijacked
   - Verify CSRF protection

5. **Password Security**
   - Verify password is hashed (bcrypt)
   - Verify password not logged
   - Verify password complexity enforced

**Tools:** OWASP ZAP, Burp Suite

---

## 2. Test Scenarios

### 2.1. Test Scenarios Matrix (từ SRS)

| ID | Scenario | Priority | Type | Status |
|----|----------|----------|------|--------|
| TS-001 | Happy Path: Complete signup successfully | P0 | Functional | To Do |
| TS-002 | Email already registered | P0 | Functional | To Do |
| TS-003 | Invalid email format | P1 | Functional | To Do |
| TS-004 | OTP expired | P0 | Functional | To Do |
| TS-005 | Invalid OTP (3 attempts) | P0 | Functional | To Do |
| TS-006 | Resend OTP successfully | P1 | Functional | To Do |
| TS-007 | Resend OTP with cooldown | P1 | Functional | To Do |
| TS-008 | Weak password rejected | P1 | Functional | To Do |
| TS-009 | Password mismatch | P1 | Functional | To Do |
| TS-010 | Session timeout | P1 | Functional | To Do |
| TS-011 | Rate limit exceeded | P0 | Security | To Do |
| TS-012 | Email service failure | P0 | Error Handling | To Do |
| TS-013 | Network timeout | P1 | Error Handling | To Do |
| TS-014 | Database error during user creation | P0 | Error Handling | To Do |
| TS-015 | Multiple browser tabs | P2 | Edge Case | To Do |
| TS-016 | Back button navigation | P2 | Edge Case | To Do |
| TS-017 | Page refresh during flow | P2 | Edge Case | To Do |
| TS-018 | Invalid phone format | P2 | Functional | To Do |
| TS-019 | SQL injection attempts | P0 | Security | To Do |
| TS-020 | XSS payloads | P0 | Security | To Do |

### 2.2. Test Scenario Details

#### TS-001: Happy Path - Complete Signup Successfully

**Description:** User completes all 3 steps of signup without errors

**Preconditions:**
- Email is not registered
- User has access to email inbox
- All services (backend, database, Redis, email) are running

**Test Steps:**
1. Navigate to /signup
2. Enter valid email
3. Submit form
4. Receive OTP via email
5. Enter correct OTP
6. Submit OTP
7. Fill user information (name, password, phone)
8. Submit final form
9. Verify account created

**Expected Results:**
- User account created in database
- Email marked as verified
- User receives welcome email
- User redirected to dashboard or login page

**Postconditions:**
- User can login with credentials
- Session data cleaned up from Redis

---

#### TS-005: Invalid OTP - 3 Failed Attempts

**Description:** User enters wrong OTP 3 times and gets locked

**Preconditions:**
- User has completed Step 1 (email sent)
- OTP has been generated and sent

**Test Steps:**
1. Navigate to OTP verification screen
2. Enter wrong OTP (999999)
3. Submit
4. Verify error: "Mã OTP không chính xác, còn 2 lần thử"
5. Enter wrong OTP again (888888)
6. Submit
7. Verify error: "Mã OTP không chính xác, còn 1 lần thử"
8. Enter wrong OTP third time (777777)
9. Submit
10. Verify error: "Mã OTP đã bị khóa. Vui lòng gửi lại OTP mới"
11. Verify "Resend OTP" button is enabled

**Expected Results:**
- After 3 failed attempts, OTP is locked
- User cannot try the same OTP anymore
- Resend OTP option is provided
- Attempts counter in Redis = 3

**Postconditions:**
- OTP is deleted from Redis
- User must request new OTP to continue

---

#### TS-011: Rate Limit Exceeded

**Description:** User exceeds rate limit for sending OTP

**Preconditions:**
- Clean state (no previous rate limits)

**Test Steps:**
1. Send OTP request from IP 192.168.1.1 for test1@example.com
2. Send OTP request from same IP for test2@example.com
3. Repeat steps 1-2 until 5 requests made
4. Send 6th OTP request from same IP
5. Verify 429 error returned
6. Check error response contains:
   - limit: 5
   - remaining: 0
   - resetAt: <timestamp>
   - retryAfter: <seconds>

**Expected Results:**
- First 5 requests succeed
- 6th request returns 429 Too Many Requests
- Error message: "Bạn đã vượt quá số lần gửi OTP cho phép"
- Rate limit counter in Redis = 6
- Counter expires after 1 hour

**Postconditions:**
- User must wait until rate limit window expires
- After 1 hour, user can send OTP again

---

## 3. Test Cases (Chi tiết)

### 3.1. Test Case Template

```
Test Case ID: TC-XXX
Test Scenario: [Scenario name]
Priority: P0/P1/P2
Type: Functional/Security/Performance/Edge Case
Test Level: Unit/Integration/E2E

Description: [Brief description]

Preconditions:
- [Precondition 1]
- [Precondition 2]

Test Data:
- [Data needed for test]

Test Steps:
1. [Step 1]
2. [Step 2]
...

Expected Results:
- [Expected result 1]
- [Expected result 2]

Actual Results: [To be filled during test execution]

Status: Pass/Fail/Blocked

Postconditions:
- [Postcondition 1]

Notes: [Any additional notes]
```

---

### 3.2. Test Cases for Step 1: Send OTP

#### TC-001: Send OTP with Valid Email

**Test Scenario:** TS-001 (Happy Path)
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify OTP is sent successfully for valid email

**Preconditions:**
- Backend API is running
- Redis is running
- Email service is configured
- Email "newuser@example.com" is NOT registered

**Test Data:**
```json
{
  "email": "newuser@example.com"
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/send-otp`
2. Include request body with email
3. Verify response status code
4. Verify response body structure
5. Check OTP stored in Redis
6. Check session created in Redis
7. Check email sent (check email service logs or test mailbox)
8. Check signup attempt logged in MongoDB

**Expected Results:**
- Status code: 200 OK
- Response body contains:
  ```json
  {
    "success": true,
    "message": "Mã OTP đã được gửi đến email của bạn",
    "data": {
      "sessionId": "<uuid>",
      "email": "n***@example.com",
      "expiresIn": 600,
      "expiresAt": "<ISO timestamp>",
      "canResendAt": "<ISO timestamp>"
    }
  }
  ```
- Redis key `signup:session:{sessionId}` exists with TTL 1800s
- Redis key `signup:otp:{email}:{sessionId}` exists with TTL 600s
- Email sent to newuser@example.com with OTP code
- MongoDB `signup_attempts` collection has new record with success=true

**Postconditions:**
- Session active in Redis
- OTP valid for 10 minutes
- User can proceed to Step 2

---

#### TC-002: Send OTP with Invalid Email Format

**Test Scenario:** TS-003
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify proper error for invalid email format

**Preconditions:**
- Backend API is running

**Test Data:**
```json
// Test with multiple invalid formats
[
  { "email": "invalid-email" },
  { "email": "test@" },
  { "email": "@example.com" },
  { "email": "test @example.com" },
  { "email": "" }
]
```

**Test Steps:**
1. For each test data:
2. Send POST request to `/api/auth/signup/send-otp`
3. Verify response status code
4. Verify error message

**Expected Results:**
- Status code: 400 Bad Request
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_EMAIL_FORMAT",
      "message": "Email không hợp lệ",
      "details": {
        "field": "email",
        "value": "<invalid email>",
        "constraint": "Must be a valid email address"
      }
    }
  }
  ```
- No OTP generated
- No session created
- No email sent
- Signup attempt logged with success=false

---

#### TC-003: Send OTP for Already Registered Email

**Test Scenario:** TS-002
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify user cannot signup with existing email

**Preconditions:**
- Backend API is running
- User with email "existing@example.com" already exists in database

**Test Data:**
```json
{
  "email": "existing@example.com"
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/send-otp`
2. Include request body with existing email
3. Verify response status code
4. Verify error response

**Expected Results:**
- Status code: 409 Conflict
- Response body:
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
- No OTP generated
- No session created
- No email sent

---

#### TC-004: Send OTP - Rate Limit Exceeded (IP)

**Test Scenario:** TS-011
**Priority:** P0
**Type:** Security
**Test Level:** Integration

**Description:** Verify rate limiting works for IP address

**Preconditions:**
- Backend API is running
- Redis is running
- No existing rate limits for IP 192.168.1.100

**Test Data:**
```json
[
  { "email": "test1@example.com" },
  { "email": "test2@example.com" },
  { "email": "test3@example.com" },
  { "email": "test4@example.com" },
  { "email": "test5@example.com" },
  { "email": "test6@example.com" }
]
```

**Test Steps:**
1. Send 5 OTP requests from IP 192.168.1.100 with different emails
2. Verify all 5 requests succeed (200 OK)
3. Send 6th OTP request from same IP
4. Verify rate limit error
5. Check Redis rate limit counter
6. Wait for rate limit window to expire (or use test helper)
7. Send request again
8. Verify request succeeds

**Expected Results:**
- Requests 1-5: Status 200 OK
- Request 6: Status 429 Too Many Requests
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Bạn đã vượt quá số lần gửi OTP cho phép",
      "details": {
        "limit": 5,
        "remaining": 0,
        "resetAt": "<ISO timestamp>",
        "retryAfter": 3600
      }
    }
  }
  ```
- Redis key `signup:ratelimit:ip:192.168.1.100:send_otp` = 6
- After window expires, requests succeed again

---

### 3.3. Test Cases for Step 2: Verify OTP

#### TC-010: Verify OTP with Correct Code

**Test Scenario:** TS-001 (Happy Path)
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify user can successfully verify OTP

**Preconditions:**
- OTP has been sent (Step 1 completed)
- Session exists in Redis
- OTP exists in Redis

**Test Data:**
```json
{
  "email": "test@example.com",
  "otp": "123456",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Get actual OTP from Redis (for testing) or from test email inbox
2. Send POST request to `/api/auth/signup/verify-otp`
3. Include correct OTP, email, and sessionId
4. Verify response status code
5. Verify JWT token returned
6. Check session updated (verified=true)
7. Check OTP deleted from Redis
8. Decode JWT token and verify claims

**Expected Results:**
- Status code: 200 OK
- Response body:
  ```json
  {
    "success": true,
    "message": "Xác thực OTP thành công",
    "data": {
      "verified": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenExpiresIn": 1800,
      "tokenExpiresAt": "<ISO timestamp>",
      "nextStep": "complete_signup"
    }
  }
  ```
- Redis session field `verified` = "true"
- Redis OTP key deleted
- JWT token contains: email, sessionId, verified=true
- JWT token expires in 30 minutes

---

#### TC-011: Verify OTP with Incorrect Code

**Test Scenario:** TS-005
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify error shown for incorrect OTP

**Preconditions:**
- OTP has been sent
- Session and OTP exist in Redis
- Correct OTP is "123456"

**Test Data:**
```json
{
  "email": "test@example.com",
  "otp": "999999",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/verify-otp`
2. Include incorrect OTP
3. Verify response status code
4. Verify error message includes attempts remaining
5. Check Redis attempts counter incremented
6. Verify OTP still exists in Redis (not deleted)

**Expected Results:**
- Status code: 401 Unauthorized
- Response body:
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
- Redis key `signup:otp:attempts:{sessionId}` = 1
- OTP still exists in Redis
- Session still active

---

#### TC-012: Verify OTP - 3 Failed Attempts (Lockout)

**Test Scenario:** TS-005
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify OTP locked after 3 failed attempts

**Preconditions:**
- OTP has been sent
- Session and OTP exist in Redis

**Test Data:**
```json
{
  "email": "test@example.com",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "wrongOTPs": ["111111", "222222", "333333"]
}
```

**Test Steps:**
1. Attempt 1: Send request with OTP "111111"
2. Verify response: 401, attemptsRemaining: 2
3. Attempt 2: Send request with OTP "222222"
4. Verify response: 401, attemptsRemaining: 1
5. Attempt 3: Send request with OTP "333333"
6. Verify response: 403, OTP locked
7. Verify OTP deleted from Redis
8. Verify attempts counter = 3
9. Try 4th attempt with correct OTP
10. Verify still returns 403 (locked)

**Expected Results:**
- Attempt 1: Status 401, attemptsRemaining: 2
- Attempt 2: Status 401, attemptsRemaining: 1
- Attempt 3: Status 403, response:
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
- Redis OTP key deleted
- Redis attempts counter = 3
- Attempt 4: Still returns 403 or OTP_EXPIRED

---

#### TC-013: Verify Expired OTP

**Test Scenario:** TS-004
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify error for expired OTP

**Preconditions:**
- OTP was sent 11 minutes ago (expired)
- OR OTP TTL set to 0 for testing

**Test Data:**
```json
{
  "email": "test@example.com",
  "otp": "123456",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Send OTP (Step 1)
2. Wait 11 minutes OR manually delete OTP from Redis
3. Send POST request to `/api/auth/signup/verify-otp` with correct OTP
4. Verify response

**Expected Results:**
- Status code: 401 Unauthorized
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "OTP_EXPIRED",
      "message": "Mã OTP đã hết hạn",
      "details": {
        "expiredAt": "<ISO timestamp>",
        "action": "resend_otp"
      }
    }
  }
  ```
- OTP does not exist in Redis (auto-deleted by TTL)

---

#### TC-014: Verify OTP with Invalid Session

**Test Scenario:** TS-010
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify error when session is invalid or expired

**Preconditions:**
- Session does not exist OR expired

**Test Data:**
```json
{
  "email": "test@example.com",
  "otp": "123456",
  "sessionId": "invalid-session-id-12345"
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/verify-otp`
2. Use non-existent or expired sessionId
3. Verify response

**Expected Results:**
- Status code: 404 Not Found
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "SESSION_NOT_FOUND",
      "message": "Phiên làm việc không tồn tại hoặc đã hết hạn",
      "details": {
        "sessionId": "invalid-session-id-12345",
        "action": "restart_signup"
      }
    }
  }
  ```

---

### 3.4. Test Cases for Step 2.5: Resend OTP

#### TC-020: Resend OTP Successfully After Cooldown

**Test Scenario:** TS-006
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify user can resend OTP after cooldown period

**Preconditions:**
- OTP was sent 61+ seconds ago (cooldown expired)
- Session still active

**Test Data:**
```json
{
  "email": "test@example.com",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Send initial OTP (Step 1)
2. Wait 61 seconds
3. Send POST request to `/api/auth/signup/resend-otp`
4. Verify response
5. Check old OTP invalidated
6. Check new OTP created
7. Check attempts counter reset
8. Check new cooldown set
9. Verify email sent with new OTP

**Expected Results:**
- Status code: 200 OK
- Response body:
  ```json
  {
    "success": true,
    "message": "Mã OTP mới đã được gửi đến email của bạn",
    "data": {
      "email": "t***@example.com",
      "expiresIn": 600,
      "expiresAt": "<ISO timestamp>",
      "canResendAt": "<ISO timestamp + 60s>",
      "resendCount": 1
    }
  }
  ```
- Old OTP deleted from Redis
- New OTP created in Redis with new TTL
- Attempts counter reset to 0
- New cooldown active for 60 seconds
- Email sent with new OTP

---

#### TC-021: Resend OTP During Cooldown Period

**Test Scenario:** TS-007
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify error when resending OTP during cooldown

**Preconditions:**
- OTP was sent 30 seconds ago (cooldown still active)

**Test Data:**
```json
{
  "email": "test@example.com",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Send initial OTP
2. Wait 30 seconds (cooldown still active)
3. Send POST request to `/api/auth/signup/resend-otp`
4. Verify error response

**Expected Results:**
- Status code: 429 Too Many Requests
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESEND_COOLDOWN_ACTIVE",
      "message": "Vui lòng đợi trước khi gửi lại OTP",
      "details": {
        "canResendAt": "<ISO timestamp>",
        "remainingSeconds": 30,
        "cooldownPeriod": 60
      }
    }
  }
  ```
- OTP not resent
- No email sent

---

#### TC-022: Resend OTP - Daily Limit Exceeded

**Test Scenario:** TS-007
**Priority:** P1
**Type:** Security
**Test Level:** Integration

**Description:** Verify rate limit for resending OTP

**Preconditions:**
- User has already resent OTP 5 times today

**Test Data:**
```json
{
  "email": "test@example.com",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Test Steps:**
1. Resend OTP 5 times (waiting for cooldown each time)
2. Attempt 6th resend
3. Verify rate limit error

**Expected Results:**
- Status code: 429 Too Many Requests
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESEND_LIMIT_EXCEEDED",
      "message": "Bạn đã vượt quá số lần gửi lại OTP cho phép",
      "details": {
        "dailyLimit": 5,
        "resetAt": "<ISO timestamp (next day 00:00)>",
        "suggestion": "Vui lòng liên hệ hỗ trợ nếu bạn cần trợ giúp"
      }
    }
  }
  ```

---

### 3.5. Test Cases for Step 3: Complete Signup

#### TC-030: Complete Signup with Valid Data

**Test Scenario:** TS-001 (Happy Path)
**Priority:** P0
**Type:** Functional
**Test Level:** Integration

**Description:** Verify user account created successfully

**Preconditions:**
- Steps 1 and 2 completed (email verified)
- Valid JWT token from Step 2

**Test Data:**
```json
{
  "fullName": "Nguyễn Văn A",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phone": "+84912345678",
  "acceptTerms": true
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/complete`
2. Include Bearer token in Authorization header
3. Include request body with user data
4. Verify response
5. Check user created in MongoDB
6. Verify password is hashed
7. Verify emailVerified = true
8. Check session deleted from Redis
9. Check welcome email sent
10. Try to login with new credentials

**Expected Results:**
- Status code: 201 Created
- Response body:
  ```json
  {
    "success": true,
    "message": "Đăng ký thành công! Chào mừng bạn đến với hệ thống",
    "data": {
      "user": {
        "id": "user_abc123",
        "email": "test@example.com",
        "fullName": "Nguyễn Văn A",
        "phone": "+84912345678",
        "emailVerified": true,
        "createdAt": "<ISO timestamp>"
      },
      "session": {
        "accessToken": "eyJhbGc...",
        "refreshToken": "eyJhbGc...",
        "expiresIn": 86400
      }
    }
  }
  ```
- User document in MongoDB:
  - email = "test@example.com"
  - emailVerified = true
  - passwordHash starts with "$2b$12$"
  - fullName = "Nguyễn Văn A"
  - phone = "+84912345678"
- Session deleted from Redis
- Welcome email sent
- Login with credentials succeeds

---

#### TC-031: Complete Signup - Password Too Weak

**Test Scenario:** TS-008
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify weak password rejected

**Preconditions:**
- Steps 1 and 2 completed
- Valid JWT token

**Test Data:**
```json
[
  { "password": "12345678", "reason": "No uppercase, special char" },
  { "password": "password", "reason": "No uppercase, number, special char" },
  { "password": "Pass123", "reason": "Too short, no special char" },
  { "password": "Pass word123!", "reason": "Contains whitespace" }
]
```

**Test Steps:**
1. For each weak password:
2. Send POST request to `/api/auth/signup/complete`
3. Include weak password
4. Verify validation error

**Expected Results:**
- Status code: 400 Bad Request
- Response body:
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
            "message": "Mật khẩu phải chứa ít nhất 1 chữ hoa",
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
- No user created

---

#### TC-032: Complete Signup - Password Mismatch

**Test Scenario:** TS-009
**Priority:** P1
**Type:** Functional
**Test Level:** Integration

**Description:** Verify error when passwords don't match

**Preconditions:**
- Steps 1 and 2 completed
- Valid JWT token

**Test Data:**
```json
{
  "fullName": "Test User",
  "password": "SecurePass123!",
  "confirmPassword": "DifferentPass456!",
  "acceptTerms": true
}
```

**Test Steps:**
1. Send POST request to `/api/auth/signup/complete`
2. Include mismatched passwords
3. Verify error

**Expected Results:**
- Status code: 400 Bad Request
- Response body:
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

---

#### TC-033: Complete Signup - Invalid Token

**Test Scenario:** TS-010
**Priority:** P1
**Type:** Security
**Test Level:** Integration

**Description:** Verify error with invalid or expired token

**Preconditions:**
- None (testing security)

**Test Data:**
- Invalid token: "invalid-token-12345"
- Expired token: (generate token with -1 expiry)

**Test Steps:**
1. Send POST request to `/api/auth/signup/complete`
2. Include invalid token in Authorization header
3. Verify error
4. Repeat with expired token

**Expected Results:**
- Status code: 401 Unauthorized
- For invalid token:
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
- For expired token:
  ```json
  {
    "success": false,
    "error": {
      "code": "TOKEN_EXPIRED",
      "message": "Token đã hết hạn",
      "details": {
        "action": "restart_signup"
      }
    }
  }
  ```

---

#### TC-034: Complete Signup - Invalid Phone Format

**Test Scenario:** TS-018
**Priority:** P2
**Type:** Functional
**Test Level:** Integration

**Description:** Verify phone number validation

**Preconditions:**
- Steps 1 and 2 completed

**Test Data:**
```json
[
  { "phone": "0912345678", "reason": "Missing country code" },
  { "phone": "+849123456789012345", "reason": "Too long" },
  { "phone": "+84 912 345 678", "reason": "Contains spaces" },
  { "phone": "84912345678", "reason": "Missing + prefix" }
]
```

**Test Steps:**
1. For each invalid phone:
2. Send POST request with invalid phone
3. Verify validation error

**Expected Results:**
- Status code: 400 Bad Request
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Dữ liệu không hợp lệ",
      "details": {
        "fields": [
          {
            "field": "phone",
            "message": "Số điện thoại phải có định dạng quốc tế (vd: +84912345678)"
          }
        ]
      }
    }
  }
  ```

---

### 3.6. Test Cases for Edge Cases

#### TC-040: Multiple Browser Tabs

**Test Scenario:** TS-015
**Priority:** P2
**Type:** Edge Case
**Test Level:** E2E

**Description:** Verify behavior when user opens signup in multiple tabs

**Preconditions:**
- None

**Test Steps:**
1. Open Tab 1: Navigate to /signup
2. Enter email in Tab 1, submit
3. Open Tab 2: Navigate to /signup
4. Enter same email in Tab 2, submit
5. In Tab 1: Enter OTP and verify
6. In Tab 2: Try to enter OTP
7. Continue signup in Tab 1 to completion
8. Try to continue in Tab 2

**Expected Results:**
- Both tabs can send OTP for same email (limited by rate limiting)
- Latest OTP replaces previous OTP
- Only latest OTP is valid
- Tab 1 completes successfully
- Tab 2 shows error when trying to verify old OTP or complete signup
- User cannot create duplicate accounts

---

#### TC-041: Back Button Navigation

**Test Scenario:** TS-016
**Priority:** P2
**Type:** Edge Case
**Test Level:** E2E

**Description:** Verify behavior when user clicks browser back button

**Preconditions:**
- None

**Test Steps:**
1. Navigate to /signup (Step 1)
2. Enter email, submit
3. Navigate to /signup/verify (Step 2)
4. Click browser back button
5. Verify on Step 1 page
6. Verify email field populated with previous value
7. Change email and submit again
8. Verify new OTP sent
9. At Step 2, click back button again
10. Navigate forward again

**Expected Results:**
- Back button works correctly
- Email field retains value (if using URL params or state)
- User can change email and restart
- Session handles navigation properly
- No errors occur
- User can navigate back and forth without breaking flow

---

#### TC-042: Page Refresh During Flow

**Test Scenario:** TS-017
**Priority:** P2
**Type:** Edge Case
**Test Level:** E2E

**Description:** Verify behavior when user refreshes page during signup

**Preconditions:**
- None

**Test Steps:**
1. Navigate to /signup
2. Enter email, submit
3. At Step 2 (OTP entry), refresh page (F5)
4. Verify page state after refresh
5. Try to continue flow
6. If broken, restart from Step 1

**Expected Results:**
- **Option 1 (Session preserved):**
  - After refresh, user remains on Step 2
  - SessionId preserved (localStorage/URL param)
  - User can enter OTP and continue
  - Countdown timer may reset but functional

- **Option 2 (Session lost - acceptable):**
  - After refresh, user redirected to Step 1
  - Clear message: "Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại"
  - User can restart signup
  - No errors or broken state

---

#### TC-043: Session Timeout During Flow

**Test Scenario:** TS-010
**Priority:** P1
**Type:** Edge Case
**Test Level:** Integration

**Description:** Verify session expires after 30 minutes

**Preconditions:**
- User has started signup (Step 1 completed)

**Test Steps:**
1. Send OTP (Step 1)
2. Wait 31 minutes (or manipulate Redis TTL for testing)
3. Try to verify OTP
4. Verify error response

**Expected Results:**
- Status code: 404 Not Found
- Error code: SESSION_NOT_FOUND
- Message: "Phiên làm việc không tồn tại hoặc đã hết hạn"
- Action: "restart_signup"
- Frontend shows friendly message with option to restart

---

### 3.7. Test Cases for Security

#### TC-050: SQL Injection Attempts

**Test Scenario:** TS-019
**Priority:** P0
**Type:** Security
**Test Level:** Integration

**Description:** Verify SQL injection attempts are blocked

**Preconditions:**
- Backend API is running

**Test Data:**
```json
[
  { "email": "test@example.com' OR '1'='1" },
  { "email": "'; DROP TABLE users; --" },
  { "fullName": "Test'; DELETE FROM users WHERE '1'='1" },
  { "password": "' OR '1'='1'; --" }
]
```

**Test Steps:**
1. For each payload:
2. Send to appropriate endpoint
3. Verify request rejected or sanitized
4. Check database not affected

**Expected Results:**
- Request returns 400 Bad Request (validation error)
- OR values are properly escaped/sanitized
- No SQL injection occurs (using MongoDB, less vulnerable)
- Database remains intact
- Attack logged for monitoring

---

#### TC-051: XSS Payload Injection

**Test Scenario:** TS-020
**Priority:** P0
**Type:** Security
**Test Level:** Integration

**Description:** Verify XSS payloads are sanitized

**Preconditions:**
- Backend API is running

**Test Data:**
```json
[
  { "fullName": "<script>alert('XSS')</script>" },
  { "fullName": "<img src=x onerror=alert('XSS')>" },
  { "email": "test+<script>alert(1)</script>@example.com" }
]
```

**Test Steps:**
1. For each payload:
2. Submit in signup form
3. If accepted, verify stored safely
4. Retrieve user data via API
5. Display in frontend
6. Verify no script execution

**Expected Results:**
- Payloads either rejected at validation
- OR stored as plain text (escaped)
- When displayed, rendered as text (not executed)
- Frontend properly escapes output
- No XSS vulnerability

---

#### TC-052: CSRF Attack Attempt

**Test Scenario:** N/A
**Priority:** P0
**Type:** Security
**Test Level:** Integration

**Description:** Verify CSRF protection

**Preconditions:**
- User logged in on different site

**Test Steps:**
1. Create malicious page with form submitting to /api/auth/signup/send-otp
2. User visits malicious page while having valid session
3. Form auto-submits
4. Verify request blocked

**Expected Results:**
- Request blocked due to missing CSRF token
- OR CORS policy blocks cross-origin request
- Status 403 Forbidden
- No signup initiated

---

### 3.8. Test Cases for Error Handling

#### TC-060: Email Service Failure

**Test Scenario:** TS-012
**Priority:** P0
**Type:** Error Handling
**Test Level:** Integration

**Description:** Verify graceful handling of email service failure

**Preconditions:**
- Email service is down OR mock to throw error

**Test Steps:**
1. Send OTP request
2. Backend attempts to send email
3. Email service fails (timeout, connection error, etc.)
4. Verify error response to user
5. Check retry mechanism (if implemented)
6. Check error logged

**Expected Results:**
- Status code: 500 Internal Server Error (or 503 Service Unavailable)
- Response body:
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
- Backend retries sending email (3 attempts with exponential backoff)
- If all retries fail, return error
- Error logged with details for monitoring
- User can retry request

---

#### TC-061: Database Connection Error

**Test Scenario:** TS-014
**Priority:** P0
**Type:** Error Handling
**Test Level:** Integration

**Description:** Verify handling of database errors

**Preconditions:**
- MongoDB is down OR mock to throw error

**Test Steps:**
1. At Step 3, submit complete signup form
2. Backend attempts to create user
3. Database connection fails
4. Verify error response

**Expected Results:**
- Status code: 500 Internal Server Error
- Response body:
  ```json
  {
    "success": false,
    "error": {
      "code": "DATABASE_ERROR",
      "message": "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau",
      "details": {
        "retryable": true
      }
    }
  }
  ```
- Error logged with stack trace
- Session remains active (not deleted)
- User can retry
- No partial data created

---

#### TC-062: Network Timeout

**Test Scenario:** TS-013
**Priority:** P1
**Type:** Error Handling
**Test Level:** Integration

**Description:** Verify timeout handling

**Preconditions:**
- Simulate slow network OR set low timeout

**Test Steps:**
1. Send API request
2. Request takes > 30 seconds (timeout threshold)
3. Verify timeout error

**Expected Results:**
- Frontend shows timeout error: "Kết nối bị gián đoạn. Vui lòng thử lại"
- User data preserved (if applicable)
- User can retry
- Backend request cancelled or times out
- No hanging connections

---

## 4. Regression Test Plan

### 4.1. Regression Test Strategy

**Purpose:** Ensure new changes don't break existing functionality

**When to Run:**
- Before every release
- After bug fixes
- After refactoring
- Weekly automated runs

**Scope:**
- All P0 test cases (critical functionality)
- Selected P1 test cases (important features)
- Integration tests for affected areas

### 4.2. Regression Test Suite

#### Core Signup Flow (Must Pass)
| Test Case ID | Description | Type | Automation |
|--------------|-------------|------|------------|
| TC-001 | Send OTP with valid email | Integration | Yes |
| TC-010 | Verify OTP with correct code | Integration | Yes |
| TC-030 | Complete signup with valid data | Integration | Yes |
| E2E-001 | Complete signup flow (happy path) | E2E | Yes |

#### Error Handling (Must Pass)
| Test Case ID | Description | Type | Automation |
|--------------|-------------|------|------------|
| TC-002 | Invalid email format | Integration | Yes |
| TC-003 | Email already exists | Integration | Yes |
| TC-011 | Incorrect OTP | Integration | Yes |
| TC-012 | OTP locked after 3 attempts | Integration | Yes |
| TC-013 | Expired OTP | Integration | Yes |
| TC-031 | Weak password | Integration | Yes |
| TC-032 | Password mismatch | Integration | Yes |

#### Security (Must Pass)
| Test Case ID | Description | Type | Automation |
|--------------|-------------|------|------------|
| TC-004 | Rate limit IP | Integration | Yes |
| TC-050 | SQL injection prevention | Security | Yes |
| TC-051 | XSS prevention | Security | Yes |

#### Additional (Should Pass)
| Test Case ID | Description | Type | Automation |
|--------------|-------------|------|------------|
| TC-020 | Resend OTP after cooldown | Integration | Yes |
| TC-021 | Resend OTP during cooldown | Integration | Yes |
| TC-033 | Invalid token | Integration | Yes |
| TC-034 | Invalid phone format | Integration | Yes |

### 4.3. Regression Test Execution

**Pre-requisites:**
- Test environment ready (staging)
- Test data prepared
- Mock services configured (if needed)

**Execution Steps:**
1. Run automated unit tests (5 min)
2. Run automated integration tests (15 min)
3. Run automated E2E tests (30 min)
4. Review results and investigate failures
5. Run manual tests for non-automated cases (1-2 hours)
6. Generate test report

**Success Criteria:**
- 100% of P0 tests pass
- 95%+ of P1 tests pass
- No critical bugs found
- Performance benchmarks met

**Failure Handling:**
- Block release if P0 tests fail
- Investigate and fix failures
- Re-run regression suite
- Update test cases if needed

### 4.4. Regression Test Report Template

```
=== Regression Test Report ===
Date: [Date]
Build: [Build number]
Environment: [Staging/Production]
Tester: [Name]

Test Summary:
- Total Tests: 50
- Passed: 48
- Failed: 2
- Blocked: 0
- Pass Rate: 96%

Failed Tests:
1. TC-034: Invalid phone format
   - Reason: Backend not validating E.164 format
   - Severity: Medium
   - Status: Bug filed (#1234)

2. E2E-001: Complete signup flow
   - Reason: Email service timeout in test environment
   - Severity: Low
   - Status: Environment issue, re-run passed

Performance:
- Avg response time: 250ms
- P95 response time: 450ms
- Email delivery time: 2 seconds
- All within acceptable range

Recommendation: PASS - Ready for release
```

---

## 5. Automation Scope

### 5.1. Automation Strategy

**Goal:** Automate 80%+ of regression tests

**Approach:**
- Automate all API integration tests (Jest + Supertest)
- Automate critical E2E flows (Playwright)
- Manual testing for exploratory, usability, edge cases

**Priority:**
1. P0 test cases (all automated)
2. P1 test cases (80% automated)
3. P2 test cases (selected automation)

### 5.2. Test Automation Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Jest | Test individual functions/components |
| API Tests | Jest + Supertest | Test REST API endpoints |
| E2E Tests | Playwright | Test full user flows |
| Test Data | Faker.js | Generate test data |
| Mocking | Jest Mock + ioredis-mock + mongodb-memory-server | Mock external dependencies |
| CI/CD | GitHub Actions | Automated test execution |
| Reporting | Jest HTML Reporter | Test reports |
| Performance | k6 | Load testing |

### 5.3. Automated Test Cases

#### High Priority (Automate First)

**API Integration Tests:**
```typescript
// Automated with Jest + Supertest
describe('Signup API Automation', () => {
  // TC-001: Send OTP - Valid Email
  it('TC-001: should send OTP for valid email', async () => {
    const response = await request(app)
      .post('/api/auth/signup/send-otp')
      .send({ email: 'test@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.sessionId).toBeDefined();
  });

  // TC-002: Send OTP - Invalid Email
  it('TC-002: should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/signup/send-otp')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  // TC-003: Send OTP - Email Exists
  it('TC-003: should reject existing email', async () => {
    // Pre-create user
    await createUser({ email: 'existing@example.com' });

    const response = await request(app)
      .post('/api/auth/signup/send-otp')
      .send({ email: 'existing@example.com' })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  // TC-004: Rate Limit
  it('TC-004: should enforce rate limit', async () => {
    const ip = '192.168.1.100';

    // Send 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/signup/send-otp')
        .set('X-Forwarded-For', ip)
        .send({ email: `test${i}@example.com` })
        .expect(200);
    }

    // 6th request should be rate limited
    const response = await request(app)
      .post('/api/auth/signup/send-otp')
      .set('X-Forwarded-For', ip)
      .send({ email: 'test6@example.com' })
      .expect(429);

    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // TC-010: Verify OTP - Correct
  it('TC-010: should verify correct OTP', async () => {
    const { sessionId, otp } = await setupOTPTest();

    const response = await request(app)
      .post('/api/auth/signup/verify-otp')
      .send({
        email: 'test@example.com',
        otp: otp,
        sessionId: sessionId
      })
      .expect(200);

    expect(response.body.data.verified).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  // TC-011, TC-012: OTP Attempts
  it('TC-012: should lock OTP after 3 failed attempts', async () => {
    const { sessionId } = await setupOTPTest();

    // Attempt 1
    await request(app)
      .post('/api/auth/signup/verify-otp')
      .send({ email: 'test@example.com', otp: '111111', sessionId })
      .expect(401);

    // Attempt 2
    await request(app)
      .post('/api/auth/signup/verify-otp')
      .send({ email: 'test@example.com', otp: '222222', sessionId })
      .expect(401);

    // Attempt 3 - Locked
    const response = await request(app)
      .post('/api/auth/signup/verify-otp')
      .send({ email: 'test@example.com', otp: '333333', sessionId })
      .expect(403);

    expect(response.body.error.code).toBe('OTP_LOCKED');
  });

  // TC-030: Complete Signup
  it('TC-030: should create user successfully', async () => {
    const { token } = await setupCompleteSignupTest();

    const response = await request(app)
      .post('/api/auth/signup/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Test User',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        acceptTerms: true
      })
      .expect(201);

    expect(response.body.data.user.id).toBeDefined();
    expect(response.body.data.user.emailVerified).toBe(true);

    // Verify user in database
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
  });
});
```

**E2E Tests:**
```typescript
// Automated with Playwright
import { test, expect } from '@playwright/test';

test.describe('Signup E2E Tests', () => {
  test('E2E-001: Complete signup flow', async ({ page }) => {
    // Step 1: Enter email
    await page.goto('/signup');
    await page.fill('input[name="email"]', 'e2etest@example.com');
    await page.click('button:has-text("Tiếp tục")');

    // Wait for OTP screen
    await expect(page).toHaveURL(/\/signup\/verify/);

    // Get OTP from test helper (mock or test email)
    const otp = await getTestOTP('e2etest@example.com');

    // Step 2: Enter OTP
    await page.fill('input[name="otp"]', otp);
    await page.click('button:has-text("Xác nhận")');

    // Wait for user info form
    await expect(page).toHaveURL(/\/signup\/complete/);

    // Step 3: Fill form
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.check('input[name="acceptTerms"]');
    await page.click('button:has-text("Đăng ký")');

    // Verify success
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Chào mừng')).toBeVisible();
  });

  test('E2E-002: Invalid OTP error', async ({ page }) => {
    // Navigate to OTP screen
    await setupOTPScreen(page);

    // Enter wrong OTP
    await page.fill('input[name="otp"]', '999999');
    await page.click('button:has-text("Xác nhận")');

    // Verify error
    await expect(page.locator('.error-message')).toContainText('Mã OTP không chính xác');
    await expect(page.locator('.attempts-remaining')).toContainText('2');
  });
});
```

### 5.4. Non-Automated Test Cases (Manual)

**Exploratory Testing:**
- User experience and UI/UX testing
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness
- Accessibility (screen readers, keyboard navigation)

**Edge Cases:**
- Multiple browser tabs (TC-040)
- Back button navigation (TC-041)
- Page refresh behavior (TC-042)
- Slow network conditions
- Various timezone scenarios

**Usability Testing:**
- Error message clarity
- Form field labels and placeholders
- Loading states and spinners
- Success messages and redirects

### 5.5. Continuous Integration Setup

**CI Pipeline (GitHub Actions):**

```yaml
name: Signup Feature Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run OWASP ZAP scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
```

### 5.6. Test Maintenance

**Best Practices:**
- Keep tests independent (no dependencies between tests)
- Use setup/teardown for test data
- Use test fixtures for common data
- Clear database and Redis between test runs
- Use meaningful test descriptions
- Keep tests fast (mock slow operations)
- Review and update tests with code changes

**Test Data Management:**
```typescript
// Test data factory
export const testDataFactory = {
  createValidEmail: () => faker.internet.email(),
  createValidOTP: () => '123456',
  createValidPassword: () => 'SecurePass123!',
  createValidUser: () => ({
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'SecurePass123!',
    phone: '+84912345678'
  })
};

// Setup helpers
export const setupHelpers = {
  async createTestUser(overrides = {}) {
    const userData = {
      ...testDataFactory.createValidUser(),
      ...overrides
    };
    return await User.create(userData);
  },

  async setupOTPTest() {
    const email = testDataFactory.createValidEmail();
    const otp = '123456';
    const sessionId = uuidv4();

    // Create session and OTP in Redis
    await redis.hset(`signup:session:${sessionId}`, {
      email,
      step: '1',
      verified: 'false'
    });
    await redis.set(
      `signup:otp:${email}:${sessionId}`,
      await bcrypt.hash(otp, 12),
      'EX',
      600
    );

    return { email, otp, sessionId };
  }
};
```

---

## 6. Test Metrics & Reporting

### 6.1. Key Metrics to Track

- **Test Coverage:** Unit (80%+), Integration (90%+), E2E (Critical paths)
- **Pass Rate:** Target 95%+
- **Test Execution Time:** Unit (<5min), Integration (<15min), E2E (<30min)
- **Defect Detection Rate:** # of bugs found in testing vs production
- **Test Maintenance Cost:** Time spent updating tests

### 6.2. Test Report Template

```markdown
# Signup Feature Test Report

**Test Cycle:** Sprint 5, Week 2
**Date:** 2024-11-04 to 2024-11-08
**Tester:** QA Team

## Summary

| Metric | Value |
|--------|-------|
| Total Test Cases | 62 |
| Executed | 60 |
| Passed | 57 |
| Failed | 3 |
| Blocked | 2 |
| Pass Rate | 95% |

## Test Execution by Type

| Type | Total | Passed | Failed | Pass Rate |
|------|-------|--------|--------|-----------|
| Unit | 30 | 30 | 0 | 100% |
| Integration | 20 | 18 | 2 | 90% |
| E2E | 10 | 9 | 1 | 90% |

## Defects Found

### DEF-001: Email service timeout
- **Severity:** Medium
- **Test Case:** TC-060
- **Status:** In Progress
- **Description:** Email service times out after 5 seconds, causing signup failure

### DEF-002: OTP cooldown not working
- **Severity:** High
- **Test Case:** TC-021
- **Status:** Fixed, Pending Re-test
- **Description:** Resend OTP cooldown not enforced, users can spam resend button

### DEF-003: Phone validation too strict
- **Severity:** Low
- **Test Case:** TC-034
- **Status:** Open
- **Description:** Some valid Vietnam phone numbers rejected

## Recommendations

1. Fix high-severity bugs before release
2. Add monitoring for email service timeouts
3. Review phone validation regex
4. Add more edge case tests

## Next Steps

- Re-test fixed bugs
- Run regression suite
- Performance testing on staging
```

---

**Document Version:** 1.0
**Last Updated:** 2024-11-04
**Prepared by:** QA Team
**Status:** Ready for Test Execution
