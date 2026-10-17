"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { UnlockVerifyFormValues } from "@/types/Login";
// components
import CustomButton from "@/components/CustomButton";
import PasswordInput from "@/components/PasswordInput";
// forms
import { unlockVerifyFormProps } from "@/forms/Login";
// hooks
import { useSubmitGuard } from "@/hooks";
import { useUnlockVerify } from "../../hooks/useUnlockVerify";
// others
import CONSTANTS from "@/constants";

const { TEMP_PASSWORD } = CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

const UnlockVerifyStep = ({
  email,
  isResending,
  onResend
}: {
  email: string;
  isResending: boolean;
  onResend: () => void;
}) => {
  const t = useTranslations("login.unlock");
  const { mutate: verify, isPending } = useUnlockVerify();
  const { run, release } = useSubmitGuard();
  const methods = useForm<UnlockVerifyFormValues>({ ...unlockVerifyFormProps });

  const onSubmit = (data: UnlockVerifyFormValues) =>
    run(() =>
      verify(
        { email, tempPassword: data[TEMP_PASSWORD] },
        { onSettled: release }
      )
    );

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
        <p className="text-muted-foreground text-center text-sm">
          {t("sentDescription")}
        </p>
        <PasswordInput
          name={TEMP_PASSWORD}
          label={t("labelTempPassword")}
          placeholder={t("placeholderTempPassword")}
          autoComplete="one-time-code"
          disabled={isPending}
          required
        />
        <CustomButton type="submit" loading={isPending} fullWidth>
          {t("button.verify")}
        </CustomButton>
        <CustomButton
          type="button"
          variant="ghost"
          fullWidth
          loading={isResending}
          disabled={isPending}
          onClick={onResend}
        >
          {t("button.resend")}
        </CustomButton>
      </form>
    </FormProvider>
  );
};

export default UnlockVerifyStep;
