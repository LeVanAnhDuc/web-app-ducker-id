// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// components
import AuthOptionCardBody from "../AuthOptionCardBody";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { Link } from "@/i18n/navigation";

const AuthOptionCardLink = ({
  icon,
  title,
  description,
  colorVariant,
  href,
  animationDelay = 0
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  colorVariant: ColorVariant;
  href: string;
  animationDelay?: number;
}) => (
  <FadeSlideLeft delay={animationDelay}>
    <Link
      href={href}
      className="group border-border hover:border-primary hover:bg-primary/5 flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-colors duration-200"
    >
      <AuthOptionCardBody
        icon={icon}
        title={title}
        description={description}
        colorVariant={colorVariant}
      />
    </Link>
  </FadeSlideLeft>
);

export default AuthOptionCardLink;
