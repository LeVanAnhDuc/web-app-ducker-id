"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import UserResultRow from "../UserResultRow";
import UserResultsLoading from "../UserResultsLoading";
import UserResultsEmpty from "../UserResultsEmpty";

const UserResultsList = ({
  users,
  total,
  isLoading,
  selectedIds,
  onToggle
}: {
  users: AdminUser[];
  total: number;
  isLoading: boolean;
  selectedIds: string[];
  onToggle: (user: AdminUser) => void;
}) => {
  const t = useTranslations("adminEntitlements.picker");

  return (
    <div role="listbox" aria-label={t("results")}>
      <div className="text-muted-foreground px-3 py-2 text-xs font-medium">
        {t("results")}
      </div>
      {isLoading ? (
        <UserResultsLoading />
      ) : users.length === 0 ? (
        <UserResultsEmpty label={t("noResults")} />
      ) : (
        <>
          {users.map((user) => (
            <UserResultRow
              key={user._id}
              user={user}
              isSelected={selectedIds.includes(user._id)}
              onToggle={() => onToggle(user)}
            />
          ))}
          {total > users.length && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              {t("showing", { shown: users.length, total })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserResultsList;
