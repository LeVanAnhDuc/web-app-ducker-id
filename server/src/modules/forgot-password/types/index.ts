// types
import type { Request } from "express";

export interface FPOtpSendBody {
  email: string;
}

export type FPOtpSendRequest = Request<
  Record<string, never>,
  unknown,
  FPOtpSendBody
>;

export interface FPOtpVerifyBody {
  email: string;
  otp: string;
}

export type FPOtpVerifyRequest = Request<
  Record<string, never>,
  unknown,
  FPOtpVerifyBody
>;

export interface FPMagicLinkSendBody {
  email: string;
}

export type FPMagicLinkSendRequest = Request<
  Record<string, never>,
  unknown,
  FPMagicLinkSendBody
>;

export interface FPMagicLinkVerifyBody {
  email: string;
  token: string;
}

export type FPMagicLinkVerifyRequest = Request<
  Record<string, never>,
  unknown,
  FPMagicLinkVerifyBody
>;

export interface FPVerifyResponse {
  success: boolean;
  resetToken: string;
}

export interface FPResetPasswordBody {
  email: string;
  resetToken: string;
  newPassword: string;
}

export type FPResetPasswordRequest = Request<
  Record<string, never>,
  unknown,
  FPResetPasswordBody
>;

export interface FPResetPasswordResponse {
  success: boolean;
}
