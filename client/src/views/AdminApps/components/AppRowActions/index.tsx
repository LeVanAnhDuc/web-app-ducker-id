"use client";

// libs
import { Pencil, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { WebApp } from "@/types/AdminApps";
// components
import CustomButton from "@/components/CustomButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
// others
import CONSTANTS from "@/constants";

const AppRowActions = ({
  app,
  onEdit,
  onHide,
  onUnhide
}: {
  app: WebApp;
  onEdit: (app: WebApp) => void;
  onHide: (app: WebApp) => void;
  onUnhide: (app: WebApp) => void;
}) => {
  const t = useTranslations("adminApps.actions");
  const isActive = app.status === CONSTANTS.APP_STATUS.ACTIVE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CustomButton
          variant="ghost"
          size="icon-sm"
          aria-label={t("rowMenuLabel")}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </CustomButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={() => onEdit(app)}
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span>{t("edit")}</span>
        </DropdownMenuItem>
        {isActive ? (
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2"
            onSelect={() => onHide(app)}
          >
            <EyeOff className="size-4" aria-hidden="true" />
            <span>{t("hide")}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onSelect={() => onUnhide(app)}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span>{t("unhide")}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppRowActions;
