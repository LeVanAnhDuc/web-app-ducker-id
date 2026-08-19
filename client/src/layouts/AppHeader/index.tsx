"use client";

// libs
import { useState } from "react";
import { Bell, Menu, Search, Shield, X } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import UserMenu from "@/components/UserMenu";
import Logo from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import NotificationPanel from "./components/NotificationPanel";
import HeaderSearch from "./components/HeaderSearch";
// hooks
import { useAnnounce } from "@/hooks";
import useUnreadCount from "@/views/Notifications/hooks/useUnreadCount";
// others
import { usePathname } from "@/i18n/navigation";

const AppHeader = ({
  isMobileMenuOpen,
  onMobileMenuToggle
}: {
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}) => {
  const t = useTranslations("dashboard.header");
  const tAdmin = useTranslations("admin");
  const { announce } = useAnnounce();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  const handleNotifOpenChange = (open: boolean) => {
    setNotifOpen(open);
    if (open) announce(t("notificationsLabel"));
  };

  return (
    <header className="border-border bg-card/80 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <CustomButton
          variant="ghost"
          size="icon"
          aria-label={t("menuToggleLabel")}
          className="md:hidden"
          onClick={onMobileMenuToggle}
        >
          {isMobileMenuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </CustomButton>
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-foreground text-lg font-semibold">
            {t("appName")}
          </span>
        </div>
        {isAdminRoute && (
          <Badge
            variant="default"
            className="hidden h-6 gap-1 px-2 md:inline-flex"
          >
            <Shield className="size-3" aria-hidden="true" />
            <span>{tAdmin("modeBadge")}</span>
          </Badge>
        )}
      </div>
      <HeaderSearch />
      <div className="flex items-center gap-2">
        <CustomButton
          variant="ghost"
          size="icon"
          aria-label={t("searchLabel")}
          className="relative md:hidden"
        >
          <Search className="size-5" aria-hidden="true" />
        </CustomButton>
        <Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
          <PopoverTrigger asChild>
            <CustomButton
              variant="ghost"
              size="icon"
              aria-label={t("notificationsLabel")}
              className="relative"
            >
              <Bell className="size-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CustomButton>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <NotificationPanel onNavigate={() => setNotifOpen(false)} />
          </PopoverContent>
        </Popover>
        <UserMenu />
      </div>
    </header>
  );
};

export default AppHeader;
