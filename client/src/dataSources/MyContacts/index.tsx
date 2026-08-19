// types
import type { MyContact } from "@/types/MyContacts";
import type { CustomTableColumn } from "@/types/CustomTable";
import type { ListFilterDef } from "@/types/List";
import type { ContactAdminMessages, LeafKeyOf } from "@/types/libs";
// components
import CustomBadge from "@/components/CustomBadge";
import FormatTime from "@/components/FormatTime";
import ShortId from "@/components/ShortId";
// dataSources
import { CONTACT_STATUS_VARIANT } from "@/dataSources/ContactAdmin";
// others
import CONSTANTS from "@/constants";

export const buildMyContactsFilterDefs = (
  tStatus: (
    key: LeafKeyOf<ContactAdminMessages["admin"]["list"]["status"]>
  ) => string,
  labels: { status: string }
): ListFilterDef[] => [
  {
    key: "status",
    type: "select",
    label: labels.status,
    options: Object.values(CONSTANTS.CONTACT_STATUS).map((s) => ({
      value: s,
      label: tStatus(s)
    }))
  }
];

export const buildMyContactsColumns = (
  tTable: (
    key: LeafKeyOf<ContactAdminMessages["myContacts"]["table"]>
  ) => string,
  tStatus: (
    key: LeafKeyOf<ContactAdminMessages["admin"]["list"]["status"]>
  ) => string,
  tPriority: (
    key: LeafKeyOf<ContactAdminMessages["myContacts"]["priority"]>
  ) => string
): CustomTableColumn<MyContact>[] => [
  {
    id: "ticketNumber",
    header: tTable("ticketNumber"),
    cell: (item) => <ShortId value={item._id} />,
    cellClassName: "font-mono text-xs font-medium"
  },
  {
    id: "subject",
    header: tTable("subject"),
    cell: (item) => item.subject,
    cellClassName: "max-w-[240px] truncate"
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
    id: "priority",
    header: tTable("priority"),
    cell: (item) => tPriority(item.priority),
    cellClassName: "text-muted-foreground text-xs"
  },
  {
    id: "createdAt",
    header: tTable("createdAt"),
    cell: (item) => <FormatTime value={item.createdAt} variant="dateLong" />,
    cellClassName: "text-muted-foreground text-xs"
  }
];
