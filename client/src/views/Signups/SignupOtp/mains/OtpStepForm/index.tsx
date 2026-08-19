"use client";

// libs
import { useState } from "react";
// types
import type { SignupMessages } from "@/types/libs";
// components
import ResendButton from "@/components/ResendButton";
import OtpInputGroup from "@/components/OtpInputGroup";
import OtpInstruction from "../../components/OtpInstruction";
// hooks
import { useSignupOtp } from "../../hooks/useSignupOtp";
// ghosts
import AutoVerifyOtpEffect from "@/ghosts/AutoVerifyOTPEffect";
// others
import CONSTANTS from "@/constants";

const { OTP_LENGTH } = CONSTANTS.SIGNUP;

const OtpStepForm = ({
  email,
  changeEmailHref,
  translations
}: {
  email: string;
  changeEmailHref: string;
  translations: SignupMessages;
}) => {
  const [otp, setOtp] = useState("");

  const {
    button: { changeEmail, resend, resendIn, sending },
    instruction,
    resendSuccess,
    verifying
  } = translations.otpStep;

  const {
    verifyOtp,
    resendOtp,
    isVerifying,
    isResending,
    countdown,
    canResend
  } = useSignupOtp({
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

      <OtpInstruction label={instruction} />

      <ResendButton
        countdown={countdown}
        canResend={canResend}
        isResending={isResending}
        isProcessing={isVerifying}
        onResend={handleResend}
        tryOtherHref={changeEmailHref}
        labels={{
          resend,
          resendIn,
          sending,
          tryOther: changeEmail
        }}
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
