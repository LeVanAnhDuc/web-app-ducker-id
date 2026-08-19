// types
import type { z } from "zod";
import type { signupInfoFormValidation } from "@/forms/Signup/validations";
import type { LoginTokenResponse } from "@/types/Login";
import type { GENDER_VALUES } from "@/constants/gender";

export type GenderValue = (typeof GENDER_VALUES)[number];

export type SignupInfoFormValues = z.infer<typeof signupInfoFormValidation>;

export type SendSignupOtpResponse = {
  success: boolean;
  expiresIn: number;
  cooldownSeconds: number;
};

export type VerifySignupOtpResponse = {
  success: boolean;
  sessionToken: string;
  expiresIn: number;
};

export type ResendSignupOtpResponse = {
  success: boolean;
  expiresIn: number;
  cooldownSeconds: number;
  resendCount: number;
  maxResends: number;
  remainingResends: number;
};

export type SignupCompletePayload = {
  email: string;
  sessionToken: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  acceptTerms: boolean;
};

export type SignupCompleteResponse = {
  success: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  tokens: LoginTokenResponse;
};

export type CheckEmailResponse = {
  available: boolean;
};
