// libs
import { getTranslations } from "next-intl/server";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import ForceChangePasswordForm from "./mains/ForceChangePasswordForm";
// ghosts
import ForceChangeGuard from "./ghosts/ForceChangeGuard";

const ForceChangePassword = async () => {
  const t = await getTranslations("forceChangePassword");

  return (
    <AuthStepLayout title={t("title")} description={t("description")}>
      <ForceChangePasswordForm />
      <ForceChangeGuard />
    </AuthStepLayout>
  );
};

export default ForceChangePassword;
