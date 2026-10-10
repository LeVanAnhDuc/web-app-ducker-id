// types
import type {
  AdminCategory,
  CategoryMoveDirection
} from "@/types/AdminCategories";
import type { CategoryName } from "@/types/Apps";
import type { CustomTableColumn } from "@/types/CustomTable";
import type { AdminCategoriesMessages, LeafKeyOf } from "@/types/libs";
// components
import MoveButtons from "@/views/AdminCategories/components/MoveButtons";
// others
import { COLUMN_BREAKPOINT } from "@/constants/list";

/**
 * The name cell shows the current locale's name first and the other
 * language underneath, so an admin sees both without opening the sheet.
 */
export const buildAdminCategoriesColumns = ({
  tTable,
  localize,
  otherLanguage,
  rows,
  moving,
  onMove
}: {
  tTable: (key: LeafKeyOf<AdminCategoriesMessages["table"]>) => string;
  localize: (name: CategoryName) => string;
  otherLanguage: (name: CategoryName) => string;
  rows: AdminCategory[];
  moving: boolean;
  onMove: (category: AdminCategory, direction: CategoryMoveDirection) => void;
}): CustomTableColumn<AdminCategory>[] => {
  const lastIndex = rows.length - 1;
  const indexOf = new Map(rows.map((row, index) => [row._id, index]));

  return [
    {
      id: "order",
      header: tTable("order"),
      width: "7rem",
      cell: (category) => {
        const index = indexOf.get(category._id) ?? 0;
        return (
          <MoveButtons
            id={category._id}
            name={localize(category.name)}
            isFirst={index === 0}
            isLast={index === lastIndex}
            busy={moving}
            onMove={(direction) => onMove(category, direction)}
          />
        );
      }
    },
    {
      id: "name",
      header: tTable("name"),
      cell: (category) => (
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground truncate font-medium">
            {localize(category.name)}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {otherLanguage(category.name)}
          </span>
        </div>
      )
    },
    {
      id: "slug",
      header: tTable("slug"),
      hideBelow: COLUMN_BREAKPOINT.SM,
      cell: (category) => (
        <span className="block max-w-[16rem] truncate">{category.slug}</span>
      ),
      cellClassName: "text-muted-foreground font-mono text-xs"
    },
    {
      id: "apps",
      header: tTable("apps"),
      align: "right",
      width: "6rem",
      cell: (category) => category.appCount,
      cellClassName: "tabular-nums"
    }
  ];
};
