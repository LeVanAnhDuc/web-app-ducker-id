// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import { SESSION_CONFIG } from "@/modules/signup/constants";
import { GENDERS } from "@/modules/user/constants";
// validators
import {
  AGE_VALIDATION,
  EMAIL_VALIDATION,
  FULLNAME_VALIDATION,
  NUMERIC_OTP_PATTERN,
  OTP_VALIDATION,
  PASSWORD_STRENGTH_PATTERN,
  PASSWORD_VALIDATION,
  SAFE_FULLNAME_PATTERN
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

const SendOtpRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const ResendOtpRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

const VerifyOtpRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email", "otp"],
  properties: {
    email: emailField,
    otp: otpField
  }
};

const CompleteSignupRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: [
    "email",
    "password",
    "confirmPassword",
    "sessionToken",
    "acceptTerms",
    "fullName",
    "gender",
    "dateOfBirth"
  ],
  properties: {
    email: emailField,
    password: passwordField,
    confirmPassword: {
      type: "string",
      description: "Must equal `password`"
    },
    sessionToken: {
      type: "string",
      minLength: SESSION_CONFIG.TOKEN_LENGTH * 2,
      maxLength: SESSION_CONFIG.TOKEN_LENGTH * 2,
      description: "Returned by /auth/signup/verify-otp"
    },
    acceptTerms: { type: "boolean", enum: [true] },
    fullName: {
      type: "string",
      minLength: FULLNAME_VALIDATION.MIN_LENGTH,
      maxLength: FULLNAME_VALIDATION.MAX_LENGTH,
      pattern: SAFE_FULLNAME_PATTERN.source,
      example: "Nguyễn Văn A"
    },
    gender: { type: "string", enum: Object.values(GENDERS) },
    dateOfBirth: {
      type: "string",
      format: "date",
      example: "1995-05-15",
      description: `Age between ${AGE_VALIDATION.MIN_AGE} and ${AGE_VALIDATION.MAX_AGE}`
    }
  }
};

const CheckEmailRequestSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  required: ["email"],
  properties: {
    email: emailField
  }
};

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
        idToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
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
  SendOtpRequest: SendOtpRequestSchema,
  ResendOtpRequest: ResendOtpRequestSchema,
  VerifyOtpRequest: VerifyOtpRequestSchema,
  CompleteSignupRequest: CompleteSignupRequestSchema,
  CheckEmailRequest: CheckEmailRequestSchema,

  SendOtpResponse: SendOtpResponseSchema,
  VerifyOtpResponse: VerifyOtpResponseSchema,
  ResendOtpResponse: ResendOtpResponseSchema,
  CompleteSignupResponse: CompleteSignupResponseSchema,
  CheckEmailResponse: CheckEmailResponseSchema
};
