// libs
import { ShieldCheck } from "lucide-react";
// components
import RecoveryOptionCard from "../../components/RecoveryOptionCard";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { cn } from "@/libs/utils";

const RecoveryOptionTwoFactor = ({
  title,
  descriptionEnabled,
  descriptionDisabled,
  unavailableLabel,
  has2FAEnabled = false,
  delay
}: {
  title: string;
  descriptionEnabled: string;
  descriptionDisabled: string;
  unavailableLabel: string;
  has2FAEnabled?: boolean;
  delay?: number;
}) => {
  const disabled = !has2FAEnabled;
  const description = has2FAEnabled ? descriptionEnabled : descriptionDisabled;

  return (
    <FadeSlideLeft
      delay={delay}
      aria-label={disabled ? `${title} - ${unavailableLabel}` : title}
      aria-disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border-2 p-4",
        "transition-colors duration-200",
        disabled
          ? "border-border bg-muted cursor-not-allowed opacity-60"
          : "border-border hover:border-primary hover:bg-primary/5"
      )}
    >
      <RecoveryOptionCard
        icon={ShieldCheck}
        title={title}
        description={description}
        colorVariant="success"
        disabled={disabled}
        unavailableLabel={unavailableLabel}
      />
    </FadeSlideLeft>
  );
};

export default RecoveryOptionTwoFactor;
