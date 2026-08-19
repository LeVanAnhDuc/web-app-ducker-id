"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// types
import type { AxiosError } from "axios";
import type {
  AdminAppFormValues,
  WebApp,
  AdminAppCreateResult
} from "@/types/AdminApps";
// components
import CustomButton from "@/components/CustomButton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppFormFields from "../../components/AppFormFields";
// ghosts
import FormResetEffect from "../../ghosts/FormResetEffect";
// forms
import { adminAppFormProps } from "@/forms/AdminApp";
// hooks
import { useAnnounce, useSubmitGuard } from "@/hooks";
import useCreateAdminApp from "../../hooks/useCreateAdminApp";
import useUpdateAdminApp from "../../hooks/useUpdateAdminApp";
// requests
import { getAdminAppCategories } from "@/requests/adminApps";
// others
import CONSTANTS from "@/constants";

const AdminAppsFormSheet = ({
  open,
  editingApp,
  onClose,
  onCreated
}: {
  open: boolean;
  editingApp: WebApp | null;
  onClose: () => void;
  onCreated: (result: AdminAppCreateResult) => void;
}) => {
  const t = useTranslations("adminApps.form");
  const tActions = useTranslations("adminApps.actions");
  const tAnnounce = useTranslations("adminApps.announce");
  const { announce } = useAnnounce();
  const isEdit = editingApp !== null;

  const { NAME } = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
  const { WEB_APP_NAME_EXISTS } = CONSTANTS.ERROR_CODES;

  const methods = useForm<AdminAppFormValues>(adminAppFormProps);

  const { data: categories = [] } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_APP_CATEGORIES],
    queryFn: getAdminAppCategories,
    enabled: open
  });

  const createMutation = useCreateAdminApp();
  const updateMutation = useUpdateAdminApp();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { run, release } = useSubmitGuard();

  const onSubmit = (values: AdminAppFormValues) =>
    run(() => {
      if (isEdit && editingApp) {
        updateMutation.mutate(
          { id: editingApp._id, input: values },
          {
            onSettled: release,
            onSuccess: (updated) => {
              announce(tAnnounce("updated", { name: updated.displayName }));
              onClose();
            },
            onError: (error) => {
              const code = (error as AxiosError<ErrorResponsePattern>).response
                ?.data?.code;
              if (code === WEB_APP_NAME_EXISTS) {
                methods.setError(NAME, { message: "exists" });
              }
            }
          }
        );
        return;
      }
      createMutation.mutate(values, {
        onSettled: release,
        onSuccess: (created) => {
          announce(tAnnounce("created", { name: created.displayName }));
          onClose();
          onCreated(created);
        }
      });
    });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <FormProvider {...methods}>
          <FormResetEffect open={open} editingApp={editingApp} />
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <SheetHeader className="border-border border-b">
              <SheetTitle>
                {isEdit ? t("editTitle") : t("createTitle")}
              </SheetTitle>
              <SheetDescription>
                {isEdit ? t("editDescription") : t("createDescription")}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <AppFormFields categories={categories} disabled={isPending} />
              </div>
            </ScrollArea>
            <SheetFooter className="border-border flex-row justify-end gap-2 border-t">
              <CustomButton
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                {tActions("cancel")}
              </CustomButton>
              <CustomButton type="submit" loading={isPending}>
                {isEdit ? tActions("updateSubmit") : tActions("createSubmit")}
              </CustomButton>
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
};

export default AdminAppsFormSheet;
