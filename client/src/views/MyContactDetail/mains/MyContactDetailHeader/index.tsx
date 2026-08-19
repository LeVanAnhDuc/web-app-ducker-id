// libs
import { getTranslations } from "next-intl/server";
// components
import CustomBreadcrumb from "@/components/CustomBreadcrumb";
import PageTitle from "@/components/PageTitle";
// dataSources
import { buildMyContactDetailBreadcrumb } from "@/dataSources/MyContactDetail";

const MyContactDetailHeader = async () => {
  const t = await getTranslations("contactAdmin");
  return (
    <div className="flex flex-col gap-3">
      <CustomBreadcrumb items={buildMyContactDetailBreadcrumb(t)} />
      <PageTitle>{t("myContacts.detail.title")}</PageTitle>
    </div>
  );
};

export default MyContactDetailHeader;
