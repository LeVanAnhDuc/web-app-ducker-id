// libs
import * as z from "zod";
// schemas
import { emailSchema } from "@/schemas";
// others
import CONSTANTS from "@/constants";

const { EMAIL, SUBJECT, MESSAGE } = CONSTANTS.FIELD_NAMES.SUPPORT_FIELD_NAMES;
const {
  SUBJECT_MIN_CHARS,
  SUBJECT_MAX_CHARS,
  MESSAGE_MIN_CHARS,
  MESSAGE_MAX_CHARS
} = CONSTANTS.SUPPORT;

export const supportValidation = z.object({
  [EMAIL]: emailSchema.optional().or(z.literal("")),
  [SUBJECT]: z
    .string()
    .min(1, { message: "required" })
    .min(SUBJECT_MIN_CHARS, { message: "minLength" })
    .max(SUBJECT_MAX_CHARS, { message: "maxLength" }),
  [MESSAGE]: z
    .string()
    .min(1, { message: "required" })
    .min(MESSAGE_MIN_CHARS, { message: "minLength" })
    .max(MESSAGE_MAX_CHARS, { message: "maxLength" })
});
