"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { AxiosError } from "axios";
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import CardSectionTitle from "@/components/CardSectionTitle";
import CustomButton from "@/components/CustomButton";
import CustomTooltip from "@/components/CustomTooltip";
import PasswordInput from "@/components/PasswordInput";
// hooks
import { useSubmitGuard, useChangePassword } from "@/hooks";
// forms
import { changePasswordFormProps } from "@/forms/ChangePassword";
// others
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;
const { CHANGE_PASSWORD_WRONG_CURRENT, CHANGE_PASSWORD_SAME_AS_CURRENT } =
  CONSTANTS.ERROR_CODES;

const FIELD_ERROR_MAP: Record<
  string,
  { field: keyof ChangePasswordFormValues; message: string }
> = {
  [CHANGE_PASSWORD_WRONG_CURRENT]: {
    field: CURRENT_PASSWORD,
    message: "wrongCurrentPassword"
  },
  [CHANGE_PASSWORD_SAME_AS_CURRENT]: {
    field: NEW_PASSWORD,
    message: "sameAsCurrent"
  }
};

const ChangePasswordCard = () => {
  const t = useTranslations("account.changePassword");
  const methods = useForm<ChangePasswordFormValues>({
    ...changePasswordFormProps
  });

  const { mutate: changePassword, isPending } = useChangePassword();
  const { run, release } = useSubmitGuard();

  const onSubmit = (data: ChangePasswordFormValues) =>
    run(() => {
      changePassword(data, {
        onSettled: release,
        onSuccess: () => methods.reset(),
        onError: (error) => {
          const code = (error as AxiosError<ErrorResponsePattern>).response
            ?.data?.code;
          const fieldError = code ? FIELD_ERROR_MAP[code] : undefined;
          if (fieldError) {
            methods.setError(fieldError.field, { message: fieldError.message });
          }
        }
      });
    });

  const isDisabled = !methods.formState.isDirty || isPending;

  return (
    <Card aria-labelledby="change-password-title">
      <CardHeader className="border-b">
        <CardSectionTitle id="change-password-title">
          {t("title")}
        </CardSectionTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <FormProvider {...methods}>
        <CardContent>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
            <PasswordInput
              name={CURRENT_PASSWORD}
              label={t("fields.currentPassword")}
              placeholder={t("placeholders.currentPassword")}
              autoComplete="current-password"
              disabled={isPending}
            />
            <PasswordInput
              name={NEW_PASSWORD}
              label={t("fields.newPassword")}
              placeholder={t("placeholders.newPassword")}
              autoComplete="new-password"
              disabled={isPending}
            />
            <PasswordInput
              name={CONFIRM_PASSWORD}
              label={t("fields.confirmPassword")}
              placeholder={t("placeholders.confirmPassword")}
              autoComplete="new-password"
              disabled={isPending}
            />
            <div className="border-border flex justify-end gap-3 border-t pt-5">
              <CustomTooltip
                content={
                  !methods.formState.isDirty ? t("tooltips.noChanges") : ""
                }
              >
                <CustomButton
                  type="button"
                  variant="outline"
                  onClick={() => methods.reset()}
                  disabled={isDisabled}
                >
                  {t("buttons.cancel")}
                </CustomButton>
              </CustomTooltip>
              <CustomTooltip
                content={
                  !methods.formState.isDirty ? t("tooltips.noChanges") : ""
                }
              >
                <CustomButton
                  type="submit"
                  loading={isPending}
                  disabled={isDisabled}
                >
                  {t("buttons.save")}
                </CustomButton>
              </CustomTooltip>
            </div>
          </form>
        </CardContent>
      </FormProvider>
    </Card>
  );
};

export default ChangePasswordCard;
