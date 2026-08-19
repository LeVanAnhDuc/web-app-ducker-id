// types
import type { CustomBreadcrumbItem } from "@/types/CustomBreadcrumb";
import type { ContactAdminMessages, LeafKeyOf } from "@/types/libs";
// others
import CONSTANTS from "@/constants";

export const buildMyContactDetailBreadcrumb = (
  t: (key: LeafKeyOf<ContactAdminMessages>) => string
): readonly CustomBreadcrumbItem[] => [
  {
    key: "list",
    label: t("myContacts.detail.breadcrumb.list"),
    href: CONSTANTS.ROUTES.MY_CONTACTS
  },
  { key: "current", label: t("myContacts.detail.breadcrumb.current") }
];
