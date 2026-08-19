"use client";

// libs
import { useTranslations } from "next-intl";
// components
import EntityName from "@/components/EntityName";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import StatBadge from "../../components/StatBadge";
// hooks
import useUserInfo from "@/hooks/useUserInfo";
// others
import { PROFILE_STATS_MOCK } from "@/mocks/Profile";

const ProfileCard = () => {
  const t = useTranslations("account");
  const userInfo = useUserInfo();

  if (!userInfo) return null;

  return (
    <Card
      className="gap-0 overflow-hidden py-0"
      aria-labelledby="profile-page-title"
    >
      <div className="flex flex-col gap-4 px-8 pt-6 pb-6">
        <div className="flex items-end gap-5">
          <Avatar className="ring-card size-20 shrink-0 ring-4">
            <AvatarImage src={userInfo.avatar ?? ""} alt={userInfo.fullName} />
            <AvatarFallback className="bg-muted text-foreground text-xl font-bold">
              {userInfo.initials}
            </AvatarFallback>
          </Avatar>
          <div className="mb-2 min-w-0 flex-1">
            <EntityName className="truncate">{userInfo.fullName}</EntityName>
            <p className="text-muted-foreground truncate text-sm">
              {userInfo.email}
            </p>
          </div>
        </div>
      </div>
      <div className="border-border flex flex-wrap items-center gap-2 border-t px-8 py-4">
        <StatBadge>
          {t("card.stats.apps", { count: PROFILE_STATS_MOCK.appsCount })}
        </StatBadge>
        <StatBadge>
          {t("card.stats.teams", { count: PROFILE_STATS_MOCK.teamsCount })}
        </StatBadge>
        <StatBadge>
          {t("card.stats.plan", { plan: PROFILE_STATS_MOCK.planName })}
        </StatBadge>
      </div>
    </Card>
  );
};

export default ProfileCard;
