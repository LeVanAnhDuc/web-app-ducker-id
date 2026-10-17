// types
import type { OpenAPIV3 } from "openapi-types";

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

const body = (ref: string): OpenAPIV3.RequestBodyObject => ({
  required: true,
  content: { "application/json": { schema: { $ref: ref } } }
});

export const unlockAccountPaths: OpenAPIV3.PathsObject = {
  "/auth/unlock/request": {
    post: {
      summary: "Request a temporary password for a locked account",
      description: `
Emails a temporary password to an account locked by failed sign-ins.

- 400 \`UNLOCK_ACCOUNT_NOT_LOCKED\` / \`UNLOCK_ACCOUNT_DISABLED\` / \`UNLOCK_COOLDOWN\`
- 429 \`UNLOCK_RATE_LIMIT\`
      `.trim(),
      tags: ["Auth - Unlock"],
      requestBody: body("#/components/schemas/UnlockRequestBody"),
      responses: {
        "200": ok("Unlock email sent", {
          type: "object",
          properties: { success: { type: "boolean", example: true } }
        }),
        "400": { $ref: "#/components/responses/BadRequest" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/auth/unlock/verify": {
    post: {
      summary: "Unlock and sign in with the temporary password",
      description: `
Unlocks the account and signs in; the refresh token is set as an HttpOnly
cookie. The account must then change its password.

- 401 \`UNLOCK_INVALID_TEMP_PASSWORD\` / \`UNLOCK_AUTH_NOT_FOUND\`
- 429 shares the sign-in per-IP limit
      `.trim(),
      tags: ["Auth - Unlock"],
      requestBody: body("#/components/schemas/UnlockVerifyBody"),
      responses: {
        "200": ok("Account unlocked", {
          $ref: "#/components/schemas/UnlockVerifyResponse"
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  }
};
