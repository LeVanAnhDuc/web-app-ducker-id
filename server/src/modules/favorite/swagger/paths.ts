// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import { FAVORITE_SORTS } from "@/modules/favorite/constants";

const appIdParam: OpenAPIV3.ParameterObject = {
  name: "appId",
  in: "path",
  required: true,
  schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
};

const errors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/Unauthorized" }
};

// Items are the launcher's app shape (`UserAppResponse`, web-app module) with
// `isFavorite: true`.
export const favoritePaths: OpenAPIV3.PathsObject = {
  "/users/me/favorites": {
    get: {
      summary: "List my favourite apps",
      description:
        "Only apps the caller may still open. Not paginated: the list is the caller's own pins.",
      tags: ["Favorites"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "categoryId",
          in: "query",
          schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
        },
        {
          name: "sort",
          in: "query",
          schema: {
            type: "string",
            enum: Object.values(FAVORITE_SORTS),
            default: FAVORITE_SORTS.RECENT
          }
        }
      ],
      responses: {
        "200": {
          description: "Favourites retrieved",
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
                              $ref: "#/components/schemas/UserAppResponse"
                            }
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
        ...errors
      }
    }
  },
  "/users/me/favorites/{appId}": {
    post: {
      summary: "Add an app to my favourites",
      description: "Idempotent. The caller must be allowed to open the app.",
      tags: ["Favorites"],
      security: [{ bearerAuth: [] }],
      parameters: [appIdParam],
      responses: {
        "201": {
          description: "Added",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessResponse" }
            }
          }
        },
        ...errors,
        "404": { $ref: "#/components/responses/NotFound" }
      }
    },
    delete: {
      summary: "Remove an app from my favourites",
      description: "Idempotent.",
      tags: ["Favorites"],
      security: [{ bearerAuth: [] }],
      parameters: [appIdParam],
      responses: {
        "204": { description: "Removed" },
        ...errors
      }
    }
  }
};
