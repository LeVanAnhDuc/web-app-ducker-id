"use client";

// types
import type {
  LoginHistoryDeviceType,
  LoginHistoryMethod,
  LoginHistoryStats
} from "@/types/LoginHistory";
import type { MethodSlice } from "../../components/MethodDonut";
import type { CountBarRow } from "../../components/CountBarList";
// libs
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MethodDonut from "../../components/MethodDonut";
import CountBarList from "../../components/CountBarList";
// dataSources
import { loginHistoryByDevice } from "@/dataSources/Home";

/**
 * Both halves come from facets the stats endpoint already returned before this
 * feature existed — the page was simply throwing them away.
 */
const BreakdownSection = ({
  stats,
  isLoading
}: {
  stats?: LoginHistoryStats;
  isLoading: boolean;
}) => {
  const tMethods = useTranslations("home.methods");
  const tDevices = useTranslations("home.devices");
  const tMethod = useTranslations("loginHistory.method");
  const tDevice = useTranslations("loginHistory.deviceType");

  const days = stats?.range.days ?? 0;

  const slices: MethodSlice[] = Object.entries(stats?.byMethod ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([method, count]) => ({
      method: method as LoginHistoryMethod,
      label: tMethod(method as LoginHistoryMethod),
      count
    }));

  const devices: CountBarRow[] = Object.entries(stats?.byDevice ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([device, count]) => ({
      key: device,
      label: tDevice(device as LoginHistoryDeviceType),
      count,
      href: loginHistoryByDevice(device)
    }));

  const panel = (
    title: string,
    subtitle: string,
    labelledBy: string,
    body: React.ReactNode
  ) => (
    <Card className="rounded-2xl border p-6" aria-labelledby={labelledBy}>
      <div className="mb-4 flex flex-col gap-0.5">
        <SectionHeading id={labelledBy}>{title}</SectionHeading>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      {body}
    </Card>
  );

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {panel(
        tMethods("title"),
        tMethods("subtitle", { days }),
        "home-methods-title",
        slices.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {tMethods("empty")}
          </p>
        ) : (
          <MethodDonut slices={slices} total={stats.total} />
        )
      )}
      {panel(
        tDevices("title"),
        tDevices("subtitle", { days }),
        "home-devices-title",
        devices.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {tDevices("empty")}
          </p>
        ) : (
          <CountBarList
            rows={devices}
            caption={tDevices("tableCaption")}
            labelColumn={tDevices("deviceColumn")}
            countColumn={tMethods("countColumn")}
          />
        )
      )}
    </div>
  );
};

export default BreakdownSection;
