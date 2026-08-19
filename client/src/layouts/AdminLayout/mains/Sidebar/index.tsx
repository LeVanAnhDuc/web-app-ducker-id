"use client";

// libs
import { useTranslations } from "next-intl";
// components
import { CustomSidebarCollapseToggle } from "@/components/CustomSidebar";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import BackToDashboardLink from "../../components/BackToDashboardLink";
// hooks
import { useAnnounce } from "@/hooks";
// dataSources
import { ADMIN_NAV_GROUPS } from "@/dataSources/AdminSidebar";
// others
import { Link, usePathname } from "@/i18n/navigation";

const Sidebar = ({
  collapseToggleAriaLabel
}: {
  collapseToggleAriaLabel: string;
}) => {
  const tNav = useTranslations("admin.sidebar.nav");
  const tGroups = useTranslations("admin.sidebar.groups");
  const tAnnounce = useTranslations("common.announce");
  const { announce } = useAnnounce();
  const pathname = usePathname();

  const handleCollapseToggle = (collapsed: boolean) => {
    announce(tAnnounce(collapsed ? "sidebarCollapsed" : "sidebarExpanded"));
  };

  return (
    <UISidebar
      collapsible="icon"
      className="border-border [&_[data-slot=sidebar-inner]]:bg-card top-16! h-[calc(100svh-4rem)]!"
    >
      <CustomSidebarCollapseToggle
        aria-label={collapseToggleAriaLabel}
        onToggle={handleCollapseToggle}
      />
      <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-0">
        {ADMIN_NAV_GROUPS.map((group) => {
          const groupLabel = tGroups(group.key);
          return (
            <SidebarGroup key={group.key} className="p-0">
              <SidebarGroupLabel className="text-muted-foreground mt-5 mb-2 h-auto px-2 text-xs font-semibold tracking-[0.12em] uppercase">
                {groupLabel}
              </SidebarGroupLabel>
              <SidebarMenu
                className="gap-1 group-data-[collapsible=icon]:items-center"
                aria-label={groupLabel}
              >
                {group.items.map((item) => {
                  const label = tNav(item.key);
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className="h-10 gap-3 px-3 text-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&>span:last-child]:hidden"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-border border-t px-3 py-3 group-data-[collapsible=icon]:px-0">
        <BackToDashboardLink />
      </SidebarFooter>
    </UISidebar>
  );
};

export default Sidebar;
