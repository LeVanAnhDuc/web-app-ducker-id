// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { SignupInfoFormValues } from "@/types/Signup";
// forms
import { initialSignupInfoFormData } from "./data";
import { signupInfoFormValidation } from "./validations";

export const signupInfoFormProps: UseFormProps<SignupInfoFormValues> = {
  defaultValues: initialSignupInfoFormData,
  resolver: zodResolver(signupInfoFormValidation)
};
