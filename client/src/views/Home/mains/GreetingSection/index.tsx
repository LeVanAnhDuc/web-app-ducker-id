"use client";

// libs
import {
  Compass,
  Calendar,
  Timer,
  Zap,
  LayoutGrid,
  Trophy
} from "lucide-react";
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import HeroTitle from "@/components/HeroTitle";
import { Card } from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";
import StatCard from "../../components/StatCard";
// others
import useHomeApps from "../../hooks/useHomeApps";

const WEEKLY_DATA = [
  { day: "M", value: 40 },
  { day: "T", value: 65 },
  { day: "W", value: 30, active: true },
  { day: "T", value: 80 },
  { day: "F", value: 50 },
  { day: "S", value: 20 },
  { day: "S", value: 10 }
];

const MAX_BAR = 80;

const GreetingSection = () => {
  const t = useTranslations("home");
  const { data } = useHomeApps();
  const totalApps = data?.meta.total ?? 0;
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? t("greeting.morning")
      : hour < 18
        ? t("greeting.afternoon")
        : t("greeting.evening");

  return (
    <div className="flex flex-col gap-5">
      <Card className="bg-card flex flex-row items-center justify-between gap-6 rounded-2xl border p-8 md:p-10">
        <div className="flex flex-col gap-3">
          <HeroTitle>{greeting}, Anh Duc</HeroTitle>
          <p className="text-muted-foreground text-sm font-medium">
            {t("greeting.date")}
          </p>
          <p className="text-foreground/70 max-w-xl text-base">
            {t("greeting.subtitle", { count: 3 })}
          </p>
        </div>
        <div
          className="bg-muted hidden size-32 shrink-0 items-center justify-center rounded-3xl lg:flex xl:size-40"
          aria-hidden="true"
        >
          <LayoutGrid className="text-foreground size-14 xl:size-20" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Compass className="text-primary size-6" aria-hidden="true" />}
          iconBg="bg-primary/10"
          value={String(totalApps)}
          label={t("stats.totalApps")}
          badge={t("stats.allTime")}
          badgeBg="bg-primary/10"
          badgeText="text-primary"
        />
        <StatCard
          icon={<Calendar className="text-info size-6" aria-hidden="true" />}
          iconBg="bg-info/10"
          value="12"
          label={t("stats.appsThisMonth")}
          badge={t("stats.fromLastMonth")}
          badgeBg="bg-info/10"
          badgeText="text-info"
        />
        <StatCard
          icon={<Timer className="text-success size-6" aria-hidden="true" />}
          iconBg="bg-success/10"
          value="38 hrs"
          label={t("stats.timeSaved")}
          badge={t("stats.hoursThisMonth")}
          badgeBg="bg-success/10"
          badgeText="text-success"
        />
        <StatCard
          icon={
            <Zap
              className="text-warning-foreground size-6"
              aria-hidden="true"
            />
          }
          iconBg="bg-warning/20"
          value="14 days"
          label={t("stats.currentStreak")}
          badge={t("stats.personalBest")}
          badgeBg="bg-warning/20"
          badgeText="text-warning-foreground"
        />
      </div>
      <Card
        className="rounded-2xl border p-7"
        aria-labelledby="weekly-activity-title"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <SectionHeading id="weekly-activity-title">
              {t("weeklyActivity.title")}
            </SectionHeading>
            <p className="text-muted-foreground text-sm">
              {t("weeklyActivity.subtitle")}
            </p>
          </div>
          <div className="bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-2">
            <div className="bg-primary size-2 rounded-sm" aria-hidden="true" />
            <span className="text-muted-foreground text-xs">
              {t("weeklyActivity.legend")}
            </span>
          </div>
        </div>
        <ul className="flex items-end gap-3">
          {WEEKLY_DATA.map((d, i) => (
            <li
              key={i}
              className="flex flex-1 flex-col items-center gap-1.5"
              aria-label={`${d.day}: ${d.value} opens`}
            >
              <div
                className="flex w-full flex-col items-center justify-end"
                style={{ height: 120 }}
                aria-hidden="true"
              >
                <div
                  className={
                    d.active
                      ? "bg-primary w-full rounded-lg"
                      : "bg-primary/15 w-full rounded-lg"
                  }
                  style={{ height: `${(d.value / MAX_BAR) * 120}px` }}
                />
              </div>
              <span
                className="text-muted-foreground text-xs font-medium"
                aria-hidden="true"
              >
                {d.day}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border-warning/50 bg-card flex items-center justify-between gap-4 rounded-2xl border p-4">
        <div className="flex items-center gap-3.5">
          <div
            className="bg-warning/25 flex size-11 items-center justify-center rounded-xl"
            aria-hidden="true"
          >
            <Zap className="text-warning-foreground size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-warning-foreground text-sm font-bold">
              {t("achievement.title")}
            </p>
            <p className="text-warning-foreground/80 text-xs">
              {t("achievement.subtitle")}
            </p>
          </div>
        </div>
        <CustomButton
          size="sm"
          className="shrink-0"
          iconLeft={<Trophy className="size-3.5" aria-hidden="true" />}
        >
          {t("achievement.cta")}
        </CustomButton>
      </Card>
    </div>
  );
};

export default GreetingSection;
