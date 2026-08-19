"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
// components
import {
  Table,
  TableBody,
  TableCaption,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import EntitlementAppHeader from "../EntitlementAppHeader";
import EntitlementUserRow from "../EntitlementUserRow";

const EntitlementMatrixTable = ({
  users,
  apps,
  isEditing,
  grantsByUser,
  onCheckAllToggle
}: {
  users: AdminUser[];
  apps: WebApp[];
  isEditing: boolean;
  grantsByUser: Record<string, string[]>;
  onCheckAllToggle: (
    user: AdminUser,
    eligibleAppIds: string[],
    nextGranted: boolean
  ) => void;
}) => {
  const t = useTranslations("adminEntitlements.matrix");

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table containerClassName="max-h-[32rem]">
        <TableCaption className="sr-only">{t("title")}</TableCaption>
        <TableHeader>
          <TableRow>
            <th
              scope="col"
              className="bg-card text-muted-foreground sticky top-0 left-0 z-20 border-r p-4 text-left align-middle text-xs font-medium text-nowrap"
            >
              {t("userColumn")}
            </th>
            {apps.map((app) => (
              <th
                key={app._id}
                scope="col"
                className="bg-card sticky top-0 z-10 min-w-24 p-2 align-middle"
              >
                <EntitlementAppHeader app={app} />
              </th>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <EntitlementUserRow
              key={user._id}
              user={user}
              apps={apps}
              isEditing={isEditing}
              grantedAppIds={grantsByUser[user._id] ?? []}
              onCheckAllToggle={onCheckAllToggle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EntitlementMatrixTable;
