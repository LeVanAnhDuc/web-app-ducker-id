// types
import type { Request } from "express";
import type {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  ResetPasswordBodyDto
} from "../dtos/requests";

export type FPOtpSendRequest = Request<
  Record<string, never>,
  unknown,
  OtpSendBodyDto
>;

export type FPOtpVerifyRequest = Request<
  Record<string, never>,
  unknown,
  OtpVerifyBodyDto
>;

export type FPMagicLinkSendRequest = Request<
  Record<string, never>,
  unknown,
  MagicLinkSendBodyDto
>;

export type FPMagicLinkVerifyRequest = Request<
  Record<string, never>,
  unknown,
  MagicLinkVerifyBodyDto
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
