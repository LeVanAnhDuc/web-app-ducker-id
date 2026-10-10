// types
import type { OpenAPIV3 } from "openapi-types";

const idParam: OpenAPIV3.ParameterObject = {
  name: "id",
  in: "path",
  required: true,
  description: "MongoDB ObjectId of the category",
  schema: {
    type: "string",
    pattern: "^[a-fA-F0-9]{24}$",
    example: "507f1f77bcf86cd799439012"
  }
};

const ok = (
  description: string,
  data: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/SuccessResponse" },
          { type: "object", properties: { data } }
        ]
      }
    }
  }
});

const adminList: OpenAPIV3.SchemaObject = {
  type: "array",
  items: { $ref: "#/components/schemas/AdminCategoryResponse" }
};

const jsonBody = (ref: string): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: { "application/json": { schema: { $ref: ref } } }
});

const adminErrors = {
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" }
};

export const categoryPaths: OpenAPIV3.PathsObject = {
  "/apps/categories": {
    get: {
      summary: "List categories (public)",
      description: `
Every category in display order, for the launcher filter. Names come in both
languages; the client picks one by locale.

**Authentication:** public; an optional Bearer token is accepted.

**Caching:** \`Cache-Control: public, max-age=60\`.
      `.trim(),
      tags: ["Categories"],
      responses: {
        "200": ok("Categories retrieved successfully", {
          type: "array",
          items: { $ref: "#/components/schemas/PublicCategoryResponse" }
        }),
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/categories": {
    get: {
      summary: "List categories with app counts",
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": ok("Categories retrieved successfully", adminList),
        ...adminErrors
      }
    },
    post: {
      summary: "Create a category",
      description:
        "The slug is generated from name.en; a taken slug gets a -2, -3… suffix. Created last in the order.",
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody("#/components/schemas/CreateCategoryBody"),
      responses: {
        "201": ok("Category created", {
          $ref: "#/components/schemas/AdminCategoryResponse"
        }),
        "400": { $ref: "#/components/responses/BadRequest" },
        ...adminErrors,
        "409": { description: "name.en already used (CATEGORY_NAME_TAKEN)" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/categories/{id}": {
    patch: {
      summary: "Rename a category",
      description:
        "Changing name.en regenerates the slug; changing only name.vi keeps it.",
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: jsonBody("#/components/schemas/UpdateCategoryBody"),
      responses: {
        "200": ok("Category updated", {
          $ref: "#/components/schemas/AdminCategoryResponse"
        }),
        "400": { $ref: "#/components/responses/BadRequest" },
        ...adminErrors,
        "404": { description: "Category not found (CATEGORY_NOT_FOUND)" },
        "409": { description: "name.en already used (CATEGORY_NAME_TAKEN)" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    },
    delete: {
      summary: "Delete a category",
      description: `
Runs in one transaction. Apps that keep another category just lose this one.
Apps whose only category is this one must each get a target in
\`reassignments\` — the set must match the current orphans exactly.

- 400 \`CATEGORY_REASSIGN_REQUIRED\` — orphans exist and no reassignments were sent
- 400 \`CATEGORY_REASSIGN_INVALID\` — a target is this category or no longer exists
- 409 \`CATEGORY_IMPACT_CHANGED\` — the orphan set changed since it was read
      `.trim(),
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DeleteCategoryBody" }
          }
        }
      },
      responses: {
        "204": { description: "Category deleted" },
        "400": { $ref: "#/components/responses/BadRequest" },
        ...adminErrors,
        "404": { description: "Category not found (CATEGORY_NOT_FOUND)" },
        "409": { description: "Orphan set changed (CATEGORY_IMPACT_CHANGED)" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/categories/{id}/move": {
    post: {
      summary: "Move a category up or down",
      description:
        "Renumbers every sortOrder and returns the new list. Moving past either end is a no-op.",
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: jsonBody("#/components/schemas/MoveCategoryBody"),
      responses: {
        "200": ok("Order updated", adminList),
        "400": { $ref: "#/components/responses/BadRequest" },
        ...adminErrors,
        "404": { description: "Category not found (CATEGORY_NOT_FOUND)" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/categories/{id}/delete-impact": {
    get: {
      summary: "Preview what deleting a category would affect",
      tags: ["Categories Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        "200": ok("Delete impact", {
          $ref: "#/components/schemas/DeleteImpactResponse"
        }),
        ...adminErrors,
        "404": { description: "Category not found (CATEGORY_NOT_FOUND)" }
      }
    }
  }
};
