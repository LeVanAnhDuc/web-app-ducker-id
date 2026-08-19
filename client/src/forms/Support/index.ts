// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { SupportFormValues } from "@/types/Support";
// forms
import { initialSupportData } from "./data";
import { supportValidation } from "./validations";

export const supportFormProps: UseFormProps<SupportFormValues> = {
  defaultValues: initialSupportData,
  resolver: zodResolver(supportValidation)
};
