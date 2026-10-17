"use client";

// libs
import { useRef } from "react";
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
  onResetPassword: (user: AdminUser, trigger: HTMLElement | null) => void;
  onLockToggle: (user: AdminUser, trigger: HTMLElement | null) => void;
  onForceLogout: (user: AdminUser, trigger: HTMLElement | null) => void;
}) => {
  const t = useTranslations("adminUsers.actions");
  const tTable = useTranslations("adminUsers.table");
  // The dialogs these items open have no DialogTrigger, so they return focus
  // to this button themselves (useReturnFocus).
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CustomButton
          ref={triggerRef}
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
          onSelect={() => onResetPassword(user, triggerRef.current)}
        >
          <KeyRound className="size-4" aria-hidden="true" />
          <span>{t("resetPassword")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => onLockToggle(user, triggerRef.current)}
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
          onSelect={() => onForceLogout(user, triggerRef.current)}
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span>{t("forceLogout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserRowActions;
