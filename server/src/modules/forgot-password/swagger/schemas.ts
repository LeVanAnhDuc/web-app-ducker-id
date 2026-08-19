// libs
import j2s from "joi-to-swagger";
// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import {
  fpOtpSendSchema,
  fpOtpVerifySchema,
  fpMagicLinkSendSchema,
  fpMagicLinkVerifySchema,
  fpResetPasswordSchema
} from "@/validators/schemas/forgot-password";

const { swagger: FPOtpSendRequestSchema } = j2s(fpOtpSendSchema);
const { swagger: FPOtpVerifyRequestSchema } = j2s(fpOtpVerifySchema);
const { swagger: FPMagicLinkSendRequestSchema } = j2s(fpMagicLinkSendSchema);
const { swagger: FPMagicLinkVerifyRequestSchema } = j2s(
  fpMagicLinkVerifySchema
);
const { swagger: FPResetPasswordRequestSchema } = j2s(fpResetPasswordSchema);

const FPSendResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    expiresIn: {
      type: "integer",
      example: 300,
      description: "OTP/token expiry in seconds"
    },
    cooldown: {
      type: "integer",
      example: 60,
      description: "Cooldown before next request in seconds"
    }
  }
};

const FPVerifyResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    resetToken: {
      type: "string",
      example: "a1b2c3d4e5f6...128chars",
      description: "One-time reset token (64 bytes hex, 128 chars)"
    }
  }
};

const FPResetPasswordResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    }
  }
};

export const forgotPasswordSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  FPOtpSendRequest: FPOtpSendRequestSchema as OpenAPIV3.SchemaObject,
  FPOtpVerifyRequest: FPOtpVerifyRequestSchema as OpenAPIV3.SchemaObject,
  FPMagicLinkSendRequest:
    FPMagicLinkSendRequestSchema as OpenAPIV3.SchemaObject,
  FPMagicLinkVerifyRequest:
    FPMagicLinkVerifyRequestSchema as OpenAPIV3.SchemaObject,
  FPResetPasswordRequest:
    FPResetPasswordRequestSchema as OpenAPIV3.SchemaObject,
  FPSendResponse: FPSendResponseSchema,
  FPVerifyResponse: FPVerifyResponseSchema,
  FPResetPasswordResponse: FPResetPasswordResponseSchema
};
