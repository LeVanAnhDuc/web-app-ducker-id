// types
import type { CheckEmailParams } from "../types";
import type { CheckEmailDto } from "../dtos";
import type { SignupServiceDeps } from "./deps";
// dtos
import { toCheckEmailDto } from "../dtos";

export const checkEmail = async (
  deps: SignupServiceDeps,
  params: CheckEmailParams
): Promise<CheckEmailDto> => {
  const { email } = params;

  const exists = await deps.userService.emailExists(email);

  return toCheckEmailDto(!exists);
};
