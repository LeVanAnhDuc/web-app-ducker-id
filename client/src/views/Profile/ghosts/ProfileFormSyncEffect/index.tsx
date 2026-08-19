"use client";

// libs
import { useFormContext } from "react-hook-form";
// types
import type { UpdatePersonalInfoFormValues } from "@/types/UpdatePersonalInfo";
import type { MyProfileResponse } from "@/types/User";
// hooks
import { useUpdateEffect } from "@/hooks";
// others
import { mapProfileToFormValues } from "@/utils";

const ProfileFormSyncEffect = ({ profile }: { profile: MyProfileResponse }) => {
  const { reset } = useFormContext<UpdatePersonalInfoFormValues>();

  useUpdateEffect(() => {
    reset(mapProfileToFormValues(profile));
  }, [profile, reset]);

  return null;
};

export default ProfileFormSyncEffect;
