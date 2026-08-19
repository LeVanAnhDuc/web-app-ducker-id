// libs
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
// components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
// dataSources
import { ADMIN_DASHBOARD_CARDS } from "@/dataSources/AdminDashboard";
// others
import { Link } from "@/i18n/navigation";

const OverviewGrid = async () => {
  const t = await getTranslations("adminDashboard");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_DASHBOARD_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className="hover:border-primary/40 transition-[border-color,box-shadow] hover:shadow-md"
          >
            <CardHeader>
              <div className="bg-secondary text-secondary-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <CardTitle>{t(`cards.${card.key}.title`)}</CardTitle>
              <CardDescription>
                {t(`cards.${card.key}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={card.href}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {t("openCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OverviewGrid;
