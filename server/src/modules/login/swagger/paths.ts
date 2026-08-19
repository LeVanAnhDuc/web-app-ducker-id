// types
import type { OpenAPIV3 } from "openapi-types";

const responses = {
  loginSuccess: {
    description: "Login successful",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/LoginResponse" }
      }
    }
  },
  validationError: { $ref: "#/components/responses/ValidationError" },
  badRequest: { $ref: "#/components/responses/BadRequest" },
  unauthorized: { $ref: "#/components/responses/Unauthorized" },
  tooManyRequests: { $ref: "#/components/responses/TooManyRequests" }
} as const;

export const loginPaths: OpenAPIV3.PathsObject = {
  "/auth/login": {
    post: {
      summary: "Login with email and password",
      description: `
Authenticate user with email and password.

**Rate Limits:**
- \`30\` attempts per IP per \`15 minutes\`

**Security:**
- Account locked after \`5\` failed attempts (progressive lockout)
- Passwords are verified using bcrypt

**Returns:**
- Access token (\`15 min\` expiry)
- Refresh token in HTTP-only cookie (\`7 days\` expiry)
- ID token
      `.trim(),
      tags: ["Auth - Login"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginRequest" }
          }
        }
      },
      responses: {
        "200": responses.loginSuccess,
        "400": {
          description: "Account locked due to too many failed attempts"
        },
        "401": { description: "Invalid credentials" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/login/otp/send": {
    post: {
      summary: "Send OTP for passwordless login",
      description: `
Send a \`6-digit\` OTP to the user's email for passwordless login.

**Rate Limits:**
- \`10\` requests per IP per \`15 minutes\`
- \`5\` requests per email per \`15 minutes\`

**Cooldown:** \`60 seconds\` between requests

**OTP Expiry:** \`5 minutes\`
      `.trim(),
      tags: ["Auth - Login"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginOtpSendRequest" }
          }
        }
      },
      responses: {
        "200": { description: "OTP sent successfully" },
        "400": { description: "Cooldown not expired" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/login/otp/verify": {
    post: {
      summary: "Verify OTP and login",
      description: `
Verify the OTP code and authenticate the user.

**Security:**
- \`5\` failed attempts before lockout (\`15 minutes\`)

**Returns:**
- Access token (\`15 min\` expiry)
- Refresh token in HTTP-only cookie (\`7 days\` expiry)
- ID token
      `.trim(),
      tags: ["Auth - Login"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginOtpVerifyRequest" }
          }
        }
      },
      responses: {
        "200": responses.loginSuccess,
        "400": { description: "OTP verification locked" },
        "401": { description: "Invalid or expired OTP" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/login/magic-link/send": {
    post: {
      summary: "Send magic link for passwordless login",
      description: `
Send a magic link to the user's email for passwordless login.

**Rate Limits:**
- \`10\` requests per IP per \`15 minutes\`
- \`5\` requests per email per \`15 minutes\`

**Cooldown:** \`60 seconds\` between requests

**Link Expiry:** \`15 minutes\`
      `.trim(),
      tags: ["Auth - Login"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginMagicLinkSendRequest" }
          }
        }
      },
      responses: {
        "200": { description: "Magic link sent successfully" },
        "400": { description: "Cooldown not expired" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/login/magic-link/verify": {
    post: {
      summary: "Verify magic link and login",
      description: `
Verify the magic link token and authenticate the user.

**Returns:**
- Access token (\`15 min\` expiry)
- Refresh token in HTTP-only cookie (\`7 days\` expiry)
- ID token
      `.trim(),
      tags: ["Auth - Login"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginMagicLinkVerifyRequest" }
          }
        }
      },
      responses: {
        "200": responses.loginSuccess,
        "401": { description: "Invalid or expired magic link" },
        "422": responses.validationError
      }
    }
  }
};
