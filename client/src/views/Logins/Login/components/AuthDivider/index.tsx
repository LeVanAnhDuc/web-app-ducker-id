// libs
import { getTranslations } from "next-intl/server";

const AuthDivider = async () => {
  const t = await getTranslations("common");

  return <div className="text-center uppercase">{t("or")}</div>;
};

export default AuthDivider;
