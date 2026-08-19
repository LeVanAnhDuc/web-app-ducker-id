// types
import type { OpenAPIV3 } from "openapi-types";

export const webAppSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  AdminAppResponse: {
    type: "object",
    required: [
      "_id",
      "name",
      "displayName",
      "description",
      "iconUrl",
      "homeUrl",
      "categoryId",
      "status",
      "requiredRoles",
      "redirectUris",
      "clientId",
      "createdAt",
      "updatedAt"
    ],
    properties: {
      _id: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
        description: "MongoDB _id of the app"
      },
      name: {
        type: "string",
        example: "satellite-monitor",
        description: "Internal unique app name"
      },
      displayName: {
        type: "string",
        example: "Satellite Monitor"
      },
      description: {
        type: "string",
        nullable: true,
        example: "Real-time constellation monitoring dashboard"
      },
      iconUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/icons/satellite-monitor.png"
      },
      homeUrl: {
        type: "string",
        example: "https://monitor.example.com"
      },
      categoryId: {
        type: "string",
        example: "507f1f77bcf86cd799439012",
        description: "MongoDB _id of the owning category"
      },
      status: {
        type: "string",
        enum: ["active", "inactive"],
        example: "active"
      },
      requiredRoles: {
        type: "array",
        items: {
          type: "string",
          enum: ["user", "admin"]
        },
        example: ["user"]
      },
      redirectUris: {
        type: "array",
        items: { type: "string" },
        example: ["https://monitor.example.com/callback"]
      },
      clientId: {
        type: "string",
        example: "client_abc123",
        description: "OAuth client identifier"
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2025-01-15T10:30:00.000Z"
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2025-01-15T10:30:00.000Z"
      }
    }
  },
  AdminAppListResponse: {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/AdminAppResponse" }
      }
    }
  },
  AdminCategoryResponse: {
    type: "object",
    required: ["_id", "name", "slug"],
    properties: {
      _id: {
        type: "string",
        example: "507f1f77bcf86cd799439012",
        description: "MongoDB _id of the category"
      },
      name: {
        type: "string",
        example: "Monitoring",
        description: "Human-readable category display name"
      },
      slug: {
        type: "string",
        example: "monitoring",
        description: "Internal unique category name used as a slug"
      }
    }
  },
  AdminAppCreateBody: {
    type: "object",
    required: [
      "name",
      "displayName",
      "homeUrl",
      "categoryId",
      "status",
      "requiredRoles",
      "redirectUris"
    ],
    properties: {
      name: {
        type: "string",
        example: "satellite-monitor",
        description:
          "Internal unique app name — lowercase letters, numbers, and hyphens only (min 2, max 64)"
      },
      displayName: {
        type: "string",
        example: "Satellite Monitor",
        description:
          "Human-readable name displayed in the portal (min 2, max 80)"
      },
      description: {
        type: "string",
        example: "Real-time constellation monitoring dashboard",
        description: "Optional description (max 500 characters)"
      },
      iconUrl: {
        type: "string",
        example: "https://cdn.example.com/icons/satellite-monitor.png",
        description: "Optional icon URL (must start with http:// or https://)"
      },
      homeUrl: {
        type: "string",
        example: "https://monitor.example.com",
        description: "App home URL (must start with http:// or https://)"
      },
      categoryId: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        example: "507f1f77bcf86cd799439012",
        description: "MongoDB ObjectId of the owning category"
      },
      status: {
        type: "string",
        enum: ["active", "inactive"],
        example: "active"
      },
      requiredRoles: {
        type: "array",
        items: {
          type: "string",
          enum: ["user", "admin"]
        },
        minItems: 1,
        example: ["user"],
        description: "Roles required to access this app"
      },
      redirectUris: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 20,
        example: ["https://monitor.example.com/callback"],
        description: "OAuth redirect URIs (max 20)"
      }
    }
  },
  AdminAppUpdateInput: {
    type: "object",
    minProperties: 1,
    properties: {
      name: {
        type: "string",
        example: "satellite-monitor",
        description:
          "Internal unique app name — lowercase letters, numbers, and hyphens only (min 2, max 64)"
      },
      displayName: {
        type: "string",
        example: "Satellite Monitor",
        description:
          "Human-readable name displayed in the portal (min 2, max 80)"
      },
      description: {
        type: "string",
        example: "Real-time constellation monitoring dashboard",
        description: "Optional description (max 500 characters)"
      },
      iconUrl: {
        type: "string",
        example: "https://cdn.example.com/icons/satellite-monitor.png",
        description: "Optional icon URL (must start with http:// or https://)"
      },
      homeUrl: {
        type: "string",
        example: "https://monitor.example.com",
        description: "App home URL (must start with http:// or https://)"
      },
      categoryId: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        example: "507f1f77bcf86cd799439012",
        description: "MongoDB ObjectId of the owning category"
      },
      status: {
        type: "string",
        enum: ["active", "inactive"],
        example: "active"
      },
      requiredRoles: {
        type: "array",
        items: {
          type: "string",
          enum: ["user", "admin"]
        },
        minItems: 1,
        example: ["user"],
        description: "Roles required to access this app"
      },
      redirectUris: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 20,
        example: ["https://monitor.example.com/callback"],
        description: "OAuth redirect URIs (max 20)"
      }
    }
  },
  UserAppResponse: {
    type: "object",
    required: [
      "_id",
      "displayName",
      "description",
      "iconUrl",
      "homeUrl",
      "category"
    ],
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      displayName: { type: "string", example: "Satellite Monitor" },
      description: {
        type: "string",
        nullable: true,
        example: "Real-time constellation monitoring dashboard"
      },
      iconUrl: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/icons/monitor.png"
      },
      homeUrl: { type: "string", example: "https://monitor.example.com" },
      category: { type: "string", nullable: true, example: "Internal Tools" }
    }
  },
  UserCategoryResponse: {
    type: "object",
    required: ["_id", "displayName"],
    properties: {
      _id: {
        type: "string",
        example: "507f1f77bcf86cd799439012",
        description: "MongoDB _id of the category"
      },
      displayName: {
        type: "string",
        example: "Monitoring",
        description: "Human-readable category display name"
      }
    }
  },
  UserAppsListResponse: {
    type: "object",
    required: ["items", "meta"],
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/UserAppResponse" }
      },
      meta: {
        type: "object",
        required: ["total", "page", "limit", "totalPages"],
        properties: {
          total: { type: "integer", example: 25 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 12 },
          totalPages: { type: "integer", example: 3 }
        }
      }
    }
  },
  AdminAppCreatedResponse: {
    allOf: [
      { $ref: "#/components/schemas/AdminAppResponse" },
      {
        type: "object",
        required: ["clientSecret"],
        properties: {
          clientSecret: {
            type: "string",
            example:
              "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
            description:
              "Plaintext OAuth client secret — returned ONCE at creation. Store it securely."
          }
        }
      }
    ]
  }
};
