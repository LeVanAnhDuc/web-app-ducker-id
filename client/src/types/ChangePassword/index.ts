// libs
import type * as z from "zod";
// forms
import type { changePasswordValidation } from "@/forms/ChangePassword/validations";

export type ChangePasswordFormValues = z.infer<typeof changePasswordValidation>;
