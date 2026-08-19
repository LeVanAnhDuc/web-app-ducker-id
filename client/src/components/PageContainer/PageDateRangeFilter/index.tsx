"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { DateRangePreset } from "@/types/List";
// components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
// others
import { computeDateRange } from "@/utils/listDateRange";
import CONSTANTS from "@/constants";

const { LIST } = CONSTANTS;

const PageDateRangeFilter = ({
  value,
  onChange
}: {
  value: string;
  onChange: (preset: string, fromDate?: string, toDate?: string) => void;
}) => {
  const t = useTranslations("list.dateRange");
  const current = (value || "all") as DateRangePreset;

  const handleChange = (preset: string) => {
    const { fromDate, toDate } = computeDateRange(preset as DateRangePreset);
    onChange(preset, fromDate, toDate);
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <CustomSelectTrigger aria-label={t("label")}>
        <SelectValue />
      </CustomSelectTrigger>
      <SelectContent>
        {LIST.DATE_PRESETS.filter((p) => p !== "custom").map((preset) => (
          <SelectItem key={preset} value={preset}>
            {t(preset)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PageDateRangeFilter;
