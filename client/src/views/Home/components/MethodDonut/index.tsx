"use client";

// libs
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart } from "recharts";
// types
import type { ChartConfig } from "@/components/ui/chart";
import type { LoginHistoryMethod } from "@/types/LoginHistory";
// components
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import ChartDataTable from "../ChartDataTable";
// dataSources
import { loginHistoryByMethod } from "@/dataSources/Home";
// others
import { Link } from "@/i18n/navigation";

/**
 * The categorical ramp in order of preference. `--chart-3` is skipped: it is
 * the weak slot in both themes. `--chart-2` is brass, the signature fill, so
 * it comes last — a fourth category is the only reason to spend it.
 */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-2)"
];

export interface MethodSlice {
  method: LoginHistoryMethod;
  label: string;
  count: number;
}

const MethodDonut = ({
  slices,
  total
}: {
  slices: MethodSlice[];
  total: number;
}) => {
  const t = useTranslations("home.methods");

  const config: ChartConfig = Object.fromEntries(
    slices.map((slice, index) => [
      slice.method,
      {
        label: slice.label,
        color: SERIES_COLORS[index % SERIES_COLORS.length]
      }
    ])
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ChartContainer
        config={config}
        className="mx-auto aspect-square h-[150px]"
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="method" />} />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="method"
            innerRadius={44}
            outerRadius={70}
            // A 1px separator in the card colour carries the boundary between
            // slices, so neighbouring fills never have to do it alone.
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.method}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="flex min-w-0 flex-1 flex-col gap-1">
        {slices.map((slice, index) => (
          <li key={slice.method}>
            <Link
              href={loginHistoryByMethod(slice.method)}
              className="hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{
                    background: SERIES_COLORS[index % SERIES_COLORS.length]
                  }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm">{slice.label}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {slice.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ChartDataTable
        caption={t("tableCaption")}
        headers={[t("methodColumn"), t("countColumn")]}
        rows={[
          ...slices.map((slice) => ({
            key: slice.method,
            cells: [slice.label, slice.count]
          })),
          { key: "__total", cells: [t("countColumn"), total] }
        ]}
      />
    </div>
  );
};

export default MethodDonut;
