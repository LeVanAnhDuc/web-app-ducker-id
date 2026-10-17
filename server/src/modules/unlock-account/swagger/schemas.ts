// types
import type { OpenAPIV3 } from "openapi-types";

export const unlockAccountSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  UnlockRequestBody: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" }
    }
  },
  UnlockVerifyBody: {
    type: "object",
    required: ["email", "tempPassword"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" },
      tempPassword: {
        type: "string",
        minLength: 12,
        description: "The temporary password emailed by /auth/unlock/request"
      }
    }
  },
  UnlockVerifyResponse: {
    type: "object",
    description:
      "Signed in with the temporary password; the refresh token is set as an HttpOnly cookie, never in the body",
    properties: {
      accessToken: { type: "string" },
      idToken: { type: "string" },
      expiresIn: { type: "integer", example: 900 }
    }
  }
};
