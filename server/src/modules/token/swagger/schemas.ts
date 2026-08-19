// types
import type { OpenAPIV3 } from "openapi-types";

const RefreshTokenResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    accessToken: {
      type: "string",
      example: "eyJhbGciOiJIUzI1NiIs...",
      description: "New JWT access token"
    },
    idToken: {
      type: "string",
      example: "eyJhbGciOiJIUzI1NiIs...",
      description: "JWT ID token containing user info"
    },
    expiresIn: {
      type: "integer",
      example: 900,
      description: "Access token expiration in seconds"
    }
  }
};

export const tokenSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  RefreshTokenResponse: RefreshTokenResponseSchema
};
