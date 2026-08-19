"use client";

// components
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { FadeScale, FadeIn } from "@/components/Animated";
// others
import CONSTANTS from "@/constants";

const { OTP_LENGTH } = CONSTANTS.FORGOT_PASSWORD;

const OtpInputGroup = ({
  value,
  onChange,
  disabled = false,
  isVerifying = false,
  verifyingLabel
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isVerifying?: boolean;
  verifyingLabel?: string;
}) => (
  <FadeScale delay={0.3}>
    <div className="mb-2 flex justify-center">
      <InputOTP
        maxLength={OTP_LENGTH}
        value={value}
        onChange={onChange}
        disabled={disabled || isVerifying}
      >
        <InputOTPGroup>
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <InputOTPSlot
              key={`slot-${index}`}
              index={index}
              className="h-12 w-12 text-xl"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>

    {isVerifying && verifyingLabel && (
      <FadeIn className="text-primary flex items-center justify-center gap-2 text-center text-sm">
        <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
        <span>{verifyingLabel}</span>
      </FadeIn>
    )}
  </FadeScale>
);

export default OtpInputGroup;
