"use client";

// components
import CustomButton from "@/components/CustomButton";
import { FadeIn } from "@/components/Animated";
import { Link } from "@/i18n/navigation";

const ResendButton = ({
  countdown,
  canResend,
  isResending,
  isProcessing = false,
  onResend,
  tryOtherHref,
  labels
}: {
  countdown: number;
  canResend: boolean;
  isResending: boolean;
  isProcessing?: boolean;
  onResend: () => void;
  tryOtherHref: string;
  labels: {
    resend: string;
    resendIn: string;
    sending: string;
    tryOther: string;
  };
}) => (
  <FadeIn delay={0.4} className="space-y-5">
    <CustomButton
      onClick={onResend}
      disabled={!canResend || isProcessing}
      loading={isResending}
      variant="outline"
      fullWidth
    >
      {isResending
        ? labels.sending
        : canResend
          ? labels.resend
          : labels.resendIn.replace("{seconds}", String(countdown))}
    </CustomButton>

    <div className="text-center">
      <Link
        href={tryOtherHref}
        aria-disabled={isProcessing}
        className="text-primary hover:text-primary/80 text-sm transition-colors duration-200 hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {labels.tryOther}
      </Link>
    </div>
  </FadeIn>
);

export default ResendButton;
