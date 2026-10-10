"use client";

// libs
import { LayoutGrid } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
// components
import HeroTitle from "@/components/HeroTitle";
import { Card } from "@/components/ui/card";
// hooks
import { useHasMounted, useUserInfo } from "@/hooks";

const MORNING_ENDS = 12;
const AFTERNOON_ENDS = 18;

const GreetingSection = ({ totalApps }: { totalApps: number }) => {
  const t = useTranslations("home.greeting");
  const locale = useLocale();
  const user = useUserInfo();
  // Both the greeting and the date read the clock, so they are rendered only
  // after mount — the server's hour is not the viewer's.
  const mounted = useHasMounted();

  const hour = new Date().getHours();
  const greeting =
    hour < MORNING_ENDS
      ? t("morning")
      : hour < AFTERNOON_ENDS
        ? t("afternoon")
        : t("evening");

  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <Card className="bg-card flex flex-row items-center justify-between gap-6 rounded-2xl border p-8 md:p-10">
      <div className="flex flex-col gap-3">
        <HeroTitle>
          {mounted ? `${greeting}, ${user?.fullName ?? ""}`.trim() : " "}
        </HeroTitle>
        <p className="text-muted-foreground text-sm font-medium">
          {mounted ? today : " "}
        </p>
        <p className="text-foreground/70 max-w-xl text-base">
          {totalApps > 0
            ? t("subtitle", { count: totalApps })
            : t("subtitleEmpty")}
        </p>
      </div>
      <div
        className="bg-muted hidden size-32 shrink-0 items-center justify-center rounded-3xl lg:flex xl:size-40"
        aria-hidden="true"
      >
        <LayoutGrid className="text-foreground size-14 xl:size-20" />
      </div>
    </Card>
  );
};

export default GreetingSection;
