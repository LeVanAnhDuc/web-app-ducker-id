"use client";

// libs
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
// types
import type { UserApp } from "@/types/Apps";
// components
import SearchInput from "@/components/SearchInput";
import CustomButton from "@/components/CustomButton";
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from "@/components/ui/popover";
import ResultList from "./mains/ResultList";
// ghosts
import ActiveIndexResetEffect from "./ghosts/ActiveIndexResetEffect";
import SearchResultAnnouncer from "./ghosts/SearchResultAnnouncer";
// hooks
import { useAnnounce, useDebouncedValue } from "@/hooks";
import useApps from "@/views/Apps/hooks/useApps";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const HeaderSearch = () => {
  const t = useTranslations("dashboard.header");
  const router = useRouter();
  const { announce } = useAnnounce();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounced = useDebouncedValue(query.trim(), 300);
  const hasQuery = debounced.length > 0;

  const { data, isLoading, isError } = useApps({
    search: debounced || undefined,
    limit: CONSTANTS.PAGINATION.HEADER_SEARCH_RESULT_LIMIT
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? items.length;

  const handleNavigateToApps = () => {
    router.push(
      `${CONSTANTS.ROUTES.APPS}?search=${encodeURIComponent(debounced)}`
    );
    setOpen(false);
  };

  const handleSelectApp = (app: UserApp) => {
    announce(t("announce.opened", { name: app.displayName }));
    window.open(app.homeUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        handleSelectApp(items[activeIndex]);
      } else if (hasQuery) {
        handleNavigateToApps();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showViewAll = hasQuery && total > items.length;

  return (
    <>
      <ActiveIndexResetEffect
        query={debounced}
        setActiveIndex={setActiveIndex}
      />
      <SearchResultAnnouncer
        open={open}
        isLoading={isLoading}
        itemsLength={items.length}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            placeholder={t("searchPlaceholder")}
            ariaLabel={t("searchLabel")}
            className="mx-4 hidden max-w-md flex-1 md:block"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            onFocus={handleOpen}
            onClick={handleOpen}
            onKeyDown={handleKeyDown}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const target = e.detail.originalEvent.target;
            if (
              inputRef.current &&
              target instanceof Node &&
              inputRef.current.contains(target)
            ) {
              e.preventDefault();
            }
          }}
        >
          <ResultList
            items={items}
            isLoading={isLoading}
            isError={isError}
            hasQuery={hasQuery}
            activeIndex={activeIndex}
            labels={{
              suggested: t("suggestedLabel"),
              results: t("resultsLabel"),
              noResults: t("noResults"),
              noResultsHint: t("noResultsHint"),
              open: t("openLabel")
            }}
            listId={listId}
            onSelectApp={handleSelectApp}
          />
          {showViewAll && (
            <CustomButton
              variant="ghost"
              size="sm"
              fullWidth
              className="mt-1"
              onClick={handleNavigateToApps}
            >
              {t("viewAll")}
            </CustomButton>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
};

export default HeaderSearch;
