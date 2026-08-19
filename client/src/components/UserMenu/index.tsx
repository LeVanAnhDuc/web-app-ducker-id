"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import CustomButton from "../CustomButton";
import SupportDialog from "../SupportDialog";
import AvatarUser from "./components/AvatarUser";
import UserInfoHeader from "./mains/UserInfoHeader";
import AdminEntryItem from "./mains/AdminEntryItem";
import UtilityMenuItems from "./mains/UtilityMenuItems";
import SignOutItem from "./mains/SignoutItem";
// hooks
import useUserInfo from "@/hooks/useUserInfo";

const UserMenu = () => {
  const t = useTranslations("common.userMenu");
  const userInfo = useUserInfo();
  const isLoggedIn = userInfo !== null;
  const [supportOpen, setSupportOpen] = useState(false);

  const handleOpenSupport = () => setSupportOpen(true);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CustomButton
            variant="ghost"
            aria-label={t("trigger")}
            className="size-9 rounded-full p-0"
          >
            <AvatarUser
              src={userInfo?.avatar}
              fallback={userInfo?.initials ?? "?"}
            />
          </CustomButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-60 rounded-xl p-1"
          align="end"
          sideOffset={8}
        >
          {isLoggedIn ? (
            <>
              <UserInfoHeader
                fullName={userInfo.fullName}
                email={userInfo.email}
                avatar={userInfo.avatar}
                initials={userInfo.initials}
              />
              <AdminEntryItem />
              <DropdownMenuSeparator />
              <UtilityMenuItems onOpenSupport={handleOpenSupport} />
              <DropdownMenuSeparator />
              <SignOutItem />
            </>
          ) : (
            <UtilityMenuItems onOpenSupport={handleOpenSupport} />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </>
  );
};

export default UserMenu;
