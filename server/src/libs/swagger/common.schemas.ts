// types
import type { OpenAPIV3 } from "openapi-types";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const commonSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  SuccessResponse: {
    type: "object",
    properties: {
      timestamp: {
        type: "string",
        format: "date-time",
        example: "2025-01-15T10:30:00.000Z"
      },
      path: {
        type: "string",
        example: "/api/v1/auth/login"
      },
      message: {
        type: "string",
        example: "Operation successful"
      },
      data: {
        type: "object"
      },
      meta: {
        $ref: "#/components/schemas/ResponseMeta"
      }
    }
  },

  ResponseMeta: {
    type: "object",
    properties: {
      pagination: {
        $ref: "#/components/schemas/PaginationMeta"
      }
    }
  },

  PaginationMeta: {
    type: "object",
    required: [
      "page",
      "pageSize",
      "totalItems",
      "totalPages",
      "hasNext",
      "hasPrev"
    ],
    properties: {
      page: { type: "integer", example: 1 },
      pageSize: { type: "integer", example: 20 },
      totalItems: { type: "integer", example: 157 },
      totalPages: { type: "integer", example: 8 },
      hasNext: { type: "boolean", example: true },
      hasPrev: { type: "boolean", example: false }
    }
  },

  ErrorResponse: {
    type: "object",
    properties: {
      code: {
        type: "string",
        example: ERROR_CODES.BAD_REQUEST
      },
      message: {
        type: "string",
        example: "Error message"
      },
      timestamp: {
        type: "string",
        format: "date-time",
        example: "2025-01-15T10:30:00.000Z"
      },
      path: {
        type: "string",
        example: "/api/v1/auth/login"
      },
      errors: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ValidationErrorItem"
        }
      }
    }
  },

  ValidationErrorResponse: {
    type: "object",
    properties: {
      code: {
        type: "string",
        example: ERROR_CODES.VALIDATION_ERROR
      },
      message: {
        type: "string",
        example: "Validation failed"
      },
      timestamp: {
        type: "string",
        format: "date-time"
      },
      path: {
        type: "string"
      },
      errors: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ValidationErrorItem"
        }
      }
    }
  },

  ValidationErrorItem: {
    type: "object",
    properties: {
      field: {
        type: "string",
        example: "email"
      },
      reason: {
        type: "string",
        example: "any.required"
      },
      message: {
        type: "string",
        example: "Email is required"
      }
    }
  }
};

export const commonResponses: Record<
  string,
  OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject
> = {
  ValidationError: {
    description: "Validation failed - Invalid input data",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ValidationErrorResponse"
        }
      }
    }
  },
  BadRequest: {
    description: "Bad request - Business rule violation",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        }
      }
    }
  },
  Unauthorized: {
    description: "Unauthorized - Invalid credentials",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        }
      }
    }
  },
  Forbidden: {
    description: "Forbidden - Access denied",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        }
      }
    }
  },
  NotFound: {
    description: "Not found - Resource does not exist",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        }
      }
    }
  },
  Conflict: {
    description: "Conflict - Resource already exists",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        },
        example: {
          code: ERROR_CODES.CONFLICT,
          message: "Email already registered",
          timestamp: "2025-01-15T10:30:00.000Z",
          path: "/api/v1/auth/signup/send-otp"
        }
      }
    }
  },
  TooManyRequests: {
    description: "Too many requests - Rate limit exceeded",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        },
        example: {
          code: ERROR_CODES.TOO_MANY_REQUESTS,
          message: "Rate limit exceeded. Try again later.",
          timestamp: "2025-01-15T10:30:00.000Z",
          path: "/api/v1/auth/login"
        }
      }
    }
  }
};
