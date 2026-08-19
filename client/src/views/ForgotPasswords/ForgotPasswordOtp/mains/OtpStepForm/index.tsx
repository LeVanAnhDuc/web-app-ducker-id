"use client";

// libs
import { useState } from "react";
// types
import type { ForgotPasswordMessages } from "@/types/libs";
// components
import ResendButton from "@/components/ResendButton";
import OtpInputGroup from "@/components/OtpInputGroup";
import OtpInstructionBox from "../../components/OtpInstructionBox";
// hooks
import { useForgotPasswordOtp } from "../../hooks/useForgotPasswordOtp";
// ghosts
import AutoVerifyOtpEffect from "@/ghosts/AutoVerifyOTPEffect";
// others
import CONSTANTS from "@/constants";

const { OTP_LENGTH } = CONSTANTS.FORGOT_PASSWORD;

const OtpStepForm = ({
  email,
  tryOtherHref,
  translations
}: {
  email: string;
  tryOtherHref: string;
  translations: ForgotPasswordMessages;
}) => {
  const [otp, setOtp] = useState("");

  const {
    button: { resend, resendIn, sending, tryOther },
    instruction,
    resendSuccess,
    verifying
  } = translations.form.otp;

  const {
    verifyOtp,
    resendOtp,
    isVerifying,
    isResending,
    countdown,
    canResend
  } = useForgotPasswordOtp({
    email,
    resendSuccessMessage: resendSuccess,
    onVerifyError: () => setOtp("")
  });

  const handleVerify = () => {
    if (otp.length !== OTP_LENGTH) return;
    verifyOtp(otp);
  };

  const handleResend = () => {
    resendOtp();
    setOtp("");
  };

  return (
    <>
      <OtpInputGroup
        value={otp}
        onChange={setOtp}
        disabled={isResending}
        isVerifying={isVerifying}
        verifyingLabel={verifying}
      />

      <OtpInstructionBox instruction={instruction} />

      <ResendButton
        countdown={countdown}
        canResend={canResend}
        isResending={isResending}
        isProcessing={isVerifying}
        onResend={handleResend}
        tryOtherHref={tryOtherHref}
        labels={{ resend, resendIn, sending, tryOther }}
      />

      <AutoVerifyOtpEffect
        otpValue={otp}
        otpLength={OTP_LENGTH}
        onVerify={handleVerify}
      />
    </>
  );
};

export default OtpStepForm;
