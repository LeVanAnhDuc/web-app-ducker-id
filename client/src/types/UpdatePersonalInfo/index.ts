// libs
import type * as z from "zod";
// forms
import type { updatePersonalInfoValidation } from "@/forms/UpdatePersonalInfo/validations";

export type UpdatePersonalInfoFormValues = z.infer<
  typeof updatePersonalInfoValidation
>;
