// libs
import * as z from "zod";
// constants
import { GENDER_VALUES } from "@/constants/gender";
// others
import { getDateOfBirthBounds, parseDateOnly } from "@/utils";

const SAFE_PHONE_PATTERN = /^[\d\s()+-]+$/;
const SAFE_ADDRESS_PATTERN = /^[\p{L}\p{N}\s,.\-'/#]+$/u;

export const updatePersonalInfoValidation = z.object({
  firstName: z
    .string()
    .min(1, { message: "required" })
    .max(50, { message: "maxLength" }),
  lastName: z
    .string()
    .min(1, { message: "required" })
    .max(50, { message: "maxLength" }),
  phone: z
    .string()
    .max(20, { message: "maxLength" })
    .regex(SAFE_PHONE_PATTERN, { message: "invalid" })
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, { message: "maxLength" })
    .regex(SAFE_ADDRESS_PATTERN, { message: "invalid" })
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        // Same 13–120 range as sign-up (birthdaySchema)
        const date = parseDateOnly(val);
        const { minDate, maxDate } = getDateOfBirthBounds();
        return date >= minDate && date <= maxDate;
      },
      { message: "invalid" }
    )
    .optional()
    .or(z.literal("")),
  gender: z
    .enum(GENDER_VALUES, { message: "invalid" })
    .optional()
    .or(z.literal(""))
});
