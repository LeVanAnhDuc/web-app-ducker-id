// libs
import { getTranslations } from "next-intl/server";
// components
import PageTitle from "@/components/PageTitle";
import StatsRow from "./mains/StatsRow";
import LoginHistoryTable from "./mains/LoginHistoryTable";

const LoginHistory = async () => {
  const t = await getTranslations("loginHistory");
  return (
    <div className="flex flex-col gap-6 md:h-full md:min-h-0">
      <div className="flex flex-col gap-1.5 md:shrink-0">
        <PageTitle>{t("title")}</PageTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="md:shrink-0">
        <StatsRow />
      </div>
      <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
        <LoginHistoryTable />
      </div>
    </div>
  );
};

export default LoginHistory;
