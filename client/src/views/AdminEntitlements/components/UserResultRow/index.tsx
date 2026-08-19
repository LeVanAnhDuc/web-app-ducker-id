"use client";

// libs
import { Check, Plus } from "lucide-react";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import CustomButton from "@/components/CustomButton";

const UserResultRow = ({
  user,
  isSelected,
  onToggle
}: {
  user: AdminUser;
  isSelected: boolean;
  onToggle: () => void;
}) => (
  <CustomButton
    type="button"
    variant="ghost"
    role="option"
    aria-selected={isSelected}
    onClick={onToggle}
    className="hover:bg-accent group h-auto w-full justify-between gap-3 rounded-md p-2.5"
  >
    <span className="flex items-center gap-3">
      <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl text-base font-semibold">
        {user.fullName.charAt(0).toUpperCase()}
      </span>
      <span className="flex flex-col text-left">
        <span className="text-foreground text-sm font-semibold">
          {user.fullName}
        </span>
        <span className="text-muted-foreground text-xs">{user.email}</span>
      </span>
    </span>
    {isSelected ? (
      <Check className="text-primary size-[18px]" aria-hidden="true" />
    ) : (
      <Plus
        className="text-muted-foreground size-[18px] opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    )}
  </CustomButton>
);

export default UserResultRow;
