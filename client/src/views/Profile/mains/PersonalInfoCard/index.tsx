"use client";

// libs
import { useQuery } from "@tanstack/react-query";
// components
import PersonalInfoForm from "@/views/Profile/components/PersonalInfoForm";
// requests
import { getMyProfile } from "@/requests/user";
// others
import CONSTANTS from "@/constants";

const PersonalInfoCard = () => {
  const { data: profile } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.MY_PROFILE],
    queryFn: getMyProfile
  });

  if (!profile) return null;

  return <PersonalInfoForm profile={profile} />;
};

export default PersonalInfoCard;
