"use client";

// libs
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
// types
import type { AxiosError } from "axios";
import type { AdminCategory } from "@/types/AdminCategories";
// components
import CustomButton from "@/components/CustomButton";
import CustomDialogContent from "@/components/CustomDialogContent";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import DeleteImpactBody from "../../components/DeleteImpactBody";
import DeleteImpactError from "../../components/DeleteImpactError";
import DeleteImpactSkeleton from "../../components/DeleteImpactSkeleton";
// ghosts
import ReassignPruneEffect from "../../ghosts/ReassignPruneEffect";
// hooks
import {
  useAnnounce,
  useInvalidateCategories,
  useLocalizedName,
  useSubmitGuard
} from "@/hooks";
import useDeleteCategory from "../../hooks/useDeleteCategory";
import useDeleteImpact from "../../hooks/useDeleteImpact";
import useReassignState from "../../hooks/useReassignState";
// others
import CONSTANTS from "@/constants";

const {
  CATEGORY_IMPACT_CHANGED,
  CATEGORY_REASSIGN_INVALID,
  CATEGORY_NOT_FOUND
} = CONSTANTS.ERROR_CODES;
const REMAINING_ID = "delete-category-remaining";

/** Rendered with `key={target._id}` so the reassignment state never leaks between categories (DR-18). */
const DeleteCategoryDialog = ({
  target,
  categories,
  onClose
}: {
  target: AdminCategory | null;
  categories: AdminCategory[];
  onClose: () => void;
}) => {
  const t = useTranslations("adminCategories");
  const localize = useLocalizedName();
  const { announce } = useAnnounce();
  const invalidateCategories = useInvalidateCategories();
  const impactQuery = useDeleteImpact(target?._id ?? null);
  const mutation = useDeleteCategory();
  const reassign = useReassignState();
  const { run, release } = useSubmitGuard();

  const targets = useMemo(
    () => categories.filter((c) => c._id !== target?._id),
    [categories, target]
  );
  const impact = impactQuery.data;
  const orphans = impact?.orphaned ?? [];
  const blocked = orphans.length > 0 && targets.length === 0;
  const complete = orphans.every((app) => reassign.targetOf(app._id));
  const canConfirm = Boolean(impact) && !blocked && complete;
  const name = target ? localize(target.name) : "";

  const handleConfirm = () =>
    run(() => {
      if (!target || !canConfirm) return release();
      mutation.mutate(
        { id: target._id, reassignments: reassign.toReassignments(orphans) },
        {
          onSettled: release,
          onSuccess: () => {
            announce(t("announce.deleted", { name }));
            onClose();
          },
          onError: async (error) => {
            const code = (error as AxiosError<ErrorResponsePattern>).response
              ?.data?.code;
            if (code === CATEGORY_NOT_FOUND) {
              await invalidateCategories();
              onClose();
              return;
            }
            if (code === CATEGORY_REASSIGN_INVALID)
              await invalidateCategories();
            if (code === CATEGORY_IMPACT_CHANGED) {
              announce(t("announce.impactChanged"));
            }
            await impactQuery.refetch();
          }
        }
      );
    });

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-full">
              <Trash2 className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>
              {blocked
                ? t("delete.blockedTitle", { name })
                : t("delete.title", { name })}
            </DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="text-muted-foreground max-h-[60vh] overflow-y-auto pt-2 text-sm">
              {impactQuery.isLoading ? (
                <DeleteImpactSkeleton />
              ) : impactQuery.isError || !impact ? (
                <DeleteImpactError onRetry={() => impactQuery.refetch()} />
              ) : (
                <DeleteImpactBody
                  impact={impact}
                  targets={targets}
                  reassign={reassign.state}
                  remainingId={REMAINING_ID}
                  onBulkChange={reassign.setBulk}
                  onOverrideChange={reassign.setOverride}
                />
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <ReassignPruneEffect targets={targets} onPrune={reassign.prune} />
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {blocked ? (
            <span />
          ) : (
            <CustomButton
              type="button"
              variant="destructive"
              disabled={!canConfirm}
              loading={mutation.isPending}
              aria-describedby={orphans.length > 0 ? REMAINING_ID : undefined}
              title={
                !canConfirm && impact ? t("delete.disabledHint") : undefined
              }
              onClick={handleConfirm}
            >
              {t("actions.confirmDelete")}
            </CustomButton>
          )}
          <CustomButton
            type="button"
            variant={blocked ? "default" : "outline"}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {blocked ? t("actions.understood") : t("actions.cancel")}
          </CustomButton>
        </DialogFooter>
      </CustomDialogContent>
    </Dialog>
  );
};

export default DeleteCategoryDialog;
