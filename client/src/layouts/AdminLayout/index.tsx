"use client";

// libs
import { useTranslations } from "next-intl";
// components
import {
  SidebarInset,
  SidebarProvider,
  useSidebar
} from "@/components/ui/sidebar";
import Sidebar from "./mains/Sidebar";
import AppHeader from "../AppHeader";
// hooks
import { useAnnounce } from "@/hooks";

const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const tAnnounce = useTranslations("common.announce");
  const tSidebar = useTranslations("common.sidebar");
  const { announce } = useAnnounce();
  const { state, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleMobileMenuToggle = () => {
    const next = !openMobile;
    announce(tAnnounce(next ? "mobileMenuOpened" : "mobileMenuClosed"));
    setOpenMobile(next);
  };

  return (
    <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
      <AppHeader
        isMobileMenuOpen={openMobile}
        onMobileMenuToggle={handleMobileMenuToggle}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          collapseToggleAriaLabel={tSidebar(
            isCollapsed ? "expand" : "collapse"
          )}
        />
        <SidebarInset className="min-w-0 flex-1">
          <div
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 lg:p-8"
          >
            {children}
          </div>
        </SidebarInset>
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider defaultOpen>
    <AdminShell>{children}</AdminShell>
  </SidebarProvider>
);

export default AdminLayout;
