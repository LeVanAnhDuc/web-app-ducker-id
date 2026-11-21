// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import {
  PASSWORD_STRENGTH_PATTERN,
  PASSWORD_VALIDATION
} from "@/validators/constants";

const ChangePasswordRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["currentPassword", "newPassword", "confirmPassword"],
  properties: {
    currentPassword: { type: "string", minLength: 1 },
    newPassword: {
      type: "string",
      minLength: PASSWORD_VALIDATION.MIN_LENGTH,
      maxLength: PASSWORD_VALIDATION.MAX_LENGTH,
      pattern: PASSWORD_STRENGTH_PATTERN.source
    },
    confirmPassword: {
      type: "string",
      description: "Must equal `newPassword`"
    }
  }
};

const ChangePasswordResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    idToken: { type: "string" },
    expiresIn: {
      type: "integer",
      example: 3600,
      description: "Access token lifetime in seconds"
    }
  }
};

export const changePasswordSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  ChangePasswordRequest: ChangePasswordRequestSchema,
  ChangePasswordResponse: ChangePasswordResponseSchema
};
