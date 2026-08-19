// types
import type { DateRangePreset } from "@/types/List";
// others
import { formatYmdLocal } from "@/utils";

export const computeDateRange = (
  preset: DateRangePreset
): { fromDate?: string; toDate?: string } => {
  if (preset === "all" || preset === "custom") return {};
  const now = new Date();
  const to = formatYmdLocal(now);
  const days =
    preset === "today"
      ? 0
      : preset === "last7"
        ? 6
        : preset === "last30"
          ? 29
          : 89;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { fromDate: formatYmdLocal(from), toDate: to };
};
