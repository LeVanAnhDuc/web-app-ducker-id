// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { ForgotPasswordResetFormValues } from "@/types/ForgotPasswordReset";
// forms
import { initialForgotPasswordResetFormData } from "./data";
import { forgotPasswordResetValidation } from "./validations";

export const forgotPasswordResetFormProps: UseFormProps<ForgotPasswordResetFormValues> =
  {
    defaultValues: initialForgotPasswordResetFormData,
    resolver: zodResolver(forgotPasswordResetValidation)
  };
