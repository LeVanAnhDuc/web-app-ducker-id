// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type {
  EmailStepFormValues,
  PasswordStepFormValues
} from "@/types/Login";
// forms
import { initialEmailStepData, initialPasswordStepData } from "./data";
import { emailStepValidation, passwordStepValidation } from "./validations";

export const emailStepFormProps: UseFormProps<EmailStepFormValues> = {
  defaultValues: initialEmailStepData,
  resolver: zodResolver(emailStepValidation)
};

export const passwordStepFormProps: UseFormProps<PasswordStepFormValues> = {
  defaultValues: initialPasswordStepData,
  resolver: zodResolver(passwordStepValidation)
};
