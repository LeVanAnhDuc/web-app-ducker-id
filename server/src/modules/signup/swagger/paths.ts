// types
import type { OpenAPIV3 } from "openapi-types";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const signupPaths: OpenAPIV3.PathsObject = {
  "/auth/signup/send-otp": {
    post: {
      summary: "Send OTP to email",
      description: `
Step 1 of signup flow. Sends a 6-digit OTP to the provided email address.

**Rate Limits:**
- 5 requests per IP per 15 minutes
- 3 requests per email per 15 minutes

**OTP Details:**
- Valid for 5 minutes
- 60 seconds cooldown between requests
      `.trim(),
      tags: ["Auth - Signup"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/SendOtpRequest"
            }
          }
        }
      },
      responses: {
        "200": {
          description: "OTP sent successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/SendOtpResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          $ref: "#/components/responses/ValidationError"
        },
        "409": {
          $ref: "#/components/responses/Conflict"
        },
        "429": {
          $ref: "#/components/responses/TooManyRequests"
        }
      }
    }
  },

  "/auth/signup/verify-otp": {
    post: {
      summary: "Verify OTP code",
      description: `
Step 2 of signup flow. Verifies the OTP code submitted by user.

**Security:**
- Maximum 5 failed attempts before account lockout
- Lockout duration: 15 minutes

**On Success:**
- Returns a session token valid for 5 minutes
- Use this token in the complete-signup step
      `.trim(),
      tags: ["Auth - Signup"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/VerifyOtpRequest"
            }
          }
        }
      },
      responses: {
        "200": {
          description: "OTP verified successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/VerifyOtpResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Invalid OTP or account locked",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              },
              examples: {
                invalidOtp: {
                  summary: "Invalid OTP",
                  value: {
                    code: ERROR_CODES.BAD_REQUEST,
                    message: "Invalid OTP. 4 attempts remaining.",
                    timestamp: "2025-01-15T10:30:00.000Z",
                    path: "/api/v1/auth/signup/verify-otp"
                  }
                },
                accountLocked: {
                  summary: "Account locked",
                  value: {
                    code: ERROR_CODES.BAD_REQUEST,
                    message: "Account locked. Try again in 15 minutes.",
                    timestamp: "2025-01-15T10:30:00.000Z",
                    path: "/api/v1/auth/signup/verify-otp"
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  "/auth/signup/resend-otp": {
    post: {
      summary: "Resend OTP code",
      description: `
Request a new OTP code. Tracks resend count.

**Limits:**
- Maximum 5 resends per signup session
- 60 seconds cooldown between resends
- Same rate limits as send-otp
      `.trim(),
      tags: ["Auth - Signup"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResendOtpRequest"
            }
          }
        }
      },
      responses: {
        "200": {
          description: "OTP resent successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/ResendOtpResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Cooldown active or resend limit exceeded",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse"
              }
            }
          }
        },
        "409": {
          $ref: "#/components/responses/Conflict"
        },
        "429": {
          $ref: "#/components/responses/TooManyRequests"
        }
      }
    }
  },

  "/auth/signup/complete": {
    post: {
      summary: "Complete signup",
      description: `
Step 3 (final) of signup flow. Completes registration with user profile data.

**Prerequisites:**
- Must have a valid session token from verify-otp step
- Session token expires after 5 minutes

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**On Success:**
- User account is created
- Returns access and refresh tokens
      `.trim(),
      tags: ["Auth - Signup"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CompleteSignupRequest"
            }
          }
        }
      },
      responses: {
        "200": {
          description: "Signup completed successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/CompleteSignupResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Invalid session or validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationErrorResponse"
              }
            }
          }
        },
        "409": {
          $ref: "#/components/responses/Conflict"
        }
      }
    }
  },

  "/auth/signup/check-email/{email}": {
    get: {
      summary: "Check email availability",
      description: `
Check if an email address is available for registration.
Useful for real-time validation in signup forms.

**Rate Limit:** 10 requests per IP per minute
      `.trim(),
      tags: ["Auth - Signup"],
      parameters: [
        {
          in: "path",
          name: "email",
          required: true,
          schema: {
            type: "string",
            format: "email"
          },
          description: "Email address to check",
          example: "user@example.com"
        }
      ],
      responses: {
        "200": {
          description: "Email availability status",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/CheckEmailResponse" }
                    }
                  }
                ]
              },
              examples: {
                available: {
                  summary: "Email available",
                  value: {
                    timestamp: "2025-01-15T10:30:00.000Z",
                    path: "/api/v1/auth/signup/check-email/user@example.com",
                    data: {
                      available: true
                    }
                  }
                },
                taken: {
                  summary: "Email taken",
                  value: {
                    timestamp: "2025-01-15T10:30:00.000Z",
                    path: "/api/v1/auth/signup/check-email/existing@example.com",
                    data: {
                      available: false
                    }
                  }
                }
              }
            }
          }
        },
        "400": {
          $ref: "#/components/responses/ValidationError"
        },
        "429": {
          $ref: "#/components/responses/TooManyRequests"
        }
      }
    }
  }
};
