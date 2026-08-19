"use client";

// libs
import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";

const DangerZoneCard = () => {
  const t = useTranslations("account.dangerZone");
  const items: { title: string; description: string; action: ReactNode }[] = [
    {
      title: t("delete.title"),
      description: t("delete.description"),
      action: (
        <CustomButton variant="destructive">{t("delete.button")}</CustomButton>
      )
    }
  ];

  return (
    <Card className="border-destructive/40" aria-labelledby="danger-zone-title">
      <CardHeader className="border-destructive/30 border-b">
        <div className="flex items-center gap-2">
          <TriangleAlert
            className="text-destructive size-4"
            aria-hidden="true"
          />
          <h3
            id="danger-zone-title"
            className="text-destructive text-base leading-none font-semibold"
          >
            {t("title")}
          </h3>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">
                {item.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {item.description}
              </p>
            </div>
            {item.action}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DangerZoneCard;
