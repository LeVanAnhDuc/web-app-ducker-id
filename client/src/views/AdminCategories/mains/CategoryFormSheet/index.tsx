"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { AxiosError } from "axios";
import type {
  AdminCategory,
  AdminCategoryFormValues
} from "@/types/AdminCategories";
// components
import CategoryNameField from "@/components/CategoryNameField";
import CategorySlugPreview from "@/components/CategorySlugPreview";
import CustomButton from "@/components/CustomButton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
// ghosts
import CategoryFormResetEffect from "../../ghosts/CategoryFormResetEffect";
// forms
import { adminCategoryFormProps } from "@/forms/AdminCategory";
// hooks
import {
  useAnnounce,
  useCreateCategory,
  useLocalizedName,
  useSubmitGuard
} from "@/hooks";
import useUpdateCategory from "../../hooks/useUpdateCategory";
// others
import CONSTANTS from "@/constants";
import { toCategoryName } from "@/utils";

const { NAME_EN, NAME_VI } = CONSTANTS.FIELD_NAMES.ADMIN_CATEGORY_FIELD_NAMES;
const { CATEGORY_NAME_TAKEN, CATEGORY_NOT_FOUND } = CONSTANTS.ERROR_CODES;

const CategoryFormSheet = ({
  open,
  editing,
  onClose
}: {
  open: boolean;
  editing: AdminCategory | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminCategories");
  const tFields = useTranslations("adminCategories.form.fields");
  const { announce } = useAnnounce();
  const localize = useLocalizedName();
  const methods = useForm<AdminCategoryFormValues>(adminCategoryFormProps);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { run, release } = useSubmitGuard();

  const handleError = (error: unknown) => {
    const code = (error as AxiosError<ErrorResponsePattern>).response?.data
      ?.code;
    if (code === CATEGORY_NAME_TAKEN) {
      methods.setError(NAME_EN, { message: "taken" });
    }
    // Deleted in another tab: nothing left to edit; the list is refetched.
    if (code === CATEGORY_NOT_FOUND) onClose();
  };

  const onSubmit = (values: AdminCategoryFormValues) =>
    run(() => {
      const name = toCategoryName(values);
      const onSuccess = (saved: AdminCategory) => {
        announce(
          t(editing ? "announce.updated" : "announce.created", {
            name: localize(saved.name)
          })
        );
        onClose();
      };
      if (editing) {
        updateMutation.mutate(
          { id: editing._id, input: { name } },
          { onSettled: release, onSuccess, onError: handleError }
        );
        return;
      }
      createMutation.mutate(name, {
        onSettled: release,
        onSuccess,
        onError: handleError
      });
    });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <FormProvider {...methods}>
          <CategoryFormResetEffect open={open} editing={editing} />
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <SheetHeader className="border-border border-b">
              <SheetTitle>
                {editing ? t("form.editTitle") : t("form.createTitle")}
              </SheetTitle>
              <SheetDescription>
                {editing
                  ? t("form.editDescription", { count: editing.appCount })
                  : t("form.createDescription")}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <CategoryNameField
                name={NAME_EN}
                label={tFields("nameEn.label")}
                placeholder={tFields("nameEn.placeholder")}
                disabled={isPending}
              />
              <CategoryNameField
                name={NAME_VI}
                label={tFields("nameVi.label")}
                placeholder={tFields("nameVi.placeholder")}
                disabled={isPending}
              />
              <CategorySlugPreview currentSlug={editing?.slug} />
            </div>
            <SheetFooter className="border-border flex-row justify-end gap-2 border-t">
              <CustomButton
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                {t("actions.cancel")}
              </CustomButton>
              <CustomButton type="submit" loading={isPending}>
                {editing
                  ? t("actions.updateSubmit")
                  : t("actions.createSubmit")}
              </CustomButton>
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
};

export default CategoryFormSheet;
