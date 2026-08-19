// libs
import * as z from "zod";
// schemas
import { passwordSchema } from "@/schemas";
// constants
import CONSTANTS from "@/constants";

const { NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.FORGOT_PASSWORD_FIELD_NAMES;

export const forgotPasswordResetValidation = z
  .object({
    [NEW_PASSWORD]: passwordSchema,
    [CONFIRM_PASSWORD]: z.string().min(1, "required")
  })
  .refine((data) => data[NEW_PASSWORD] === data[CONFIRM_PASSWORD], {
    message: "mismatch",
    path: [CONFIRM_PASSWORD]
  });
