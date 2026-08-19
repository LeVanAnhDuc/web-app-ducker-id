// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// components
import LoginOptionCard from "../LoginOptionCard";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { Link } from "@/i18n/navigation";
import { cn } from "@/libs/utils";

const LoginOptionCardLink = ({
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
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border-2",
        "border-border p-4 transition-colors duration-200",
        "hover:border-primary hover:bg-primary/5"
      )}
    >
      <LoginOptionCard
        icon={icon}
        title={title}
        description={description}
        colorVariant={colorVariant}
      />
    </Link>
  </FadeSlideLeft>
);

export default LoginOptionCardLink;
