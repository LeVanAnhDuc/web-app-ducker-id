// types
import type { Request } from "express";
import type {
  CheckEmailParamsDto,
  CompleteSignupBodyDto,
  ResendOtpBodyDto,
  SendOtpBodyDto,
  VerifyOtpBodyDto
} from "../dtos/requests";

export interface SendOtpRequest extends Omit<Request, "body"> {
  body: SendOtpBodyDto;
}

export interface VerifyOtpRequest extends Omit<Request, "body"> {
  body: VerifyOtpBodyDto;
}

export interface ResendOtpRequest extends Omit<Request, "body"> {
  body: ResendOtpBodyDto;
}

export interface CompleteSignupRequest extends Omit<Request, "body"> {
  body: CompleteSignupBodyDto;
}

// The index signature keeps the handler assignable to Express's own, whose
// params are a string dictionary.
export interface CheckEmailRequest extends Omit<Request, "params"> {
  params: CheckEmailParamsDto & Record<string, string>;
}
