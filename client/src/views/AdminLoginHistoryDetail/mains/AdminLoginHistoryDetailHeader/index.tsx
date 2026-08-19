// libs
import { getTranslations } from "next-intl/server";
// components
import CustomBreadcrumb from "@/components/CustomBreadcrumb";
import PageTitle from "@/components/PageTitle";
// dataSources
import { buildAdminLoginHistoryDetailBreadcrumb } from "@/dataSources/AdminLoginHistoryDetail";

const AdminLoginHistoryDetailHeader = async () => {
  const t = await getTranslations("loginHistory");
  return (
    <div className="flex flex-col gap-3">
      <CustomBreadcrumb items={buildAdminLoginHistoryDetailBreadcrumb(t)} />
      <PageTitle>{t("admin.detail.title")}</PageTitle>
    </div>
  );
};

export default AdminLoginHistoryDetailHeader;
