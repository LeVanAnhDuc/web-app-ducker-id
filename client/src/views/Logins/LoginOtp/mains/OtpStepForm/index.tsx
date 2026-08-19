"use client";

// libs
import { useState } from "react";
// types
import type { LoginMessages } from "@/types/libs";
// components
import ResendButton from "@/components/ResendButton";
import OtpInputGroup from "@/components/OtpInputGroup";
import OtpInstruction from "../../components/OtpInstruction";
// ghosts
import AutoVerifyOtpEffect from "@/ghosts/AutoVerifyOTPEffect";
// hooks
import { useOtpLogin } from "../../hooks/useOtpLogin";
// others
import CONSTANTS from "@/constants";

const { OTP_LENGTH } = CONSTANTS.LOGIN;

const OtpStepForm = ({
  email,
  tryOtherHref,
  translations
}: {
  email: string;
  tryOtherHref: string;
  translations: LoginMessages;
}) => {
  const [otp, setOtp] = useState("");

  const {
    button: { resend, resendIn, sending, tryOther },
    instruction,
    resendSuccess,
    verifying
  } = translations.form.otp;

  const { sendOtp, verifyOtp, isSending, isVerifying, countdown, canResend } =
    useOtpLogin({
      email,
      resendSuccessMessage: resendSuccess,
      onVerifyError: () => setOtp("")
    });

  const handleVerify = () => {
    if (otp.length !== OTP_LENGTH) return;
    verifyOtp(otp);
  };

  const handleResend = () => {
    sendOtp();
    setOtp("");
  };

  return (
    <>
      <OtpInputGroup
        value={otp}
        onChange={setOtp}
        disabled={isSending}
        isVerifying={isVerifying}
        verifyingLabel={verifying}
      />

      <OtpInstruction label={instruction} />

      <ResendButton
        countdown={countdown}
        canResend={canResend}
        isResending={isSending}
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
