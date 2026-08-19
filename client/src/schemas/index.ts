// libs
import * as z from "zod";
// others
import { GENDER_VALUES } from "@/constants/gender";
import { getDateOfBirthBounds } from "@/utils";

const SAFE_EMAIL_PATTERN =
  // eslint-disable-next-line no-control-regex
  /^[^\u0000-\u001F\u007F-\u009F\u200B-\u200D\u202A-\u202E\uFEFF]+$/;

export const emailSchema = z
  .string()
  .min(1, { message: "required" })
  .min(3, { message: "minLength" })
  .max(254, { message: "maxLength" })
  .email({ message: "invalid" })
  .regex(SAFE_EMAIL_PATTERN, { message: "invalid" });

export const genderSchema = z.enum(GENDER_VALUES, { message: "invalid" });

export const profileDateOfBirthSchema = z
  .string()
  .min(1, { message: "required" })
  .refine(
    (value) => {
      const date = new Date(value);
      const today = new Date();
      const minDate = new Date(
        today.getFullYear() - 100,
        today.getMonth(),
        today.getDate()
      );
      return date >= minDate && date <= today;
    },
    { message: "invalid" }
  );

export const birthdaySchema = z
  .string()
  .min(1, { message: "required" })
  .refine(
    (value) => {
      const date = new Date(value);
      const { minDate, maxDate } = getDateOfBirthBounds();
      return date >= minDate && date <= maxDate;
    },
    { message: "invalid" }
  );

const SAFE_FULLNAME_PATTERN = /^[\p{L}\s\-'.]+$/u;

export const fullNameSchema = z
  .string()
  .min(1, { message: "required" })
  .min(2, { message: "minLength" })
  .max(100, { message: "maxLength" })
  .regex(SAFE_FULLNAME_PATTERN, { message: "invalid" });

export const passwordSchema = z
  .string()
  .min(1, { message: "required" })
  .min(8, { message: "minLength" })
  .max(128, { message: "maxLength" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: "requirements"
  });
