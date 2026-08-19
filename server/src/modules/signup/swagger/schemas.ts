// libs
import j2s from "joi-to-swagger";
// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  completeSignupSchema,
  checkEmailSchema
} from "@/validators/schemas/signup";

const { swagger: SendOtpRequestSchema } = j2s(sendOtpSchema);
const { swagger: ResendOtpRequestSchema } = j2s(resendOtpSchema);
const { swagger: VerifyOtpRequestSchema } = j2s(verifyOtpSchema);
const { swagger: CompleteSignupRequestSchema } = j2s(completeSignupSchema);
const { swagger: CheckEmailRequestSchema } = j2s(checkEmailSchema);
const SendOtpResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    expiresIn: {
      type: "integer",
      example: 300,
      description: "OTP expiration in seconds"
    },
    cooldownSeconds: {
      type: "integer",
      example: 60,
      description: "Cooldown before next OTP request"
    }
  }
};

const VerifyOtpResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    sessionToken: {
      type: "string",
      example: "a1b2c3d4e5f6...",
      description: "Session token for complete signup step"
    },
    expiresIn: {
      type: "integer",
      example: 300,
      description: "Session token expiration in seconds"
    }
  }
};

const ResendOtpResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    expiresIn: {
      type: "integer",
      example: 300,
      description: "OTP expiration in seconds"
    },
    cooldownSeconds: {
      type: "integer",
      example: 60,
      description: "Cooldown before next resend"
    },
    resendCount: {
      type: "integer",
      example: 1,
      description: "Current resend count"
    },
    maxResends: {
      type: "integer",
      example: 5,
      description: "Maximum allowed resends"
    }
  }
};

const CompleteSignupResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true
    },
    user: {
      type: "object",
      properties: {
        id: { type: "string", example: "user_123" },
        email: { type: "string", example: "user@example.com" },
        fullName: { type: "string", example: "John Doe" }
      }
    },
    tokens: {
      type: "object",
      properties: {
        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
        refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
        expiresIn: { type: "integer", example: 900 }
      }
    }
  }
};

const CheckEmailResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    available: {
      type: "boolean",
      example: true,
      description: "Whether email is available for registration"
    }
  }
};
export const signupSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  SendOtpRequest: SendOtpRequestSchema as OpenAPIV3.SchemaObject,
  ResendOtpRequest: ResendOtpRequestSchema as OpenAPIV3.SchemaObject,
  VerifyOtpRequest: VerifyOtpRequestSchema as OpenAPIV3.SchemaObject,
  CompleteSignupRequest: CompleteSignupRequestSchema as OpenAPIV3.SchemaObject,
  CheckEmailRequest: CheckEmailRequestSchema as OpenAPIV3.SchemaObject,

  SendOtpResponse: SendOtpResponseSchema,
  VerifyOtpResponse: VerifyOtpResponseSchema,
  ResendOtpResponse: ResendOtpResponseSchema,
  CompleteSignupResponse: CompleteSignupResponseSchema,
  CheckEmailResponse: CheckEmailResponseSchema
};
