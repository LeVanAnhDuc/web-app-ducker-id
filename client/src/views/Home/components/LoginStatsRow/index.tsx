"use client";
// libs
import { Activity, ArrowRight, CircleCheck, CircleX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import CustomButton from "@/components/CustomButton";
import { Skeleton } from "@/components/ui/skeleton";
import LoginStatCard from "../LoginStatCard";
// ghosts
import LoginStatsAnnouncer from "../../ghosts/LoginStatsAnnouncer";
// requests
import { getMyLoginHistoryStats } from "@/requests/loginHistory";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

const LoginStatsRow = () => {
  const t = useTranslations("home.loginStats");
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.LOGIN_HISTORY, "stats"],
    queryFn: getMyLoginHistoryStats
  });
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="login-stats-title"
    >
      <LoginStatsAnnouncer isLoading={isLoading} total={data?.total} />
      <div className="flex items-center justify-between">
        <SectionHeading id="login-stats-title">{t("title")}</SectionHeading>
        <CustomButton
          size="sm"
          variant="ghost"
          onClick={() => router.push(ROUTES.LOGIN_HISTORY)}
          iconRight={<ArrowRight className="size-3.5" aria-hidden="true" />}
        >
          {t("viewHistory")}
        </CustomButton>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`stats-skeleton-${i}`} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoginStatCard
            icon={Activity}
            label={t("totalLogins")}
            value={data?.total ?? 0}
            tone="neutral"
          />
          <LoginStatCard
            icon={CircleCheck}
            label={t("successful")}
            value={data?.successful ?? 0}
            tone="success"
          />
          <LoginStatCard
            icon={CircleX}
            label={t("failed")}
            value={data?.failed ?? 0}
            tone="danger"
          />
        </div>
      )}
    </section>
  );
};

export default LoginStatsRow;
