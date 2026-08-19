// libs
import type { ReactNode } from "react";
// types
import type { COLUMN_BREAKPOINT } from "@/constants/list";

export type ColumnAlign = "left" | "center" | "right";

export type ColumnBreakpoint =
  (typeof COLUMN_BREAKPOINT)[keyof typeof COLUMN_BREAKPOINT];

export interface CustomTableColumn<T> {
  id: string;
  header: ReactNode;
  align?: ColumnAlign;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  srOnlyHeader?: boolean;
  sortable?: boolean;
  width?: string;
  hideBelow?: ColumnBreakpoint;
}
