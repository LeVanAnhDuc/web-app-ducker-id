// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { AdminCategoryFormValues } from "@/types/AdminCategories";
// forms
import { initialAdminCategoryData } from "./data";
import { adminCategoryValidation } from "./validations";

export const adminCategoryFormProps: UseFormProps<AdminCategoryFormValues> = {
  defaultValues: initialAdminCategoryData,
  resolver: zodResolver(adminCategoryValidation),
  mode: "onBlur"
};
