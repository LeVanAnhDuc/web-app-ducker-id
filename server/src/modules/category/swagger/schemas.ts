// types
import type { OpenAPIV3 } from "openapi-types";

const objectId = (description: string): OpenAPIV3.SchemaObject => ({
  type: "string",
  pattern: "^[a-fA-F0-9]{24}$",
  example: "507f1f77bcf86cd799439012",
  description
});

const categoryName: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["en", "vi"],
  properties: {
    en: { type: "string", maxLength: 100, example: "Internal Tools" },
    vi: { type: "string", maxLength: 100, example: "Công cụ nội bộ" }
  }
};

export const categorySwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  CategoryName: categoryName,
  PublicCategoryResponse: {
    type: "object",
    required: ["_id", "slug", "name"],
    properties: {
      _id: objectId("MongoDB _id of the category"),
      slug: {
        type: "string",
        example: "internal-tools",
        description: "Derived from name.en; changes when name.en changes"
      },
      name: { $ref: "#/components/schemas/CategoryName" }
    }
  },
  AdminCategoryResponse: {
    type: "object",
    required: ["_id", "slug", "name", "sortOrder", "appCount"],
    properties: {
      _id: objectId("MongoDB _id of the category"),
      slug: { type: "string", example: "internal-tools" },
      name: { $ref: "#/components/schemas/CategoryName" },
      sortOrder: { type: "integer", example: 0 },
      appCount: {
        type: "integer",
        example: 2,
        description: "Apps referencing this category, active or not"
      }
    }
  },
  CreateCategoryBody: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        allOf: [{ $ref: "#/components/schemas/CategoryName" }],
        description:
          "Zero-width characters are stripped and whitespace collapsed; name.en must contain a letter or digit"
      }
    }
  },
  UpdateCategoryBody: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "object",
        minProperties: 1,
        properties: {
          en: { type: "string", maxLength: 100, example: "Dev Tools" },
          vi: { type: "string", maxLength: 100, example: "Công cụ nội bộ" }
        }
      }
    }
  },
  MoveCategoryBody: {
    type: "object",
    required: ["direction"],
    properties: {
      direction: { type: "string", enum: ["up", "down"], example: "up" }
    }
  },
  DeleteImpactResponse: {
    type: "object",
    required: ["total", "orphaned"],
    properties: {
      total: { type: "integer", example: 4 },
      orphaned: {
        type: "array",
        description: "Apps whose only category is this one",
        items: {
          type: "object",
          required: ["_id", "displayName"],
          properties: {
            _id: objectId("MongoDB _id of the app"),
            displayName: { type: "string", example: "Shorten Link" }
          }
        }
      }
    }
  },
  DeleteCategoryBody: {
    type: "object",
    properties: {
      reassignments: {
        type: "array",
        maxItems: 500,
        default: [],
        description:
          "One entry per orphaned app, exactly matching the current orphan set",
        items: {
          type: "object",
          required: ["appId", "categoryId"],
          properties: {
            appId: objectId("Orphaned app"),
            categoryId: objectId("Target category (not the one being deleted)")
          }
        }
      }
    }
  }
};
