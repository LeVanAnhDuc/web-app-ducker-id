"use client";

// libs
import { useEffect, useRef } from "react";

const AutoVerifyOtpEffect = ({
  otpValue,
  otpLength,
  onVerify
}: {
  otpValue: string;
  otpLength: number;
  onVerify: () => void;
}) => {
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (otpValue.length === otpLength) {
      onVerifyRef.current();
    }
  }, [otpValue, otpLength]);

  return null;
};

export default AutoVerifyOtpEffect;
