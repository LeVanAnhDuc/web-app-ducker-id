// libs
import * as z from "zod";
// others
import CONSTANTS from "@/constants";

const {
  NAME,
  DISPLAY_NAME,
  DESCRIPTION,
  ICON_URL,
  HOME_URL,
  CATEGORY_ID,
  STATUS,
  REQUIRED_ROLES,
  REDIRECT_URIS
} = CONSTANTS.FIELD_NAMES.ADMIN_APP_FIELD_NAMES;
const { USER, ADMIN } = CONSTANTS.AUTHENTICATION_ROLES;
const { ACTIVE, INACTIVE } = CONSTANTS.APP_STATUS;

const NAME_MIN = 2;
const NAME_MAX = 64;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 80;
const DESCRIPTION_MAX = 500;
const URL_MAX = 2000;
const URL_PATTERN = /^https?:\/\/.+/i;
const REDIRECT_URIS_MAX = 20;

const optionalUrl = z
  .string()
  .max(URL_MAX, { message: "maxLength" })
  .refine((v) => v === "" || URL_PATTERN.test(v), { message: "invalid" });

const requiredUrl = z
  .string()
  .min(1, { message: "required" })
  .max(URL_MAX, { message: "maxLength" })
  .regex(URL_PATTERN, { message: "invalid" });

export const adminAppValidation = z.object({
  [NAME]: z
    .string()
    .min(1, { message: "required" })
    .min(NAME_MIN, { message: "minLength" })
    .max(NAME_MAX, { message: "maxLength" })
    .regex(NAME_PATTERN, { message: "invalid" }),
  [DISPLAY_NAME]: z
    .string()
    .min(1, { message: "required" })
    .min(DISPLAY_NAME_MIN, { message: "minLength" })
    .max(DISPLAY_NAME_MAX, { message: "maxLength" }),
  [DESCRIPTION]: z.string().max(DESCRIPTION_MAX, { message: "maxLength" }),
  [ICON_URL]: optionalUrl,
  [HOME_URL]: requiredUrl,
  [CATEGORY_ID]: z.string().min(1, { message: "required" }),
  [STATUS]: z.enum([ACTIVE, INACTIVE]),
  [REQUIRED_ROLES]: z
    .array(z.enum([USER, ADMIN]))
    .min(1, { message: "required" }),
  [REDIRECT_URIS]: z
    .array(requiredUrl)
    .min(1, { message: "required" })
    .max(REDIRECT_URIS_MAX, { message: "maxItems" })
});
