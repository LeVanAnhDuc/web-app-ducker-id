// types
import type { Request } from "express";

export interface PasswordLoginBody {
  email: string;
  password: string;
}

export interface PasswordLoginRequest extends Omit<Request, "body"> {
  body: PasswordLoginBody;
}

export interface OtpSendBody {
  email: string;
}

export interface OtpVerifyBody {
  email: string;
  otp: string;
}

export interface OtpSendRequest extends Omit<Request, "body"> {
  body: OtpSendBody;
}

export interface OtpVerifyRequest extends Omit<Request, "body"> {
  body: OtpVerifyBody;
}

export interface MagicLinkSendBody {
  email: string;
}

export interface MagicLinkVerifyBody {
  email: string;
  token: string;
}

export interface MagicLinkSendRequest extends Omit<Request, "body"> {
  body: MagicLinkSendBody;
}

export interface MagicLinkVerifyRequest extends Omit<Request, "body"> {
  body: MagicLinkVerifyBody;
}
