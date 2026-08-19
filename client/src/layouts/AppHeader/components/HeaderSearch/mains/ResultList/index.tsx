// libs
import { Search } from "lucide-react";
// types
import type { UserApp } from "@/types/Apps";
// components
import { Skeleton } from "@/components/ui/skeleton";
import ResultRow from "../../components/ResultRow";

const ResultList = ({
  items,
  isLoading,
  isError,
  hasQuery,
  activeIndex,
  labels,
  listId,
  onSelectApp
}: {
  items: UserApp[];
  isLoading: boolean;
  isError: boolean;
  hasQuery: boolean;
  activeIndex: number;
  labels: {
    suggested: string;
    results: string;
    noResults: string;
    noResultsHint: string;
    open: string;
  };
  listId: string;
  onSelectApp: (app: UserApp) => void;
}) => {
  const isEmpty = !isLoading && (isError || items.length === 0);
  return (
    <div id={listId} role="listbox" className="flex flex-col gap-0.5">
      {isLoading &&
        Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2.5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      {isEmpty && (
        <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
          <Search className="text-muted-foreground size-6" aria-hidden="true" />
          <span className="text-foreground text-sm font-medium">
            {labels.noResults}
          </span>
          <span className="text-muted-foreground text-xs">
            {labels.noResultsHint}
          </span>
        </div>
      )}
      {!isLoading && !isEmpty && (
        <>
          <span className="text-muted-foreground px-3 py-2 text-xs font-medium">
            {hasQuery ? labels.results : labels.suggested}
          </span>
          {items.map((app, index) => (
            <ResultRow
              key={app._id}
              id={`${listId}-option-${index}`}
              app={app}
              openLabel={labels.open}
              isActive={index === activeIndex}
              onSelect={onSelectApp}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default ResultList;
