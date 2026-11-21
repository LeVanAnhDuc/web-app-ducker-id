// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import {
  FORGOT_PASSWORD_MAGIC_LINK_CONFIG,
  FORGOT_PASSWORD_RESET_TOKEN_CONFIG
} from "@/modules/forgot-password/constants";
// validators
import {
  EMAIL_VALIDATION,
  NUMERIC_OTP_PATTERN,
  OTP_VALIDATION,
  PASSWORD_STRENGTH_PATTERN,
  PASSWORD_VALIDATION
} from "@/validators/constants";

const emailField: OpenAPIV3.SchemaObject = {
  type: "string",
  format: "email",
  minLength: EMAIL_VALIDATION.MIN_LENGTH,
  maxLength: EMAIL_VALIDATION.MAX_LENGTH,
  example: "user@example.com"
};

const otpField: OpenAPIV3.SchemaObject = {
  type: "string",
  minLength: OTP_VALIDATION.LENGTH,
  maxLength: OTP_VALIDATION.LENGTH,
  pattern: NUMERIC_OTP_PATTERN.source,
  example: "123456"
};

const passwordField: OpenAPIV3.SchemaObject = {
  type: "string",
  minLength: PASSWORD_VALIDATION.MIN_LENGTH,
  maxLength: PASSWORD_VALIDATION.MAX_LENGTH,
  pattern: PASSWORD_STRENGTH_PATTERN.source
};

const tokenField: OpenAPIV3.SchemaObject = {
  type: "string",
  minLength: FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2,
  maxLength: FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2,
  pattern: "^[a-f0-9]+$"
};

const resetTokenField: OpenAPIV3.SchemaObject = {
  type: "string",
  minLength: FORGOT_PASSWORD_RESET_TOKEN_CONFIG.TOKEN_LENGTH * 2,
  maxLength: FORGOT_PASSWORD_RESET_TOKEN_CONFIG.TOKEN_LENGTH * 2,
  pattern: "^[a-f0-9]+$"
};

const FPOtpSendRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const FPOtpVerifyRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "otp"],
  properties: {
    email: emailField,
    otp: otpField
  }
};

const FPMagicLinkSendRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const FPMagicLinkVerifyRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "token"],
  properties: {
    email: emailField,
    token: tokenField
  }
};

const FPResetPasswordRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "resetToken", "newPassword"],
  properties: {
    email: emailField,
    resetToken: resetTokenField,
    newPassword: passwordField
  }
};

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
  FPOtpSendRequest: FPOtpSendRequestSchema,
  FPOtpVerifyRequest: FPOtpVerifyRequestSchema,
  FPMagicLinkSendRequest: FPMagicLinkSendRequestSchema,
  FPMagicLinkVerifyRequest: FPMagicLinkVerifyRequestSchema,
  FPResetPasswordRequest: FPResetPasswordRequestSchema,
  FPSendResponse: FPSendResponseSchema,
  FPVerifyResponse: FPVerifyResponseSchema,
  FPResetPasswordResponse: FPResetPasswordResponseSchema
};
