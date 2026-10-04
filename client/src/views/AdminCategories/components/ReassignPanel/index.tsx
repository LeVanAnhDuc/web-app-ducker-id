"use client";

// libs
import { useTranslations } from "next-intl";
import { CircleAlert } from "lucide-react";
// types
import type { AdminCategory, OrphanApp } from "@/types/AdminCategories";
// components
import CustomBadge from "@/components/CustomBadge";
import TargetSelect from "../TargetSelect";
// hooks
import { useLocalizedName } from "@/hooks";
// others
import { cn } from "@/libs/utils";

/**
 * Mock 3c: one shared target for every orphan, plus a select per app that
 * overrides it. An overridden row is marked "Set individually" and keeps its
 * choice when the shared target changes.
 */
const ReassignPanel = ({
  orphans,
  targets,
  bulk,
  overrides,
  onBulkChange,
  onOverrideChange
}: {
  orphans: OrphanApp[];
  targets: AdminCategory[];
  bulk: string;
  overrides: Record<string, string>;
  onBulkChange: (categoryId: string) => void;
  onOverrideChange: (appId: string, categoryId: string) => void;
}) => {
  const t = useTranslations("adminCategories.delete");
  const localize = useLocalizedName();
  const bulkName = targets.find((c) => c._id === bulk);
  const sharedOption = bulkName
    ? t("shared", { name: localize(bulkName.name) })
    : t("choose");
  const done = orphans.filter((app) => overrides[app._id] ?? bulk).length;

  return (
    <div
      className={cn(
        "rounded-lg border",
        done < orphans.length ? "border-keyline" : "border-border"
      )}
    >
      <div className="flex flex-col gap-3 p-3">
        <p className="text-foreground flex items-center gap-2 font-medium">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {t("orphansTitle", { count: orphans.length })}
        </p>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reassign-bulk"
            className="text-foreground text-sm font-medium"
          >
            {t("bulkLabel")}
          </label>
          <TargetSelect
            id="reassign-bulk"
            label={t("bulkLabel")}
            value={bulk}
            targets={targets}
            firstOption={t("choose")}
            muted={!bulk}
            onChange={onBulkChange}
          />
          <p className="text-xs">{t("bulkHint")}</p>
        </div>
      </div>
      <div className="border-border bg-muted flex items-center justify-between border-y px-3 py-2 text-xs">
        <span className="text-foreground font-medium">{t("perAppTitle")}</span>
        <span className="tabular-nums" aria-live="polite">
          {t("progress", { done, total: orphans.length })}
        </span>
      </div>
      <ul className="divide-border max-h-72 divide-y overflow-y-auto">
        {orphans.map((app) => {
          const own = app._id in overrides;
          return (
            <li
              key={app._id}
              data-testid="reassign-row"
              className={cn(
                "flex flex-col gap-2 border-l-2 px-3 py-2.5 sm:flex-row sm:items-center",
                own ? "border-l-keyline" : "border-l-transparent"
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="text-foreground truncate font-medium"
                  title={app.displayName}
                >
                  {app.displayName}
                </span>
                {own && (
                  <CustomBadge variant="secondary" className="shrink-0">
                    {t("override")}
                  </CustomBadge>
                )}
              </div>
              <div className="sm:w-48">
                <TargetSelect
                  id={`reassign-${app._id}`}
                  label={t("rowLabel", { name: app.displayName })}
                  value={overrides[app._id] ?? ""}
                  targets={targets}
                  firstOption={sharedOption}
                  muted={!own}
                  onChange={(categoryId) =>
                    onOverrideChange(app._id, categoryId)
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReassignPanel;
