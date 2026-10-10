"use client";

// libs
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
// types
import type {
  AdminCategory,
  CategoryDeleteImpact,
  ReassignState
} from "@/types/AdminCategories";
// components
import ReassignPanel from "../ReassignPanel";

/** What the dialog says for each impact shape (mock 3a / 3b / 3c / 3d). */
const DeleteImpactBody = ({
  impact,
  targets,
  reassign,
  remainingId,
  onBulkChange,
  onOverrideChange
}: {
  impact: CategoryDeleteImpact;
  targets: AdminCategory[];
  reassign: ReassignState;
  remainingId: string;
  onBulkChange: (categoryId: string) => void;
  onOverrideChange: (appId: string, categoryId: string) => void;
}) => {
  const t = useTranslations("adminCategories.delete");
  const orphans = impact.orphaned;
  const keepOthers = impact.total - orphans.length;

  if (impact.total === 0) return <p>{t("noApps")}</p>;

  if (orphans.length === 0) {
    return (
      <p>
        {t("total", { count: impact.total })}{" "}
        {t("onlyRemoved", { count: impact.total })}
      </p>
    );
  }

  if (targets.length === 0) {
    return <p>{t("lastCategory", { count: orphans.length })}</p>;
  }

  const remaining = orphans.filter(
    (app) => !(reassign.overrides[app._id] ?? reassign.bulk)
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <p>{t("total", { count: impact.total })}</p>
      {keepOthers > 0 && (
        <p className="flex items-center gap-2">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {t("keepOthers", { count: keepOthers })}
        </p>
      )}
      <ReassignPanel
        orphans={orphans}
        targets={targets}
        bulk={reassign.bulk}
        overrides={reassign.overrides}
        onBulkChange={onBulkChange}
        onOverrideChange={onOverrideChange}
      />
      <p
        id={remainingId}
        aria-live="polite"
        className={remaining > 0 ? "text-foreground text-xs" : "text-xs"}
      >
        {remaining > 0 ? t("remaining", { count: remaining }) : t("complete")}
      </p>
    </div>
  );
};

export default DeleteImpactBody;
