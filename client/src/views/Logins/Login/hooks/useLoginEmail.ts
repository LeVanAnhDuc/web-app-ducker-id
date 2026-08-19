"use client";

// libs
import { useMutation } from "@tanstack/react-query";
// requests
import { checkEmailAvailability, sendSignupOtp } from "@/requests/signup";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN_PASSWORD, SIGNUP_OTP } = CONSTANTS.ROUTES;

export const useLoginEmail = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (email: string) => {
      const result = await checkEmailAvailability(email);
      if (result.available) {
        await sendSignupOtp(email);
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
