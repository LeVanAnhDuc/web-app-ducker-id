"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
// types
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
import type {
  GenderEnum,
  MyProfileResponse,
  UpdateProfileData
} from "@/types/User";
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
import FirstNameField from "@/views/Profile/components/FirstNameField";
import LastNameField from "@/views/Profile/components/LastNameField";
import PhoneField from "@/views/Profile/components/PhoneField";
import AddressField from "@/views/Profile/components/AddressField";
import GenderField from "@/views/Profile/components/GenderField";
import DateOfBirthField from "@/views/Profile/components/DateOfBirthField";
// ghosts
import ProfileFormSyncEffect from "@/views/Profile/ghosts/ProfileFormSyncEffect";
// hooks
import { useAnnounce, useSubmitGuard } from "@/hooks";
// forms
import { updatePersonalInfoFormProps } from "@/forms/UpdatePersonalInfo";
// requests
import { updateMyProfile } from "@/requests/user";
// others
import CONSTANTS from "@/constants";
import { mapProfileToFormValues } from "@/utils";

const PersonalInfoForm = ({ profile }: { profile: MyProfileResponse }) => {
  const t = useTranslations("account.personalInfo");
  const { announce } = useAnnounce();
  const queryClient = useQueryClient();

  const methods = useForm<UpdatePersonalInfoFormValues>({
    ...updatePersonalInfoFormProps,
    defaultValues: mapProfileToFormValues(profile)
  });

  const { run, release } = useSubmitGuard();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: UpdateProfileData) => updateMyProfile(data),
    onMutate: () => announce(t("announce.saving")),
    onSuccess: (updated: MyProfileResponse) => {
      announce(t("announce.saved"));
      queryClient.setQueryData([CONSTANTS.QUERY_KEYS.MY_PROFILE], updated);
      toast.success(t("toast.success"));
    },
    onSettled: () => release()
  });

  const onSubmit = (data: UpdatePersonalInfoFormValues) =>
    run(() => {
      const fullName = [data.firstName, data.lastName]
        .filter(Boolean)
        .join(" ");
      const payload: UpdateProfileData = { fullName };
      if (data.phone) payload.phone = data.phone;
      if (data.address) payload.address = data.address;
      if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth;
      if (data.gender) payload.gender = data.gender as GenderEnum;
      mutate(payload);
    });

  const handleCancel = () => {
    methods.reset(mapProfileToFormValues(profile));
  };

  const isDirty = methods.formState.isDirty;
  const cancelDisabledReason = isPending
    ? t("tooltips.saving")
    : !isDirty
      ? t("tooltips.noChangesToCancel")
      : null;
  const saveDisabledReason = isPending
    ? t("tooltips.saving")
    : !isDirty
      ? t("tooltips.noChangesToSave")
      : null;

  return (
    <Card aria-labelledby="personal-info-title">
      <CardHeader className="border-b">
        <CardSectionTitle id="personal-info-title">
          {t("title")}
        </CardSectionTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <FormProvider {...methods}>
        <ProfileFormSyncEffect profile={profile} />
        <CardContent>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FirstNameField control={methods.control} isPending={isPending} />
              <LastNameField control={methods.control} isPending={isPending} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <PhoneField control={methods.control} isPending={isPending} />
              <GenderField control={methods.control} isPending={isPending} />
            </div>
            <AddressField control={methods.control} isPending={isPending} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DateOfBirthField
                control={methods.control}
                isPending={isPending}
              />
            </div>
            <div className="border-border flex justify-end gap-3 border-t pt-5">
              <CustomTooltip content={cancelDisabledReason}>
                <CustomButton
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending || !isDirty}
                >
                  {t("buttons.cancel")}
                </CustomButton>
              </CustomTooltip>
              <CustomTooltip content={saveDisabledReason}>
                <CustomButton
                  type="submit"
                  loading={isPending}
                  disabled={!isDirty || isPending}
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

export default PersonalInfoForm;
