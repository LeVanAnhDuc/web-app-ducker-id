"use client";

// libs
import { X } from "lucide-react";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import CustomButton from "@/components/CustomButton";

const UserChip = ({
  user,
  removeLabel,
  disabled = false,
  onRemove
}: {
  user: AdminUser;
  removeLabel: string;
  disabled?: boolean;
  onRemove: () => void;
}) => (
  <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md py-1 pr-1 pl-2 text-xs font-medium">
    <span className="bg-primary/15 grid size-5 place-items-center rounded-full text-[10px] font-semibold">
      {user.fullName.charAt(0).toUpperCase()}
    </span>
    {user.fullName}
    <CustomButton
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-primary hover:bg-primary/10 size-5"
      aria-label={removeLabel}
      disabled={disabled}
      onClick={onRemove}
    >
      <X className="size-3" aria-hidden="true" />
    </CustomButton>
  </span>
);

export default UserChip;
