// types
import type { ContactListItem, ContactStatus } from "@/types/ContactAdmin";
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef } from "@/types/List";
import type { ContactAdminMessages, LeafKeyOf } from "@/types/libs";
// components
import CustomBadge from "@/components/CustomBadge";
import FormatTime from "@/components/FormatTime";
import ShortId from "@/components/ShortId";
// others
import CONSTANTS from "@/constants";

export const NEXT_STEPS = [
  {
    key: "step2",
    bgClass: "bg-primary",
    textClass: "text-primary-foreground"
  },
  {
    key: "step3",
    bgClass: "bg-success",
    textClass: "text-success-foreground"
  }
] as const;

export const CONTACT_STATUS_VARIANT: Record<
  ContactStatus,
  "warning" | "info" | "success"
> = {
  new: "warning",
  processing: "info",
  resolved: "success"
};

export const buildAdminContactFilterDefs = (
  tStatus: (
    key: LeafKeyOf<ContactAdminMessages["admin"]["list"]["status"]>
  ) => string,
  labels: {
    status: string;
    email: string;
    dateRange: string;
    emailPh: string;
  }
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: labels.status,
    options: Object.values(CONSTANTS.CONTACT_STATUS).map((s) => ({
      value: s,
      label: tStatus(s)
    }))
  },
  {
    key: "email",
    type: "text",
    label: labels.email,
    placeholder: labels.emailPh
  },
  { key: "dateRange", type: "dateRange", label: labels.dateRange }
];

export const buildAdminContactColumns = (
  tTable: (
    key: LeafKeyOf<ContactAdminMessages["admin"]["list"]["table"]>
  ) => string,
  tStatus: (
    key: LeafKeyOf<ContactAdminMessages["admin"]["list"]["status"]>
  ) => string
): CustomTableColumn<ContactListItem>[] => [
  {
    id: "ticketNumber",
    header: tTable("ticketNumber"),
    cell: (item) => <ShortId value={item._id} />,
    cellClassName: "font-mono text-xs font-medium"
  },
  {
    id: "email",
    header: tTable("email"),
    cell: (item) => item.email ?? "—",
    cellClassName: "text-muted-foreground"
  },
  {
    id: "subject",
    header: tTable("subject"),
    cell: (item) => item.subject,
    cellClassName: "max-w-[200px] truncate"
  },
  {
    id: "status",
    header: tTable("status"),
    cell: (item) => (
      <CustomBadge
        variant={CONTACT_STATUS_VARIANT[item.status]}
        className="text-xs"
      >
        {tStatus(item.status)}
      </CustomBadge>
    )
  },
  {
    id: "createdAt",
    header: tTable("createdAt"),
    cell: (item) => <FormatTime value={item.createdAt} variant="dateLong" />,
    cellClassName: "text-muted-foreground text-xs"
  }
];
