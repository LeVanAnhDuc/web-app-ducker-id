"use client";

// libs
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
// components
import {
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
// hooks
import { useAnnounce } from "@/hooks";
// others
import { cn } from "@/libs/utils";

const ThemeSubmenu = () => {
  const t = useTranslations("common.userMenu");
  const { theme, setTheme } = useTheme();
  const { announce } = useAnnounce();

  const options = [
    { value: "light", icon: Sun, label: t("themeLight") },
    { value: "dark", icon: Moon, label: t("themeDark") },
    { value: "system", icon: Monitor, label: t("themeSystem") }
  ];

  const announceKey: Record<
    string,
    "switchedToLight" | "switchedToDark" | "switchedToSystem"
  > = {
    light: "switchedToLight",
    dark: "switchedToDark",
    system: "switchedToSystem"
  };

  const handleValueChange = (next: string) => {
    setTheme(next);
    announce(t(announceKey[next]));
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer gap-3 px-3 py-2">
        <SunMoon className="size-4" aria-hidden="true" />
        <span className="flex-1 truncate">{t("theme")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          aria-label={t("themeSubmenuLabel")}
          className="min-w-[180px]"
        >
          <DropdownMenuPrimitive.RadioGroup
            value={theme}
            onValueChange={handleValueChange}
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <DropdownMenuPrimitive.RadioItem
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm outline-hidden select-none",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-4 items-center justify-center"
                  >
                    {isActive ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </DropdownMenuPrimitive.RadioItem>
              );
            })}
          </DropdownMenuPrimitive.RadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

export default ThemeSubmenu;
