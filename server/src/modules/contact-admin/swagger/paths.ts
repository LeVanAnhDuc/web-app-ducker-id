// types
import type { OpenAPIV3 } from "openapi-types";

export const contactAdminPaths: OpenAPIV3.PathsObject = {
  "/contact/submit": {
    post: {
      summary: "Submit a contact request",
      description: `
Submit a contact request to the admin.

**Auth:** Optional — \`Authorization: Bearer <token>\` may be provided. When
present and valid, the created contact is attached to the caller (\`userId\`)
so it later shows up in \`GET /contacts\`. Guests (no token) may still submit;
the contact is created with \`userId = null\`.

**Rate Limits:**
- 5 requests per IP per 15 minutes
      `.trim(),
      tags: ["Contact Admin"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SubmitContactRequest" }
          }
        }
      },
      responses: {
        "201": {
          description: "Contact request submitted successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/SubmitContactResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/contacts": {
    get: {
      summary: "List my contact requests (owner-scoped)",
      description: `
List contact requests submitted by the authenticated caller. Only contacts
whose \`userId\` matches the caller are returned — never other users' or
anonymous/guest contacts.
      `.trim(),
      tags: ["Contact Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100 }
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["new", "processing", "resolved"] }
        },
        {
          name: "search",
          in: "query",
          description: "Case-insensitive match on subject",
          schema: { type: "string" }
        },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["createdAt", "priority", "status"]
          }
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] }
        }
      ],
      responses: {
        "200": {
          description: "Contacts retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/ContactListItem"
                            }
                          },
                          meta: {
                            $ref: "#/components/schemas/PaginationMeta"
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" }
      }
    }
  },
  "/contacts/{id}": {
    get: {
      summary: "Get my contact detail (owner-scoped)",
      description: `
Return the full detail of a contact request owned by the authenticated
caller. If the id does not exist, or belongs to a different user, the
response is \`404\` — the API never reveals whether the resource exists for
another owner.
      `.trim(),
      tags: ["Contact Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          example: "507f1f77bcf86cd799439011"
        }
      ],
      responses: {
        "200": {
          description: "Contact detail retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/ContactDetailItem" }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" }
      }
    }
  }
};
