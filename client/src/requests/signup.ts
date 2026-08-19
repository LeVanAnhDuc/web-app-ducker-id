// types
import type {
  SendSignupOtpResponse,
  VerifySignupOtpResponse,
  ResendSignupOtpResponse,
  SignupCompletePayload,
  SignupCompleteResponse,
  CheckEmailResponse
} from "@/types/Signup";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const sendSignupOtp = async (
  email: string
): Promise<SendSignupOtpResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<SendSignupOtpResponse>
  >(END_POINTS.AUTH_SIGNUP_SEND_OTP, { email });
  return response.data.data;
};

export const verifySignupOtp = async (
  email: string,
  otp: string
): Promise<VerifySignupOtpResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<VerifySignupOtpResponse>
  >(END_POINTS.AUTH_SIGNUP_VERIFY_OTP, { email, otp });
  return response.data.data;
};

export const resendSignupOtp = async (
  email: string
): Promise<ResendSignupOtpResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<ResendSignupOtpResponse>
  >(END_POINTS.AUTH_SIGNUP_RESEND_OTP, { email });
  return response.data.data;
};

export const completeSignup = async (
  payload: SignupCompletePayload
): Promise<SignupCompleteResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<SignupCompleteResponse>
  >(END_POINTS.AUTH_SIGNUP_COMPLETE, payload);
  return response.data.data;
};

export const checkEmailAvailability = async (
  email: string
): Promise<CheckEmailResponse> => {
  const response = await axiosInstance.get<ResponsePattern<CheckEmailResponse>>(
    generatePath(END_POINTS.AUTH_SIGNUP_CHECK_EMAIL, { email })
  );
  return response.data.data;
};
