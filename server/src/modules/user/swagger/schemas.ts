// types
import type { OpenAPIV3 } from "openapi-types";

const UserProfileResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["_id", "fullName", "email", "createdAt"],
  properties: {
    _id: {
      type: "string",
      example: "64f1b2c3d4e5f6a7b8c9d0e1",
      description: "User ID (MongoDB ObjectId)"
    },
    fullName: {
      type: "string",
      example: "Nguyen Van A"
    },
    email: {
      type: "string",
      format: "email",
      example: "user@example.com",
      description: "Taken from authenticated token"
    },
    phone: {
      type: "string",
      nullable: true,
      example: "+84 912 345 678"
    },
    avatar: {
      type: "string",
      nullable: true,
      example: "http://localhost:3000/uploads/avatars/uuid.jpg",
      description: "Full URL to avatar image, or null if not set"
    },
    address: {
      type: "string",
      nullable: true,
      example: "123 Le Loi, District 1, Ho Chi Minh City"
    },
    dateOfBirth: {
      type: "string",
      format: "date-time",
      nullable: true,
      example: "1995-06-15T00:00:00.000Z"
    },
    gender: {
      type: "string",
      nullable: true,
      enum: ["male", "female", "other", "prefer_not_to_say", null],
      example: "male"
    },
    createdAt: {
      type: "string",
      format: "date-time",
      example: "2026-01-01T00:00:00.000Z"
    }
  }
};

const PublicUserProfileResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["_id", "fullName"],
  properties: {
    _id: {
      type: "string",
      example: "64f1b2c3d4e5f6a7b8c9d0e1"
    },
    fullName: {
      type: "string",
      example: "Nguyen Van A"
    },
    avatar: {
      type: "string",
      nullable: true,
      example: "http://localhost:3000/uploads/avatars/uuid.jpg"
    },
    gender: {
      type: "string",
      nullable: true,
      enum: ["male", "female", "other", "prefer_not_to_say", null],
      example: "female"
    }
  }
};

const UpdateProfileRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  description: "All fields are optional. Only provided fields are updated.",
  properties: {
    fullName: {
      type: "string",
      minLength: 2,
      maxLength: 100,
      example: "Nguyen Van B",
      description: "Letters, spaces, hyphens, apostrophes, and dots only"
    },
    phone: {
      type: "string",
      minLength: 1,
      example: "+84 912 345 678",
      description: "Cannot be an empty string if provided"
    },
    address: {
      type: "string",
      maxLength: 500,
      example: "456 Nguyen Hue, District 1, Ho Chi Minh City"
    },
    dateOfBirth: {
      type: "string",
      format: "date",
      example: "1995-06-15",
      description:
        "ISO 8601 date. Must not be in the future, and age must not exceed 100 years."
    },
    gender: {
      type: "string",
      enum: ["male", "female", "other", "prefer_not_to_say"],
      example: "male"
    }
  }
};

const AdminUserSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["_id", "fullName", "email", "role", "isActive", "createdAt"],
  properties: {
    _id: {
      type: "string",
      example: "64f1b2c3d4e5f6a7b8c9d0e1",
      description: "User ID (MongoDB ObjectId)"
    },
    fullName: {
      type: "string",
      example: "Nguyen Van A"
    },
    email: {
      type: "string",
      format: "email",
      example: "user@example.com"
    },
    avatar: {
      type: "string",
      nullable: true,
      example: "http://localhost:3000/uploads/avatars/uuid.jpg",
      description: "Full URL to avatar image, or null if not set"
    },
    role: {
      type: "string",
      enum: ["user", "admin"],
      example: "user"
    },
    isActive: {
      type: "boolean",
      example: true,
      description: "False when account is locked"
    },
    lastLoginAt: {
      type: "string",
      format: "date-time",
      nullable: true,
      example: "2026-05-20T08:30:00.000Z",
      description:
        "ISO 8601 timestamp of last successful login, or null if never logged in"
    },
    createdAt: {
      type: "string",
      format: "date-time",
      example: "2026-01-01T00:00:00.000Z"
    }
  }
};

const AdminUsersListResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["items", "meta"],
  properties: {
    items: {
      type: "array",
      items: { $ref: "#/components/schemas/AdminUser" }
    },
    meta: {
      type: "object",
      required: ["total", "page", "limit", "totalPages"],
      properties: {
        total: {
          type: "integer",
          example: 120,
          description: "Total number of matching users"
        },
        page: {
          type: "integer",
          example: 1,
          description: "Current page number (1-based)"
        },
        limit: {
          type: "integer",
          example: 20,
          description: "Number of items per page"
        },
        totalPages: {
          type: "integer",
          example: 6,
          description: "Total number of pages"
        }
      }
    }
  }
};

const SetUserActiveResultSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["_id", "isActive"],
  properties: {
    _id: {
      type: "string",
      example: "64f1b2c3d4e5f6a7b8c9d0e1",
      description: "User ID (MongoDB ObjectId)"
    },
    isActive: {
      type: "boolean",
      example: false,
      description: "False when the account is locked, true when active"
    }
  }
};

const AdminResetPasswordResultSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["_id", "email"],
  properties: {
    _id: {
      type: "string",
      example: "64f1b2c3d4e5f6a7b8c9d0e1",
      description: "User ID (MongoDB ObjectId)"
    },
    email: {
      type: "string",
      format: "email",
      example: "user@example.com",
      description: "Email address the temporary password was sent to"
    }
  }
};

export const userSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  UserProfileResponse: UserProfileResponseSchema,
  PublicUserProfileResponse: PublicUserProfileResponseSchema,
  UpdateProfileRequest: UpdateProfileRequestSchema,
  AdminUser: AdminUserSchema,
  AdminUsersListResponse: AdminUsersListResponseSchema,
  SetUserActiveResult: SetUserActiveResultSchema,
  AdminResetPasswordResult: AdminResetPasswordResultSchema
};
