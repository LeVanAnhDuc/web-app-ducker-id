"use client";

// libs
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState } from "@/types/List";
// components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
import PageDateRangeFilter from "../PageDateRangeFilter";
// constants
import CONSTANTS from "@/constants";

const { LIST } = CONSTANTS;

const PageFilterPanel = ({
  filterDefs,
  query
}: {
  filterDefs: ListFilterDef[];
  query: ListQueryState;
}) => {
  const t = useTranslations("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("filters")}</span>
        {query.activeFilterCount > 0 && (
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            iconLeft={<X className="size-3.5" />}
            onClick={query.clearFilters}
          >
            {t("clearAll")}
          </CustomButton>
        )}
      </div>
      {filterDefs.map((def) => (
        <div key={def.key} className="flex flex-col gap-1.5">
          <Label className="text-xs">{def.label}</Label>
          {def.type === "select" && (
            <Select
              value={query.filters[def.key] || LIST.ALL_VALUE}
              onValueChange={(v) =>
                query.setFilter(def.key, v === LIST.ALL_VALUE ? "" : v)
              }
            >
              <CustomSelectTrigger>
                <SelectValue placeholder={def.allLabel ?? t("all")} />
              </CustomSelectTrigger>
              <SelectContent>
                <SelectItem value={LIST.ALL_VALUE}>
                  {def.allLabel ?? t("all")}
                </SelectItem>
                {def.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {def.type === "text" && (
            <CustomInput
              value={query.filters[def.key] ?? ""}
              onChange={(e) => query.setFilter(def.key, e.target.value)}
              placeholder={def.placeholder}
            />
          )}
          {def.type === "dateRange" && (
            <PageDateRangeFilter
              value={query.filters[LIST.PARAM.DATE_RANGE] ?? ""}
              onChange={query.setDateRange}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default PageFilterPanel;
