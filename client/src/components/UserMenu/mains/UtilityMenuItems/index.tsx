"use client";

// libs
import { Headphones, Keyboard, LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import UserMenuItem from "../../components/UserMenuItem";
import ThemeSubmenu from "../../components/ThemeSubmenu";
import LanguageSubmenu from "../../components/LanguageSubmenu";

const UtilityMenuItems = ({
  onOpenSupport
}: {
  onOpenSupport?: () => void;
}) => {
  const t = useTranslations("common.userMenu");
  return (
    <>
      <ThemeSubmenu />
      <LanguageSubmenu />
      <UserMenuItem
        icon={Keyboard}
        label={t("keyboardShortcuts")}
        shortcut={t("keyboardShortcutsHint")}
      />
      <UserMenuItem icon={LifeBuoy} label={t("helpCenter")} />
      <UserMenuItem
        icon={Headphones}
        label={t("support")}
        onSelect={onOpenSupport}
      />
    </>
  );
};

export default UtilityMenuItems;
