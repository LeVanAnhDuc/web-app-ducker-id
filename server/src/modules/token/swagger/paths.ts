// types
import type { OpenAPIV3 } from "openapi-types";

export const tokenPaths: OpenAPIV3.PathsObject = {
  "/auth/token/refresh": {
    post: {
      summary: "Refresh access token",
      description: `
Get a new access token using the refresh token from HTTP-only cookie.

**Authentication:**
- Requires valid refresh token in HTTP-only cookie

**Returns:**
- New access token (\`15 min\` expiry)
- New ID token
      `.trim(),
      tags: ["Auth - Session"],
      responses: {
        "200": {
          description: "Token refreshed successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/RefreshTokenResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": {
          description: "Refresh token required"
        },
        "403": {
          description: "Invalid or expired refresh token"
        }
      }
    }
  }
};
