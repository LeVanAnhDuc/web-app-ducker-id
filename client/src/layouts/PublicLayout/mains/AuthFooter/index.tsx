// libs
import { getTranslations } from "next-intl/server";
// others
import { Link } from "@/i18n/navigation";

const AuthFooter = async () => {
  const t = await getTranslations("common");

  return (
    <div className="mt-6 text-center">
      <div className="text-muted-foreground flex items-center justify-center gap-4 text-sm">
        <Link
          href="#"
          className="hover:text-foreground transition-colors duration-200"
        >
          {t("footer.help")}
        </Link>
        <span>•</span>
        <Link
          href="#"
          className="hover:text-foreground transition-colors duration-200"
        >
          {t("footer.privacy")}
        </Link>
        <span>•</span>
        <Link
          href="#"
          className="hover:text-foreground transition-colors duration-200"
        >
          {t("footer.terms")}
        </Link>
      </div>
    </div>
  );
};

export default AuthFooter;
