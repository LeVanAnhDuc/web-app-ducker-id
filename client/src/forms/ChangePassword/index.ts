// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// forms
import { initialChangePasswordData } from "./data";
import { changePasswordValidation } from "./validations";

export const changePasswordFormProps: UseFormProps<ChangePasswordFormValues> = {
  defaultValues: initialChangePasswordData,
  resolver: zodResolver(changePasswordValidation)
};
