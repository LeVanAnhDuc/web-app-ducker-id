"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { AuthenticationRole } from "@/types/User";
// components
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from "@/components/ui/popover";
import SearchInput from "@/components/SearchInput";
import UserRoleFilter from "../UserRoleFilter";
import UserResultsList from "../UserResultsList";
// ghosts
import PickerResultsAnnouncer from "../../ghosts/PickerResultsAnnouncer";
// hooks
import { useDebouncedValue } from "@/hooks";
import useAdminUsersSearch from "../../hooks/useAdminUsersSearch";

const UserMultiSelect = ({
  selectedUsers,
  onToggle,
  disabled = false
}: {
  selectedUsers: AdminUser[];
  onToggle: (user: AdminUser) => void;
  disabled?: boolean;
}) => {
  const t = useTranslations("adminEntitlements.picker");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AuthenticationRole | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const debounced = useDebouncedValue(search, 300);
  const isOpen = isFocused && !disabled;

  const { data, isFetching } = useAdminUsersSearch(
    debounced.trim(),
    role,
    isOpen
  );
  const users = data?.items ?? [];
  const total = data?.meta.total ?? 0;
  const selectedIds = selectedUsers.map((user) => user._id);

  return (
    <Popover open={isOpen} onOpenChange={setIsFocused}>
      <div className="flex items-center gap-3">
        <PopoverAnchor asChild>
          <div className="flex-1">
            <SearchInput
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              ariaLabel={t("searchPlaceholder")}
              value={search}
              placeholder={t("searchPlaceholder")}
              disabled={disabled}
              onChange={setSearch}
              onFocus={() => setIsFocused(true)}
            />
          </div>
        </PopoverAnchor>
        <UserRoleFilter role={role} onChange={setRole} />
      </div>
      <PopoverContent
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-2"
      >
        <UserResultsList
          users={users}
          total={total}
          isLoading={isFetching}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      </PopoverContent>
      <PickerResultsAnnouncer
        count={users.length}
        isOpen={isOpen}
        isFetching={isFetching}
      />
    </Popover>
  );
};

export default UserMultiSelect;
