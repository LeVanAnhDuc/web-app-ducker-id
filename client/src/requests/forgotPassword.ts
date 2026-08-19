// types
import type {
  SendOtpResponse,
  VerifyOtpResponse,
  SendMagicLinkResponse,
  VerifyMagicLinkResponse,
  ResetPasswordResponse
} from "@/types/ForgotPassword";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const sendForgotPasswordOtp = async (
  email: string
): Promise<SendOtpResponse> => {
  const response = await axiosInstance.post<ResponsePattern<SendOtpResponse>>(
    END_POINTS.AUTH_FORGOT_PASSWORD_OTP_SEND,
    { email }
  );
  return response.data.data;
};

export const verifyForgotPasswordOtp = async (
  email: string,
  otp: string
): Promise<VerifyOtpResponse> => {
  const response = await axiosInstance.post<ResponsePattern<VerifyOtpResponse>>(
    END_POINTS.AUTH_FORGOT_PASSWORD_OTP_VERIFY,
    { email, otp }
  );
  return response.data.data;
};

export const sendForgotPasswordMagicLink = async (
  email: string
): Promise<SendMagicLinkResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<SendMagicLinkResponse>
  >(END_POINTS.AUTH_FORGOT_PASSWORD_MAGIC_LINK_SEND, { email });
  return response.data.data;
};

export const verifyForgotPasswordMagicLink = async (
  email: string,
  token: string
): Promise<VerifyMagicLinkResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<VerifyMagicLinkResponse>
  >(END_POINTS.AUTH_FORGOT_PASSWORD_MAGIC_LINK_VERIFY, { email, token });
  return response.data.data;
};

export const forgotPasswordReset = async (
  email: string,
  resetToken: string,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<ResetPasswordResponse>
  >(END_POINTS.AUTH_FORGOT_PASSWORD_RESET, { email, resetToken, newPassword });
  return response.data.data;
};
