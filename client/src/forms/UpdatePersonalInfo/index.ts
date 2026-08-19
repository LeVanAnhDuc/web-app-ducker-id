// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
// forms
import { initialUpdatePersonalInfoData } from "./data";
import { updatePersonalInfoValidation } from "./validations";

export const updatePersonalInfoFormProps: UseFormProps<UpdatePersonalInfoFormValues> =
  {
    defaultValues: initialUpdatePersonalInfoData,
    resolver: zodResolver(updatePersonalInfoValidation)
  };
