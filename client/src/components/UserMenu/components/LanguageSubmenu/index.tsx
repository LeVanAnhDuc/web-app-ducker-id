"use client";

// libs
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, Globe } from "lucide-react";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
// types
import type { Locale } from "@/types/I18n";
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
import { localeNames } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/libs/utils";

const LanguageSubmenu = () => {
  const t = useTranslations("common.userMenu");
  const tAnnounce = useTranslations("common.announce");
  const { announce } = useAnnounce();
  const localeActive = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const handleValueChange = (next: string) => {
    if (next === localeActive || !hasLocale(routing.locales, next) || pending)
      return;

    const newLocale = next as Locale;
    announce(
      tAnnounce("languageChanged", { language: localeNames[newLocale] })
    );

    const search = searchParams.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    startTransition(() => {
      router.replace(fullPath, { locale: newLocale });
    });
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer gap-3 px-3 py-2">
        <Globe className="size-4" aria-hidden="true" />
        <span className="flex-1 truncate">{t("language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          aria-label={t("languageSubmenuLabel")}
          className="min-w-[180px]"
        >
          <DropdownMenuPrimitive.RadioGroup
            value={localeActive}
            onValueChange={handleValueChange}
          >
            {routing.locales.map((locale) => {
              const isActive = locale === localeActive;
              return (
                <DropdownMenuPrimitive.RadioItem
                  key={locale}
                  value={locale}
                  disabled={pending}
                  className={cn(
                    "focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm outline-hidden select-none",
                    isActive && "bg-accent text-accent-foreground",
                    pending && "pointer-events-none opacity-60"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-4 items-center justify-center"
                  >
                    {isActive ? <Check className="size-4" /> : null}
                  </span>
                  <span className="flex-1 truncate">{localeNames[locale]}</span>
                </DropdownMenuPrimitive.RadioItem>
              );
            })}
          </DropdownMenuPrimitive.RadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

export default LanguageSubmenu;
