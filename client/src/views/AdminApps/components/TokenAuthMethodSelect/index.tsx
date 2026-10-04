"use client";

// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import {
  FormControl,
  FormDescription,
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
import AppFormMessage from "../AppFormMessage";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { TOKEN_ENDPOINT_AUTH_METHOD } =
  CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
const { CLIENT_SECRET_BASIC, NONE } = CONSTANTS.TOKEN_AUTH_METHOD;

const TokenAuthMethodSelect = ({
  label,
  hint,
  confidentialLabel,
  publicLabel,
  disabled = false
}: {
  label: string;
  hint: string;
  confidentialLabel: string;
  publicLabel: string;
  disabled?: boolean;
}) => {
  const { field, fieldState } = useFieldProps<AdminAppFormValues>(
    TOKEN_ENDPOINT_AUTH_METHOD
  );

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              if (value) field.onChange(value);
            }}
            disabled={disabled}
          >
            <FormControl>
              <CustomSelectTrigger aria-invalid={fieldState.invalid}>
                <SelectValue />
              </CustomSelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={CLIENT_SECRET_BASIC}>
                {confidentialLabel}
              </SelectItem>
              <SelectItem value={NONE}>{publicLabel}</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>{hint}</FormDescription>
          <AppFormMessage />
        </FormItem>
      )}
    />
  );
};

export default TokenAuthMethodSelect;
