"use client";

// libs
import { KeyRound, Lock, LogOut, MoreHorizontal, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import CustomButton from "@/components/CustomButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const UserRowActions = ({
  user,
  onResetPassword,
  onLockToggle,
  onForceLogout
}: {
  user: AdminUser;
  onResetPassword: (user: AdminUser) => void;
  onLockToggle: (user: AdminUser) => void;
  onForceLogout: (user: AdminUser) => void;
}) => {
  const t = useTranslations("adminUsers.actions");
  const tTable = useTranslations("adminUsers.table");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CustomButton
          variant="ghost"
          size="icon-sm"
          aria-label={tTable("rowMenuLabel")}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </CustomButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => onResetPassword(user)}
        >
          <KeyRound className="size-4" aria-hidden="true" />
          <span>{t("resetPassword")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => onLockToggle(user)}
        >
          {user.isActive ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <Unlock className="size-4" aria-hidden="true" />
          )}
          <span>{user.isActive ? t("lock") : t("unlock")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onSelect={() => onForceLogout(user)}
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span>{t("forceLogout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserRowActions;
