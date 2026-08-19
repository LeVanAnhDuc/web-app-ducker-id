"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
// types
import type { SignupInfoFormValues } from "@/types/Signup";
import type { SignupMessages } from "@/types/libs";
// components
import PasswordInput from "@/components/PasswordInput";
import FullNameInput from "../../components/FullNameInput";
import GenderSelect from "../../components/GenderSelect";
import BirthdayInput from "../../components/BirthdayInput";
import SubmitButton from "../../components/SubmitButton";
// forms
import { signupInfoFormProps } from "@/forms/Signup";
// hooks
import { useSubmitGuard } from "@/hooks";
import { useSignupComplete } from "../../hooks/useSignupComplete";
// others
import CONSTANTS from "@/constants";

const { PASSWORD, PASSWORD_CONFIRM, FULL_NAME, GENDER, BIRTHDAY } =
  CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

const InfoStepForm = ({
  email,
  sessionToken,
  translations
}: {
  email: string;
  sessionToken: string;
  translations: SignupMessages;
}) => {
  const methods = useForm<SignupInfoFormValues>({ ...signupInfoFormProps });
  const { mutate: complete, isPending } = useSignupComplete();
  const { run, release } = useSubmitGuard();

  const {
    input: {
      labelFullName,
      placeholderFullName,
      labelGender,
      placeholderGender,
      gender,
      labelBirthday,
      placeholderBirthday,
      labelPassword,
      placeholderPassword,
      labelPasswordConfirm,
      placeholderPasswordConfirm
    },
    button: { submit }
  } = translations.infoStep;

  const onSubmit = (data: SignupInfoFormValues) =>
    run(() => {
      complete(
        {
          email,
          sessionToken,
          fullName: data[FULL_NAME],
          gender: data[GENDER],
          dateOfBirth: data[BIRTHDAY],
          password: data[PASSWORD],
          confirmPassword: data[PASSWORD_CONFIRM],
          acceptTerms: true
        },
        { onSettled: release }
      );
    });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
        <FullNameInput
          label={labelFullName}
          placeholder={placeholderFullName}
          disabled={isPending}
        />
        <GenderSelect
          label={labelGender}
          placeholder={placeholderGender}
          genderLabels={gender}
          disabled={isPending}
        />
        <BirthdayInput
          label={labelBirthday}
          placeholder={placeholderBirthday}
          disabled={isPending}
          required
        />
        <PasswordInput
          name={PASSWORD}
          label={labelPassword}
          placeholder={placeholderPassword}
          autoComplete="new-password"
          disabled={isPending}
          required
        />
        <PasswordInput
          name={PASSWORD_CONFIRM}
          label={labelPasswordConfirm}
          placeholder={placeholderPasswordConfirm}
          autoComplete="new-password"
          disabled={isPending}
          required
        />
        <SubmitButton label={submit} loading={isPending} />
      </form>
    </FormProvider>
  );
};

export default InfoStepForm;
