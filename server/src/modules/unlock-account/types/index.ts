// types
import type { Request } from "express";

export interface UnlockRequestBody {
  email: string;
}

export interface UnlockVerifyBody {
  email: string;
  tempPassword: string;
}

export type UnlockRequest = Request<
  Record<string, never>,
  unknown,
  UnlockRequestBody
>;

export type UnlockVerifyRequest = Request<
  Record<string, never>,
  unknown,
  UnlockVerifyBody
>;
