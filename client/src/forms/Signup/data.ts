// types
import type { SignupInfoFormValues } from "@/types/Signup";
// others
import CONSTANTS from "@/constants";

const { FULL_NAME, GENDER, BIRTHDAY, PASSWORD, PASSWORD_CONFIRM } =
  CONSTANTS.FIELD_NAMES.SIGNUP_FIELD_NAMES;

export const initialSignupInfoFormData: SignupInfoFormValues = {
  [FULL_NAME]: "",
  [GENDER]: "",
  [BIRTHDAY]: "",
  [PASSWORD]: "",
  [PASSWORD_CONFIRM]: ""
};
