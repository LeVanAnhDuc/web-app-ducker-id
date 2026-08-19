// libs
import * as z from "zod";
// schemas
import { emailSchema, passwordSchema } from "@/schemas";
// others
import CONSTANTS from "@/constants";

const { EMAIL, PASSWORD } = CONSTANTS.FIELD_NAMES.LOGIN_FIELD_NAMES;

export const emailStepValidation = z.object({
  [EMAIL]: emailSchema
});

export const passwordStepValidation = z.object({
  [PASSWORD]: passwordSchema
});
