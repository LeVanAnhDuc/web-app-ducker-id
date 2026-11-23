// types
import type { CheckEmailDto } from "../dtos";
import type { UserService } from "@/modules/user/user.service";
// dtos
import { toCheckEmailDto } from "../dtos";

export const checkEmail = async (
  userService: UserService,
  email: string
): Promise<CheckEmailDto> => {
  const exists = await userService.emailExists(email);

  return toCheckEmailDto(!exists);
};
