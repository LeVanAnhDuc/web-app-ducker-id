"use client";

// types
import type { LucideIcon } from "lucide-react";
import type { ColorVariant } from "@/types/Color";
// components
import AuthOptionCardBody from "../AuthOptionCardBody";
import CustomButton from "@/components/CustomButton";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { useRouter } from "@/i18n/navigation";

const AuthOptionCardButton = ({
  icon,
  title,
  description,
  colorVariant,
  href,
  animationDelay = 0,
  onSelect,
  disabled = false,
  unavailableLabel
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  colorVariant: ColorVariant;
  href: string;
  animationDelay?: number;
  onSelect: () => void;
  disabled?: boolean;
  unavailableLabel?: string;
}) => {
  const router = useRouter();
  const handleClick = () => {
    if (disabled) return;
    onSelect();
    router.push(href);
  };
  return (
    <FadeSlideLeft delay={animationDelay}>
      <CustomButton
        variant="ghost"
        fullWidth
        onClick={handleClick}
        disabled={disabled}
        className="group border-border hover:border-primary hover:bg-primary/5 flex h-auto items-center justify-start gap-4 rounded-xl border-2 px-4 py-4 text-left whitespace-normal transition-colors duration-200"
      >
        <AuthOptionCardBody
          icon={icon}
          title={title}
          description={description}
          colorVariant={colorVariant}
          disabled={disabled}
          unavailableLabel={unavailableLabel}
        />
      </CustomButton>
    </FadeSlideLeft>
  );
};

export default AuthOptionCardButton;
