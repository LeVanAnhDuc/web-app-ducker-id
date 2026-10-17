"use client";

// libs
import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
// requests
import { checkEmailAvailability, sendSignupOtp } from "@/requests/signup";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN_PASSWORD, SIGNUP_OTP } = CONSTANTS.ROUTES;
const { SIGNUP_OTP_COOLDOWN } = CONSTANTS.ERROR_CODES;

// Re-entering the same unknown address inside the resend cooldown: the code
// sent a moment ago is still valid, so the user continues to it.
const sendSignupOtpUnlessCoolingDown = async (email: string) => {
  try {
    await sendSignupOtp(email);
  } catch (error) {
    const code =
      isAxiosError<ErrorResponsePattern>(error) && error.response?.data?.code;
    if (code !== SIGNUP_OTP_COOLDOWN) throw error;
  }
};

export const useLoginEmail = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (email: string) => {
      const result = await checkEmailAvailability(email);
      if (result.available) {
        await sendSignupOtpUnlessCoolingDown(email);
      }
      return { available: result.available, email };
    },
    onSuccess: ({ available, email }) => {
      if (!available) {
        router.push(`${LOGIN_PASSWORD}?email=${encodeURIComponent(email)}`);
      } else {
        router.push(`${SIGNUP_OTP}?email=${encodeURIComponent(email)}`);
      }
    }
  });
};
