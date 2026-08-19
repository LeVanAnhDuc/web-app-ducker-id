// types
import type { CustomBreadcrumbItem } from "@/types/CustomBreadcrumb";
import type { LeafKeyOf, LoginHistoryMessages } from "@/types/libs";
// others
import CONSTANTS from "@/constants";

export const buildAdminLoginHistoryDetailBreadcrumb = (
  t: (key: LeafKeyOf<LoginHistoryMessages>) => string
): readonly CustomBreadcrumbItem[] => [
  {
    key: "list",
    label: t("admin.detail.breadcrumb.list"),
    href: CONSTANTS.ROUTES.ADMIN_LOGIN_HISTORY
  },
  { key: "current", label: t("admin.detail.breadcrumb.current") }
];
