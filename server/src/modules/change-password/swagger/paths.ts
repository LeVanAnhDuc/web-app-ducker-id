// types
import type { OpenAPIV3 } from "openapi-types";

export const changePasswordPaths: OpenAPIV3.PathsObject = {
  "/auth/change-password": {
    patch: {
      summary: "Change password (authenticated user)",
      description: `
Change the password of the currently authenticated user.

**Auth:** Requires a valid access token (Bearer).

**Behavior:**
- Verifies the current password.
- Rejects a new password identical to the current one.
- On success, sets a **new** refresh token cookie and returns a fresh access token, so the current device stays signed in.
- All other devices are signed out on their next token refresh (\`passwordChangedAt\`).
- A "password changed" alert email is queued.

**Rate Limit:** \`5\` requests per IP + user per \`15 minutes\`.
      `.trim(),
      tags: ["Auth - Change Password"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ChangePasswordRequest" }
          }
        }
      },
      responses: {
        "200": {
          description:
            "Password changed; fresh tokens issued (refresh token set as HttpOnly cookie)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordResponse" }
            }
          }
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  }
};
