"use client";

// libs
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
// hooks
import { useAnnounce } from "@/hooks";
// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const BackToDashboardLink = () => {
  const t = useTranslations("admin.sidebar");
  const tAnnounce = useTranslations("admin.announce");
  const { announce } = useAnnounce();
  const label = t("backToDashboard");

  const handleClick = () => {
    announce(tAnnounce("exitedAdmin"));
  };

  return (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={label}
          className="text-muted-foreground hover:text-foreground h-10 gap-3 px-3 text-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&>span:last-child]:hidden"
        >
          <Link href={CONSTANTS.ROUTES.HOME} onClick={handleClick}>
            <LogOut aria-hidden="true" className="rotate-180" />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default BackToDashboardLink;
