"use client";

// libs
import { useLocale } from "next-intl";
// types
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
// hooks
import { useHasMounted } from "@/hooks";
// others
import { formatDateTime, toValidDate } from "@/utils";

const FormatTime = ({
  value,
  variant
}: {
  value: DateTimeValue;
  variant: DateTimeVariant;
}) => {
  const locale = useLocale();
  const mounted = useHasMounted();

  const iso = toValidDate(value)?.toISOString();

  const text =
    !mounted && variant === "relative"
      ? "—"
      : formatDateTime(
          value,
          variant,
          locale,
          mounted ? undefined : { timeZone: "UTC" }
        );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
};

export default FormatTime;
