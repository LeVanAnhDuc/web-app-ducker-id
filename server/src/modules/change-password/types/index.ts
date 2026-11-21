// types
import type { Request } from "express";
import type { ChangePasswordBodyDto } from "../dtos/requests";

export type ChangePasswordRequest = Request<
  Record<string, never>,
  unknown,
  ChangePasswordBodyDto
>;
