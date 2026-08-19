// types
import type { OpenAPIV3 } from "openapi-types";

const responses = {
  sendSuccess: {
    description:
      "OTP/magic link sent successfully (or fake success for anti-enumeration)",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/FPSendResponse" }
      }
    }
  },
  verifySuccess: {
    description: "Verification successful — returns one-time reset token",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/FPVerifyResponse" }
      }
    }
  },
  resetSuccess: {
    description: "Password reset successful",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/FPResetPasswordResponse" }
      }
    }
  },
  validationError: { $ref: "#/components/responses/ValidationError" },
  badRequest: { $ref: "#/components/responses/BadRequest" },
  unauthorized: { $ref: "#/components/responses/Unauthorized" },
  tooManyRequests: { $ref: "#/components/responses/TooManyRequests" }
} as const;

export const forgotPasswordPaths: OpenAPIV3.PathsObject = {
  "/auth/forgot-password/otp/send": {
    post: {
      summary: "Send OTP for password recovery",
      description: `
Send a \`6-digit\` OTP to the user's email for password recovery.

**Anti-Enumeration:** Returns success even if email does not exist (no email is actually sent).

**Rate Limits:**
- \`10\` requests per IP per \`15 minutes\`
- \`5\` requests per email per \`15 minutes\`

**Cooldown:** \`60 seconds\` between requests

**Resend Limit:** \`3\` resends per OTP session

**OTP Expiry:** \`5 minutes\`
      `.trim(),
      tags: ["Auth - Forgot Password"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FPOtpSendRequest" }
          }
        }
      },
      responses: {
        "200": responses.sendSuccess,
        "400": {
          description: "Cooldown not expired or resend limit exceeded"
        },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/forgot-password/otp/verify": {
    post: {
      summary: "Verify OTP and get reset token",
      description: `
Verify the OTP code sent to email. On success, returns a one-time \`resetToken\` used to reset the password.

**Security:**
- \`5\` failed attempts before lockout (\`15 minutes\`)
- Failed attempts are recorded in login history

**Reset Token:** \`128-char hex\` string, expires in \`10 minutes\`, one-time use
      `.trim(),
      tags: ["Auth - Forgot Password"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FPOtpVerifyRequest" }
          }
        }
      },
      responses: {
        "200": responses.verifySuccess,
        "400": {
          description: "OTP verification locked (too many failed attempts)"
        },
        "401": { description: "Invalid or expired OTP" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/forgot-password/magic-link/send": {
    post: {
      summary: "Send magic link for password recovery",
      description: `
Send a magic link to the user's email for password recovery. The link redirects to \`/reset-password?email=...&token=...&method=magic-link\`.

**Anti-Enumeration:** Returns success even if email does not exist.

**Rate Limits:**
- \`10\` requests per IP per \`15 minutes\`
- \`5\` requests per email per \`15 minutes\`

**Cooldown:** \`60 seconds\` between requests

**Resend Limit:** \`3\` resends per session

**Link Expiry:** \`15 minutes\`
      `.trim(),
      tags: ["Auth - Forgot Password"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FPMagicLinkSendRequest" }
          }
        }
      },
      responses: {
        "200": responses.sendSuccess,
        "400": {
          description: "Cooldown not expired or resend limit exceeded"
        },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/forgot-password/magic-link/verify": {
    post: {
      summary: "Verify magic link and get reset token",
      description: `
Verify the magic link token. On success, returns a one-time \`resetToken\` used to reset the password.

**Security:**
- Failed attempts are recorded in login history

**Reset Token:** \`128-char hex\` string, expires in \`10 minutes\`, one-time use
      `.trim(),
      tags: ["Auth - Forgot Password"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FPMagicLinkVerifyRequest" }
          }
        }
      },
      responses: {
        "200": responses.verifySuccess,
        "401": { description: "Invalid or expired magic link" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  },

  "/auth/forgot-password/reset": {
    post: {
      summary: "Reset password with reset token",
      description: `
Reset the user's password using the \`resetToken\` obtained from OTP or magic link verification.

**Rate Limits:**
- \`10\` requests per IP per \`15 minutes\`

**Security:**
- Reset token is one-time use (deleted after successful reset)
- Reset token expires in \`10 minutes\`
- All existing sessions are invalidated via \`passwordChangedAt\` timestamp
- Password reset is recorded in login history

**Password Requirements:**
- Minimum \`8\` characters
- At least one uppercase, one lowercase, one digit, one special character
      `.trim(),
      tags: ["Auth - Forgot Password"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/FPResetPasswordRequest" }
          }
        }
      },
      responses: {
        "200": responses.resetSuccess,
        "401": { description: "Invalid or expired reset token" },
        "422": responses.validationError,
        "429": responses.tooManyRequests
      }
    }
  }
};
