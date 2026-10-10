"use client";

// libs
import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ListFilterDef, ListQueryState } from "@/types/List";
// components
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import CustomButton from "@/components/CustomButton";
import SearchInput from "@/components/SearchInput";
import PageFilterPanel from "../PageFilterPanel";

// Layout contract: search always sits on the LEFT and the filter controls
// (`filterSlot` + Filters popover) always on the RIGHT, even when only one of
// the two is rendered — so every list page lines up the same way.
const PageToolbar = ({
  query,
  filterDefs = [],
  searchPlaceholder,
  filterSlot,
  showSearch = true
}: {
  query: ListQueryState;
  filterDefs?: ListFilterDef[];
  searchPlaceholder?: string;
  filterSlot?: ReactNode;
  showSearch?: boolean;
}) => {
  const t = useTranslations("list");

  const hasFilters = filterDefs.length > 0;
  const hasFilterGroup = hasFilters || Boolean(filterSlot);

  return (
    <div
      {...(showSearch ? { role: "search" } : {})}
      className="flex flex-wrap items-center gap-3"
    >
      {showSearch && (
        <SearchInput
          value={query.search}
          onChange={query.setSearch}
          placeholder={searchPlaceholder ?? t("searchPlaceholder")}
          ariaLabel={t("search")}
          className="w-full sm:w-80"
          inputClassName="!h-10"
        />
      )}
      {hasFilterGroup && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {filterSlot}
          {hasFilters && (
            <Popover>
              <PopoverTrigger asChild>
                <CustomButton
                  type="button"
                  variant="outline"
                  iconLeft={<SlidersHorizontal className="size-4" />}
                >
                  {t("filters")}
                  {query.activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                      {query.activeFilterCount}
                    </span>
                  )}
                </CustomButton>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <PageFilterPanel filterDefs={filterDefs} query={query} />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
};

export default PageToolbar;
