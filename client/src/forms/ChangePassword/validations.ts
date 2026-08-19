// libs
import * as z from "zod";
// schemas
import { passwordSchema } from "@/schemas";
// others
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;

export const changePasswordValidation = z
  .object({
    [CURRENT_PASSWORD]: z.string().min(1, { message: "required" }),
    [NEW_PASSWORD]: passwordSchema,
    [CONFIRM_PASSWORD]: z.string().min(1, { message: "required" })
  })
  .refine((data) => data[NEW_PASSWORD] === data[CONFIRM_PASSWORD], {
    message: "mismatch",
    path: [CONFIRM_PASSWORD]
  });
