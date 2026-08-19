// types
import type { OpenAPIV3 } from "openapi-types";

export const logoutPaths: OpenAPIV3.PathsObject = {
  "/auth/logout": {
    post: {
      summary: "Logout user",
      description: `
Clear refresh token cookie and logout.
Client should also delete access token from memory.

**Authentication:**
- Requires valid access token (Bearer)

**Actions:**
- Clears refresh token HTTP-only cookie
      `.trim(),
      tags: ["Auth - Session"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Logged out successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/LogoutResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": {
          $ref: "#/components/responses/Unauthorized"
        }
      }
    }
  }
};
