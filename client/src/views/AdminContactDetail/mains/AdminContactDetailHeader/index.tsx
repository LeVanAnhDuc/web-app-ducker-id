// libs
import { getTranslations } from "next-intl/server";
// components
import CustomBreadcrumb from "@/components/CustomBreadcrumb";
import PageTitle from "@/components/PageTitle";
// dataSources
import { buildAdminContactDetailBreadcrumb } from "@/dataSources/AdminContactDetail";

const AdminContactDetailHeader = async ({ id }: { id: string }) => {
  const t = await getTranslations("contactAdmin");
  return (
    <div className="flex flex-col gap-3">
      <CustomBreadcrumb items={buildAdminContactDetailBreadcrumb(id, t)} />
      <PageTitle>{t("admin.detail.title")}</PageTitle>
    </div>
  );
};

export default AdminContactDetailHeader;
