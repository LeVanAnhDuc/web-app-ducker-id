"use client";

// components
import PersonalInfoForm from "@/views/Profile/components/PersonalInfoForm";
// hooks
import useMyProfile from "../../hooks/useMyProfile";

const PersonalInfoCard = () => {
  const { data: profile } = useMyProfile();

  if (!profile) return null;

  return <PersonalInfoForm profile={profile} />;
};

export default PersonalInfoCard;
