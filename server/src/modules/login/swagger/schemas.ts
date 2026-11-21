// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import { MAGIC_LINK_CONFIG } from "@/modules/login/constants";
// validators
import {
  EMAIL_VALIDATION,
  NUMERIC_OTP_PATTERN,
  OTP_VALIDATION
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

const tokenField: OpenAPIV3.SchemaObject = {
  type: "string",
  minLength: MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2,
  maxLength: MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2,
  pattern: "^[a-f0-9]+$"
};

const LoginRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: emailField,
    password: { type: "string", minLength: 1 }
  }
};

const OtpSendRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const OtpVerifyRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "otp"],
  properties: {
    email: emailField,
    otp: otpField
  }
};

const MagicLinkSendRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const MagicLinkVerifyRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "token"],
  properties: {
    email: emailField,
    token: tokenField
  }
};

const LoginResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    accessToken: {
      type: "string",
      example: "eyJhbGciOiJIUzI1NiIs...",
      description: "JWT access token"
    },
    refreshToken: {
      type: "string",
      example: "eyJhbGciOiJIUzI1NiIs...",
      description: "JWT refresh token"
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

export const loginSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  LoginRequest: LoginRequestSchema,
  LoginOtpSendRequest: OtpSendRequestSchema,
  LoginOtpVerifyRequest: OtpVerifyRequestSchema,
  LoginMagicLinkSendRequest: MagicLinkSendRequestSchema,
  LoginMagicLinkVerifyRequest: MagicLinkVerifyRequestSchema,
  LoginResponse: LoginResponseSchema
};
