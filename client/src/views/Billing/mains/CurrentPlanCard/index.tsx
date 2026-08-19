// libs
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
// components
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import CardSectionTitle from "@/components/CardSectionTitle";
import CustomButton from "@/components/CustomButton";

const CurrentPlanCard = async () => {
  const t = await getTranslations("billing.currentPlan");
  const features = t.raw("features") as string[];

  return (
    <Card aria-labelledby="current-plan-title">
      <CardHeader className="border-b">
        <CardSectionTitle id="current-plan-title">
          {t("title")}
        </CardSectionTitle>
        <CardDescription>
          {t("renewsOn", { date: "June 1, 2026" })}
        </CardDescription>
        <CardAction>
          <Badge className="bg-primary text-primary-foreground rounded-full px-3 py-1">
            {t("badge")}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-foreground text-3xl font-bold">
              {t("price")}
            </span>
            <span className="text-muted-foreground text-sm">
              {t("perMonth")}
            </span>
          </div>
          <p className="text-foreground text-sm font-semibold">
            {t("planName")}
          </p>
          <ul className="mt-1 grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <Check className="text-success size-4" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CustomButton>{t("buttons.upgrade")}</CustomButton>
          <CustomButton variant="outline">{t("buttons.cancel")}</CustomButton>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentPlanCard;
