# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Token Refresh cung cấp endpoint để làm mới access token và id token bằng refresh token. Refresh token được đọc từ HTTP-only cookie. Endpoint không yêu cầu access token (vì mục đích chính là để lấy access token mới khi token cũ hết hạn). Thao tác hoàn toàn stateless — chỉ verify JWT và sign JWT mới, không tương tác DB hay Redis.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client                              Server (Express)
┌──────────┐                        ┌──────────────────────────────────┐
│ Axios    │                        │ TokenController                  │
│ intercep │──Cookie: refreshToken─▶│   ↓                              │
│ tor      │                        │ TokenService.refreshAccessToken() │
│ (on 401) │                        │   ├── verifyRefreshToken(cookie)  │
│          │◀──{ accessToken,       │   └── generateAuthTokensResponse()│
│          │    idToken,            │         ├── sign accessToken      │
│          │    expiresIn }         │         ├── sign refreshToken     │
└──────────┘                        │         └── sign idToken          │
                                    └──────────────────────────────────┘
```

---

## 3.3. Data Model

Không thay đổi. Feature này không tương tác với database hay Redis.

### JWT Token Configuration

```typescript
TOKEN_EXPIRY = {
  ACCESS_TOKEN:  "8h",     // access token lifetime
  REFRESH_TOKEN: "7d",     // refresh token lifetime
  ID_TOKEN:      "8h",     // id token lifetime
  NUMBER_ACCESS_TOKEN: 28800  // 8h in seconds (for expiresIn response)
}
```

### JWT Payload Structure

```typescript
{
  userId:   string,          // User's auth ID
  authId:   string,          // Auth record ID
  email:    string,          // User's email
  roles:    string,          // User's role (user/admin)
  fullName: string,          // User's full name (from users collection)
  avatar:   string | null    // User's avatar URL (null nếu chưa có)
}
```

---

## 3.4. API Design

### Endpoint: Refresh Token

```
POST /api/v1/auth/token/refresh

Headers:
  Cookie: refreshToken={jwt}   (HTTP-only, set bởi login)

Request Body: Không có

Response 200:
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "string — JWT mới (8h)",
    "refreshToken": "string — JWT mới (7d)",
    "idToken": "string — JWT mới (8h)",
    "expiresIn": 28800
  }
}

Response 401: Refresh token không có trong cookie
Response 403: Refresh token hết hạn hoặc không hợp lệ
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Client nhận 401 từ API call (access token hết hạn)
2. Axios interceptor tự động gọi POST /api/v1/auth/token/refresh
   (Browser tự gửi cookie refreshToken kèm request)
3. TokenController nhận request → gọi service.refreshAccessToken(req)
4. TokenService:
   a. Đọc refreshToken từ req.cookies.refreshToken
   b. Nếu không có → throw UnauthorizedError (401)
   c. verifyRefreshToken(refreshToken):
      - jwt.verify(token, JWT_REFRESH_SECRET)
      - Nếu expired → throw ForbiddenError (403)
      - Nếu invalid → throw ForbiddenError (403)
      - Return decoded payload { userId, authId, email, roles, fullName, avatar }
   d. generateAuthTokensResponse(payload):
      - generateAccessToken(payload) → sign với JWT_ACCESS_SECRET, exp 8h
      - generateRefreshToken(payload) → sign với JWT_REFRESH_SECRET, exp 7d
      - generateIdToken(payload) → sign với JWT_ID_SECRET, exp 8h
      - Return { accessToken, refreshToken, idToken, expiresIn: 28800 }
5. Controller trả response 200 với tokens
6. Client lưu access token mới → retry request gốc
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/token/
│   ├── token.module.ts          # DI setup, export router & service
│   ├── token.controller.ts      # Route handler: POST /refresh
│   ├── token.service.ts         # Business logic (verify + generate tokens)
│   └── swagger/
│       ├── index.ts             # Export paths + schemas
│       ├── paths.ts             # OpenAPI path definition
│       └── schemas.ts           # OpenAPI schema (RefreshTokenResponse)
├── utils/token/
│   ├── jwt.ts                   # JWT generate + verify functions
│   └── auth-response.ts         # generateAuthTokensResponse helper
├── types/
│   ├── modules/token.ts         # RefreshTokenResponse type
│   ├── jwt.ts                   # TPayload, TExpiresIn, AuthTokens
│   └── auth.ts                  # AuthTokensResponse
└── constants/
    └── infrastructure.ts        # TOKEN_EXPIRY config
```

---

## 3.7. Dependencies & Integrations

| Dependency   | Loại     | Mô tả                                   | Ghi chú                           |
| ------------ | -------- | ---------------------------------------- | ---------------------------------- |
| jsonwebtoken | Library  | Verify refresh token + sign new tokens   | 3 secrets riêng biệt              |
| cookie-parser | Library | Parse cookies từ request                 | Express middleware                 |
| Logger       | Internal | Ghi log success/failure                  | utils/logger                       |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Tokens đã phát hành vẫn valid cho đến khi hết hạn
- Không có side effects cần cleanup (stateless operation)
