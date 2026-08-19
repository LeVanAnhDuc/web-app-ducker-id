"use client";

// types
import type { AdminAppFormValues } from "@/types/AdminApps";
// components
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
// hooks
import { useFieldProps } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { STATUS } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
const { ACTIVE, INACTIVE } = CONSTANTS.APP_STATUS;

const StatusSwitch = ({
  label,
  disabled = false
}: {
  label: string;
  disabled?: boolean;
}) => {
  const { field } = useFieldProps<AdminAppFormValues>(STATUS);

  return (
    <FormField
      {...field}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between gap-3">
          <FormLabel className="text-foreground cursor-pointer">
            {label}
          </FormLabel>
          <FormControl>
            <Switch
              checked={field.value === ACTIVE}
              onCheckedChange={(checked) =>
                field.onChange(checked ? ACTIVE : INACTIVE)
              }
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default StatusSwitch;
