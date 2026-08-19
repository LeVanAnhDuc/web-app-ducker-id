// libs
import j2s from "joi-to-swagger";
// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import {
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  magicLinkSendSchema,
  magicLinkVerifySchema
} from "@/validators/schemas/login";

const { swagger: LoginRequestSchema } = j2s(loginSchema);
const { swagger: OtpSendRequestSchema } = j2s(otpSendSchema);
const { swagger: OtpVerifyRequestSchema } = j2s(otpVerifySchema);
const { swagger: MagicLinkSendRequestSchema } = j2s(magicLinkSendSchema);
const { swagger: MagicLinkVerifyRequestSchema } = j2s(magicLinkVerifySchema);

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
  LoginRequest: LoginRequestSchema as OpenAPIV3.SchemaObject,
  LoginOtpSendRequest: OtpSendRequestSchema as OpenAPIV3.SchemaObject,
  LoginOtpVerifyRequest: OtpVerifyRequestSchema as OpenAPIV3.SchemaObject,
  LoginMagicLinkSendRequest:
    MagicLinkSendRequestSchema as OpenAPIV3.SchemaObject,
  LoginMagicLinkVerifyRequest:
    MagicLinkVerifyRequestSchema as OpenAPIV3.SchemaObject,
  LoginResponse: LoginResponseSchema
};
