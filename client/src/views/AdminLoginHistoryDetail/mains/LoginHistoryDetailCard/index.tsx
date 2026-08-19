"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { LoginHistoryMethod } from "@/types/LoginHistory";
// components
import CustomBadge from "@/components/CustomBadge";
import EntityName from "@/components/EntityName";
import FormatTime from "@/components/FormatTime";
import LoginHistoryDetailLoading from "../../components/LoginHistoryDetailLoading";
import LoginHistoryDetailError from "../../components/LoginHistoryDetailError";
import DetailField from "../../components/DetailField";
// ghosts
import LoginHistoryDetailAnnouncer from "../../ghosts/LoginHistoryDetailAnnouncer";
// hooks
import useAdminLoginHistoryDetail from "../../hooks/useAdminLoginHistoryDetail";
// others
import { formatLoginLocation } from "@/utils";
import CONSTANTS from "@/constants";

const LoginHistoryDetailCard = ({ id }: { id: string }) => {
  const t = useTranslations("loginHistory.admin.detail");
  const tFields = useTranslations("loginHistory.admin.detail.fields");
  const tStatus = useTranslations("loginHistory.status");
  const tMethod = useTranslations("loginHistory.method");
  const tDevice = useTranslations("loginHistory.deviceType");
  const tLocation = useTranslations("loginHistory.location");

  const { data, isLoading, isError, error } = useAdminLoginHistoryDetail(id);

  if (isLoading) return <LoginHistoryDetailLoading />;

  if (isError) return <LoginHistoryDetailError error={error} />;

  if (!data) return null;

  const location = formatLoginLocation(data.city, data.country, tLocation);

  return (
    <>
      <LoginHistoryDetailAnnouncer
        isLoading={false}
        hasData={true}
        isError={false}
      />
      <div className="bg-card rounded-xl border p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <EntityName>{data.usernameAttempted}</EntityName>
            <p className="text-muted-foreground text-sm">
              <FormatTime value={data.createdAt} variant="datetime" />
            </p>
          </div>
          <CustomBadge
            variant={
              data.status === CONSTANTS.LOGIN_HISTORY.STATUS.SUCCESS
                ? "success"
                : "warning"
            }
            className="text-sm"
          >
            {tStatus(data.status)}
          </CustomBadge>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailField
            label={tFields("method")}
            value={tMethod(data.method as LoginHistoryMethod)}
          />
          <DetailField label={tFields("status")} value={tStatus(data.status)} />
          {data.userId && (
            <DetailField label={tFields("userId")} value={data.userId} mono />
          )}
          {data.failReason && (
            <DetailField
              label={tFields("failReason")}
              value={data.failReason}
            />
          )}
          <DetailField label={tFields("ip")} value={data.ip} mono />
          <DetailField label={tFields("country")} value={location} />
          <DetailField
            label={tFields("deviceType")}
            value={tDevice(data.deviceType)}
          />
          <DetailField label={tFields("os")} value={data.os} />
          <DetailField label={tFields("browser")} value={data.browser} />
          <DetailField label={tFields("clientType")} value={data.clientType} />
          {data.timezoneOffset && (
            <DetailField
              label={tFields("timezoneOffset")}
              value={data.timezoneOffset}
            />
          )}
          <DetailField
            label={tFields("isAnomaly")}
            value={data.isAnomaly ? t("anomalyYes") : t("anomalyNo")}
          />
          <DetailField
            label={tFields("anomalyReasons")}
            value={
              data.anomalyReasons.length > 0
                ? data.anomalyReasons.join(", ")
                : t("anomalyNone")
            }
          />
          <DetailField
            label={tFields("userAgent")}
            value={data.userAgent}
            mono
            span
          />
        </dl>
      </div>
    </>
  );
};

export default LoginHistoryDetailCard;
