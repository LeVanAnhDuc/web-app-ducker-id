// libs
import * as z from "zod";
// schemas
import {
  fullNameSchema,
  passwordSchema,
  genderSchema,
  birthdaySchema
} from "@/schemas";
// others
import CONSTANTS from "@/constants";

const { FULL_NAME, GENDER, BIRTHDAY, PASSWORD, PASSWORD_CONFIRM } =
  CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

export const signupInfoFormValidation = z
  .object({
    [FULL_NAME]: fullNameSchema,
    [GENDER]: genderSchema,
    [BIRTHDAY]: birthdaySchema,
    [PASSWORD]: passwordSchema,
    [PASSWORD_CONFIRM]: z.string().min(1, { message: "required" })
  })
  .refine((data) => data[PASSWORD] === data[PASSWORD_CONFIRM], {
    message: "mismatch",
    path: [PASSWORD_CONFIRM]
  });
