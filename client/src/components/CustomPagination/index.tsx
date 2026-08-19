"use client";

// libs
import { useMemo, type MouseEvent } from "react";
// components
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
// others
import { buildPaginationPageNumbers } from "@/utils";

const CustomPagination = ({
  page,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  className
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  className?: string;
}) => {
  const pageNumbers = useMemo(
    () => buildPaginationPageNumbers(page, totalPages),
    [page, totalPages]
  );
  const disabledPrev = page <= 1;
  const disabledNext = page >= totalPages;
  const handleClick = (e: MouseEvent, target: number) => {
    e.preventDefault();
    if (target < 1 || target > totalPages || target === page) return;
    onPageChange(target);
  };
  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => handleClick(e, page - 1)}
            aria-disabled={disabledPrev}
            tabIndex={disabledPrev ? -1 : 0}
            className={
              disabledPrev ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
        {showPageNumbers &&
          pageNumbers.map((num, idx) =>
            num === "dots" ? (
              <PaginationItem key={`dots-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={num}>
                <PaginationLink
                  href="#"
                  isActive={num === page}
                  onClick={(e) => handleClick(e, num)}
                >
                  {num}
                </PaginationLink>
              </PaginationItem>
            )
          )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => handleClick(e, page + 1)}
            aria-disabled={disabledNext}
            tabIndex={disabledNext ? -1 : 0}
            className={
              disabledNext ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default CustomPagination;
