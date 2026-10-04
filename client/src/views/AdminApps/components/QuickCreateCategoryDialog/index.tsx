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
import CustomDialogContent from "@/components/CustomDialogContent";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
// ghosts
import QuickCreateResetEffect from "../../ghosts/QuickCreateResetEffect";
// forms
import { adminCategoryFormProps } from "@/forms/AdminCategory";
// hooks
import {
  useAnnounce,
  useCreateCategory,
  useLocalizedName,
  useSubmitGuard
} from "@/hooks";
// others
import CONSTANTS from "@/constants";
import { toCategoryName } from "@/utils";

const { NAME_EN, NAME_VI } = CONSTANTS.FIELD_NAMES.ADMIN_CATEGORY_FIELD_NAMES;

/**
 * Opened from the category picker with the search text as the English name.
 * Cancelling leaves the picker and the app form untouched.
 */
const QuickCreateCategoryDialog = ({
  initialName,
  onClose,
  onCreated
}: {
  initialName: string | null;
  onClose: () => void;
  onCreated: (category: AdminCategory) => void;
}) => {
  const t = useTranslations("adminCategories");
  const tFields = useTranslations("adminCategories.form.fields");
  const { announce } = useAnnounce();
  const localize = useLocalizedName();
  const methods = useForm<AdminCategoryFormValues>(adminCategoryFormProps);
  const mutation = useCreateCategory();
  const { run, release } = useSubmitGuard();
  const open = initialName !== null;

  const onSubmit = (values: AdminCategoryFormValues) =>
    run(() =>
      mutation.mutate(toCategoryName(values), {
        onSettled: release,
        onSuccess: (created) => {
          announce(t("announce.created", { name: localize(created.name) }));
          onCreated(created);
        },
        onError: (error) => {
          const code = (error as AxiosError<ErrorResponsePattern>).response
            ?.data?.code;
          if (code === CONSTANTS.ERROR_CODES.CATEGORY_NAME_TAKEN) {
            methods.setError(NAME_EN, { message: "taken" });
          }
        }
      })
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent className="sm:max-w-md">
        <FormProvider {...methods}>
          <QuickCreateResetEffect initialName={initialName} />
          <form
            onSubmit={(event) => {
              // The dialog sits inside the app form; keep its submit local.
              event.stopPropagation();
              void methods.handleSubmit(onSubmit)(event);
            }}
            className="flex flex-col gap-5"
          >
            <DialogHeader>
              <DialogTitle>{t("quickCreate.title")}</DialogTitle>
              <DialogDescription>
                {t("quickCreate.description")}
              </DialogDescription>
            </DialogHeader>
            <CategoryNameField
              name={NAME_EN}
              label={tFields("nameEn.label")}
              placeholder={tFields("nameEn.placeholder")}
              disabled={mutation.isPending}
            />
            <CategoryNameField
              name={NAME_VI}
              label={tFields("nameVi.label")}
              placeholder={tFields("nameVi.placeholder")}
              disabled={mutation.isPending}
            />
            <CategorySlugPreview />
            <DialogFooter>
              <CustomButton
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                {t("actions.cancel")}
              </CustomButton>
              <CustomButton type="submit" loading={mutation.isPending}>
                {t("quickCreate.submit")}
              </CustomButton>
            </DialogFooter>
          </form>
        </FormProvider>
      </CustomDialogContent>
    </Dialog>
  );
};

export default QuickCreateCategoryDialog;
