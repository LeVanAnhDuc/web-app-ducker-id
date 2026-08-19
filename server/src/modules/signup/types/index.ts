// types
import type { Request } from "express";
import type { Gender } from "@/modules/user/types";

export interface SendOtpBody {
  email: string;
}

export interface VerifyOtpBody {
  email: string;
  otp: string;
}

export interface ResendOtpBody {
  email: string;
}

export interface CompleteSignupBody {
  email: string;
  sessionToken: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface CheckEmailParams {
  email: string;
  [key: string]: string;
}

export interface SendOtpRequest extends Omit<Request, "body"> {
  body: SendOtpBody;
}

export interface VerifyOtpRequest extends Omit<Request, "body"> {
  body: VerifyOtpBody;
}

export interface ResendOtpRequest extends Omit<Request, "body"> {
  body: ResendOtpBody;
}

export interface CompleteSignupRequest extends Omit<Request, "body"> {
  body: CompleteSignupBody;
}

export interface CheckEmailRequest extends Omit<Request, "params"> {
  params: CheckEmailParams;
}
