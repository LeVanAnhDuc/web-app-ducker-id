// libs
import * as z from "zod";
// schemas
import { emailSchema, passwordSchema } from "@/schemas";
// others
import CONSTANTS from "@/constants";

const { EMAIL, PASSWORD, TEMP_PASSWORD } =
  CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

export const emailStepValidation = z.object({
  [EMAIL]: emailSchema
});

export const passwordStepValidation = z.object({
  [PASSWORD]: passwordSchema
});

// The emailed temporary password (server: 12+ characters)
export const unlockVerifyValidation = z.object({
  [TEMP_PASSWORD]: z
    .string()
    .min(1, { message: "required" })
    .min(12, { message: "minLength" })
});
