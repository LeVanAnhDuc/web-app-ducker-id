// types
import type { OpenAPIV3 } from "openapi-types";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const userPaths: OpenAPIV3.PathsObject = {
  "/users/me": {
    get: {
      summary: "Get my profile",
      description: `
Get the full profile of the currently authenticated user.

**Authentication:**
- Requires valid Bearer token (idToken)

**Returns:**
- All profile fields including email (from token), phone, address, dateOfBirth, gender, avatar (full URL)
      `.trim(),
      tags: ["User Profile"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserProfileResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "500": {
          description: "Internal Server Error (e.g. database unreachable)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        }
      }
    },
    patch: {
      summary: "Update my profile",
      description: `
Partially update the profile of the authenticated user. All fields are optional.

**Authentication:**
- Requires valid Bearer token (idToken)

**Rate Limits:**
- 10 requests per IP per 15 minutes

**Behavior:**
- Only the fields provided in the request body are updated
- Unknown fields are silently ignored (e.g. sending \`email\` has no effect)
- Sending an empty body \`{}\` returns 200 with no changes
      `.trim(),
      tags: ["User Profile"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateProfileRequest" }
          }
        }
      },
      responses: {
        "200": {
          description: "Profile updated successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserProfileResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "429": { $ref: "#/components/responses/TooManyRequests" },
        "500": {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        }
      }
    }
  },
  "/admin/users": {
    get: {
      summary: "List users (admin)",
      description: `
List all registered users with optional filtering, search, and pagination.

**Authentication:**
- Requires valid Bearer token (admin role)

**Filtering:**
- \`search\` — case-insensitive keyword match on fullName or email
- \`role\` — filter by role (\`user\` | \`admin\`)
- \`status\` — filter by account status (\`active\` | \`locked\`)

**Sorting:**
- \`sortBy\` — field to sort on (\`createdAt\` | \`fullName\` | \`lastLoginAt\`), default \`createdAt\`
- \`sortOrder\` — direction (\`asc\` | \`desc\`), default \`desc\`

**Pagination:**
- \`page\` — 1-based page number, default 1
- \`limit\` — items per page (1–100), default 20
      `.trim(),
      tags: ["User Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          description: "Page number (1-based)",
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
            example: 1
          }
        },
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Number of items per page (1–100)",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
            example: 20
          }
        },
        {
          name: "search",
          in: "query",
          required: false,
          description: "Case-insensitive keyword to match fullName or email",
          schema: {
            type: "string",
            example: "nguyen"
          }
        },
        {
          name: "role",
          in: "query",
          required: false,
          description: "Filter by user role",
          schema: {
            type: "string",
            enum: ["user", "admin"],
            example: "user"
          }
        },
        {
          name: "status",
          in: "query",
          required: false,
          description: "Filter by account status",
          schema: {
            type: "string",
            enum: ["active", "locked"],
            example: "active"
          }
        },
        {
          name: "sortBy",
          in: "query",
          required: false,
          description: "Field to sort results by",
          schema: {
            type: "string",
            enum: ["createdAt", "fullName", "lastLoginAt"],
            default: "createdAt",
            example: "createdAt"
          }
        },
        {
          name: "sortOrder",
          in: "query",
          required: false,
          description: "Sort direction",
          schema: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            example: "desc"
          }
        }
      ],
      responses: {
        "200": {
          description: "Users retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/AdminUsersListResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" }
      }
    }
  },
  "/admin/users/{id}/lock": {
    patch: {
      summary: "Lock a user account (admin)",
      description: `
Soft-lock a user account by setting \`auth.isActive\` to \`false\`. Blocks future
login attempts and refresh token usage; does not affect any in-flight request.

**Authentication:**
- Requires valid Bearer token (admin role)

**Rate Limits:**
- 20 requests per IP+admin per 15 minutes

**Behavior:**
- Idempotent — locking an already-locked account returns 200 with no error
- An admin cannot lock their own account (403 \`ADMIN_CANNOT_LOCK_SELF\`)
- Locking another admin's account is allowed, unless they are the last remaining
  active admin (403 \`ADMIN_CANNOT_LOCK_LAST_ADMIN\`) — prevents total admin lockout

**Params:**
- \`id\` must be a valid MongoDB ObjectId (24 hex characters)
      `.trim(),
      tags: ["User Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "MongoDB ObjectId of the target user",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "64f1b2c3d4e5f6a7b8c9d0e1"
          }
        }
      ],
      responses: {
        "200": {
          description: "User locked successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/SetUserActiveResult"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Bad Request — invalid ObjectId format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description:
            "Forbidden — non-admin caller, admin attempting to lock their own account, or admin attempting to lock the last remaining active admin",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                code: ERROR_CODES.ADMIN_CANNOT_LOCK_SELF,
                message: "You cannot lock your own account",
                timestamp: "2026-01-01T00:00:00.000Z",
                path: "/api/v1/admin/users/64f1b2c3d4e5f6a7b8c9d0e1/lock"
              }
            }
          }
        },
        "404": { $ref: "#/components/responses/NotFound" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/users/{id}/unlock": {
    patch: {
      summary: "Unlock a user account (admin)",
      description: `
Re-activate a previously locked user account by setting \`auth.isActive\` to
\`true\`.

**Authentication:**
- Requires valid Bearer token (admin role)

**Rate Limits:**
- 20 requests per IP+admin per 15 minutes

**Behavior:**
- Idempotent — unlocking an already-active account returns 200 with no error
- An admin may unlock their own account

**Params:**
- \`id\` must be a valid MongoDB ObjectId (24 hex characters)
      `.trim(),
      tags: ["User Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "MongoDB ObjectId of the target user",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "64f1b2c3d4e5f6a7b8c9d0e1"
          }
        }
      ],
      responses: {
        "200": {
          description: "User unlocked successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/SetUserActiveResult"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Bad Request — invalid ObjectId format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/users/{id}/reset-password": {
    post: {
      summary: "Reset a user's password (admin)",
      description: `
Admin-initiated password reset. Overwrites the target account's real password
with a freshly generated temporary password, which is emailed to the user.
Bumps \`tokenVersion\` (revokes all outstanding refresh tokens for that account)
and sets \`mustChangePassword\` so the user is forced to set a new password on
their next login.

**Authentication:**
- Requires valid Bearer token (admin role)

**Rate Limits:**
- 20 requests per IP+admin per 15 minutes

**Behavior:**
- The admin never sees the generated temporary password — it is only emailed
  to the target user
- An admin cannot reset their own password via this endpoint (403
  \`ADMIN_CANNOT_RESET_SELF\`) — use the regular change-password flow instead
- Resetting another admin's password is allowed
- Response returns only \`{ _id, email }\` — never the password or its hash

**Params:**
- \`id\` must be a valid MongoDB ObjectId (24 hex characters)
      `.trim(),
      tags: ["User Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "MongoDB ObjectId of the target user",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "64f1b2c3d4e5f6a7b8c9d0e1"
          }
        }
      ],
      responses: {
        "200": {
          description: "Password reset successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/AdminResetPasswordResult"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Bad Request — invalid ObjectId format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description:
            "Forbidden — non-admin caller, or admin attempting to reset their own password",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                code: ERROR_CODES.ADMIN_CANNOT_RESET_SELF,
                message: "You cannot reset your own password here.",
                timestamp: "2026-01-01T00:00:00.000Z",
                path: "/api/v1/admin/users/64f1b2c3d4e5f6a7b8c9d0e1/reset-password"
              }
            }
          }
        },
        "404": { $ref: "#/components/responses/NotFound" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/users/{id}": {
    get: {
      summary: "Get public profile",
      description: `
Get the public profile of any user by their ID. Does not require authentication.

**Public fields only:**
- \`_id\`, \`fullName\`, \`avatar\`, \`gender\`
- Sensitive fields (email, phone, address, dateOfBirth) are never returned

**Params:**
- \`id\` must be a valid MongoDB ObjectId (24 hex characters)
      `.trim(),
      tags: ["User Profile"],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "MongoDB ObjectId of the target user",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "64f1b2c3d4e5f6a7b8c9d0e1"
          }
        }
      ],
      responses: {
        "200": {
          description: "Public profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/PublicUserProfileResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": {
          description: "Bad Request — invalid ObjectId format",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                code: ERROR_CODES.BAD_REQUEST,
                message: "Invalid user ID format",
                timestamp: "2026-01-01T00:00:00.000Z",
                path: "/api/v1/users/abc123"
              }
            }
          }
        },
        "404": { $ref: "#/components/responses/NotFound" },
        "500": {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        }
      }
    }
  }
};
