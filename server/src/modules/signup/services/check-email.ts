// types
import type { CheckEmailParamsDto } from "../dtos/requests";
import type { CheckEmailDto } from "../dtos";
import type { UserService } from "@/modules/user/services";
// dtos
import { toCheckEmailDto } from "../dtos";

export const checkEmail = async (
  userService: UserService,
  params: CheckEmailParamsDto
): Promise<CheckEmailDto> => {
  const { email } = params;

  const exists = await userService.emailExists(email);

  return toCheckEmailDto(!exists);
};
