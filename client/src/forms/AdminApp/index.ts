// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { AdminAppFormValues } from "@/types/AdminApps";
// forms
import { initialAdminAppData } from "./data";
import { adminAppValidation } from "./validations";

export const adminAppFormProps: UseFormProps<AdminAppFormValues> = {
  defaultValues: initialAdminAppData,
  resolver: zodResolver(adminAppValidation)
};
