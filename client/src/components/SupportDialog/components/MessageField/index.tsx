"use client";

// libs
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { SupportFormValues } from "@/types/Support";
// components
import FormFieldMessage from "@/components/FormFieldMessage";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
// hooks
import { useFormField } from "@/components/ui/form";
// others
import CONSTANTS from "@/constants";

const { MESSAGE } = CONSTANTS.FIELD_NAMES.SUPPORT_FIELD_NAMES;
const { MESSAGE_MIN_CHARS } = CONSTANTS.SUPPORT;

const MessageHint = ({ charCount }: { charCount: number }) => {
  const t = useTranslations("support.form.hint");
  const { error } = useFormField();
  return (
    <div className="flex items-center justify-between">
      {error?.message ? (
        <FormFieldMessage />
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("minChars", { count: MESSAGE_MIN_CHARS })}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        {t("charCount", { count: charCount })}
      </p>
    </div>
  );
};

const MessageField = ({ disabled }: { disabled?: boolean }) => {
  const t = useTranslations("support.form.input");
  const { control } = useFormContext<SupportFormValues>();
  const messageValue = useWatch({ control, name: MESSAGE });

  return (
    <FormField
      control={control}
      name={MESSAGE}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t("labelMessage")} <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder={t("placeholderMessage")}
              disabled={disabled}
              rows={6}
              className="resize-none"
            />
          </FormControl>
          <MessageHint charCount={messageValue?.length || 0} />
        </FormItem>
      )}
    />
  );
};

export default MessageField;
