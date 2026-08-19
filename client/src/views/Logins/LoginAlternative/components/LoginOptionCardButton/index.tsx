"use client";

// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// components
import LoginOptionCard from "../LoginOptionCard";
import CustomButton from "@/components/CustomButton";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/libs/utils";

const LoginOptionCardButton = ({
  icon,
  title,
  description,
  colorVariant,
  href,
  animationDelay = 0,
  onSelect
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  colorVariant: ColorVariant;
  href: string;
  animationDelay?: number;
  onSelect: () => void;
}) => {
  const router = useRouter();
  const handleClick = () => {
    onSelect();
    router.push(href);
  };

  return (
    <FadeSlideLeft delay={animationDelay}>
      <CustomButton
        variant="ghost"
        fullWidth
        onClick={handleClick}
        className={cn(
          "group flex h-auto items-center justify-start gap-4",
          "border-border rounded-xl border-2 px-4 py-4",
          "text-left whitespace-normal",
          "transition-colors duration-200",
          "hover:border-primary hover:bg-primary/5"
        )}
      >
        <LoginOptionCard
          icon={icon}
          title={title}
          description={description}
          colorVariant={colorVariant}
        />
      </CustomButton>
    </FadeSlideLeft>
  );
};

export default LoginOptionCardButton;
