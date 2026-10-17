// types
import type { z } from "zod";
import type {
  emailStepValidation,
  passwordStepValidation,
  unlockVerifyValidation
} from "@/forms/Login/validations";

export type EmailStepFormValues = z.infer<typeof emailStepValidation>;
export type PasswordStepFormValues = z.infer<typeof passwordStepValidation>;
export type UnlockVerifyFormValues = z.infer<typeof unlockVerifyValidation>;
export type LoginTokenResponse = {
  accessToken: string;
  idToken: string;
  expiresIn: number;
};

export type SendOtpResponse = {
  success: boolean;
  expiresIn: number;
  cooldown: number;
};

export type SendMagicLinkResponse = {
  success: boolean;
  expiresIn: number;
  cooldown: number;
};
