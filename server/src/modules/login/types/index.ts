// types
import type { Request } from "express";
import type {
  LoginBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto
} from "../dtos/requests";

export interface PasswordLoginRequest extends Omit<Request, "body"> {
  body: LoginBodyDto;
}

export interface OtpSendRequest extends Omit<Request, "body"> {
  body: OtpSendBodyDto;
}

export interface OtpVerifyRequest extends Omit<Request, "body"> {
  body: OtpVerifyBodyDto;
}

export interface MagicLinkSendRequest extends Omit<Request, "body"> {
  body: MagicLinkSendBodyDto;
}

export interface MagicLinkVerifyRequest extends Omit<Request, "body"> {
  body: MagicLinkVerifyBodyDto;
}
