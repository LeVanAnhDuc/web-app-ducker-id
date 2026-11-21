// types
import type { Request } from "express";
import type {
  ForgotPasswordMagicLinkSendBodyDto,
  ForgotPasswordMagicLinkVerifyBodyDto,
  ForgotPasswordOtpSendBodyDto,
  ForgotPasswordOtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "../dtos/requests";

export type FPOtpSendRequest = Request<
  Record<string, never>,
  unknown,
  ForgotPasswordOtpSendBodyDto
>;

export type FPOtpVerifyRequest = Request<
  Record<string, never>,
  unknown,
  ForgotPasswordOtpVerifyBodyDto
>;

export type FPMagicLinkSendRequest = Request<
  Record<string, never>,
  unknown,
  ForgotPasswordMagicLinkSendBodyDto
>;

export type FPMagicLinkVerifyRequest = Request<
  Record<string, never>,
  unknown,
  ForgotPasswordMagicLinkVerifyBodyDto
>;

export interface FPVerifyResponse {
  success: boolean;
  resetToken: string;
}

export type FPResetPasswordRequest = Request<
  Record<string, never>,
  unknown,
  ResetPasswordBodyDto
>;

export interface FPResetPasswordResponse {
  success: boolean;
}
