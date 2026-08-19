"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { AxiosError } from "axios";
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// components
import CustomButton from "@/components/CustomButton";
import PasswordInput from "@/components/PasswordInput";
// hooks
import { useChangePassword, useSubmitGuard } from "@/hooks";
// forms
import { changePasswordFormProps } from "@/forms/ChangePassword";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;
const { CHANGE_PASSWORD_WRONG_CURRENT, CHANGE_PASSWORD_SAME_AS_CURRENT } =
  CONSTANTS.ERROR_CODES;
const { HOME } = CONSTANTS.ROUTES;

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

const ForceChangePasswordForm = () => {
  const t = useTranslations("forceChangePassword");
  const router = useRouter();
  const methods = useForm<ChangePasswordFormValues>({
    ...changePasswordFormProps
  });

  const { mutate: changePassword, isPending } = useChangePassword();
  const { run, release } = useSubmitGuard();

  const onSubmit = (data: ChangePasswordFormValues) =>
    run(() => {
      changePassword(data, {
        onSettled: release,
        // New tokens (mustChangePassword=false) are already set by the shared
        // hook — safe to leave the private app straight away.
        onSuccess: () => router.replace(HOME),
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

  return (
    <FormProvider {...methods}>
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
        <CustomButton type="submit" loading={isPending} fullWidth>
          {t("buttons.submit")}
        </CustomButton>
      </form>
    </FormProvider>
  );
};

export default ForceChangePasswordForm;
