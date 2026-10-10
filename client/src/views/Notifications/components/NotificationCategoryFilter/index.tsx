"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { NotificationCategoryFilter as CategoryFilter } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
// dataSources
import { NOTIFICATION_CATEGORY_OPTIONS } from "@/dataSources/Notifications";
// others
import { cn } from "@/libs/utils";

const NotificationCategoryFilter = ({
  value,
  onChange
}: {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) => {
  const t = useTranslations("notifications.categories");
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-border flex flex-wrap gap-2 border-b px-4 py-3 sm:px-6"
    >
      {NOTIFICATION_CATEGORY_OPTIONS.map((option) => (
        <CustomButton
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full",
            value !== option.value && "text-muted-foreground"
          )}
        >
          {t(option.labelKey)}
        </CustomButton>
      ))}
    </div>
  );
};

export default NotificationCategoryFilter;
