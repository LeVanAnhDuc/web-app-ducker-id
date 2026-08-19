"use client";

// libs
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { AuthenticationRole } from "@/types/User";
// components
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import CustomButton from "@/components/CustomButton";
import CustomSelectTrigger from "@/components/CustomSelectTrigger";
// others
import CONSTANTS from "@/constants";

const { AUTHENTICATION_ROLES, LIST } = CONSTANTS;

const UserRoleFilter = ({
  role,
  onChange
}: {
  role: AuthenticationRole | null;
  onChange: (role: AuthenticationRole | null) => void;
}) => {
  const t = useTranslations("adminEntitlements.picker");
  const isActive = role !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <CustomButton
          type="button"
          variant="outline"
          iconLeft={<SlidersHorizontal className="size-4" />}
        >
          {t("filtersLabel")}
          {isActive && (
            <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
              1
            </span>
          )}
        </CustomButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">{t("role.label")}</Label>
          <Select
            value={role ?? LIST.ALL_VALUE}
            onValueChange={(value) =>
              onChange(
                value === LIST.ALL_VALUE ? null : (value as AuthenticationRole)
              )
            }
          >
            <CustomSelectTrigger>
              <SelectValue />
            </CustomSelectTrigger>
            <SelectContent>
              <SelectItem value={LIST.ALL_VALUE}>{t("role.all")}</SelectItem>
              <SelectItem value={AUTHENTICATION_ROLES.ADMIN}>
                {t("role.admin")}
              </SelectItem>
              <SelectItem value={AUTHENTICATION_ROLES.USER}>
                {t("role.user")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserRoleFilter;
