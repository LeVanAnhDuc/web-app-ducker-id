"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
// types
import type { SupportFormValues } from "@/types/Support";
// components
import EmailField from "../../components/EmailField";
import SubjectField from "../../components/SubjectField";
import MessageField from "../../components/MessageField";
import SubmitButton from "../../components/SubmitButton";
// hooks
import { useSubmitGuard } from "@/hooks";
import useSupportSubmit from "../../hooks/useSupportSubmit";
// forms
import { supportFormProps } from "@/forms/Support";

const SupportForm = ({
  initialEmail,
  emailReadOnly,
  emailPrefilled,
  onSubmitted
}: {
  initialEmail: string;
  emailReadOnly: boolean;
  emailPrefilled: boolean;
  onSubmitted: (id: string) => void;
}) => {
  const { mutate: submit, isPending } = useSupportSubmit({
    onSuccess: onSubmitted
  });

  const methods = useForm<SupportFormValues>({
    ...supportFormProps,
    defaultValues: {
      ...supportFormProps.defaultValues,
      email: initialEmail
    }
  });

  // A double click lands while zod is still validating the first one, before
  // isPending disables the button — the ref guard drops the second submit.
  const { run, release } = useSubmitGuard();

  const onSubmit = (data: SupportFormValues) =>
    run(() => submit(data, { onSettled: release }));

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <EmailField
          readOnly={emailReadOnly}
          prefilled={emailPrefilled}
          disabled={isPending}
        />
        <SubjectField disabled={isPending} />
        <MessageField disabled={isPending} />
        <SubmitButton isSubmitting={isPending} />
      </form>
    </FormProvider>
  );
};

export default SupportForm;
