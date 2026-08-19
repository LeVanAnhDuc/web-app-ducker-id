// types
import type { CustomBreadcrumbItem } from "@/types/CustomBreadcrumb";
import type { ContactAdminMessages, LeafKeyOf } from "@/types/libs";
// others
import CONSTANTS from "@/constants";

export const buildAdminContactDetailBreadcrumb = (
  id: string,
  t: (key: LeafKeyOf<ContactAdminMessages>) => string
): readonly CustomBreadcrumbItem[] => [
  {
    key: "list",
    label: t("admin.detail.breadcrumb.list"),
    href: CONSTANTS.ROUTES.ADMIN_CONTACT
  },
  { key: "current", label: id }
];
