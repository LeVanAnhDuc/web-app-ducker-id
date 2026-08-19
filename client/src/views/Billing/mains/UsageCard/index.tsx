// libs
import { getTranslations } from "next-intl/server";
// components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import CardSectionTitle from "@/components/CardSectionTitle";
import UsageStat from "../../components/UsageStat";
// others
import { USAGE_STATS_MOCK } from "@/mocks/Billing";

const UsageCard = async () => {
  const t = await getTranslations("billing.usage");
  return (
    <Card aria-labelledby="usage-title">
      <CardHeader className="border-b">
        <CardSectionTitle id="usage-title">{t("title")}</CardSectionTitle>
        <CardDescription>
          {t("subtitle", { period: "May 2026", resetDate: "June 1" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {USAGE_STATS_MOCK.map((stat) => (
          <UsageStat
            key={stat.key}
            label={t(`stats.${stat.key}`)}
            value={stat.value}
            ratio={stat.ratio}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default UsageCard;
