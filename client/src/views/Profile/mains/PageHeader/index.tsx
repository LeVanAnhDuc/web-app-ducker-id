// libs
import { getTranslations } from "next-intl/server";
// components
import PageTitle from "@/components/PageTitle";

const PageHeader = async () => {
  const t = await getTranslations("account");
  return (
    <div className="flex flex-col gap-1.5">
      <PageTitle id="profile-page-title">{t("title")}</PageTitle>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
    </div>
  );
};

export default PageHeader;
