"use client";

// libs
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
// types
import type { ChartConfig } from "@/components/ui/chart";
import type { LoginStatsDay } from "@/types/LoginHistory";
// components
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import ChartDataTable from "../ChartDataTable";
// dataSources
import { loginHistoryByDay } from "@/dataSources/Home";
// others
import { useRouter } from "@/i18n/navigation";
import { formatDayLabel, formatDayLong, tickInterval } from "../../utils";

/**
 * Success and failure already mean something everywhere else in the product,
 * so they keep the semantic tokens instead of taking two slots off the
 * categorical ramp. An arbitrary palette here would quietly contradict the
 * red "Failed" badge in the login history table.
 */
const useChartConfig = (): ChartConfig => {
  const t = useTranslations("home.activity");
  return {
    successful: { label: t("successful"), color: "var(--primary)" },
    failed: { label: t("failed"), color: "var(--destructive)" }
  };
};

const ActivityChart = ({ days }: { days: LoginStatsDay[] }) => {
  const t = useTranslations("home.activity");
  const locale = useLocale();
  const router = useRouter();
  const config = useChartConfig();

  const total = days.reduce((sum, day) => sum + day.total, 0);
  const successful = days.reduce((sum, day) => sum + day.successful, 0);
  const failed = days.reduce((sum, day) => sum + day.failed, 0);

  return (
    <>
      <ChartContainer
        config={config}
        className="h-[220px] w-full"
        role="img"
        aria-label={t("chartLabel", {
          days: days.length,
          total,
          successful,
          failed
        })}
      >
        <BarChart
          accessibilityLayer
          data={days}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
          // The whole column is the target, not just the drawn bar: a day with
          // one sign-in is a two-pixel sliver otherwise.
          onClick={(state) => {
            const day = state?.activeLabel;
            if (day) router.push(loginHistoryByDay(day));
          }}
          className="cursor-pointer"
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={tickInterval(days.length)}
            tickFormatter={(day: string) => formatDayLabel(day, locale)}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(day) => formatDayLong(String(day), locale)}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {/* Without a cap, a week of data draws columns a hundred pixels
              wide — it reads as a bar for a category, not a day. */}
          <Bar
            dataKey="successful"
            stackId="a"
            fill="var(--color-successful)"
            maxBarSize={44}
          />
          <Bar
            dataKey="failed"
            stackId="a"
            fill="var(--color-failed)"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ChartContainer>
      <ChartDataTable
        caption={t("tableCaption")}
        headers={[t("dayColumn"), t("successful"), t("failed")]}
        rows={days.map((day) => ({
          key: day.date,
          cells: [formatDayLong(day.date, locale), day.successful, day.failed]
        }))}
      />
    </>
  );
};

export default ActivityChart;
