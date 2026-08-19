"use client";

// libs
import { useTranslations } from "next-intl";
// components
import { useFormField } from "@/components/ui/form";
// others
import { cn } from "@/libs/utils";

type ValidationNamespace = NonNullable<Parameters<typeof useTranslations>[0]>;

const DEFAULT_NAMESPACE = "common.validation" as ValidationNamespace;

const FormFieldMessage = ({
  className,
  namespace = DEFAULT_NAMESPACE
}: {
  className?: string;
  namespace?: ValidationNamespace;
}) => {
  const { error, name, formMessageId } = useFormField();
  const t = useTranslations(namespace);

  if (!error?.message) return null;

  // Try to translate: validation.{fieldName}.{errorKey}
  // If not found, fallback to the raw message
  const errorKey = error.message;
  const translationKey = `${name}.${errorKey}`;

  let message: string;
  // Use t.has() to check if key exists, avoiding runtime errors
  if (t.has(translationKey as Parameters<typeof t.has>[0])) {
    message = t(translationKey as Parameters<typeof t>[0]);
  } else {
    // Fallback to raw message if translation not found
    message = errorKey;
  }

  const hintKey = `${translationKey}Hint`;
  const hint = t.has(hintKey as Parameters<typeof t.has>[0])
    ? t(hintKey as Parameters<typeof t>[0])
    : null;

  return (
    <div
      data-slot="form-message"
      id={formMessageId}
      className={cn("flex flex-col gap-0.5", className)}
    >
      <p className="text-destructive text-sm">{message}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
};

export default FormFieldMessage;
