// types
import type {
  LoginTokenResponse,
  SendOtpResponse,
  SendMagicLinkResponse
} from "@/types/Login";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const loginWithPassword = async (
  email: string,
  password: string
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_LOGIN, { email, password });
  return response.data.data;
};

export const sendLoginOtp = async (email: string): Promise<SendOtpResponse> => {
  const response = await axiosInstance.post<ResponsePattern<SendOtpResponse>>(
    END_POINTS.AUTH_LOGIN_OTP_SEND,
    { email }
  );
  return response.data.data;
};

export const verifyLoginOtp = async (
  email: string,
  otp: string
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_LOGIN_OTP_VERIFY, { email, otp });
  return response.data.data;
};

export const sendLoginMagicLink = async (
  email: string
): Promise<SendMagicLinkResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<SendMagicLinkResponse>
  >(END_POINTS.AUTH_LOGIN_MAGIC_LINK_SEND, { email });
  return response.data.data;
};

export const verifyLoginMagicLink = async (
  email: string,
  token: string
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_LOGIN_MAGIC_LINK_VERIFY, { email, token });
  return response.data.data;
};

export const refreshToken = async (): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_REFRESH);
  return response.data.data;
};
