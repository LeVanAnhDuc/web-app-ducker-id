"use client";

// types
import type { SignupInfoFormValues } from "@/types/Signup";
// components
import FormFieldMessage from "@/components/FormFieldMessage";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { GENDER } = CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

const GenderSelect = ({
  label,
  placeholder,
  genderLabels,
  disabled = false
}: {
  label: string;
  placeholder: string;
  genderLabels: {
    male: string;
    female: string;
    other: string;
    prefer_not_to_say: string;
  };
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<SignupInfoFormValues>(GENDER);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <FormControl>
              <CustomSelectTrigger aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={placeholder} />
              </CustomSelectTrigger>
            </FormControl>
            <SelectContent>
              {CONSTANTS.GENDER_VALUES.map((option) => (
                <SelectItem key={option} value={option}>
                  {genderLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldMessage />
        </FormItem>
      )}
    />
  );
};

export default GenderSelect;
