"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
// types
import type { EmailStepFormValues } from "@/types/Login";
// components
import EmailInput from "../../components/EmailInput";
import NextButton from "../../components/NextButton";
// forms
import { emailStepFormProps } from "@/forms/Login";
// hooks
import { useSubmitGuard } from "@/hooks";
import { useLoginEmail } from "../../hooks/useLoginEmail";
// others
import CONSTANTS from "@/constants";

const { EMAIL } = CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

const EmailStepForm = ({
  labels
}: {
  labels: { email: string; next: string };
}) => {
  const methods = useForm<EmailStepFormValues>({ ...emailStepFormProps });
  const { mutate: checkEmail, isPending } = useLoginEmail();
  const { run, release } = useSubmitGuard();

  const onSubmit = (data: EmailStepFormValues) =>
    run(() => {
      checkEmail(data[EMAIL], { onSettled: release });
    });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
        <EmailInput label={labels.email} disabled={isPending} />
        <NextButton label={labels.next} loading={isPending} />
      </form>
    </FormProvider>
  );
};

export default EmailStepForm;
