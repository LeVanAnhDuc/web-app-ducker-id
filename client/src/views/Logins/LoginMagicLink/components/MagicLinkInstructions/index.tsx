// libs
import { getTranslations } from "next-intl/server";
// components
import { FadeIn } from "@/components/Animated";

const MagicLinkInstructions = async ({ minutes }: { minutes: number }) => {
  const t = await getTranslations("login.form.magicLink");

  return (
    <FadeIn delay={0.3} className="space-y-5">
      <div className="bg-info/10 rounded-lg p-4">
        <p className="text-foreground text-sm">
          <span className="mb-2 block">{t("instruction.check")}</span>
          {t("instruction.detail", { minutes })}
        </p>
      </div>
      <div className="border-warning/30 bg-warning/10 rounded-lg border p-4">
        <p className="text-warning-foreground text-sm">
          <span className="font-medium">{t("hint.title")}</span>{" "}
          {t("hint.description")}
        </p>
      </div>
    </FadeIn>
  );
};

export default MagicLinkInstructions;
