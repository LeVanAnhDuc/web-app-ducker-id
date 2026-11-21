// types
import type { Request } from "express";
import type {
  UnlockRequestBodyDto,
  UnlockVerifyBodyDto
} from "../dtos/requests";

export type UnlockRequest = Request<
  Record<string, never>,
  unknown,
  UnlockRequestBodyDto
>;

export type UnlockVerifyRequest = Request<
  Record<string, never>,
  unknown,
  UnlockVerifyBodyDto
>;
