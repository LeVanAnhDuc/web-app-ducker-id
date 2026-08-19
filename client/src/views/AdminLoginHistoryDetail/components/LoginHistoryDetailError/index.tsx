// libs
import { isAxiosError } from "axios";
import { useTranslations } from "next-intl";
// ghosts
import LoginHistoryDetailAnnouncer from "../../ghosts/LoginHistoryDetailAnnouncer";

const LoginHistoryDetailError = ({ error }: { error: unknown }) => {
  const t = useTranslations("loginHistory.admin.detail");

  const status = isAxiosError(error) ? error.response?.status : undefined;
  const isMissing = status === 404 || status === 400;

  return (
    <>
      <LoginHistoryDetailAnnouncer
        isLoading={false}
        hasData={false}
        isError={true}
      />
      <div className="bg-card rounded-xl border p-6">
        <p className="text-destructive text-sm" role="alert">
          {isMissing ? t("notFound") : t("error")}
        </p>
      </div>
    </>
  );
};

export default LoginHistoryDetailError;
