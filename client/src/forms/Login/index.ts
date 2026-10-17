// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type {
  EmailStepFormValues,
  PasswordStepFormValues,
  UnlockVerifyFormValues
} from "@/types/Login";
// forms
import {
  initialEmailStepData,
  initialPasswordStepData,
  initialUnlockVerifyData
} from "./data";
import {
  emailStepValidation,
  passwordStepValidation,
  unlockVerifyValidation
} from "./validations";

export const emailStepFormProps: UseFormProps<EmailStepFormValues> = {
  defaultValues: initialEmailStepData,
  resolver: zodResolver(emailStepValidation)
};

export const passwordStepFormProps: UseFormProps<PasswordStepFormValues> = {
  defaultValues: initialPasswordStepData,
  resolver: zodResolver(passwordStepValidation)
};

export const unlockVerifyFormProps: UseFormProps<UnlockVerifyFormValues> = {
  defaultValues: initialUnlockVerifyData,
  resolver: zodResolver(unlockVerifyValidation)
};
